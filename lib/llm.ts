import type { LlmSetting } from '@/types';

export class LlmStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmStreamError';
  }
}

const MAX_BUFFER_SIZE = 256 * 1024; // 256KB — if a single line exceeds this, the stream is malformed
const MAX_STREAM_BYTES = 50 * 1024 * 1024; // 50MB — hard cap on total bytes read from a single stream

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmStreamCallbacks {
  onThinking?: (chunk: string) => void;
  onContent?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

/**
 * Extract thinking text from OpenRouter-style reasoning_details array.
 */
function extractReasoningFromDetails(
  details: Array<{ type?: string; text?: string; thinking?: string }> | null | undefined,
): string | null {
  if (!details || !Array.isArray(details)) return null;
  const parts: string[] = [];
  for (const d of details) {
    const text = d.text ?? d.thinking;
    if (text) parts.push(text);
  }
  return parts.length > 0 ? parts.join('') : null;
}

/**
 * Detect whether a base URL points to an Anthropic-native API.
 * Matches: https://api.anthropic.com, or any URL whose path already
 * includes /v1/messages (custom proxy forwarding to Anthropic).
 */
export function isAnthropicApi(baseUrl: string): boolean {
  try {
    const u = new URL(baseUrl);
    return u.hostname === 'api.anthropic.com' || u.pathname.includes('/v1/messages');
  } catch {
    return false;
  }
}

/**
 * Verify an LLM provider connection by sending a minimal request.
 */
export async function verifyLlmConnection(setting: LlmSetting): Promise<{ success: boolean; error?: string }> {
  try {
    const base = setting.base_url.replace(/\/+$/, '');
    const anthropic = isAnthropicApi(setting.base_url);

    const url = anthropic ? `${base}/v1/messages` : `${base}/v1/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: string;

    if (anthropic) {
      headers['x-api-key'] = setting.api_key || '';
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: setting.model_name,
        messages: [{ role: 'user', content: 'Reply with "ok".' }],
        max_tokens: 10,
        stream: false,
      });
    } else {
      if (setting.api_key) {
        headers['Authorization'] = `Bearer ${setting.api_key}`;
      }
      body = JSON.stringify({
        model: setting.model_name,
        messages: [{ role: 'user', content: 'Reply with "ok".' }],
        max_tokens: 10,
        stream: false,
      });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/**
 * Stream a chat completion from an OpenAI-compatible or Anthropic-native API.
 * Auto-detects API format from the base URL.
 * Calls onThinking for reasoning/thinking content and onContent for regular content.
 */
export async function streamChatCompletion(
  setting: LlmSetting,
  messages: LlmMessage[],
  callbacks: LlmStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const anthropic = isAnthropicApi(setting.base_url);

  if (anthropic) {
    return streamAnthropicCompletion(setting, messages, callbacks, signal);
  }

  return streamOpenAICompletion(setting, messages, callbacks, signal);
}

// ── OpenAI-compatible streaming ────────────────────────────────────────────

async function streamOpenAICompletion(
  setting: LlmSetting,
  messages: LlmMessage[],
  callbacks: LlmStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${setting.base_url.replace(/\/+$/, '')}/v1/chat/completions`;
  const effectiveSignal = signal ?? AbortSignal.timeout(120_000);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (setting.api_key) {
    headers['Authorization'] = `Bearer ${setting.api_key}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: setting.model_name,
      messages,
      max_tokens: setting.max_tokens,
      stream: true,
    }),
    signal: effectiveSignal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const msg = `LLM API error: HTTP ${res.status} — ${body.slice(0, 300)}`;
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const msg = 'No response body from LLM API';
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        totalBytesRead += value.byteLength;
        if (totalBytesRead > MAX_STREAM_BYTES) {
          const msg = 'LLM stream exceeded maximum size limit';
          callbacks.onError?.(msg);
          throw new LlmStreamError(msg);
        }
        buffer += decoder.decode(value, { stream: true });
      }

      if (buffer.length > MAX_BUFFER_SIZE) {
        const msg = 'LLM stream buffer overflow — malformed SSE response';
        callbacks.onError?.(msg);
        throw new LlmStreamError(msg);
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          callbacks.onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string | null;
                reasoning_content?: string | null;
                reasoning?: string | null;
                reasoning_details?: Array<{
                  type?: string;
                  text?: string;
                  thinking?: string;
                }> | null;
              };
            }>;
          };
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            // Extract thinking from whichever field the proxy provides:
            // - reasoning_content: LiteLLM, DeepSeek
            // - reasoning: OpenRouter (legacy)
            // - reasoning_details[].text/thinking: OpenRouter (structured)
            const thinking =
              delta.reasoning_content ??
              delta.reasoning ??
              extractReasoningFromDetails(delta.reasoning_details);
            if (thinking) {
              callbacks.onThinking?.(thinking);
            }
            if (delta.content) {
              callbacks.onContent?.(delta.content);
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }

      if (done) {
        // Process remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (delta) {
                  const thinking =
                    delta.reasoning_content ??
                    delta.reasoning ??
                    extractReasoningFromDetails(delta.reasoning_details);
                  if (thinking) callbacks.onThinking?.(thinking);
                  if (delta.content) callbacks.onContent?.(delta.content);
                }
              } catch { /* skip malformed */ }
            }
          }
        }
        break;
      }
    }

    callbacks.onDone?.();
  } catch (err) {
    if (err instanceof LlmStreamError) throw err;
    if (signal?.aborted) return;
    const msg = err instanceof Error ? err.message : 'Stream reading failed';
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  } finally {
    reader.releaseLock();
  }
}

// ── Anthropic-native streaming ─────────────────────────────────────────────

async function streamAnthropicCompletion(
  setting: LlmSetting,
  messages: LlmMessage[],
  callbacks: LlmStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const base = setting.base_url.replace(/\/+$/, '');
  const url = base.includes('/v1/messages') ? base : `${base}/v1/messages`;
  const effectiveSignal = signal ?? AbortSignal.timeout(120_000);

  // Separate system message from conversation messages (Anthropic API requirement)
  const systemContent = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: setting.model_name,
    messages: conversationMessages,
    max_tokens: setting.max_tokens,
    stream: true,
  };

  if (systemContent) {
    body.system = systemContent;
  }

  // Enable extended thinking when configured
  if (setting.enable_thinking) {
    const budget = Math.max(1024, Math.floor(setting.max_tokens * 0.8));
    body.thinking = { type: 'enabled', budget_tokens: budget };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': setting.api_key || '',
    'anthropic-version': '2023-06-01',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: effectiveSignal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const msg = `LLM API error: HTTP ${res.status} — ${text.slice(0, 300)}`;
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const msg = 'No response body from LLM API';
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        totalBytesRead += value.byteLength;
        if (totalBytesRead > MAX_STREAM_BYTES) {
          const msg = 'LLM stream exceeded maximum size limit';
          callbacks.onError?.(msg);
          throw new LlmStreamError(msg);
        }
        buffer += decoder.decode(value, { stream: true });
      }

      if (buffer.length > MAX_BUFFER_SIZE) {
        const msg = 'LLM stream buffer overflow — malformed SSE response';
        callbacks.onError?.(msg);
        throw new LlmStreamError(msg);
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();

        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            delta?: {
              type?: string;
              text?: string;
              thinking?: string;
            };
            error?: { message?: string };
          };

          // Anthropic SSE event types:
          // content_block_delta with delta.type = "thinking_delta" → thinking
          // content_block_delta with delta.type = "text_delta" → content
          // message_delta with delta.stop_reason → done
          // error → error
          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'thinking_delta' && parsed.delta.thinking) {
              callbacks.onThinking?.(parsed.delta.thinking);
            } else if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
              callbacks.onContent?.(parsed.delta.text);
            }
          } else if (parsed.type === 'message_stop') {
            callbacks.onDone?.();
            return;
          } else if (parsed.type === 'error') {
            const msg = parsed.error?.message || 'Anthropic API error';
            callbacks.onError?.(msg);
            throw new LlmStreamError(msg);
          }
        } catch (err) {
          if (err instanceof LlmStreamError) throw err;
          // Skip malformed JSON lines
        }
      }

      if (done) break;
    }

    callbacks.onDone?.();
  } catch (err) {
    if (err instanceof LlmStreamError) throw err;
    if (signal?.aborted) return;
    const msg = err instanceof Error ? err.message : 'Stream reading failed';
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  } finally {
    reader.releaseLock();
  }
}

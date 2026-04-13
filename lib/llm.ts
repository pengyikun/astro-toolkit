import type { LlmSetting } from '@/types';

export class LlmStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmStreamError';
  }
}

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
 * Verify an LLM provider connection by sending a minimal request.
 */
export async function verifyLlmConnection(setting: LlmSetting): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${setting.base_url.replace(/\/+$/, '')}/v1/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: setting.model_name,
        messages: [{ role: 'user', content: 'Reply with "ok".' }],
        max_tokens: 10,
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/**
 * Stream a chat completion from an OpenAI-compatible API.
 * Calls onThinking for reasoning_content and onContent for regular content.
 */
export async function streamChatCompletion(
  setting: LlmSetting,
  messages: LlmMessage[],
  callbacks: LlmStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${setting.base_url.replace(/\/+$/, '')}/v1/chat/completions`;
  const effectiveSignal = signal ?? AbortSignal.timeout(120_000);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
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
              };
            }>;
          };
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.reasoning_content) {
            callbacks.onThinking?.(delta.reasoning_content);
          }
          if (delta?.content) {
            callbacks.onContent?.(delta.content);
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
                if (delta?.reasoning_content) callbacks.onThinking?.(delta.reasoning_content);
                if (delta?.content) callbacks.onContent?.(delta.content);
              } catch { /* skip malformed */ }
            }
          }
        }
        break;
      }
    }

    callbacks.onDone?.();
  } catch (err) {
    if (signal?.aborted) return;
    const msg = err instanceof Error ? err.message : 'Stream reading failed';
    callbacks.onError?.(msg);
    throw new LlmStreamError(msg);
  } finally {
    reader.releaseLock();
  }
}

import { NextRequest } from 'next/server';
import type { LlmSetting } from '@/types';
import { requireAccessScope } from '@/lib/access';
import * as LlmSettingModel from '@/models/llm-setting.model';
import { isAnthropicApi, LlmStreamError } from '@/lib/llm';
import { CHAT_TOOLS, toAnthropicTools, executeTool } from '@/lib/chat-tools';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

const SYSTEM_PROMPT = `You are an AI assistant for Astro Toolkit, a workspace for payment operations and integration testing. You have access to tools that let you query the workspace data.

When the user asks about accounts, transactions, credentials, todos, or briefs, use the available tools to look up real data before answering. Be concise and factual. Format data clearly using markdown when helpful.

If you don't have enough information to answer, say so rather than guessing.`;

const MAX_TOOL_ROUNDS = 5;

export async function POST(request: NextRequest) {
  let scope;
  try {
    scope = await requireAccessScope();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.messages || !Array.isArray(body.messages)) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }

  const llmSetting = await LlmSettingModel.findByOwner(db, scope);
  if (!llmSetting) {
    return Response.json({ error: 'LLM provider not configured' }, { status: 400 });
  }

  const anthropic = isAnthropicApi(llmSetting.base_url);
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 180_000);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Build message history
        const messages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...body.messages.map((m: { role: string; content: string }) => ({
            role: m.role as ChatMessage['role'],
            content: m.content,
          })),
        ];

        let toolRound = 0;

        while (toolRound < MAX_TOOL_ROUNDS) {
          if (signal.aborted) break;

          const result = anthropic
            ? await streamAnthropicWithTools(llmSetting, messages, send, signal)
            : await streamOpenAIWithTools(llmSetting, messages, send, signal);

          if (!result.hasToolCalls || result.toolCalls.length === 0) {
            break;
          }

          // Execute tool calls
          for (const tc of result.toolCalls) {
            send('tool_call', { id: tc.id, name: tc.name, arguments: tc.arguments });

            const toolResult = await executeTool(tc.name, tc.arguments, scope);
            send('tool_result', { id: tc.id, name: tc.name, result: toolResult });

            if (anthropic) {
              // Anthropic: add assistant message with tool_use blocks, then tool results
              // This is handled by appending to messages in the Anthropic format
              messages.push({
                role: 'assistant',
                content: JSON.stringify(result.contentBlocks),
              });
              messages.push({
                role: 'tool' as ChatMessage['role'],
                content: JSON.stringify(toolResult),
                tool_call_id: tc.id,
              });
            } else {
              // OpenAI: add assistant message with tool_calls, then tool results
              if (toolRound === 0 || !messages.find((m) => m.tool_calls?.some((t) => t.id === tc.id))) {
                messages.push({
                  role: 'assistant',
                  content: result.contentText || '',
                  tool_calls: result.toolCalls.map((t) => ({
                    id: t.id,
                    type: 'function' as const,
                    function: { name: t.name, arguments: JSON.stringify(t.arguments) },
                  })),
                });
              }
              messages.push({
                role: 'tool',
                content: JSON.stringify(toolResult),
                tool_call_id: tc.id,
              });
            }
          }

          toolRound++;
        }

        send('done', {});
      } catch (err) {
        if (!signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Chat failed';
          send('error', { message: msg });
        }
      } finally {
        clearTimeout(timeoutId);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}

// ── OpenAI-compatible streaming with tool support ─────────────────────────

interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  rawArgs: string;
}

interface StreamResult {
  hasToolCalls: boolean;
  toolCalls: ToolCallAccumulator[];
  contentText: string;
  contentBlocks?: unknown[];
}

async function streamOpenAIWithTools(
  setting: LlmSetting,
  messages: ChatMessage[],
  send: (event: string, data: unknown) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const url = `${setting.base_url.replace(/\/+$/, '')}/v1/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (setting.api_key) headers['Authorization'] = `Bearer ${setting.api_key}`;

  // Convert messages for OpenAI format
  const apiMessages = messages.filter((m) => m.role !== 'system').map((m) => {
    const msg: Record<string, unknown> = { role: m.role, content: m.content };
    if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
    if (m.tool_calls) msg.tool_calls = m.tool_calls;
    return msg;
  });

  const systemContent = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');

  const requestBody: Record<string, unknown> = {
    model: setting.model_name,
    messages: systemContent
      ? [{ role: 'system', content: systemContent }, ...apiMessages]
      : apiMessages,
    max_tokens: setting.max_tokens,
    stream: true,
    tools: CHAT_TOOLS,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new LlmStreamError(`LLM API error: HTTP ${res.status} — ${text.slice(0, 300)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let contentText = '';
  const toolCalls: Map<number, ToolCallAccumulator> = new Map();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Thinking/reasoning
          const thinking = delta.reasoning_content ?? delta.reasoning ?? null;
          if (thinking) send('thinking', { chunk: thinking });

          // Content
          if (delta.content) {
            contentText += delta.content;
            send('content', { chunk: delta.content });
          }

          // Tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: {},
                  rawArgs: '',
                });
              }
              const acc = toolCalls.get(idx)!;
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.name = tc.function.name;
              if (tc.function?.arguments) acc.rawArgs += tc.function.arguments;
            }
          }
        } catch { /* skip */ }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  // Parse accumulated tool call arguments
  const finalToolCalls: ToolCallAccumulator[] = [];
  for (const tc of toolCalls.values()) {
    try {
      tc.arguments = tc.rawArgs ? JSON.parse(tc.rawArgs) : {};
    } catch {
      tc.arguments = {};
    }
    finalToolCalls.push(tc);
  }

  return {
    hasToolCalls: finalToolCalls.length > 0,
    toolCalls: finalToolCalls,
    contentText,
  };
}

// ── Anthropic streaming with tool support ─────────────────────────────────

async function streamAnthropicWithTools(
  setting: LlmSetting,
  messages: ChatMessage[],
  send: (event: string, data: unknown) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const base = setting.base_url.replace(/\/+$/, '');
  const url = base.includes('/v1/messages') ? base : `${base}/v1/messages`;

  const systemContent = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const conversationMessages = messages.filter((m) => m.role !== 'system').map((m) => {
    if (m.role === 'tool') {
      return {
        role: 'user' as const,
        content: [{
          type: 'tool_result' as const,
          tool_use_id: m.tool_call_id,
          content: m.content,
        }],
      };
    }
    // If assistant message contains serialized content blocks (from tool use round)
    if (m.role === 'assistant') {
      try {
        const parsed = JSON.parse(m.content);
        if (Array.isArray(parsed)) {
          return { role: 'assistant' as const, content: parsed };
        }
      } catch { /* use as text */ }
    }
    return { role: m.role, content: m.content };
  });

  const requestBody: Record<string, unknown> = {
    model: setting.model_name,
    messages: conversationMessages,
    max_tokens: setting.max_tokens,
    stream: true,
    tools: toAnthropicTools(),
  };

  if (systemContent) requestBody.system = systemContent;

  if (setting.enable_thinking) {
    const budget = Math.max(1024, Math.floor(setting.max_tokens * 0.8));
    requestBody.thinking = { type: 'enabled', budget_tokens: budget };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': setting.api_key || '',
    'anthropic-version': '2023-06-01',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new LlmStreamError(`LLM API error: HTTP ${res.status} — ${text.slice(0, 300)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let contentText = '';
  const contentBlocks: unknown[] = [];
  const toolCalls: ToolCallAccumulator[] = [];
  let currentToolUse: { id: string; name: string; rawInput: string } | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_start') {
            const block = parsed.content_block;
            if (block?.type === 'tool_use') {
              currentToolUse = { id: block.id, name: block.name, rawInput: '' };
              contentBlocks.push({ type: 'tool_use', id: block.id, name: block.name, input: {} });
            } else if (block?.type === 'text') {
              contentBlocks.push({ type: 'text', text: '' });
            } else if (block?.type === 'thinking') {
              contentBlocks.push({ type: 'thinking', thinking: '' });
            }
          } else if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'thinking_delta' && parsed.delta.thinking) {
              send('thinking', { chunk: parsed.delta.thinking });
            } else if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
              contentText += parsed.delta.text;
              send('content', { chunk: parsed.delta.text });
              // Update text block
              const textBlock = [...contentBlocks].reverse().find((b: any) => b.type === 'text') as any;
              if (textBlock) textBlock.text += parsed.delta.text;
            } else if (parsed.delta?.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.rawInput += parsed.delta.partial_json || '';
            }
          } else if (parsed.type === 'content_block_stop' && currentToolUse) {
            let parsedInput: Record<string, unknown> = {};
            try { parsedInput = JSON.parse(currentToolUse.rawInput || '{}'); } catch { /* empty */ }
            toolCalls.push({
              id: currentToolUse.id,
              name: currentToolUse.name,
              arguments: parsedInput,
              rawArgs: currentToolUse.rawInput,
            });
            // Update tool_use block with parsed input
            const toolBlock = [...contentBlocks].reverse().find((b: any) => b.type === 'tool_use' && b.id === currentToolUse!.id) as any;
            if (toolBlock) toolBlock.input = parsedInput;
            currentToolUse = null;
          } else if (parsed.type === 'message_stop') {
            break;
          } else if (parsed.type === 'error') {
            throw new LlmStreamError(parsed.error?.message || 'Anthropic API error');
          }
        } catch (err) {
          if (err instanceof LlmStreamError) throw err;
        }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  return {
    hasToolCalls: toolCalls.length > 0,
    toolCalls,
    contentText,
    contentBlocks,
  };
}

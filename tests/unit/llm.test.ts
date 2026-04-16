import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LlmSetting } from '../../types';
import {
  LlmStreamError,
  isAnthropicApi,
  verifyLlmConnection,
  streamChatCompletion,
} from '../../lib/llm';
import type { LlmMessage, LlmStreamCallbacks } from '../../lib/llm';

function makeSetting(overrides: Partial<LlmSetting> = {}): LlmSetting {
  return {
    id: 1,
    owner_user_id: null,
    base_url: 'http://localhost:11434',
    api_key: '',
    model_name: 'test-model',
    max_tokens: 4096,
    context_window: 128000,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

describe('LlmStreamError', () => {
  it('is an instance of Error', () => {
    const err = new LlmStreamError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name LlmStreamError', () => {
    const err = new LlmStreamError('test');
    expect(err.name).toBe('LlmStreamError');
  });

  it('preserves the message', () => {
    const err = new LlmStreamError('something went wrong');
    expect(err.message).toBe('something went wrong');
  });
});

describe('verifyLlmConnection', () => {
  it('returns success on 200 response', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await verifyLlmConnection(makeSetting());

    expect(result).toEqual({ success: true });
  });

  it('returns error on non-200 response with status and body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await verifyLlmConnection(makeSetting());

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500');
    expect(result.error).toContain('Internal Server Error');
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await verifyLlmConnection(makeSetting());

    expect(result.success).toBe(false);
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('strips trailing slashes from base_url', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await verifyLlmConnection(makeSetting({ base_url: 'http://localhost:11434///' }));

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('sends correct request body', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await verifyLlmConnection(makeSetting({ model_name: 'my-model', max_tokens: 2048 }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('my-model');
    expect(body.max_tokens).toBe(10);
    expect(body.stream).toBe(false);
  });
});

describe('streamChatCompletion', () => {
  const messages: LlmMessage[] = [{ role: 'user', content: 'Hi' }];

  it('calls onContent with content chunks', async () => {
    const onContent = vi.fn();
    const onDone = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onContent, onDone });

    expect(onContent).toHaveBeenCalledWith('Hello');
    expect(onContent).toHaveBeenCalledWith(' world');
    expect(onContent).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('calls onThinking with reasoning_content chunks', async () => {
    const onThinking = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"reasoning_content":"Let me think..."}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onThinking });

    expect(onThinking).toHaveBeenCalledWith('Let me think...');
    expect(onThinking).toHaveBeenCalledTimes(1);
  });

  it('calls onThinking with OpenRouter reasoning field', async () => {
    const onThinking = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"reasoning":"Step 1: analyze..."}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onThinking });

    expect(onThinking).toHaveBeenCalledWith('Step 1: analyze...');
    expect(onThinking).toHaveBeenCalledTimes(1);
  });

  it('calls onThinking with OpenRouter reasoning_details array', async () => {
    const onThinking = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"reasoning_details":[{"type":"reasoning.text","text":"Thinking step..."}]}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onThinking });

    expect(onThinking).toHaveBeenCalledWith('Thinking step...');
    expect(onThinking).toHaveBeenCalledTimes(1);
  });

  it('prefers reasoning_content over reasoning and reasoning_details', async () => {
    const onThinking = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"reasoning_content":"primary","reasoning":"fallback"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onThinking });

    expect(onThinking).toHaveBeenCalledWith('primary');
    expect(onThinking).toHaveBeenCalledTimes(1);
  });

  it('calls onDone when [DONE] received', async () => {
    const onDone = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onDone });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('throws LlmStreamError on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(
      streamChatCompletion(makeSetting(), messages, {}),
    ).rejects.toThrow(LlmStreamError);
  });

  it('calls onError callback before throwing on HTTP error', async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    await expect(
      streamChatCompletion(makeSetting(), messages, { onError }),
    ).rejects.toThrow(LlmStreamError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toContain('HTTP 503');
  });

  it('throws LlmStreamError when response body is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: null,
    });

    await expect(
      streamChatCompletion(makeSetting(), messages, {}),
    ).rejects.toThrow(LlmStreamError);

    await expect(
      streamChatCompletion(makeSetting(), messages, {}),
    ).rejects.toThrow('No response body');
  });

  it('throws LlmStreamError on stream read error', async () => {
    const errorStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('stream broke'));
      },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      body: errorStream,
    });

    await expect(
      streamChatCompletion(makeSetting(), messages, {}),
    ).rejects.toThrow(LlmStreamError);
  });

  it('does not throw when signal is aborted', async () => {
    const controller = new AbortController();
    const errorStream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        controller.abort();
        ctrl.error(new DOMException('aborted', 'AbortError'));
      },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      body: errorStream,
    });

    await expect(
      streamChatCompletion(makeSetting(), messages, {}, controller.signal),
    ).resolves.toBeUndefined();
  });

  it('skips malformed JSON lines gracefully', async () => {
    const onContent = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {invalid json}\n\n',
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onContent });

    expect(onContent).toHaveBeenCalledWith('ok');
    expect(onContent).toHaveBeenCalledTimes(1);
  });

  it('strips trailing slashes from base_url', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream(['data: [DONE]\n\n']),
    });

    await streamChatCompletion(
      makeSetting({ base_url: 'http://localhost:11434///' }),
      messages,
      {},
    );

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('processes remaining buffer after stream ends', async () => {
    const onContent = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"content":"buffered"}}]}',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onContent });

    expect(onContent).toHaveBeenCalledWith('buffered');
  });

  it('handles multi-line SSE chunks correctly', async () => {
    const onContent = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"choices":[{"delta":{"content":"A"}}]}\ndata: {"choices":[{"delta":{"content":"B"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await streamChatCompletion(makeSetting(), messages, { onContent });

    expect(onContent).toHaveBeenCalledWith('A');
    expect(onContent).toHaveBeenCalledWith('B');
    expect(onContent).toHaveBeenCalledTimes(2);
  });

  it('uses default timeout when no signal provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream(['data: [DONE]\n\n']),
    });

    await streamChatCompletion(makeSetting(), messages, {});

    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends correct request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream(['data: [DONE]\n\n']),
    });

    const msgs: LlmMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
    ];

    await streamChatCompletion(
      makeSetting({ model_name: 'gpt-4', max_tokens: 1024 }),
      msgs,
      {},
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4');
    expect(body.messages).toEqual(msgs);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
  });
});

describe('isAnthropicApi', () => {
  it('detects api.anthropic.com', () => {
    expect(isAnthropicApi('https://api.anthropic.com')).toBe(true);
    expect(isAnthropicApi('https://api.anthropic.com/v1/messages')).toBe(true);
  });

  it('detects custom proxy with /v1/messages path', () => {
    expect(isAnthropicApi('http://localhost:8080/v1/messages')).toBe(true);
  });

  it('returns false for OpenAI-compatible endpoints', () => {
    expect(isAnthropicApi('http://localhost:11434')).toBe(false);
    expect(isAnthropicApi('https://api.openai.com')).toBe(false);
    expect(isAnthropicApi('https://openrouter.ai/api/v1')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isAnthropicApi('')).toBe(false);
    expect(isAnthropicApi('not-a-url')).toBe(false);
  });
});

describe('streamChatCompletion — Anthropic native', () => {
  const messages: LlmMessage[] = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hi' },
  ];

  function makeAnthropicSetting(overrides: Partial<LlmSetting> = {}): LlmSetting {
    return makeSetting({
      base_url: 'https://api.anthropic.com',
      api_key: 'sk-ant-test-key',
      model_name: 'claude-opus-4-20250514',
      ...overrides,
    });
  }

  it('sends request to /v1/messages with Anthropic headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"message_start","message":{"id":"msg_1"}}\n\n',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ]),
    });

    await streamChatCompletion(makeAnthropicSetting(), messages, {});

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe('https://api.anthropic.com/v1/messages');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('sk-ant-test-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('separates system message from conversation messages in request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"message_stop"}\n\n',
      ]),
    });

    await streamChatCompletion(makeAnthropicSetting(), messages, {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBe('You are helpful.');
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  it('calls onContent for text_delta events', async () => {
    const onContent = vi.fn();
    const onDone = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ]),
    });

    await streamChatCompletion(makeAnthropicSetting(), messages, { onContent, onDone });

    expect(onContent).toHaveBeenCalledWith('Hello');
    expect(onContent).toHaveBeenCalledWith(' world');
    expect(onContent).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('calls onThinking for thinking_delta events', async () => {
    const onThinking = vi.fn();
    const onContent = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me analyze..."}}\n\n',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":" step by step."}}\n\n',
        'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Result"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ]),
    });

    await streamChatCompletion(makeAnthropicSetting(), messages, { onThinking, onContent });

    expect(onThinking).toHaveBeenCalledWith('Let me analyze...');
    expect(onThinking).toHaveBeenCalledWith(' step by step.');
    expect(onThinking).toHaveBeenCalledTimes(2);
    expect(onContent).toHaveBeenCalledWith('Result');
    expect(onContent).toHaveBeenCalledTimes(1);
  });

  it('throws LlmStreamError on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key',
    });

    await expect(
      streamChatCompletion(makeAnthropicSetting(), messages, {}),
    ).rejects.toThrow(LlmStreamError);
  });

  it('throws LlmStreamError on Anthropic error event', async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"error","error":{"message":"Overloaded"}}\n\n',
      ]),
    });

    await expect(
      streamChatCompletion(makeAnthropicSetting(), messages, { onError }),
    ).rejects.toThrow(LlmStreamError);

    expect(onError).toHaveBeenCalledWith('Overloaded');
  });

  it('enables extended thinking for thinking model names', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"message_stop"}\n\n',
      ]),
    });

    await streamChatCompletion(
      makeAnthropicSetting({ model_name: 'claude-opus-4-20250514' }),
      [{ role: 'user', content: 'Hi' }],
      {},
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.thinking).toEqual({
      type: 'enabled',
      budget_tokens: expect.any(Number),
    });
    expect(body.thinking.budget_tokens).toBeGreaterThanOrEqual(1024);
  });

  it('does NOT enable thinking for non-thinking model names', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"type":"message_stop"}\n\n',
      ]),
    });

    await streamChatCompletion(
      makeAnthropicSetting({ model_name: 'claude-sonnet-4-20250514' }),
      [{ role: 'user', content: 'Hi' }],
      {},
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.thinking).toBeUndefined();
  });
});

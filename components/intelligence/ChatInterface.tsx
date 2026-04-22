'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Send, Square, ChevronRight, ChevronDown, Loader2, CheckCircle2, Brain } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallEvent[];
}

interface ToolCallEvent {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export default function ChatInterface() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamThinking, setStreamThinking] = useState('');
  const [streamContent, setStreamContent] = useState('');
  const [streamToolCalls, setStreamToolCalls] = useState<ToolCallEvent[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, streamThinking, streamToolCalls, scrollToBottom]);

  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [streamThinking]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);
    setStreamThinking('');
    setStreamContent('');
    setStreamToolCalls([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/intelligence/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages((prev) => [...prev, { role: 'assistant', content: err.error || `Error: HTTP ${res.status}` }]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accThinking = '';
      let accContent = '';
      const accToolCalls: ToolCallEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              switch (currentEvent) {
                case 'thinking':
                  accThinking += parsed.chunk || '';
                  setStreamThinking(accThinking);
                  break;
                case 'content':
                  accContent += parsed.chunk || '';
                  setStreamContent(accContent);
                  break;
                case 'tool_call': {
                  const tc: ToolCallEvent = {
                    id: parsed.id,
                    name: parsed.name,
                    arguments: parsed.arguments,
                  };
                  accToolCalls.push(tc);
                  setStreamToolCalls([...accToolCalls]);
                  break;
                }
                case 'tool_result': {
                  const existing = accToolCalls.find((tc) => tc.id === parsed.id);
                  if (existing) {
                    existing.result = parsed.result;
                    setStreamToolCalls([...accToolCalls]);
                  }
                  accContent = '';
                  setStreamContent('');
                  break;
                }
                case 'done': {
                  const assistantMsg: ChatMessage = {
                    role: 'assistant',
                    content: accContent,
                    thinking: accThinking || undefined,
                    toolCalls: accToolCalls.length > 0 ? [...accToolCalls] : undefined,
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  setStreamThinking('');
                  setStreamContent('');
                  setStreamToolCalls([]);
                  break;
                }
                case 'error':
                  setMessages((prev) => [...prev, {
                    role: 'assistant',
                    content: parsed.message || 'An error occurred',
                  }]);
                  break;
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Connection failed',
        }]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="mx-auto max-w-3xl flex flex-col chat-container">
      {/* Messages */}
      <div className="flex-1 space-y-6 pb-6">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center pt-24">
            <p className="text-sm text-ink-muted text-center max-w-md leading-relaxed">
              {t('chat.emptyState')}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageTurn key={i} message={msg} />
        ))}

        {/* Streaming turn */}
        {isStreaming && (
          <div className="space-y-3">
            {streamThinking && (
              <ThinkingBlock
                content={streamThinking}
                isStreaming
                expanded={showThinking}
                onToggle={() => setShowThinking(!showThinking)}
                ref={thinkingRef}
              />
            )}

            {streamToolCalls.map((tc) => (
              <ToolCallInline key={tc.id} toolCall={tc} />
            ))}

            {streamContent ? (
              <div className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {streamContent}
                <span className="inline-block w-1.5 h-4 bg-brand/60 animate-pulse ml-0.5 align-text-bottom" />
              </div>
            ) : !streamThinking && streamToolCalls.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('chat.thinking')}
              </div>
            ) : null}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-page pt-4 pb-2">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-xl border border-border bg-panel p-2 shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            className="flex-1 min-h-[2.5rem] max-h-40 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-muted/55 focus:outline-none"
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => abortRef.current?.abort()}
              className="h-9 w-9 shrink-0 rounded-lg p-0"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim()}
              className="h-9 w-9 shrink-0 rounded-lg p-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Message turn ──────────────────────────────────────────────────────────

function MessageTurn({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="text-sm leading-relaxed text-ink font-medium whitespace-pre-wrap">
        {message.content}
      </div>
    );
  }

  return (
    <div className="space-y-2 border-l-2 border-border pl-4">
      {message.thinking && (
        <ThinkingBlock content={message.thinking} />
      )}

      {message.toolCalls?.map((tc) => (
        <ToolCallInline key={tc.id} toolCall={tc} />
      ))}

      {message.content && (
        <div className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
          {message.content}
        </div>
      )}
    </div>
  );
}

// ── Thinking block ────────────────────────────────────────────────────────

import { forwardRef } from 'react';

const ThinkingBlock = forwardRef<HTMLPreElement, {
  content: string;
  isStreaming?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}>(function ThinkingBlock({ content, isStreaming, expanded: controlledExpanded, onToggle }, ref) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? localExpanded;
  const toggle = onToggle ?? (() => setLocalExpanded(!localExpanded));

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-secondary transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span>Thinking</span>
        {isExpanded
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
        }
      </button>
      {isExpanded && (
        <pre
          ref={ref}
          className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-xs leading-relaxed text-ink-muted font-mono rounded-md bg-surface-secondary/40"
        >
          {content}
          {isStreaming && <span className="inline-block w-1.5 h-3 bg-ink-muted/50 animate-pulse ml-0.5" />}
        </pre>
      )}
    </div>
  );
});

// ── Tool call inline ──────────────────────────────────────────────────────

function ToolCallInline({ toolCall }: { toolCall: ToolCallEvent }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const hasResult = toolCall.result !== undefined;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink-secondary transition-colors"
      >
        {hasResult
          ? <CheckCircle2 className="h-3 w-3 text-green-500" />
          : <Loader2 className="h-3 w-3 animate-spin" />
        }
        <span className="font-mono">{toolCall.name}</span>
        {expanded
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
        }
      </button>
      {expanded && (
        <div className="mt-1 ml-4.5 space-y-1.5">
          <div>
            <span className="text-ink-muted">{t('chat.toolArguments')}:</span>
            <pre className="mt-0.5 font-mono text-ink-secondary bg-surface-secondary/40 rounded px-2 py-1 overflow-auto max-h-24">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {hasResult && (
            <div>
              <span className="text-ink-muted">{t('chat.toolResult')}:</span>
              <pre className="mt-0.5 font-mono text-ink-secondary bg-surface-secondary/40 rounded px-2 py-1 overflow-auto max-h-32">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

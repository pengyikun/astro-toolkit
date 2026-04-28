import { NextRequest } from 'next/server';
import { requireAccessScope, ownerUserIdFromScope } from '@/lib/access';
import { briefRequestSchema } from '@/schemas/brief.schema';
import * as LlmSettingModel from '@/models/llm-setting.model';
import * as BriefModel from '@/models/brief.model';
import { gatherBriefContext, buildBriefPromptBatches, buildBriefSystemPrompt, validateBriefPrerequisites, type GatherProgressCallback } from '@/lib/intelligence';
import { streamChatCompletion, LlmStreamError } from '@/lib/llm';
import { parseBriefResultRaw, mergeBriefResults, formatBriefResult } from '@/lib/brief-parser';
import db from '@/lib/db';
import type { BriefConnector } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let scope;
  try {
    scope = await requireAccessScope();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response('Invalid request body', { status: 400 });
  }

  const parsed = briefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 });
  }

  const { connectors, date_from, date_to, email_folders } = parsed.data;

  // Validate prerequisites
  const validation = await validateBriefPrerequisites(scope, connectors as BriefConnector[]);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  // Get LLM settings
  const llmSetting = await LlmSettingModel.findByOwner(db, scope);
  if (!llmSetting) {
    return Response.json({ error: 'LLM provider not configured' }, { status: 400 });
  }

  // Create brief record
  const brief = await BriefModel.create(db, {
    connectors: JSON.stringify(connectors),
    date_from,
    date_to,
    owner_user_id: ownerUserIdFromScope(scope),
  });

  // Combined signal: client disconnect + hard timeout (scale with batches)
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 300_000);
  const signal = AbortSignal.any([
    request.signal,
    timeoutController.signal,
  ]);

  // Start SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;
      function send(event: string, data: unknown) {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          streamClosed = true;
        }
      }

      try {
        // Update status to running
        await BriefModel.updateStatus(db, brief.id, { status: 'running' });
        send('status', { briefId: brief.id, status: 'running' });

        // Gather data from connectors — send progress updates so the
        // client's stall-detection timer stays alive during long IMAP fetches.
        send('progress', { message: 'Gathering data from connectors…' });
        const onGatherProgress: GatherProgressCallback = (message) => {
          send('progress', { message });
        };
        const context = await gatherBriefContext(scope, connectors as BriefConnector[], date_from, date_to, onGatherProgress, email_folders);

        // Build prompt batches based on model context window
        const contextWindow = llmSetting.context_window ?? 128000;
        const prompts = buildBriefPromptBatches(context, contextWindow, date_from, date_to);
        const totalBatches = prompts.length;

        send('progress', {
          message: totalBatches === 1
            ? 'Analyzing with AI…'
            : `Analyzing with AI… (${totalBatches} batches)`,
        });

        let fullThinking = '';
        let fullContent = '';
        const batchResults: Array<{ summary: Array<{ date: string; source: string; description: string }>; pendingItems: Array<{ urgency: 'high' | 'medium' | 'low'; source: string; item: string }> }> = [];

        for (let i = 0; i < prompts.length; i++) {
          if (signal.aborted) break;

          if (totalBatches > 1) {
            send('progress', { message: `Processing batch ${i + 1} of ${totalBatches}…` });
          }

          const MAX_ATTEMPTS = 3;
          let batchContent = '';
          let lastError: unknown;

          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (signal.aborted) break;

            // Reset partial content from any previous failed attempt
            batchContent = '';
            lastError = undefined;
            const thinkingBefore = fullThinking.length;

            try {
              await streamChatCompletion(
                llmSetting,
                [
                  { role: 'system', content: buildBriefSystemPrompt() },
                  { role: 'user', content: prompts[i] },
                ],
                {
                  onThinking(chunk) {
                    fullThinking += chunk;
                    send('thinking', { chunk });
                  },
                  onContent(chunk) {
                    batchContent += chunk;
                    fullContent += chunk;
                    send('content', { chunk });
                  },
                },
                signal,
              );
              break; // success
            } catch (err) {
              lastError = err;

              // Don't retry on abort signals or 4xx errors
              if (signal.aborted) break;
              if (
                err instanceof LlmStreamError &&
                /HTTP [4]\d{2}/.test(err.message)
              ) {
                break;
              }

              // Strip partial content/thinking appended during failed attempt
              if (batchContent.length > 0) {
                fullContent = fullContent.slice(0, -batchContent.length);
              }
              fullThinking = fullThinking.slice(0, thinkingBefore);

              if (attempt < MAX_ATTEMPTS) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
                send('progress', {
                  message: `Retrying batch ${i + 1} (attempt ${attempt + 1}/${MAX_ATTEMPTS})…`,
                });
                await new Promise<void>((resolve) => {
                  const timer = setTimeout(resolve, delay);
                  // Cancel delay immediately if abort fires during the wait
                  signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
                });
                if (signal.aborted) break;
              }
            }
          }

          if (lastError) {
            throw lastError;
          }

          // Parse this batch's result
          const batchResult = parseBriefResultRaw(batchContent);
          if (batchResult) {
            batchResults.push(batchResult);
          } else if (batchContent.trim()) {
            throw new Error(
              `Failed to parse AI response for batch ${i + 1}/${prompts.length}. The model returned content that could not be interpreted as a valid brief.`,
            );
          }
        }

        if (!fullContent.trim()) {
          throw new Error('LLM returned empty content');
        }

        // Merge all batch results
        let summary: string;
        let pendingItems: string;

        if (batchResults.length > 0) {
          const merged = mergeBriefResults(batchResults);
          const formatted = formatBriefResult(merged);
          summary = formatted.summary;
          pendingItems = formatted.pendingItems;
        } else {
          // Fallback: treat raw content as summary
          summary = fullContent.trim();
          pendingItems = '';
        }

        // Save to DB
        await BriefModel.updateStatus(db, brief.id, {
          status: 'completed',
          thinking: fullThinking,
          summary,
          pending_items: pendingItems,
        });

        send('complete', { briefId: brief.id, summary, pendingItems });
      } catch (err) {
        const clientDisconnected = request.signal.aborted;
        const timedOut = timeoutController.signal.aborted && !clientDisconnected;
        const errorMsg = timedOut
          ? 'Brief generation timed out after 5 minutes'
          : clientDisconnected
            ? 'Brief generation was cancelled'
          : (err instanceof Error ? err.message : 'Brief generation failed');
        await BriefModel.updateStatus(db, brief.id, {
          status: 'failed',
          error: errorMsg,
        }).catch(() => {});
        if (!clientDisconnected) {
          send('error', { message: errorMsg });
        }
      } finally {
        clearTimeout(timeoutId);
        controller.close();
      }
    },
    cancel() {
      // Client disconnected — nothing extra needed since signal propagates
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

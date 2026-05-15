import { briefResultSchema } from '@/schemas/brief.schema';
import type { z } from 'zod';

type BriefResult = z.infer<typeof briefResultSchema>;

export interface TodoDraft {
  title: string;
  urgency: 'high' | 'medium' | 'low';
  category?: string;
  waitingOn?: 'me' | 'them' | 'external';
  dueDate?: string;
  eventDate?: string;
  subject?: string;
  counterparty?: string;
}

/**
 * Extract structured TodoDrafts from a parsed brief result. Each pending item
 * carries its rich context (category, waitingOn, due date, counterparty…) so
 * downstream code can persist or display it without re-parsing strings.
 */
export function extractTodosFromBriefResult(result: BriefResult): TodoDraft[] {
  return result.pendingItems
    .map((p): TodoDraft | null => {
      const title = p.item.trim();
      if (!title) return null;
      return {
        title,
        urgency: p.urgency,
        category: p.category,
        waitingOn: p.waitingOn,
        dueDate: p.dueDate,
        eventDate: p.eventDate,
        subject: p.subject,
        counterparty: p.counterparty,
      };
    })
    .filter((t): t is TodoDraft => t !== null);
}

/**
 * Parse raw LLM content into structured brief result data.
 * Returns null if the content doesn't contain valid JSON.
 */
export function parseBriefResultRaw(content: string): BriefResult | null {
  // Try direct parse first (cleanest model output)
  try {
    const parsed = briefResultSchema.safeParse(JSON.parse(content.trim()));
    if (parsed.success) return parsed.data;
  } catch { /* not direct JSON, try extraction */ }

  // Try extracting from markdown code fences
  const fenced = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced) {
    try {
      const parsed = briefResultSchema.safeParse(JSON.parse(fenced[1]));
      if (parsed.success) return parsed.data;
    } catch { /* try next strategy */ }
  }

  // Fallback: find first balanced JSON object
  const start = content.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    if (depth === 0) {
      try {
        const parsed = briefResultSchema.safeParse(JSON.parse(content.slice(start, i + 1)));
        if (parsed.success) return parsed.data;
      } catch { /* not valid JSON at this boundary */ }
      break;
    }
  }

  return null;
}

/**
 * Merge multiple batch results into a single result, deduplicating and
 * sorting chronologically.
 */
export function mergeBriefResults(results: BriefResult[]): BriefResult {
  const allSummary = results.flatMap((r) => r.summary);
  const allPending = results.flatMap((r) => r.pendingItems);

  // Deduplicate summary by date+source+description
  const summarySet = new Map<string, BriefResult['summary'][number]>();
  for (const s of allSummary) {
    const key = `${s.date}|${s.source}|${s.description}`;
    if (!summarySet.has(key)) summarySet.set(key, s);
  }

  // Deduplicate pending items by source+item
  const pendingSet = new Map<string, BriefResult['pendingItems'][number]>();
  for (const p of allPending) {
    const key = `${p.source}|${p.item}`;
    if (!pendingSet.has(key)) pendingSet.set(key, p);
  }

  // Sort summary chronologically
  const summary = [...summarySet.values()].sort((a, b) => a.date.localeCompare(b.date));
  const pendingItems = [...pendingSet.values()];

  return { summary, pendingItems };
}

/**
 * Format a structured BriefResult into display strings.
 */
export function formatBriefResult(result: BriefResult): { summary: string; pendingItems: string } {
  const summary = result.summary
    .map((s) => `- **[${s.source}]** ${s.date}: ${s.description}`)
    .join('\n');

  const pendingItems = result.pendingItems
    .map((p) => {
      const tag = p.urgency === 'high' ? '🔴' : p.urgency === 'medium' ? '🟡' : '🟢';
      return `- ${tag} **[${p.source}]** ${p.item}`;
    })
    .join('\n');

  return { summary, pendingItems };
}

/**
 * Parse formatted pending-items markdown back into structured todo data.
 * Each line follows: `- [HIGH] **[source]** Item text`
 */
export function parsePendingItemsToTodos(
  raw: string,
): Array<{ title: string; urgency: 'high' | 'medium' | 'low' }> {
  if (!raw.trim()) return [];

  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      let urgency: 'high' | 'medium' | 'low' = 'medium';
      if (line.includes('[HIGH]') || line.includes('🔴')) urgency = 'high';
      else if (line.includes('[LOW]') || line.includes('🟢')) urgency = 'low';

      const title = line
        .replace(/^[-•*]\s*/, '')
        .replace(/\[HIGH\]|\[MEDIUM\]|\[LOW\]|🔴|🟡|🟢/g, '')
        .replace(/\*\*\[[^\]]*\]\*\*/g, '')
        .trim();

      return { title, urgency };
    })
    .filter((item) => item.title.length > 0);
}


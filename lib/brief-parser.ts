import { briefResultSchema, type WaitingOn } from '@/schemas/brief.schema';
import type { z } from 'zod';

type BriefResult = z.infer<typeof briefResultSchema>;

export interface TodoDraft {
  title: string;
  urgency: 'high' | 'medium' | 'low';
  category?: string;
  waitingOn?: WaitingOn;
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
 * Normalised, case-insensitive part of a dedup key. Treats empty / missing
 * values as "*" so two entries that omit the same optional field still
 * group together.
 */
function k(part: string | undefined | null): string {
  if (!part) return '*';
  return part.trim().toLowerCase();
}

/**
 * Merge multiple batch results into a single result, deduplicating and
 * sorting chronologically.
 *
 * Dedup keys exploit the structured fields so two entries that describe
 * the same real-world event collapse even if the LLM phrased them
 * differently in different batches.
 *
 * - Summary key: `subject | counterparty | category | date | description`
 * - Pending key: `subject | counterparty | category | source | item`
 *
 * Description / item is included only as a tiebreaker so that genuinely
 * distinct events on the same thread (same subject + counterparty) still
 * survive.
 */
export function mergeBriefResults(results: BriefResult[]): BriefResult {
  const allSummary = results.flatMap((r) => r.summary);
  const allPending = results.flatMap((r) => r.pendingItems);

  // Deduplicate summary by structured identity
  const summarySet = new Map<string, BriefResult['summary'][number]>();
  for (const s of allSummary) {
    const key = [k(s.subject), k(s.counterparty), k(s.category), k(s.date), k(s.description)].join('|');
    if (!summarySet.has(key)) summarySet.set(key, s);
  }

  // Deduplicate pending items by structured identity
  const pendingSet = new Map<string, BriefResult['pendingItems'][number]>();
  for (const p of allPending) {
    const key = [k(p.subject), k(p.counterparty), k(p.category), k(p.source), k(p.item)].join('|');
    if (!pendingSet.has(key)) pendingSet.set(key, p);
  }

  // Sort summary chronologically
  const summary = [...summarySet.values()].sort((a, b) => a.date.localeCompare(b.date));
  const pendingItems = [...pendingSet.values()];

  return { summary, pendingItems };
}

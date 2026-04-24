import { briefResultSchema } from '@/schemas/brief.schema';
import type { z } from 'zod';

type BriefResult = z.infer<typeof briefResultSchema>;

/**
 * Parse raw LLM content into structured brief result data.
 * Returns null if the content doesn't contain valid JSON.
 */
export function parseBriefResultRaw(content: string): BriefResult | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = briefResultSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
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
      const tag = p.urgency === 'high' ? '[HIGH]' : p.urgency === 'medium' ? '[MEDIUM]' : '[LOW]';
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
      if (line.includes('[HIGH]')) urgency = 'high';
      else if (line.includes('[LOW]')) urgency = 'low';

      const title = line
        .replace(/^[-•*]\s*/, '')
        .replace(/\[HIGH\]|\[MEDIUM\]|\[LOW\]/g, '')
        .replace(/\*\*\[[^\]]*\]\*\*/g, '')
        .trim();

      return { title, urgency };
    })
    .filter((item) => item.title.length > 0);
}


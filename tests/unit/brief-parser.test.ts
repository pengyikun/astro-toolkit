import { describe, it, expect } from 'vitest';
import {
  parseBriefResultRaw,
  mergeBriefResults,
  formatBriefResult,
} from '../../lib/brief-parser';

const validResult = {
  summary: [
    { date: '2025-01-01', source: 'email', description: 'first' },
    { date: '2025-01-03', source: 'whatsapp', description: 'second' },
  ],
  pendingItems: [
    { source: 'email', item: 'Reply', urgency: 'high' as const },
    { source: 'whatsapp', item: 'Send invoice', urgency: 'low' as const },
  ],
};

describe('parseBriefResultRaw', () => {
  it('parses direct JSON content', () => {
    const out = parseBriefResultRaw(JSON.stringify(validResult));
    expect(out).not.toBeNull();
    expect(out?.summary.length).toBe(2);
    expect(out?.pendingItems[0].item).toBe('Reply');
  });

  it('parses JSON wrapped in markdown fences', () => {
    const fenced = '```json\n' + JSON.stringify(validResult) + '\n```';
    const out = parseBriefResultRaw(fenced);
    expect(out).not.toBeNull();
    expect(out?.pendingItems.length).toBe(2);
  });

  it('parses JSON found inside surrounding prose', () => {
    const wrapped = `Here is the brief:\n${JSON.stringify(validResult)}\nhope it helps.`;
    const out = parseBriefResultRaw(wrapped);
    expect(out).not.toBeNull();
  });

  it('returns null when there is no parseable JSON', () => {
    expect(parseBriefResultRaw('no json here')).toBeNull();
    expect(parseBriefResultRaw('')).toBeNull();
  });

  it('returns null when the JSON does not match the schema', () => {
    expect(parseBriefResultRaw('{"foo": "bar"}')).toBeNull();
  });
});

describe('mergeBriefResults', () => {
  it('returns empty result for empty input array', () => {
    const out = mergeBriefResults([]);
    expect(out.summary).toEqual([]);
    expect(out.pendingItems).toEqual([]);
  });

  it('deduplicates summary entries by date+source+description', () => {
    const out = mergeBriefResults([validResult, validResult]);
    expect(out.summary.length).toBe(2);
  });

  it('deduplicates pending items by source+item', () => {
    const out = mergeBriefResults([validResult, validResult]);
    expect(out.pendingItems.length).toBe(2);
  });

  it('sorts merged summary chronologically', () => {
    const a = {
      summary: [{ date: '2025-02-01', source: 'email', description: 'b' }],
      pendingItems: [],
    };
    const b = {
      summary: [{ date: '2025-01-01', source: 'email', description: 'a' }],
      pendingItems: [],
    };
    const merged = mergeBriefResults([a, b]);
    expect(merged.summary.map((s) => s.date)).toEqual(['2025-01-01', '2025-02-01']);
  });

  it('combines distinct pending items from multiple results', () => {
    const a = { summary: [], pendingItems: [{ source: 'email', item: 'X', urgency: 'high' as const }] };
    const b = { summary: [], pendingItems: [{ source: 'whatsapp', item: 'Y', urgency: 'low' as const }] };
    const merged = mergeBriefResults([a, b]);
    expect(merged.pendingItems.length).toBe(2);
  });
});

describe('formatBriefResult', () => {
  it('formats summary lines with source and date markers', () => {
    const { summary } = formatBriefResult(validResult);
    expect(summary).toContain('**[email]** 2025-01-01: first');
    expect(summary).toContain('**[whatsapp]** 2025-01-03: second');
  });

  it('uses urgency emojis for pending items', () => {
    const { pendingItems } = formatBriefResult(validResult);
    expect(pendingItems).toContain('🔴 **[email]** Reply');
    expect(pendingItems).toContain('🟢 **[whatsapp]** Send invoice');
  });

  it('uses 🟡 for medium urgency', () => {
    const data = {
      summary: [],
      pendingItems: [{ source: 'email', item: 'M', urgency: 'medium' as const }],
    };
    const { pendingItems } = formatBriefResult(data);
    expect(pendingItems).toContain('🟡');
  });

  it('returns empty strings for empty input', () => {
    const out = formatBriefResult({ summary: [], pendingItems: [] });
    expect(out.summary).toBe('');
    expect(out.pendingItems).toBe('');
  });
});

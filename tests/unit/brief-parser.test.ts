import { describe, it, expect } from 'vitest';
import {
  parseBriefResultRaw,
  mergeBriefResults,
  extractTodosFromBriefResult,
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

  it('canonicalises source to "Email" or "WhatsApp"', () => {
    const out = parseBriefResultRaw(JSON.stringify({
      summary: [{ date: '2025-01-01', source: 'email', description: 'x' }],
      pendingItems: [{ urgency: 'high', source: 'whatsapp', item: 'y' }],
    }));
    expect(out).not.toBeNull();
    expect(out!.summary[0].source).toBe('Email');
    expect(out!.pendingItems[0].source).toBe('WhatsApp');
  });

  it('keeps unknown sources as-is (capitalised)', () => {
    const out = parseBriefResultRaw(JSON.stringify({
      summary: [{ date: '2025-01-01', source: 'slack', description: 'x' }],
      pendingItems: [],
    }));
    expect(out).not.toBeNull();
    expect(out!.summary[0].source).toBe('Slack');
  });
});

describe('mergeBriefResults', () => {
  it('returns empty result for empty input array', () => {
    const out = mergeBriefResults([]);
    expect(out.summary).toEqual([]);
    expect(out.pendingItems).toEqual([]);
  });

  it('deduplicates summary entries by structured key', () => {
    const parsed = parseBriefResultRaw(JSON.stringify(validResult))!;
    const out = mergeBriefResults([parsed, parsed]);
    expect(out.summary.length).toBe(2);
  });

  it('deduplicates pending items by structured key', () => {
    const parsed = parseBriefResultRaw(JSON.stringify(validResult))!;
    const out = mergeBriefResults([parsed, parsed]);
    expect(out.pendingItems.length).toBe(2);
  });

  it('treats same subject + counterparty + category as the same summary entry', () => {
    const a = parseBriefResultRaw(JSON.stringify({
      summary: [
        {
          date: '2025-01-15',
          source: 'email',
          description: 'Acme returned the signed renewal.',
          subject: 'Renewal',
          counterparty: 'Acme',
          category: 'contract',
        },
      ],
      pendingItems: [],
    }))!;
    // Same logical event, phrased differently in another batch — same dedup key
    const b = parseBriefResultRaw(JSON.stringify({
      summary: [
        {
          date: '2025-01-15',
          source: 'email',
          description: 'Acme returned the signed renewal.',
          subject: 'renewal',  // case differs
          counterparty: 'ACME',  // case differs
          category: 'contract',
        },
      ],
      pendingItems: [],
    }))!;
    const merged = mergeBriefResults([a, b]);
    expect(merged.summary.length).toBe(1);
  });

  it('keeps distinct events on the same thread (different descriptions)', () => {
    const a = parseBriefResultRaw(JSON.stringify({
      summary: [
        { date: '2025-01-15', source: 'email', description: 'First update', subject: 'Q3', counterparty: 'Acme' },
      ],
      pendingItems: [],
    }))!;
    const b = parseBriefResultRaw(JSON.stringify({
      summary: [
        { date: '2025-01-15', source: 'email', description: 'Second distinct update', subject: 'Q3', counterparty: 'Acme' },
      ],
      pendingItems: [],
    }))!;
    const merged = mergeBriefResults([a, b]);
    expect(merged.summary.length).toBe(2);
  });

  it('treats same pending action with same subject/counterparty as duplicate', () => {
    const a = parseBriefResultRaw(JSON.stringify({
      summary: [],
      pendingItems: [
        {
          urgency: 'high',
          source: 'email',
          item: 'Approve €12k wire.',
          subject: 'Berlin wire',
          counterparty: 'Lena',
          category: 'approval',
        },
      ],
    }))!;
    const b = parseBriefResultRaw(JSON.stringify({
      summary: [],
      pendingItems: [
        {
          urgency: 'high',
          source: 'email',
          item: 'Approve €12k wire.',
          subject: 'BERLIN WIRE',
          counterparty: 'lena',
          category: 'approval',
        },
      ],
    }))!;
    const merged = mergeBriefResults([a, b]);
    expect(merged.pendingItems.length).toBe(1);
  });

  it('sorts merged summary chronologically', () => {
    const a = parseBriefResultRaw(JSON.stringify({
      summary: [{ date: '2025-02-01', source: 'email', description: 'b' }],
      pendingItems: [],
    }))!;
    const b = parseBriefResultRaw(JSON.stringify({
      summary: [{ date: '2025-01-01', source: 'email', description: 'a' }],
      pendingItems: [],
    }))!;
    const merged = mergeBriefResults([a, b]);
    expect(merged.summary.map((s) => s.date)).toEqual(['2025-01-01', '2025-02-01']);
  });

  it('combines distinct pending items from multiple results', () => {
    const a = parseBriefResultRaw(JSON.stringify({
      summary: [],
      pendingItems: [{ source: 'email', item: 'X', urgency: 'high' }],
    }))!;
    const b = parseBriefResultRaw(JSON.stringify({
      summary: [],
      pendingItems: [{ source: 'whatsapp', item: 'Y', urgency: 'low' }],
    }))!;
    const merged = mergeBriefResults([a, b]);
    expect(merged.pendingItems.length).toBe(2);
  });
});

describe('extractTodosFromBriefResult', () => {
  it('produces one TodoDraft per pending item, carrying structured fields', () => {
    const parsed = parseBriefResultRaw(JSON.stringify({
      summary: [],
      pendingItems: [
        {
          urgency: 'high',
          source: 'email',
          item: 'Approve payment',
          subject: 'Wire',
          counterparty: 'Bank',
          category: 'approval',
          waitingOn: 'me',
          dueDate: '2025-09-30',
          eventDate: '2025-09-25',
          messageCount: 2,
        },
      ],
    }))!;
    const drafts = extractTodosFromBriefResult(parsed);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toEqual({
      title: 'Approve payment',
      urgency: 'high',
      subject: 'Wire',
      counterparty: 'Bank',
      category: 'approval',
      waitingOn: 'me',
      dueDate: '2025-09-30',
      eventDate: '2025-09-25',
    });
  });

  it('drops items with empty titles', () => {
    const parsed = parseBriefResultRaw(JSON.stringify({
      summary: [],
      pendingItems: [
        { urgency: 'high', source: 'email', item: '   ' },
        { urgency: 'low', source: 'email', item: 'Valid' },
      ],
    }))!;
    const drafts = extractTodosFromBriefResult(parsed);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('Valid');
  });
});

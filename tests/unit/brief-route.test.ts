import { describe, it, expect } from 'vitest';
import { parseBriefResult, parseBriefResultRaw, mergeBriefResults, formatBriefResult } from '../../lib/brief-parser';

describe('parseBriefResult', () => {
  const validPayload = {
    summary: [
      { date: '2025-01-15', source: 'email', description: 'Meeting scheduled with client' },
    ],
    pendingItems: [
      { urgency: 'high' as const, source: 'email', item: 'Reply to investor' },
    ],
  };

  it('parses valid JSON with summary and pending items', () => {
    const content = JSON.stringify(validPayload);
    const result = parseBriefResult(content);

    expect(result.summary).toBe('- **[email]** 2025-01-15: Meeting scheduled with client');
    expect(result.pendingItems).toBe('- 🔴 **[email]** Reply to investor');
  });

  it('formats summary items as markdown list with source and date', () => {
    const payload = {
      summary: [
        { date: '2025-01-15', source: 'email', description: 'First item' },
        { date: '2025-01-16', source: 'whatsapp', description: 'Second item' },
      ],
      pendingItems: [],
    };
    const result = parseBriefResult(JSON.stringify(payload));

    expect(result.summary).toBe(
      '- **[email]** 2025-01-15: First item\n- **[whatsapp]** 2025-01-16: Second item',
    );
  });

  it('formats pending items with urgency icons (🔴 high, 🟡 medium, 🟢 low)', () => {
    const payload = {
      summary: [],
      pendingItems: [
        { urgency: 'high' as const, source: 'email', item: 'Urgent task' },
        { urgency: 'medium' as const, source: 'whatsapp', item: 'Medium task' },
        { urgency: 'low' as const, source: 'email', item: 'Low task' },
      ],
    };
    const result = parseBriefResult(JSON.stringify(payload));

    expect(result.pendingItems).toBe(
      '- 🔴 **[email]** Urgent task\n- 🟡 **[whatsapp]** Medium task\n- 🟢 **[email]** Low task',
    );
  });

  it('falls back to raw content when no JSON found', () => {
    const content = 'This is just plain text with no JSON';
    const result = parseBriefResult(content);

    expect(result.summary).toBe('This is just plain text with no JSON');
    expect(result.pendingItems).toBe('');
  });

  it('falls back to raw content when JSON is invalid structure', () => {
    const content = JSON.stringify({ foo: 'bar', baz: 123 });
    const result = parseBriefResult(content);

    expect(result.summary).toBe(content.trim());
    expect(result.pendingItems).toBe('');
  });

  it('falls back to raw content when JSON parse fails (malformed JSON)', () => {
    const content = '{ "summary": [broken json }';
    const result = parseBriefResult(content);

    expect(result.summary).toBe(content.trim());
    expect(result.pendingItems).toBe('');
  });

  it('handles JSON embedded in markdown code fences', () => {
    const content = `Here is the briefing:\n\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``;
    const result = parseBriefResult(content);

    expect(result.summary).toBe('- **[email]** 2025-01-15: Meeting scheduled with client');
    expect(result.pendingItems).toBe('- 🔴 **[email]** Reply to investor');
  });

  it('handles JSON with preamble text before it', () => {
    const content = `Based on your data, here is the result:\n${JSON.stringify(validPayload)}`;
    const result = parseBriefResult(content);

    expect(result.summary).toBe('- **[email]** 2025-01-15: Meeting scheduled with client');
    expect(result.pendingItems).toBe('- 🔴 **[email]** Reply to investor');
  });

  it('returns empty pendingItems when array is empty', () => {
    const payload = {
      summary: [{ date: '2025-01-15', source: 'email', description: 'Something happened' }],
      pendingItems: [],
    };
    const result = parseBriefResult(JSON.stringify(payload));

    expect(result.summary).toBe('- **[email]** 2025-01-15: Something happened');
    expect(result.pendingItems).toBe('');
  });

  it('returns empty summary string when array is empty', () => {
    const payload = {
      summary: [],
      pendingItems: [{ urgency: 'low' as const, source: 'email', item: 'Follow up' }],
    };
    const result = parseBriefResult(JSON.stringify(payload));

    expect(result.summary).toBe('');
    expect(result.pendingItems).toBe('- 🟢 **[email]** Follow up');
  });

  it('handles multiple summary items correctly', () => {
    const payload = {
      summary: [
        { date: '2025-01-10', source: 'email', description: 'Alpha' },
        { date: '2025-01-11', source: 'whatsapp', description: 'Beta' },
        { date: '2025-01-12', source: 'email', description: 'Gamma' },
      ],
      pendingItems: [],
    };
    const result = parseBriefResult(JSON.stringify(payload));
    const lines = result.summary.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('- **[email]** 2025-01-10: Alpha');
    expect(lines[1]).toBe('- **[whatsapp]** 2025-01-11: Beta');
    expect(lines[2]).toBe('- **[email]** 2025-01-12: Gamma');
  });

  it('handles mixed urgency levels in pending items', () => {
    const payload = {
      summary: [],
      pendingItems: [
        { urgency: 'low' as const, source: 'email', item: 'Low priority' },
        { urgency: 'high' as const, source: 'whatsapp', item: 'High priority' },
        { urgency: 'medium' as const, source: 'email', item: 'Medium priority' },
      ],
    };
    const result = parseBriefResult(JSON.stringify(payload));
    const lines = result.pendingItems.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('🟢');
    expect(lines[1]).toContain('🔴');
    expect(lines[2]).toContain('🟡');
  });

  it('handles empty content string', () => {
    const result = parseBriefResult('');

    expect(result.summary).toBe('');
    expect(result.pendingItems).toBe('');
  });

  it('handles whitespace-only content', () => {
    const result = parseBriefResult('   \n\t  ');

    expect(result.summary).toBe('');
    expect(result.pendingItems).toBe('');
  });
});

describe('parseBriefResultRaw', () => {
  it('parses valid JSON into structured result', () => {
    const payload = {
      summary: [{ date: '2025-01-15', source: 'email', description: 'Test' }],
      pendingItems: [{ urgency: 'high', source: 'email', item: 'Do this' }],
    };
    const result = parseBriefResultRaw(JSON.stringify(payload));
    expect(result).not.toBeNull();
    expect(result!.summary).toHaveLength(1);
    expect(result!.pendingItems).toHaveLength(1);
  });

  it('returns null for non-JSON content', () => {
    expect(parseBriefResultRaw('plain text')).toBeNull();
  });

  it('returns null for invalid schema', () => {
    expect(parseBriefResultRaw('{"foo": "bar"}')).toBeNull();
  });

  it('extracts JSON from surrounding text', () => {
    const payload = { summary: [], pendingItems: [] };
    const content = `Here is your result:\n${JSON.stringify(payload)}\nDone.`;
    const result = parseBriefResultRaw(content);
    expect(result).not.toBeNull();
  });
});

describe('mergeBriefResults', () => {
  it('merges results from multiple batches', () => {
    const batch1 = {
      summary: [{ date: '2025-01-10', source: 'email', description: 'Alpha' }],
      pendingItems: [{ urgency: 'high' as const, source: 'email', item: 'Task A' }],
    };
    const batch2 = {
      summary: [{ date: '2025-01-12', source: 'whatsapp', description: 'Beta' }],
      pendingItems: [{ urgency: 'low' as const, source: 'whatsapp', item: 'Task B' }],
    };
    const merged = mergeBriefResults([batch1, batch2]);
    expect(merged.summary).toHaveLength(2);
    expect(merged.pendingItems).toHaveLength(2);
  });

  it('deduplicates identical summary entries', () => {
    const entry = { date: '2025-01-10', source: 'email', description: 'Same event' };
    const merged = mergeBriefResults([
      { summary: [entry], pendingItems: [] },
      { summary: [entry], pendingItems: [] },
    ]);
    expect(merged.summary).toHaveLength(1);
  });

  it('deduplicates identical pending items', () => {
    const item = { urgency: 'high' as const, source: 'email', item: 'Same task' };
    const merged = mergeBriefResults([
      { summary: [], pendingItems: [item] },
      { summary: [], pendingItems: [item] },
    ]);
    expect(merged.pendingItems).toHaveLength(1);
  });

  it('sorts summary chronologically', () => {
    const merged = mergeBriefResults([
      { summary: [{ date: '2025-01-15', source: 'email', description: 'Later' }], pendingItems: [] },
      { summary: [{ date: '2025-01-10', source: 'email', description: 'Earlier' }], pendingItems: [] },
    ]);
    expect(merged.summary[0].date).toBe('2025-01-10');
    expect(merged.summary[1].date).toBe('2025-01-15');
  });

  it('handles empty batch results', () => {
    const merged = mergeBriefResults([
      { summary: [], pendingItems: [] },
      { summary: [], pendingItems: [] },
    ]);
    expect(merged.summary).toHaveLength(0);
    expect(merged.pendingItems).toHaveLength(0);
  });
});

describe('formatBriefResult', () => {
  it('formats summary and pending items as markdown', () => {
    const result = {
      summary: [{ date: '2025-01-15', source: 'email', description: 'Meeting' }],
      pendingItems: [{ urgency: 'high' as const, source: 'email', item: 'Reply' }],
    };
    const formatted = formatBriefResult(result);
    expect(formatted.summary).toBe('- **[email]** 2025-01-15: Meeting');
    expect(formatted.pendingItems).toBe('- 🔴 **[email]** Reply');
  });

  it('returns empty strings for empty arrays', () => {
    const formatted = formatBriefResult({ summary: [], pendingItems: [] });
    expect(formatted.summary).toBe('');
    expect(formatted.pendingItems).toBe('');
  });
});

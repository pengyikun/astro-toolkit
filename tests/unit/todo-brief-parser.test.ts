import { describe, it, expect } from 'vitest';
import { parsePendingItemsToTodos } from '../../lib/brief-parser';

describe('parsePendingItemsToTodos', () => {
  it('parses high urgency items', () => {
    const raw = '- 🔴 **[email]** Reply to investor';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].urgency).toBe('high');
    expect(result[0].title).toBe('Reply to investor');
  });

  it('parses medium urgency items', () => {
    const raw = '- 🟡 **[whatsapp]** Follow up with team';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].urgency).toBe('medium');
    expect(result[0].title).toBe('Follow up with team');
  });

  it('parses low urgency items', () => {
    const raw = '- 🟢 **[email]** Archive old thread';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].urgency).toBe('low');
    expect(result[0].title).toBe('Archive old thread');
  });

  it('parses multiple items', () => {
    const raw = [
      '- 🔴 **[email]** Urgent task',
      '- 🟡 **[whatsapp]** Medium task',
      '- 🟢 **[email]** Low task',
    ].join('\n');
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ title: 'Urgent task', urgency: 'high' });
    expect(result[1]).toEqual({ title: 'Medium task', urgency: 'medium' });
    expect(result[2]).toEqual({ title: 'Low task', urgency: 'low' });
  });

  it('returns empty array for empty string', () => {
    expect(parsePendingItemsToTodos('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parsePendingItemsToTodos('   \n\t  ')).toEqual([]);
  });

  it('filters out lines that result in empty titles', () => {
    const raw = '- 🔴 **[email]** \n- 🟡 **[whatsapp]** Valid task';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid task');
  });

  it('handles lines without source bracket formatting', () => {
    const raw = '- 🔴 Reply to boss';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Reply to boss');
    expect(result[0].urgency).toBe('high');
  });

  it('handles lines without urgency emoji (defaults to medium)', () => {
    const raw = '- **[email]** Some task without emoji';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].urgency).toBe('medium');
    expect(result[0].title).toBe('Some task without emoji');
  });

  it('handles bullet points with asterisks', () => {
    const raw = '* 🔴 **[email]** Asterisk bullet';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Asterisk bullet');
  });

  it('preserves special characters in title', () => {
    const raw = '- 🔴 **[email]** Reply re: Q1 2025 results & forecast';
    const result = parsePendingItemsToTodos(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Reply re: Q1 2025 results & forecast');
  });

  it('round-trips through formatBriefResult → parsePendingItemsToTodos', async () => {
    const { formatBriefResult } = await import('../../lib/brief-parser');
    const original = {
      summary: [],
      pendingItems: [
        { urgency: 'high' as const, source: 'email', item: 'Approve payment' },
        { urgency: 'medium' as const, source: 'whatsapp', item: 'Schedule meeting' },
        { urgency: 'low' as const, source: 'email', item: 'Update docs' },
      ],
    };
    const formatted = formatBriefResult(original);
    const parsed = parsePendingItemsToTodos(formatted.pendingItems);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ title: 'Approve payment', urgency: 'high' });
    expect(parsed[1]).toEqual({ title: 'Schedule meeting', urgency: 'medium' });
    expect(parsed[2]).toEqual({ title: 'Update docs', urgency: 'low' });
  });
});

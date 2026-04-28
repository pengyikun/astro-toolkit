import { describe, it, expect } from 'vitest';
import {
  briefRequestSchema,
  briefResultSchema,
  MAX_BRIEF_SPAN_DAYS,
} from '../../schemas/brief.schema';

describe('briefRequestSchema', () => {
  const validInput = {
    connectors: ['email'],
    date_from: '2025-01-01',
    date_to: '2025-01-31',
  };

  it('accepts valid input with single connector', () => {
    const result = briefRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connectors).toEqual(['email']);
    }
  });

  it('accepts valid input with both connectors', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      connectors: ['email', 'whatsapp'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connectors).toEqual(['email', 'whatsapp']);
    }
  });

  it('rejects empty connectors array', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      connectors: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid connector name', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      connectors: ['slack'],
    });
    expect(result.success).toBe(false);
  });

  it('deduplicates connectors', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      connectors: ['email', 'email'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connectors).toEqual(['email']);
    }
  });

  it('rejects non-ISO date format (human-readable)', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      date_from: 'Jan 15 2025',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO date format (slash-separated)', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      date_from: '01/15/2025',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty date strings', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      date_from: '',
      date_to: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects date_from after date_to', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-02-01',
      date_to: '2025-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateToError = result.error.issues.find((i) => i.path.includes('date_to'));
      expect(dateToError?.message).toBe('End date must be on or after start date');
    }
  });

  it('rejects date range exceeding 90 days', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-01-01',
      date_to: '2025-04-02',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateToError = result.error.issues.find((i) => i.path.includes('date_to'));
      expect(dateToError?.message).toBe(
        `Date range must not exceed ${MAX_BRIEF_SPAN_DAYS} days`
      );
    }
  });

  it('accepts date range of exactly 90 days', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-01-01',
      date_to: '2025-04-01',
    });
    expect(result.success).toBe(true);
  });

  it('accepts same-day range', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['whatsapp'],
      date_from: '2025-03-15',
      date_to: '2025-03-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects completely invalid date-like strings', () => {
    const result = briefRequestSchema.safeParse({
      ...validInput,
      date_from: '9999-99-99',
    });
    expect(result.success).toBe(false);
  });

  it('rejects impossible calendar date (Feb 31)', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-02-31',
      date_to: '2025-03-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects month 13', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-13-01',
      date_to: '2025-13-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects month 00', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-00-01',
      date_to: '2025-01-31',
    });
    expect(result.success).toBe(false);
  });

  it('rejects day 00', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-01-00',
      date_to: '2025-01-31',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid leap year date (Feb 29 in 2024)', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2024-02-29',
      date_to: '2024-03-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid leap year date (Feb 29 in 2025)', () => {
    const result = briefRequestSchema.safeParse({
      connectors: ['email'],
      date_from: '2025-02-29',
      date_to: '2025-03-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('briefResultSchema', () => {
  const validResult = {
    summary: [
      {
        date: '2025-01-15',
        source: 'email',
        description: 'Invoice received from vendor',
      },
    ],
    pendingItems: [
      {
        urgency: 'high' as const,
        source: 'whatsapp',
        item: 'Approve payment request',
      },
    ],
  };

  it('accepts valid structured result', () => {
    const result = briefResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it('accepts empty arrays for both fields', () => {
    const result = briefResultSchema.safeParse({
      summary: [],
      pendingItems: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing summary field', () => {
    const result = briefResultSchema.safeParse({
      pendingItems: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing pendingItems field', () => {
    const result = briefResultSchema.safeParse({
      summary: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid urgency value', () => {
    const result = briefResultSchema.safeParse({
      summary: [],
      pendingItems: [{ urgency: 'critical', source: 'email', item: 'Test' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects summary item with missing description', () => {
    const result = briefResultSchema.safeParse({
      summary: [{ date: '2025-01-15', source: 'email' }],
      pendingItems: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects pending item with missing item field', () => {
    const result = briefResultSchema.safeParse({
      summary: [],
      pendingItems: [{ urgency: 'high', source: 'email' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all three urgency levels', () => {
    const pendingItems = (['high', 'medium', 'low'] as const).map((urgency) => ({
      urgency,
      source: 'email',
      item: `${urgency} priority task`,
    }));
    const result = briefResultSchema.safeParse({
      summary: [],
      pendingItems,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pendingItems).toHaveLength(3);
    }
  });
});

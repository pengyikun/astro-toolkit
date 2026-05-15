import { z } from 'zod';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_BRIEF_SPAN_DAYS = 90;

function isValidCalendarDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;
  // Verify the date components round-trip correctly (catches e.g. Feb 31)
  const [y, m, day] = dateStr.split('-').map(Number);
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

export const briefRequestSchema = z
  .object({
    connectors: z
      .array(z.enum(['email', 'whatsapp']))
      .min(1, 'Select at least one connector')
      .transform((v) => [...new Set(v)]),
    date_from: z.string().regex(ISO_DATE_RE, 'Date must be YYYY-MM-DD').refine(isValidCalendarDate, 'Invalid calendar date'),
    date_to: z.string().regex(ISO_DATE_RE, 'Date must be YYYY-MM-DD').refine(isValidCalendarDate, 'Invalid calendar date'),
    email_folders: z.array(z.string().min(1)).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.date_from > val.date_to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_to'],
        message: 'End date must be on or after start date',
      });
    }

    const from = new Date(val.date_from);
    const to = new Date(val.date_to);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_BRIEF_SPAN_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_to'],
        message: `Date range must not exceed ${MAX_BRIEF_SPAN_DAYS} days`,
      });
    }
  });

// Categories the LLM is encouraged to use; kept as a free string so older
// briefs and edge cases never fail validation.
export const BRIEF_CATEGORIES = [
  'approval',
  'payment',
  'review',
  'decision',
  'meeting',
  'contract',
  'request',
  'update',
  'info',
] as const;
export type BriefCategory = (typeof BRIEF_CATEGORIES)[number];

export const WAITING_ON_VALUES = ['me', 'them', 'external'] as const;
export type WaitingOn = (typeof WAITING_ON_VALUES)[number];

export const briefResultSchema = z.object({
  summary: z.array(
    z.object({
      date: z.string(),
      source: z.string(),
      description: z.string(),
      // Optional structured fields used for the rich table view.
      // Older briefs and legacy LLM responses won't include these.
      subject: z.string().optional(),
      counterparty: z.string().optional(),
      dueDate: z.string().optional(),
      category: z.string().optional(),
      messageCount: z.number().int().positive().optional(),
    }),
  ),
  pendingItems: z.array(
    z.object({
      urgency: z.enum(['high', 'medium', 'low']),
      source: z.string(),
      item: z.string(),
      subject: z.string().optional(),
      counterparty: z.string().optional(),
      eventDate: z.string().optional(),
      dueDate: z.string().optional(),
      category: z.string().optional(),
      waitingOn: z.enum(WAITING_ON_VALUES).optional(),
      messageCount: z.number().int().positive().optional(),
    }),
  ),
});

import { z } from 'zod';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_BRIEF_SPAN_DAYS = 90;

export const briefRequestSchema = z
  .object({
    connectors: z
      .array(z.enum(['email', 'whatsapp']))
      .min(1, 'Select at least one connector')
      .transform((v) => [...new Set(v)]),
    date_from: z.string().regex(ISO_DATE_RE, 'Date must be YYYY-MM-DD'),
    date_to: z.string().regex(ISO_DATE_RE, 'Date must be YYYY-MM-DD'),
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

export const briefResultSchema = z.object({
  summary: z.array(
    z.object({
      date: z.string(),
      source: z.string(),
      description: z.string(),
    }),
  ),
  pendingItems: z.array(
    z.object({
      urgency: z.enum(['high', 'medium', 'low']),
      source: z.string(),
      item: z.string(),
    }),
  ),
});

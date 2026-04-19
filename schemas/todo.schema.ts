import { z } from 'zod';

export const todoCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  urgency: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const todoUpdateStatusSchema = z.object({
  id: z.coerce.number().positive(),
  status: z.enum(['open', 'in_progress', 'done']),
});

export const todoUpdateTitleSchema = z.object({
  id: z.coerce.number().positive(),
  title: z.string().min(1, 'Title is required').max(500),
});

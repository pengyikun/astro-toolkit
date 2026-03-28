import { z } from 'zod';

export const snippetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  snippet_type: z.enum(['json', 'xml']),
  content: z.string().min(1, 'Content is required'),
  parse_result: z.string().min(1, 'Parse result is required'),
  notes: z.string().optional().default(''),
});

export type SnippetInput = z.infer<typeof snippetSchema>;

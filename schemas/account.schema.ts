import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  region_code: z.string().min(1, 'Region is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  account_type: z.enum(['mock', 'real']),
  status: z.enum(['active', 'archived']).default('active'),
  notes: z.string().optional().default(''),
});

export type AccountInput = z.infer<typeof accountSchema>;

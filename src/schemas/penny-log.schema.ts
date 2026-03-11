import { z } from 'zod';

export const pennyLogSchema = z.object({
  partner_name: z.string().min(1, 'Partner name is required'),
  direction: z.enum(['inbound', 'outbound']),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  status: z.enum(['pending', 'success', 'failed', 'timeout', 'returned']),
  reference_id: z.string().optional().default(''),
  error_code: z.string().optional().default(''),
  error_message: z.string().optional().default(''),
  request_payload: z.string().optional().default(''),
  response_payload: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  tested_at: z.string().min(1, 'Test date is required'),
  account_id: z.coerce.number().nullable().optional().default(null),
});

export type PennyLogInput = z.infer<typeof pennyLogSchema>;

import { z } from 'zod';

export const credentialSchema = z.object({
  partner_name: z.string().min(1, 'Partner name is required').max(255),
  environment: z.enum(['sandbox', 'staging', 'uat']),
  label: z.string().min(1, 'Label is required').max(255),
  notes: z.string().optional().default(''),
});

export type CredentialInput = z.infer<typeof credentialSchema>;

import { z } from 'zod';

export const identityAliasSchema = z.object({
  field: z.enum(['name', 'email', 'phone', 'company', 'colleague']),
  alias_value: z.string().min(1, 'Value is required'),
});

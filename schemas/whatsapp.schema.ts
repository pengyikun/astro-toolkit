import { z } from 'zod';

export const whatsappSettingSchema = z.object({
  db_path: z.string()
    .min(1, 'Database path is required')
    .refine((val) => val.endsWith('.db'), 'Database path must point to a .db file'),
});

import { z } from 'zod';

export const llmSettingSchema = z.object({
  base_url: z.string().url('Valid URL is required'),
  api_key: z.string().default(''),
  model_name: z.string().min(1, 'Model name is required'),
  max_tokens: z.coerce.number().int().min(1).max(128000).default(4096),
  context_window: z.coerce.number().int().min(1000).max(2000000).default(128000),
});

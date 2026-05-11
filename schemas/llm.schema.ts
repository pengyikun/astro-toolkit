import { z } from 'zod';
import { assertSafeLlmBaseUrl } from '@/lib/llm';

// Cap max_tokens to bound upstream cost / response size.
const MAX_LLM_TOKENS = 200_000;
const MAX_LLM_CONTEXT_WINDOW = 2_000_000;

export const llmSettingSchema = z.object({
  base_url: z
    .string()
    .url('Valid URL is required')
    .superRefine((value, ctx) => {
      try {
        assertSafeLlmBaseUrl(value);
      } catch (err) {
        ctx.addIssue({
          code: 'custom',
          message: err instanceof Error ? err.message : 'Base URL is not allowed',
        });
      }
    }),
  api_key: z.string().max(4096, 'API key is too long').default(''),
  model_name: z.string().min(1, 'Model name is required').max(256, 'Model name is too long'),
  max_tokens: z.coerce.number().int().min(1).max(MAX_LLM_TOKENS).default(4096),
  context_window: z.coerce.number().int().min(1000).max(MAX_LLM_CONTEXT_WINDOW).default(128000),
  enable_thinking: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()).default(false),
});

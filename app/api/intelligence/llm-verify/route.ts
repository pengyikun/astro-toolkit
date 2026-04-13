import { NextRequest } from 'next/server';
import { requireAccessScope } from '@/lib/access';
import * as LlmSettingModel from '@/models/llm-setting.model';
import { verifyLlmConnection } from '@/lib/llm';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  let scope;
  try {
    scope = await requireAccessScope();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const setting = await LlmSettingModel.findByOwner(db, scope);
  if (!setting) {
    return Response.json({ success: false, error: 'No LLM settings configured.' }, { status: 400 });
  }

  const result = await verifyLlmConnection(setting);
  return Response.json(result);
}

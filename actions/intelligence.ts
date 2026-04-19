'use server';

import { revalidatePath } from 'next/cache';
import type { IdentityAlias, LlmSetting, Brief, BriefConnector, Todo } from '@/types';
import { identityAliasSchema } from '@/schemas/identity.schema';
import { llmSettingSchema } from '@/schemas/llm.schema';
import { briefRequestSchema } from '@/schemas/brief.schema';
import * as IdentityProfileModel from '@/models/identity-profile.model';
import * as IdentityAliasModel from '@/models/identity-alias.model';
import * as LlmSettingModel from '@/models/llm-setting.model';
import * as BriefModel from '@/models/brief.model';
import * as TodoModel from '@/models/todo.model';
import { todoCreateSchema, todoUpdateStatusSchema, todoUpdateTitleSchema } from '@/schemas/todo.schema';
import { parsePendingItemsToTodos } from '@/lib/brief-parser';
import { verifyLlmConnection } from '@/lib/llm';
import { validateBriefPrerequisites } from '@/lib/intelligence';
import db from '@/lib/db';
import { requireAccessScope, ownerUserIdFromScope } from '@/lib/access';

export interface ActionResult {
  success: boolean;
  errors?: Array<{ field: string; message: string }>;
}

// ── Identity ───────────────────────────────────────────────────────────────

export async function getIdentityEntries(): Promise<{ hasProfile: boolean; entries: IdentityAlias[] }> {
  const scope = await requireAccessScope();
  const profile = await IdentityProfileModel.findByOwner(db, scope);
  if (!profile) return { hasProfile: false, entries: [] };
  const entries = await IdentityAliasModel.findByProfileId(db, profile.id);
  return { hasProfile: true, entries };
}

export async function addIdentityEntry(formData: FormData): Promise<ActionResult> {
  const scope = await requireAccessScope();

  const raw = {
    field: formData.get('field'),
    alias_value: formData.get('alias_value'),
  };

  const parsed = identityAliasSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  // Auto-create profile container if needed
  const profile = await IdentityProfileModel.ensureProfile(db, ownerUserIdFromScope(scope), scope);

  await IdentityAliasModel.create(db, {
    profile_id: profile.id,
    ...parsed.data,
  });

  revalidatePath('/intelligence');
  return { success: true };
}

export async function removeIdentityEntry(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const profile = await IdentityProfileModel.findByOwner(db, scope);
  if (!profile) return;

  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  await IdentityAliasModel.remove(db, id, profile.id);
  revalidatePath('/intelligence');
}

// ── LLM Settings ───────────────────────────────────────────────────────────

export async function getLlmSettings(): Promise<Omit<LlmSetting, 'owner_user_id' | 'api_key'> & { hasApiKey: boolean } | null> {
  const scope = await requireAccessScope();
  const setting = await LlmSettingModel.findByOwner(db, scope);
  if (!setting) return null;
  const { owner_user_id: _, api_key: _k, ...safe } = setting;
  return { ...safe, hasApiKey: Boolean(_k) };
}

export async function saveLlmSettings(formData: FormData): Promise<ActionResult> {
  const scope = await requireAccessScope();

  const raw = {
    base_url: formData.get('base_url'),
    api_key: formData.get('api_key') ?? '',
    model_name: formData.get('model_name'),
    max_tokens: formData.get('max_tokens'),
    context_window: formData.get('context_window'),
  };

  const parsed = llmSettingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  await LlmSettingModel.upsert(db, {
    ...parsed.data,
    owner_user_id: ownerUserIdFromScope(scope),
  }, scope);

  revalidatePath('/data');
  return { success: true };
}

export async function deleteLlmSettings(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;
  await LlmSettingModel.remove(db, id, scope);
  revalidatePath('/data');
}

export async function verifyLlm(): Promise<{ success: boolean; error?: string }> {
  const scope = await requireAccessScope();
  const setting = await LlmSettingModel.findByOwner(db, scope);
  if (!setting) {
    return { success: false, error: 'No LLM settings configured.' };
  }
  return verifyLlmConnection(setting);
}

// ── Brief ──────────────────────────────────────────────────────────────────

export async function validateBrief(
  connectors: BriefConnector[],
): Promise<{ valid: boolean; error?: string }> {
  const scope = await requireAccessScope();
  return validateBriefPrerequisites(scope, connectors);
}

export async function getBriefHistory(): Promise<Brief[]> {
  const scope = await requireAccessScope();
  return BriefModel.listByOwner(db, scope);
}

export async function getBriefDetail(id: number): Promise<Brief | null> {
  const scope = await requireAccessScope();
  return BriefModel.findById(db, id, scope);
}

export async function deleteBrief(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;
  await BriefModel.remove(db, id, scope);
  revalidatePath('/intelligence/brief');
}

// ── Todo ──────────────────────────────────────────────────────────────────

export async function getTodos(): Promise<Todo[]> {
  const scope = await requireAccessScope();
  return TodoModel.listByOwner(db, scope);
}

export async function createTodo(formData: FormData): Promise<ActionResult> {
  const scope = await requireAccessScope();

  const parsed = todoCreateSchema.safeParse({
    title: formData.get('title'),
    urgency: formData.get('urgency') || 'medium',
  });
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  await TodoModel.create(db, {
    ...parsed.data,
    source: 'manual',
    owner_user_id: ownerUserIdFromScope(scope),
  });

  revalidatePath('/intelligence/todo');
  return { success: true };
}

export async function updateTodoStatus(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const parsed = todoUpdateStatusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  });
  if (!parsed.success) return;
  await TodoModel.updateStatus(db, parsed.data.id, parsed.data.status, scope);
  revalidatePath('/intelligence/todo');
}

export async function updateTodoTitle(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const parsed = todoUpdateTitleSchema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
  });
  if (!parsed.success) return;
  await TodoModel.updateTitle(db, parsed.data.id, parsed.data.title, scope);
  revalidatePath('/intelligence/todo');
}

export async function deleteTodo(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;
  await TodoModel.remove(db, id, scope);
  revalidatePath('/intelligence/todo');
}

export async function createTodosFromBrief(briefId: number): Promise<ActionResult> {
  const scope = await requireAccessScope();
  const brief = await BriefModel.findById(db, briefId, scope);
  if (!brief) {
    return { success: false, errors: [{ field: 'briefId', message: 'Brief not found' }] };
  }
  if (brief.status !== 'completed' || !brief.pending_items) {
    return { success: false, errors: [{ field: 'briefId', message: 'Brief has no pending items' }] };
  }

  const existing = await TodoModel.listByOwner(db, scope);
  const existingKeys = new Set(
    existing.filter((t) => t.brief_id === briefId).map((t) => t.title),
  );

  const items = parsePendingItemsToTodos(brief.pending_items);
  let created = 0;
  for (const item of items) {
    if (existingKeys.has(item.title)) continue;
    await TodoModel.create(db, {
      title: item.title,
      urgency: item.urgency,
      source: 'brief',
      brief_id: briefId,
      owner_user_id: ownerUserIdFromScope(scope),
    });
    created++;
  }

  revalidatePath('/intelligence/todo');
  return { success: true };
}

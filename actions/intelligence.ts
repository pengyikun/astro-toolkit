'use server';

import { revalidatePath } from 'next/cache';
import type { IdentityAlias, LlmSetting, Brief, BriefConnector } from '@/types';
import { identityAliasSchema } from '@/schemas/identity.schema';
import { llmSettingSchema } from '@/schemas/llm.schema';
import { briefRequestSchema } from '@/schemas/brief.schema';
import * as IdentityProfileModel from '@/models/identity-profile.model';
import * as IdentityAliasModel from '@/models/identity-alias.model';
import * as LlmSettingModel from '@/models/llm-setting.model';
import * as BriefModel from '@/models/brief.model';
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

export async function getLlmSettings(): Promise<Omit<LlmSetting, 'owner_user_id'> | null> {
  const scope = await requireAccessScope();
  const setting = await LlmSettingModel.findByOwner(db, scope);
  if (!setting) return null;
  const { owner_user_id: _, ...safe } = setting;
  return safe;
}

export async function saveLlmSettings(formData: FormData): Promise<ActionResult> {
  const scope = await requireAccessScope();

  const raw = {
    base_url: formData.get('base_url'),
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

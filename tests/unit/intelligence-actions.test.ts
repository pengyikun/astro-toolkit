import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessScope, LlmSetting } from '../../types';

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  ownerUserIdFromScope: vi.fn(),
  requireAccessScope: vi.fn(),
}));

const llmSettingModelMocks = vi.hoisted(() => ({
  findByOwner: vi.fn(),
  remove: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock('@/lib/access', () => ({
  applyOwnerScope: vi.fn((query) => query),
  ownerUserIdFromScope: accessMocks.ownerUserIdFromScope,
  requireAccessScope: accessMocks.requireAccessScope,
}));

vi.mock('@/models/llm-setting.model', () => ({
  findByOwner: llmSettingModelMocks.findByOwner,
  remove: llmSettingModelMocks.remove,
  upsert: llmSettingModelMocks.upsert,
}));

vi.mock('@/lib/db', () => ({
  default: {},
}));

import {
  deleteLlmSettings,
  getLlmSettings,
  saveLlmSettings,
} from '../../actions/intelligence';

function createScope(overrides: Partial<AccessScope> = {}): AccessScope {
  return { userId: 7, role: 'operator', ...overrides };
}

function createLlmSetting(overrides: Partial<LlmSetting> = {}): LlmSetting {
  return {
    id: 1,
    owner_user_id: 7,
    base_url: 'https://api.example.test/v1',
    api_key: 'stored-api-key',
    model_name: 'test-model',
    max_tokens: 4096,
    context_window: 128000,
    enable_thinking: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createValidFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const fields = {
    base_url: 'https://api.example.test/v1',
    api_key: 'new-api-key',
    model_name: 'test-model',
    max_tokens: '4096',
    context_window: '128000',
    enable_thinking: 'on',
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }

  return data;
}

describe.sequential('intelligence LLM settings actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    accessMocks.requireAccessScope.mockResolvedValue(createScope());
    accessMocks.ownerUserIdFromScope.mockReturnValue(7);

    llmSettingModelMocks.findByOwner.mockResolvedValue(createLlmSetting());
    llmSettingModelMocks.remove.mockResolvedValue(undefined);
    llmSettingModelMocks.upsert.mockResolvedValue(undefined);
  });

  it('saves API key and enable thinking state', async () => {
    const result = await saveLlmSettings(createValidFormData());

    expect(result).toEqual({ success: true });
    expect(llmSettingModelMocks.upsert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        api_key: 'new-api-key',
        enable_thinking: true,
        owner_user_id: 7,
      }),
      createScope(),
    );
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/settings/ai');
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/intelligence');
  });

  it('preserves an existing API key when the password field is left blank', async () => {
    const result = await saveLlmSettings(createValidFormData({ api_key: '' }));

    expect(result).toEqual({ success: true });
    const savedData = llmSettingModelMocks.upsert.mock.calls[0][1];
    expect(savedData).not.toHaveProperty('api_key');
    expect(savedData).toEqual(expect.objectContaining({
      enable_thinking: true,
      owner_user_id: 7,
    }));
  });

  it('saves unchecked enable thinking as false', async () => {
    const formData = createValidFormData();
    formData.delete('enable_thinking');

    const result = await saveLlmSettings(formData);

    expect(result).toEqual({ success: true });
    expect(llmSettingModelMocks.upsert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ enable_thinking: false }),
      createScope(),
    );
  });

  it('allows model token and context limits above legacy UI caps', async () => {
    const result = await saveLlmSettings(createValidFormData({
      max_tokens: '128000',
      context_window: '1000000',
    }));

    expect(result).toEqual({ success: true });
    expect(llmSettingModelMocks.upsert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        max_tokens: 128000,
        context_window: 1000000,
      }),
      createScope(),
    );
  });

  it('rejects absurdly large token caps to bound upstream cost', async () => {
    const result = await saveLlmSettings(createValidFormData({
      max_tokens: '10000000',
      context_window: '100000000',
    }));

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'max_tokens')).toBe(true);
    expect(result.errors?.some((e) => e.field === 'context_window')).toBe(true);
  });

  it('strips API key from getLlmSettings responses while exposing key status', async () => {
    const result = await getLlmSettings();

    expect(result).toEqual(expect.objectContaining({
      id: 1,
      base_url: 'https://api.example.test/v1',
      hasApiKey: true,
      enable_thinking: true,
    }));
    expect(result).not.toHaveProperty('api_key');
  });

  it('deletes LLM settings and revalidates affected routes', async () => {
    const formData = new FormData();
    formData.set('id', '1');

    await deleteLlmSettings(formData);

    expect(llmSettingModelMocks.remove).toHaveBeenCalledWith({}, 1, createScope());
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/settings/ai');
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/intelligence');
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import * as LlmSettingModel from '../../models/llm-setting.model';
import type { AccessScope } from '../../types';

let db: Knex;

const operatorScope: AccessScope = { userId: 1, role: 'operator' };
const otherScope: AccessScope = { userId: 2, role: 'operator' };

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(() => teardownTestDb());

beforeEach(async () => {
  await db('llm_settings').del();
  await db('auth_users').del();
  const now = new Date().toISOString();
  await db('auth_users').insert([
    { id: 1, email: 'op@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
    { id: 2, email: 'other@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
  ]);
});

function settingFor(owner = 1) {
  return {
    base_url: 'https://api.x',
    api_key: 'k',
    model_name: 'gpt-x',
    max_tokens: 1024,
    owner_user_id: owner,
  };
}

describe('LlmSettingModel.findByOwner', () => {
  it('returns null (not undefined) when there is no row', async () => {
    const row = await LlmSettingModel.findByOwner(db, operatorScope);
    expect(row).toBeNull();
  });

  it('returns the row when it exists for the scoped owner', async () => {
    await LlmSettingModel.upsert(db, settingFor(1), operatorScope);
    const row = await LlmSettingModel.findByOwner(db, operatorScope);
    expect(row?.base_url).toBe('https://api.x');
    expect(row?.model_name).toBe('gpt-x');
  });

  it('returns null when scoped to a different owner', async () => {
    await LlmSettingModel.upsert(db, settingFor(1), operatorScope);
    const row = await LlmSettingModel.findByOwner(db, otherScope);
    expect(row).toBeNull();
  });
});

describe('LlmSettingModel.upsert', () => {
  it('inserts when no existing row, then returns the new row', async () => {
    const row = await LlmSettingModel.upsert(db, settingFor(1), operatorScope);
    expect(row?.base_url).toBe('https://api.x');
  });

  it('updates the existing row in place (no second insert)', async () => {
    await LlmSettingModel.upsert(db, settingFor(1), operatorScope);
    await LlmSettingModel.upsert(
      db,
      { ...settingFor(1), base_url: 'https://updated', model_name: 'gpt-y' },
      operatorScope,
    );
    const all = await db('llm_settings').select('*').where('owner_user_id', 1);
    expect(all.length).toBe(1);
    expect(all[0].base_url).toBe('https://updated');
    expect(all[0].model_name).toBe('gpt-y');
  });
});

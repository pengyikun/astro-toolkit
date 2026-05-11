import { describe, it, expect, vi } from 'vitest';

// Mock model and db imports so chat-tools is pure to load.
vi.mock('@/lib/db', () => ({ default: {} }));
vi.mock('@/models/account.model', () => ({
  findAll: vi.fn(async () => ({ data: [{ id: 1, name: 'A', region_code: 'EU', currency: 'EUR', status: 'active', account_type: 'mock' }] })),
  findById: vi.fn(async (_db: unknown, id: number) => (id === 1 ? { id: 1, name: 'A', region_code: 'EU', currency: 'EUR', status: 'active', account_type: 'mock', created_at: 'x', updated_at: 'x', owner_user_id: 7 } : null)),
}));
vi.mock('@/models/penny-test-log.model', () => ({
  findAll: vi.fn(async () => ({ data: [{ id: 9, partner_name: 'P', amount: '1.00', currency: 'USD', direction: 'inbound', status: 'success', reference_id: 'r', tested_at: 't' }] })),
  findById: vi.fn(async (_db: unknown, id: number) => (id === 9 ? { id: 9, partner_name: 'P', owner_user_id: 7 } : null)),
}));
vi.mock('@/models/credential.model', () => ({
  findAll: vi.fn(async () => ({ data: [{ id: 2, partner_name: 'Bank', environment: 'prod', label: 'main' }] })),
}));
vi.mock('@/models/todo.model', () => ({
  listByOwner: vi.fn(async () => [
    { id: 1, title: 'open', urgency: 'high', status: 'open', source: 'manual' },
    { id: 2, title: 'done', urgency: 'low', status: 'done', source: 'brief' },
  ]),
}));
vi.mock('@/models/brief.model', () => ({
  findLatestCompleted: vi.fn(async () => ({ id: 5, date_from: '2025-01-01', date_to: '2025-01-07', summary: 's', pending_items: 'p' })),
}));

import { CHAT_TOOLS, toAnthropicTools, executeTool } from '../../lib/chat-tools';

describe('CHAT_TOOLS', () => {
  it('declares the expected tools in OpenAI function-calling format', () => {
    const names = CHAT_TOOLS.map((t) => t.function.name);
    expect(names).toEqual([
      'list_accounts',
      'get_account',
      'list_transactions',
      'get_transaction',
      'list_todos',
      'get_latest_brief',
      'list_credentials',
    ]);
    for (const t of CHAT_TOOLS) {
      expect(t.type).toBe('function');
      expect(t.function.parameters).toBeTypeOf('object');
    }
  });
});

describe('toAnthropicTools', () => {
  it('converts to Anthropic shape', () => {
    const out = toAnthropicTools();
    expect(out.length).toBe(CHAT_TOOLS.length);
    for (let i = 0; i < out.length; i++) {
      expect(out[i].name).toBe(CHAT_TOOLS[i].function.name);
      expect(out[i].description).toBe(CHAT_TOOLS[i].function.description);
      expect(out[i].input_schema).toBe(CHAT_TOOLS[i].function.parameters);
    }
  });
});

describe('executeTool', () => {
  it('returns an error for an unknown tool', async () => {
    const res = await executeTool('does_not_exist', {}, null);
    expect(res).toEqual({ error: 'Unknown tool: does_not_exist' });
  });

  it('list_accounts returns a sanitised projection', async () => {
    const res = (await executeTool('list_accounts', { status: 'active', region: 'EU' }, null)) as Array<Record<string, unknown>>;
    expect(res[0]).toEqual({ id: 1, name: 'A', region: 'EU', currency: 'EUR', status: 'active', account_type: 'mock' });
  });

  it('get_account strips internal fields', async () => {
    const res = await executeTool('get_account', { id: 1 }, null) as Record<string, unknown>;
    expect(res.id).toBe(1);
    expect(res.created_at).toBeUndefined();
    expect(res.updated_at).toBeUndefined();
    expect(res.owner_user_id).toBeUndefined();
  });

  it('get_account returns not-found error for missing id', async () => {
    expect(await executeTool('get_account', { id: 9999 }, null)).toEqual({ error: 'Account not found' });
  });

  it('list_transactions caps the limit at 20', async () => {
    const res = (await executeTool('list_transactions', { limit: 9999 }, null)) as unknown[];
    expect(res.length).toBeLessThanOrEqual(20);
  });

  it('list_todos filters out done items', async () => {
    const res = (await executeTool('list_todos', {}, null)) as Array<{ status: string }>;
    expect(res.every((t) => t.status !== 'done')).toBe(true);
  });

  it('get_transaction strips owner_user_id', async () => {
    const res = await executeTool('get_transaction', { id: 9 }, null) as Record<string, unknown>;
    expect(res.owner_user_id).toBeUndefined();
  });

  it('get_transaction returns not-found error for missing id', async () => {
    expect(await executeTool('get_transaction', { id: 99999 }, null)).toEqual({ error: 'Transaction not found' });
  });

  it('get_latest_brief returns brief summary fields', async () => {
    const res = (await executeTool('get_latest_brief', {}, null)) as Record<string, unknown>;
    expect(res.id).toBe(5);
    expect(res.summary).toBe('s');
    expect(res.pending_items).toBe('p');
  });

  it('list_credentials returns sanitised projection only', async () => {
    const res = (await executeTool('list_credentials', { partner_name: 'Bank' }, null)) as Array<Record<string, unknown>>;
    expect(res[0]).toEqual({ id: 2, partner_name: 'Bank', environment: 'prod', label: 'main' });
  });
});

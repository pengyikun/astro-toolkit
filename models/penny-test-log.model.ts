import type { Knex } from 'knex';
import type { AccessScope, PennyTestLog, PennyLogFilters, PaginatedResult } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findAll(
  db: Knex,
  filters: PennyLogFilters = {},
  scope?: AccessScope | null,
): Promise<PaginatedResult<PennyTestLog>> {
  const page = Math.max(1, Number(filters.page) || 1);
  const perPage = Math.max(1, Math.min(100, Number(filters.perPage) || 25));
  const offset = (page - 1) * perPage;

  const baseQuery = applyOwnerScope(
    db('penny_test_logs'),
    scope,
    'penny_test_logs.owner_user_id',
  );

  if (filters.status) {
    baseQuery.where('status', filters.status);
  }
  if (filters.partner_name) {
    baseQuery.where('partner_name', filters.partner_name);
  }
  if (filters.direction) {
    baseQuery.where('direction', filters.direction);
  }
  if (filters.currency) {
    baseQuery.where('currency', filters.currency);
  }
  if (filters.date_from) {
    baseQuery.where('tested_at', '>=', filters.date_from);
  }
  if (filters.date_to) {
    baseQuery.where('tested_at', '<=', filters.date_to);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    baseQuery.where(function (this: Knex.QueryBuilder) {
      this.where('reference_id', 'like', term)
        .orWhere('partner_name', 'like', term)
        .orWhere('notes', 'like', term)
        .orWhere('error_message', 'like', term);
    });
  }

  const [{ total }] = await baseQuery.clone().count('* as total');
  const data = await baseQuery
    .clone()
    .select('*')
    .orderBy('tested_at', 'desc')
    .limit(perPage)
    .offset(offset);

  return {
    data,
    total: Number(total),
    page,
    perPage,
    totalPages: Math.ceil(Number(total) / perPage),
  };
}

export async function findById(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<PennyTestLog | null> {
  const log = await applyOwnerScope(
    db('penny_test_logs').where('id', id),
    scope,
    'penny_test_logs.owner_user_id',
  ).first();
  return log || null;
}

export async function create(
  db: Knex,
  data: Omit<PennyTestLog, 'id' | 'created_at' | 'updated_at'>
): Promise<PennyTestLog> {
  const now = new Date().toISOString();

  const [id] = await db('penny_test_logs').insert({
    owner_user_id: data.owner_user_id ?? null,
    account_id: data.account_id,
    partner_name: data.partner_name,
    direction: data.direction,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    reference_id: data.reference_id || '',
    error_code: data.error_code || '',
    error_message: data.error_message || '',
    request_payload: data.request_payload || '',
    response_payload: data.response_payload || '',
    notes: data.notes || '',
    tested_at: data.tested_at,
    created_at: now,
    updated_at: now,
  });

  return (await findById(db, id))!;
}

export async function update(
  db: Knex,
  id: number,
  data: Partial<Omit<PennyTestLog, 'id' | 'created_at' | 'updated_at'>>,
  scope?: AccessScope | null,
): Promise<PennyTestLog | null> {
  const existing = await applyOwnerScope(
    db('penny_test_logs').where('id', id),
    scope,
    'penny_test_logs.owner_user_id',
  ).first();
  if (!existing) return null;

  const now = new Date().toISOString();

  await db('penny_test_logs')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'penny_test_logs.owner_user_id');
    })
    .update({ ...data, updated_at: now });

  return findById(db, id, scope);
}

export async function remove(db: Knex, id: number, scope?: AccessScope | null): Promise<number> {
  return db('penny_test_logs')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'penny_test_logs.owner_user_id');
    })
    .del();
}

export async function count(db: Knex, scope?: AccessScope | null): Promise<number> {
  const [{ total }] = await db('penny_test_logs')
    .modify((query) => {
      applyOwnerScope(query, scope, 'penny_test_logs.owner_user_id');
    })
    .count('* as total');
  return Number(total);
}

export async function findRecent(db: Knex, limit = 5, scope?: AccessScope | null): Promise<PennyTestLog[]> {
  return db('penny_test_logs')
    .select('*')
    .modify((query) => {
      applyOwnerScope(query, scope, 'penny_test_logs.owner_user_id');
    })
    .orderBy('tested_at', 'desc')
    .limit(limit);
}

export async function countByStatus(db: Knex, scope?: AccessScope | null): Promise<Record<string, number>> {
  const rows = await db('penny_test_logs')
    .select('status')
    .modify((query) => {
      applyOwnerScope(query, scope, 'penny_test_logs.owner_user_id');
    })
    .count('* as count')
    .groupBy('status');
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status as string] = Number(row.count);
  }
  return result;
}

export async function searchQuick(
  db: Knex,
  search: string,
  limit = 4,
  scope?: AccessScope | null,
): Promise<Array<Pick<PennyTestLog, 'id' | 'partner_name' | 'reference_id' | 'amount' | 'currency' | 'status' | 'tested_at'>>> {
  const term = `%${search}%`;

  return db('penny_test_logs')
    .select('id', 'partner_name', 'reference_id', 'amount', 'currency', 'status', 'tested_at')
    .modify((query) => {
      applyOwnerScope(query, scope, 'penny_test_logs.owner_user_id');
    })
    .where(function (this: Knex.QueryBuilder) {
      this.where('reference_id', 'like', term)
        .orWhere('partner_name', 'like', term)
        .orWhere('notes', 'like', term)
        .orWhere('error_message', 'like', term);
    })
    .orderBy('tested_at', 'desc')
    .limit(limit);
}

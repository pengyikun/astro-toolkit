import type { Knex } from 'knex';
import type { PennyTestLog, PennyLogFilters, PaginatedResult } from '../types';

export async function findAll(
  db: Knex,
  filters: PennyLogFilters = {}
): Promise<PaginatedResult<PennyTestLog>> {
  const page = Math.max(1, Number(filters.page) || 1);
  const perPage = Math.max(1, Math.min(100, Number(filters.perPage) || 25));
  const offset = (page - 1) * perPage;

  const baseQuery = db('penny_test_logs');

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
  id: number
): Promise<PennyTestLog | null> {
  const log = await db('penny_test_logs').where('id', id).first();
  return log || null;
}

export async function create(
  db: Knex,
  data: Omit<PennyTestLog, 'id' | 'created_at' | 'updated_at'>
): Promise<PennyTestLog> {
  const now = new Date().toISOString();

  const [id] = await db('penny_test_logs').insert({
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
  data: Partial<Omit<PennyTestLog, 'id' | 'created_at' | 'updated_at'>>
): Promise<PennyTestLog | null> {
  const existing = await db('penny_test_logs').where('id', id).first();
  if (!existing) return null;

  const now = new Date().toISOString();

  await db('penny_test_logs')
    .where('id', id)
    .update({ ...data, updated_at: now });

  return findById(db, id);
}

export async function remove(db: Knex, id: number): Promise<number> {
  return db('penny_test_logs').where('id', id).del();
}

export async function count(db: Knex): Promise<number> {
  const [{ total }] = await db('penny_test_logs').count('* as total');
  return Number(total);
}

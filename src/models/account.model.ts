import type { Knex } from 'knex';
import type {
  Account,
  AccountField,
  AccountWithFields,
  AccountFilters,
  PaginatedResult,
} from '../types';

export async function findAll(
  db: Knex,
  filters: AccountFilters = {}
): Promise<PaginatedResult<Account>> {
  const page = Math.max(1, Number(filters.page) || 1);
  const perPage = Math.max(1, Math.min(100, Number(filters.perPage) || 25));
  const offset = (page - 1) * perPage;

  const baseQuery = db('accounts');
  if (filters.region_code) {
    baseQuery.where('region_code', filters.region_code);
  }
  if (filters.status) {
    baseQuery.where('status', filters.status);
  } else {
    baseQuery.where('status', '!=', 'archived');
  }
  if (filters.account_type) {
    baseQuery.where('account_type', filters.account_type);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    baseQuery.where(function (this: Knex.QueryBuilder) {
      this.where('name', 'like', term).orWhere('notes', 'like', term);
    });
  }

  const [{ total }] = await baseQuery.clone().count('* as total');
  const data = await baseQuery
    .clone()
    .select('*')
    .orderBy('created_at', 'desc')
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
): Promise<AccountWithFields | null> {
  const account = await db('accounts').where('id', id).first();
  if (!account) return null;

  const fields = await db('account_fields')
    .where('account_id', id)
    .orderBy('sort_order', 'asc');

  return { ...account, fields };
}

export async function create(
  db: Knex,
  data: {
    name: string;
    region_code: string;
    currency: string;
    account_type: string;
    status?: string;
    notes?: string;
    fields?: Omit<AccountField, 'id' | 'account_id'>[];
  }
): Promise<AccountWithFields> {
  const now = new Date().toISOString();

  const [id] = await db('accounts').insert({
    name: data.name,
    region_code: data.region_code,
    currency: data.currency,
    account_type: data.account_type,
    status: data.status || 'active',
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  });

  if (data.fields && data.fields.length > 0) {
    const fieldRows = data.fields.map((f, i) => ({
      account_id: id,
      field_key: f.field_key,
      field_label: f.field_label,
      field_value: f.field_value,
      field_type: f.field_type || 'text',
      is_custom: f.is_custom || 0,
      sort_order: f.sort_order ?? i,
    }));
    await db('account_fields').insert(fieldRows);
  }

  return (await findById(db, id))!;
}

export async function update(
  db: Knex,
  id: number,
  data: {
    name?: string;
    region_code?: string;
    currency?: string;
    account_type?: string;
    status?: string;
    notes?: string;
    fields?: Omit<AccountField, 'id' | 'account_id'>[];
  }
): Promise<AccountWithFields | null> {
  const existing = await db('accounts').where('id', id).first();
  if (!existing) return null;

  const now = new Date().toISOString();
  const { fields, ...accountData } = data;

  await db('accounts')
    .where('id', id)
    .update({ ...accountData, updated_at: now });

  if (fields !== undefined) {
    await db('account_fields').where('account_id', id).del();
    if (fields.length > 0) {
      const fieldRows = fields.map((f, i) => ({
        account_id: id,
        field_key: f.field_key,
        field_label: f.field_label,
        field_value: f.field_value,
        field_type: f.field_type || 'text',
        is_custom: f.is_custom || 0,
        sort_order: f.sort_order ?? i,
      }));
      await db('account_fields').insert(fieldRows);
    }
  }

  return findById(db, id);
}

export async function remove(db: Knex, id: number): Promise<number> {
  const now = new Date().toISOString();
  return db('accounts')
    .where('id', id)
    .update({ status: 'archived', updated_at: now });
}

export async function count(db: Knex): Promise<number> {
  const [{ total }] = await db('accounts')
    .where('status', 'active')
    .count('* as total');
  return Number(total);
}

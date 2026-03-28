import type { Knex } from 'knex';
import type { SavedSnippet, SavedSnippetFilters, PaginatedResult } from '@/types';

export async function findAll(
  db: Knex,
  filters: SavedSnippetFilters = {}
): Promise<PaginatedResult<SavedSnippet>> {
  const page = Math.max(1, Number(filters.page) || 1);
  const perPage = Math.max(1, Math.min(100, Number(filters.perPage) || 25));
  const offset = (page - 1) * perPage;

  const baseQuery = db('saved_snippets');
  if (filters.snippet_type) {
    baseQuery.where('snippet_type', filters.snippet_type);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    baseQuery.where(function (this: Knex.QueryBuilder) {
      this.where('title', 'like', term).orWhere('notes', 'like', term);
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
): Promise<SavedSnippet | null> {
  return db('saved_snippets').where('id', id).first() ?? null;
}

export async function create(
  db: Knex,
  data: { title: string; snippet_type: string; content: string; parse_result: string; notes?: string }
): Promise<SavedSnippet> {
  const now = new Date().toISOString();
  const [id] = await db('saved_snippets').insert({
    title: data.title,
    snippet_type: data.snippet_type,
    content: data.content,
    parse_result: data.parse_result,
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  });
  return (await findById(db, id))!;
}

export async function remove(db: Knex, id: number): Promise<number> {
  return db('saved_snippets').where('id', id).del();
}

export async function count(db: Knex, snippetType?: string): Promise<number> {
  const query = db('saved_snippets');
  if (snippetType) query.where('snippet_type', snippetType);
  const [{ total }] = await query.count('* as total');
  return Number(total);
}

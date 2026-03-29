import type { Knex } from 'knex';
import type {
  Credential,
  CredentialItem,
  CredentialWithItems,
  CredentialFilters,
  EncryptedPayload,
  PaginatedResult,
} from '@/types';
import { encrypt, decrypt } from '@/lib/encryption';
import config from '@/lib/config';

export async function findAll(
  db: Knex,
  filters: CredentialFilters = {}
): Promise<PaginatedResult<Credential & { item_count: number }>> {
  const page = Math.max(1, Number(filters.page) || 1);
  const perPage = Math.max(1, Math.min(100, Number(filters.perPage) || 25));
  const offset = (page - 1) * perPage;

  const baseQuery = db('credentials')
    .select(
      'credentials.*',
      db.raw('(SELECT COUNT(*) FROM credential_items WHERE credential_items.credential_id = credentials.id) as item_count')
    );

  if (filters.partner_name) {
    baseQuery.where('partner_name', filters.partner_name);
  }
  if (filters.environment) {
    baseQuery.where('environment', filters.environment);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    baseQuery.where(function (this: Knex.QueryBuilder) {
      this.where('partner_name', 'like', term)
        .orWhere('label', 'like', term)
        .orWhere('notes', 'like', term);
    });
  }

  const [{ total }] = await baseQuery.clone().clearSelect().count('* as total');
  const data = await baseQuery
    .clone()
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
): Promise<CredentialWithItems | null> {
  const credential = await db('credentials').where('id', id).first();
  if (!credential) return null;

  const items = await db('credential_items')
    .where('credential_id', id)
    .orderBy('created_at', 'asc');

  return { ...credential, items };
}

export async function create(
  db: Knex,
  data: {
    partner_name: string;
    environment: string;
    label: string;
    notes?: string;
    items?: Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'>[];
  }
): Promise<CredentialWithItems> {
  const now = new Date().toISOString();

  const [id] = await db('credentials').insert({
    partner_name: data.partner_name,
    environment: data.environment,
    label: data.label,
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  });

  if (data.items && data.items.length > 0) {
    const itemRows = data.items.map((item) => ({
      credential_id: id,
      item_key: item.item_key,
      item_value:
        item.item_type === 'text'
          ? JSON.stringify(encrypt(item.item_value, config.vaultEncryptionKey))
          : item.item_value,
      item_type: item.item_type || 'text',
      file_name: item.file_name || null,
      file_path: item.file_path || null,
      created_at: now,
    }));
    await db('credential_items').insert(itemRows);
  }

  return (await findById(db, id))!;
}

export async function update(
  db: Knex,
  id: number,
  data: {
    partner_name?: string;
    environment?: string;
    label?: string;
    notes?: string;
    items?: Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'>[];
  }
): Promise<CredentialWithItems | null> {
  const existing = await db('credentials').where('id', id).first();
  if (!existing) return null;
  const existingItems = await db('credential_items').where('credential_id', id).select('*');

  const now = new Date().toISOString();
  const { items, ...credentialData } = data;

  await db('credentials')
    .where('id', id)
    .update({ ...credentialData, updated_at: now });

  if (items !== undefined) {
    await db('credential_items').where('credential_id', id).del();
    type PreparedItem = Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'> & {
      isEncrypted?: boolean;
    };

    const preparedItems: PreparedItem[] = items.map((item) => {
      const itemType = item.item_type || 'text';
      const matchingExistingItem = existingItems.find(
        (existingItem) =>
          existingItem.item_key === item.item_key &&
          existingItem.item_type === itemType,
      );

      if (
        itemType === 'text' &&
        item.item_value === '' &&
        matchingExistingItem?.item_type === 'text'
      ) {
        return {
          item_key: item.item_key,
          item_value: matchingExistingItem.item_value,
          item_type: 'text',
          file_name: item.file_name || null,
          file_path: item.file_path || null,
          isEncrypted: true,
        };
      }

      return {
        item_key: item.item_key,
        item_value: item.item_value,
        item_type: itemType,
        file_name: item.file_name || null,
        file_path: item.file_path || null,
      };
    });

    const preservedFileItems = existingItems
      .filter(
        (existingItem) =>
          existingItem.item_type === 'file' &&
          !preparedItems.some((item) => item.item_key === existingItem.item_key),
      )
      .map<PreparedItem>((existingItem) => ({
        item_key: existingItem.item_key,
        item_value: existingItem.item_value,
        item_type: 'file',
        file_name: existingItem.file_name ?? null,
        file_path: existingItem.file_path ?? null,
      }));

    const itemRows = [...preparedItems, ...preservedFileItems].map((item) => ({
        credential_id: id,
        item_key: item.item_key,
        item_value:
          item.item_type === 'text'
            ? (item.isEncrypted
                ? item.item_value
                : JSON.stringify(encrypt(item.item_value, config.vaultEncryptionKey)))
            : item.item_value,
        item_type: item.item_type || 'text',
        file_name: item.file_name || null,
        file_path: item.file_path || null,
        created_at: now,
      }));
    if (itemRows.length > 0) {
      await db('credential_items').insert(itemRows);
    }
  }

  return findById(db, id);
}

export async function remove(db: Knex, id: number): Promise<number> {
  return db('credentials').where('id', id).del();
}

export async function count(db: Knex): Promise<number> {
  const [{ total }] = await db('credentials').count('* as total');
  return Number(total);
}

export async function listPartnerNames(db: Knex): Promise<string[]> {
  const rows = await db('credentials')
    .distinct('partner_name')
    .whereNotNull('partner_name')
    .orderBy('partner_name', 'asc');

  return rows
    .map((row) => row.partner_name as string)
    .filter(Boolean);
}

export async function revealItem(
  db: Knex,
  itemId: number
): Promise<{ decrypted_value: string | null } | null> {
  const item = await db('credential_items').where('id', itemId).first();
  if (!item) return null;

  if (item.item_type !== 'text') {
    return { decrypted_value: null };
  }

  try {
    const payload: EncryptedPayload = JSON.parse(item.item_value);
    const decrypted_value = decrypt(payload, config.vaultEncryptionKey);
    return { decrypted_value };
  } catch (err) {
    console.error(`[VAULT] Failed to decrypt item ${itemId}:`, err instanceof Error ? err.message : err);
    const error = new Error('Failed to decrypt credential — the encryption key may have changed or data is corrupted');
    (error as any).status = 500;
    throw error;
  }
}

export async function searchQuick(
  db: Knex,
  search: string,
  limit = 4
): Promise<Array<Pick<Credential, 'id' | 'partner_name' | 'environment' | 'label' | 'updated_at'>>> {
  const term = `%${search}%`;

  return db('credentials')
    .select('id', 'partner_name', 'environment', 'label', 'updated_at')
    .where(function (this: Knex.QueryBuilder) {
      this.where('partner_name', 'like', term)
        .orWhere('label', 'like', term)
        .orWhere('notes', 'like', term);
    })
    .orderBy('updated_at', 'desc')
    .limit(limit);
}

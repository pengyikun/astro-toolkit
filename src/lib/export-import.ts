import type { Knex } from 'knex';
import type {
  ExportData,
  ImportSummary,
  AccountWithFields,
  CredentialWithItems,
  PennyTestLog,
  EncryptedPayload,
} from '../types';
import { encrypt, decrypt } from './encryption';

const APP_NAME = 'fintech-pm-toolkit';
const APP_VERSION = '1.0.0';

export async function buildExportData(
  db: Knex,
  modules: string[],
  encryptionKey: Buffer,
): Promise<ExportData> {
  const exportData: ExportData = {
    meta: {
      app: APP_NAME,
      version: APP_VERSION,
      exported_at: new Date().toISOString(),
      modules,
    },
  };

  if (modules.includes('accounts')) {
    const accounts = await db('accounts').select('*');
    const accountsWithFields: AccountWithFields[] = [];

    for (const account of accounts) {
      const fields = await db('account_fields')
        .where('account_id', account.id)
        .orderBy('sort_order', 'asc')
        .select('*');

      accountsWithFields.push({
        ...account,
        fields: fields.map((f: Record<string, unknown>) => ({
          field_key: f.field_key as string,
          field_label: f.field_label as string,
          field_value: f.field_value as string,
          field_type: f.field_type as 'text' | 'select' | 'textarea',
          is_custom: f.is_custom as number,
          sort_order: f.sort_order as number,
        })),
      });
    }

    exportData.accounts = accountsWithFields;
  }

  if (modules.includes('credentials')) {
    const credentials = await db('credentials').select('*');
    const credentialsWithItems: CredentialWithItems[] = [];

    for (const cred of credentials) {
      const items = await db('credential_items')
        .where('credential_id', cred.id)
        .select('*');

      credentialsWithItems.push({
        ...cred,
        items: items.map((item: Record<string, unknown>) => {
          const decryptedValue = decryptItemValue(item.item_value as string, encryptionKey);
          return {
            item_key: item.item_key as string,
            item_value: decryptedValue,
            item_type: item.item_type as 'text' | 'file',
            file_name: (item.file_name as string | null) ?? null,
            file_path: (item.file_path as string | null) ?? null,
          };
        }),
      });
    }

    exportData.credentials = credentialsWithItems;
  }

  if (modules.includes('penny_test_logs')) {
    exportData.penny_test_logs = await db('penny_test_logs').select('*');
  }

  return exportData;
}

export async function processImportData(
  db: Knex,
  jsonData: ExportData,
  selectedModules: string[],
  encryptionKey: Buffer,
): Promise<ImportSummary> {
  if (!jsonData?.meta) {
    throw new Error('Invalid import data: missing meta field');
  }
  if (jsonData.meta.app !== APP_NAME) {
    throw new Error(
      `Invalid import data: expected app "${APP_NAME}", got "${jsonData.meta.app}"`,
    );
  }

  const VALID_ACCOUNT_TYPES = ['mock', 'real'];
  const VALID_ACCOUNT_STATUSES = ['active', 'archived'];
  const VALID_DIRECTIONS = ['inbound', 'outbound'];
  const VALID_LOG_STATUSES = ['pending', 'success', 'failed', 'timeout', 'returned'];
  const VALID_ENVIRONMENTS = ['sandbox', 'staging', 'uat'];

  const summary: ImportSummary = {
    accounts: 0,
    credentials: 0,
    penny_test_logs: 0,
  };

  const accountIdMap = new Map<number, number>();

  await db.transaction(async (trx) => {
    if (selectedModules.includes('accounts') && jsonData.accounts?.length) {
      for (const account of jsonData.accounts) {
        const oldId = account.id;

        if (account.account_type && !VALID_ACCOUNT_TYPES.includes(account.account_type)) {
          throw new Error(`Invalid account_type "${account.account_type}" for account "${account.name}"`);
        }
        if (account.status && !VALID_ACCOUNT_STATUSES.includes(account.status)) {
          throw new Error(`Invalid status "${account.status}" for account "${account.name}"`);
        }

        const [newId] = await trx('accounts').insert({
          name: account.name,
          region_code: account.region_code,
          currency: account.currency,
          account_type: account.account_type,
          status: account.status,
          notes: account.notes ?? '',
          created_at: account.created_at,
          updated_at: account.updated_at,
        });

        accountIdMap.set(oldId, newId);

        if (account.fields?.length) {
          const fieldRows = account.fields.map((f, idx) => ({
            account_id: newId,
            field_key: f.field_key,
            field_label: f.field_label,
            field_value: f.field_value ?? '',
            field_type: f.field_type ?? 'text',
            is_custom: f.is_custom ?? 0,
            sort_order: f.sort_order ?? idx,
          }));
          await trx('account_fields').insert(fieldRows);
        }

        summary.accounts++;
      }
    }

    if (selectedModules.includes('credentials') && jsonData.credentials?.length) {
      for (const cred of jsonData.credentials) {
        if (cred.environment && !VALID_ENVIRONMENTS.includes(cred.environment)) {
          throw new Error(`Invalid environment "${cred.environment}" for credential "${cred.label}"`);
        }

        const [newCredId] = await trx('credentials').insert({
          partner_name: cred.partner_name,
          environment: cred.environment,
          label: cred.label,
          notes: cred.notes ?? '',
          created_at: cred.created_at,
          updated_at: cred.updated_at,
        });

        if (cred.items?.length) {
          const itemRows = cred.items.map((item) => {
            const encrypted = encrypt(item.item_value ?? '', encryptionKey);
            return {
              credential_id: newCredId,
              item_key: item.item_key,
              item_value: JSON.stringify(encrypted),
              item_type: item.item_type ?? 'text',
              file_name: item.file_name ?? null,
              file_path: item.file_path ?? null,
            };
          });
          await trx('credential_items').insert(itemRows);
        }

        summary.credentials++;
      }
    }

    if (selectedModules.includes('penny_test_logs') && jsonData.penny_test_logs?.length) {
      for (const log of jsonData.penny_test_logs) {
        if (log.direction && !VALID_DIRECTIONS.includes(log.direction)) {
          throw new Error(`Invalid direction "${log.direction}" for log entry`);
        }
        if (log.status && !VALID_LOG_STATUSES.includes(log.status)) {
          throw new Error(`Invalid status "${log.status}" for log entry`);
        }

        const oldAccountId = log.account_id;
        const newAccountId =
          oldAccountId != null ? (accountIdMap.get(oldAccountId) ?? null) : null;

        await trx('penny_test_logs').insert({
          account_id: newAccountId,
          partner_name: log.partner_name,
          direction: log.direction,
          amount: log.amount,
          currency: log.currency,
          status: log.status,
          reference_id: log.reference_id ?? '',
          error_code: log.error_code ?? '',
          error_message: log.error_message ?? '',
          request_payload: log.request_payload ?? '',
          response_payload: log.response_payload ?? '',
          notes: log.notes ?? '',
          tested_at: log.tested_at,
          created_at: log.created_at,
          updated_at: log.updated_at,
        });

        summary.penny_test_logs++;
      }
    }
  });

  return summary;
}

function decryptItemValue(storedValue: string, key: Buffer): string {
  try {
    const payload: EncryptedPayload = JSON.parse(storedValue);
    return decrypt(payload, key);
  } catch (err) {
    throw new Error(
      `Failed to decrypt credential value: ${err instanceof Error ? err.message : 'unknown error'}`
    );
  }
}

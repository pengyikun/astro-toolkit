'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { accountSchema } from '@/schemas/account.schema';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import type { AccountField } from '@/types';
import { ownerUserIdFromScope, requireAccessScope } from '@/lib/access';

const GENERIC_BANK_FIELDS = [
  { key: 'generic_account_holder', label: 'Account Holder' },
  { key: 'generic_bank_name', label: 'Bank Name' },
  { key: 'generic_account_number', label: 'Account Number' },
  { key: 'generic_iban', label: 'IBAN' },
  { key: 'generic_swift_bic', label: 'SWIFT / BIC' },
  { key: 'generic_intermediary_bank', label: 'Intermediary Bank' },
  { key: 'generic_intermediary_swift', label: 'Intermediary SWIFT' },
  { key: 'generic_bank_street', label: 'Street Address' },
  { key: 'generic_bank_city', label: 'City' },
  { key: 'generic_bank_state', label: 'State / Province' },
  { key: 'generic_bank_postal', label: 'Postal / ZIP Code' },
  { key: 'generic_bank_country', label: 'Country' },
  { key: 'transfer_type', label: 'Transfer Type' },
] as const;

export interface AccountActionResult {
  success: boolean;
  errors?: Array<{ field: string; message: string }>;
}

function parseFieldsFromFormData(formData: FormData): Omit<AccountField, 'id' | 'account_id'>[] {
  const fields: Omit<AccountField, 'id' | 'account_id'>[] = [];
  let sortOrder = 0;

  for (const gf of GENERIC_BANK_FIELDS) {
    const val = formData.get(gf.key);
    if (val && String(val).trim()) {
      fields.push({
        field_key: gf.key,
        field_label: gf.label,
        field_value: String(val).trim(),
        field_type: 'text',
        is_custom: 0,
        sort_order: sortOrder++,
      });
    }
  }

  const fieldKeys = formData.getAll('field_key');
  const fieldLabels = formData.getAll('field_label');
  const fieldValues = formData.getAll('field_value');
  const fieldTypes = formData.getAll('field_type');
  const fieldCustom = formData.getAll('field_is_custom');

  for (let i = 0; i < fieldKeys.length; i++) {
    const key = String(fieldKeys[i] || '');
    if (key) {
      fields.push({
        field_key: key,
        field_label: String(fieldLabels[i] || key),
        field_value: String(fieldValues[i] || ''),
        field_type: (String(fieldTypes[i] || 'text')) as 'text' | 'select' | 'textarea',
        is_custom: fieldCustom[i] === '1' ? 1 : 0,
        sort_order: sortOrder++,
      });
    }
  }

  return fields;
}

export async function createAccount(formData: FormData): Promise<AccountActionResult> {
  const scope = await requireAccessScope();
  const raw = {
    name: formData.get('name'),
    region_code: formData.get('region_code'),
    currency: formData.get('currency'),
    account_type: formData.get('account_type'),
    notes: formData.get('notes') || '',
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const fields = parseFieldsFromFormData(formData);
  const account = await AccountModel.create(db, {
    ...parsed.data,
    owner_user_id: ownerUserIdFromScope(scope),
    fields,
  });

  revalidatePath('/accounts');
  revalidatePath('/');
  redirect(`/accounts/${account.id}`);
}

export async function updateAccount(id: number, formData: FormData): Promise<AccountActionResult> {
  const scope = await requireAccessScope();
  const raw = {
    name: formData.get('name'),
    region_code: formData.get('region_code'),
    currency: formData.get('currency'),
    account_type: formData.get('account_type'),
    notes: formData.get('notes') || '',
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const fields = parseFieldsFromFormData(formData);
  const account = await AccountModel.update(db, id, { ...parsed.data, fields }, scope);

  if (!account) {
    return { success: false, errors: [{ field: '', message: 'Account not found' }] };
  }

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${id}`);
  revalidatePath('/');
  redirect(`/accounts/${id}`);
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  await AccountModel.remove(db, id, scope);
  revalidatePath('/accounts');
  revalidatePath('/');
  redirect('/accounts');
}

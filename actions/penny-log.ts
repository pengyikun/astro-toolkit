'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { pennyLogSchema } from '@/schemas/penny-log.schema';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import db from '@/lib/db';

export interface PennyLogActionResult {
  success: boolean;
  errors?: Array<{ field: string; message: string }>;
}

export async function createLog(formData: FormData): Promise<PennyLogActionResult> {
  const raw = {
    partner_name: formData.get('partner_name'),
    direction: formData.get('direction'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    status: formData.get('status'),
    reference_id: formData.get('reference_id') || '',
    error_code: formData.get('error_code') || '',
    error_message: formData.get('error_message') || '',
    request_payload: formData.get('request_payload') || '',
    response_payload: formData.get('response_payload') || '',
    notes: formData.get('notes') || '',
    tested_at: formData.get('tested_at'),
    account_id: formData.get('account_id') || null,
  };

  const parsed = pennyLogSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const log = await PennyTestLogModel.create(db, parsed.data);

  revalidatePath('/penny-log');
  revalidatePath('/');
  redirect(`/penny-log/${log.id}`);
}

export async function updateLog(id: number, formData: FormData): Promise<PennyLogActionResult> {
  const raw = {
    partner_name: formData.get('partner_name'),
    direction: formData.get('direction'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    status: formData.get('status'),
    reference_id: formData.get('reference_id') || '',
    error_code: formData.get('error_code') || '',
    error_message: formData.get('error_message') || '',
    request_payload: formData.get('request_payload') || '',
    response_payload: formData.get('response_payload') || '',
    notes: formData.get('notes') || '',
    tested_at: formData.get('tested_at'),
    account_id: formData.get('account_id') || null,
  };

  const parsed = pennyLogSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const log = await PennyTestLogModel.update(db, id, parsed.data);
  if (!log) {
    return { success: false, errors: [{ field: '', message: 'Log entry not found' }] };
  }

  revalidatePath('/penny-log');
  revalidatePath(`/penny-log/${id}`);
  revalidatePath('/');
  redirect(`/penny-log/${id}`);
}

export async function deleteLog(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  await PennyTestLogModel.remove(db, id);
  revalidatePath('/penny-log');
  revalidatePath('/');
  redirect('/penny-log');
}

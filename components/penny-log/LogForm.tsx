'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { createLog, updateLog } from '@/actions/penny-log';
import type { PennyLogActionResult } from '@/actions/penny-log';
import type { PennyTestLog, Account } from '@/types';

interface LogFormProps {
  log?: PennyTestLog | null;
  accounts: Account[];
}

const STATUSES = ['pending', 'success', 'failed', 'timeout', 'returned'] as const;

export default function LogForm({ log = null, accounts }: LogFormProps) {
  const { t } = useLocale();
  const isEdit = !!(log && log.id);

  const boundAction = isEdit
    ? (_prev: PennyLogActionResult, formData: FormData) => updateLog(log!.id, formData)
    : (_prev: PennyLogActionResult, formData: FormData) => createLog(formData);

  const [state, formAction, isPending] = useActionState<PennyLogActionResult, FormData>(
    boundAction,
    { success: true }
  );

  return (
    <>
      {state.errors && state.errors.length > 0 && (
        <div role="alert" className="mb-6 px-4 py-3 rounded-lg bg-danger-light border border-danger-border text-danger text-sm">
          <p className="font-medium mb-1">{t('transactions.fixErrors')}</p>
          <ul className="list-disc list-inside">
            {state.errors.map((err, idx) => (
              <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="console-panel">
          <div className="console-panel-body space-y-4">
            <h3 className="console-inline-label">{t('transactions.transactionDetails')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="partner_name" className="console-label">
                  {t('transactions.partnerName')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="partner_name"
                  name="partner_name"
                  required
                  defaultValue={log?.partner_name || ''}
                  placeholder={t('placeholder.partnerExample')}
                  className="console-input"
                />
              </div>
              <div>
                <label htmlFor="direction" className="console-label">
                  {t('common.direction')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <select
                  id="direction"
                  name="direction"
                  required
                  defaultValue={log?.direction || ''}
                  className="console-select"
                >
                  <option value="">{t('common.select')}...</option>
                  <option value="inbound">{t('transactions.inbound')}</option>
                  <option value="outbound">{t('transactions.outbound')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="amount" className="console-label">
                  {t('transactions.amount')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  step="any"
                  min="0"
                  defaultValue={log?.amount ?? ''}
                  placeholder="0.01"
                  className="console-input"
                />
              </div>
              <div>
                <label htmlFor="currency" className="console-label">
                  {t('transactions.currency')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="currency"
                  name="currency"
                  required
                  defaultValue={log?.currency || ''}
                  placeholder={t('placeholder.currencyExample')}
                  maxLength={3}
                  className="console-input"
                />
              </div>
              <div>
                <label htmlFor="status" className="console-label">
                  {t('transactions.status')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  defaultValue={log?.status || ''}
                  className="console-select"
                >
                  <option value="">{t('common.select')}...</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`transactions.${s}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reference_id" className="console-label">{t('transactions.referenceId')}</label>
                <input
                  type="text"
                  id="reference_id"
                  name="reference_id"
                  defaultValue={log?.reference_id || ''}
                  placeholder={t('placeholder.referenceId')}
                  className="console-input"
                />
              </div>
              <div>
                <label htmlFor="tested_at" className="console-label">
                  {t('transactions.testedAt')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="tested_at"
                  name="tested_at"
                  required
                  defaultValue={log?.tested_at ? log.tested_at.slice(0, 16) : ''}
                  className="console-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="account_id" className="console-label">{t('transactions.linkedAccount')}</label>
              <select
                id="account_id"
                name="account_id"
                defaultValue={log?.account_id ? String(log.account_id) : ''}
                className="console-select"
              >
                <option value="">{t('common.noneOption')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.region_code} / {a.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="console-panel">
          <div className="console-panel-body space-y-4">
            <h3 className="console-inline-label">{t('transactions.errorDetails')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="error_code" className="console-label">{t('transactions.errorCode')}</label>
                <input
                  type="text"
                  id="error_code"
                  name="error_code"
                  defaultValue={log?.error_code || ''}
                  placeholder={t('placeholder.errorCodeExample')}
                  className="console-input"
                />
              </div>
              <div>
                <label htmlFor="error_message" className="console-label">{t('transactions.errorMessage')}</label>
                <input
                  type="text"
                  id="error_message"
                  name="error_message"
                  defaultValue={log?.error_message || ''}
                  placeholder={t('placeholder.errorMessageExample')}
                  className="console-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="console-panel">
          <div className="console-panel-body space-y-4">
            <h3 className="console-inline-label">{t('transactions.requestAndResponse')}</h3>

            <div>
              <label htmlFor="request_payload" className="console-label">{t('transactions.requestBody')}</label>
              <textarea
                id="request_payload"
                name="request_payload"
                rows={4}
                defaultValue={log?.request_payload || ''}
                placeholder={t('placeholder.requestBody')}
                className="console-textarea font-mono"
              />
            </div>

            <div>
              <label htmlFor="response_payload" className="console-label">{t('transactions.responseBody')}</label>
              <textarea
                id="response_payload"
                name="response_payload"
                rows={4}
                defaultValue={log?.response_payload || ''}
                placeholder={t('placeholder.responseBody')}
                className="console-textarea font-mono"
              />
            </div>
          </div>
        </div>

        <div className="console-panel">
          <div className="console-panel-body">
            <label htmlFor="notes" className="console-label">{t('common.notes')}</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={log?.notes || ''}
              placeholder={t('placeholder.operatorNotes')}
              className="console-textarea"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="console-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? (isEdit ? t('transactions.updating') : t('transactions.creating'))
              : (isEdit ? t('transactions.updateTransaction') : t('transactions.createTransaction'))
            }
          </button>
          <Link
            href="/penny-log"
            className="console-button-secondary"
          >
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </>
  );
}

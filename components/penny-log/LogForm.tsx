'use client';

import { useActionState } from 'react';
import { createLog, updateLog } from '@/actions/penny-log';
import type { PennyLogActionResult } from '@/actions/penny-log';
import type { PennyTestLog, Account } from '@/types';

interface LogFormProps {
  log?: PennyTestLog | null;
  accounts: Account[];
}

const STATUSES = ['pending', 'success', 'failed', 'timeout', 'returned'] as const;

export default function LogForm({ log = null, accounts }: LogFormProps) {
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
        <div className="mb-6 px-4 py-3 rounded-lg bg-danger-light border border-danger-border text-danger text-sm">
          <p className="font-medium mb-1">Please fix the following errors:</p>
          <ul className="list-disc list-inside">
            {state.errors.map((err, idx) => (
              <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Transaction Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="partner_name" className="block text-sm font-medium text-ink mb-1.5">
                Partner Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="partner_name"
                name="partner_name"
                required
                defaultValue={log?.partner_name || ''}
                placeholder="e.g. Braza, Fincra"
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="direction" className="block text-sm font-medium text-ink mb-1.5">
                Direction <span className="text-danger">*</span>
              </label>
              <select
                id="direction"
                name="direction"
                required
                defaultValue={log?.direction || ''}
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              >
                <option value="">Select...</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-ink mb-1.5">
                Amount <span className="text-danger">*</span>
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
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-ink mb-1.5">
                Currency <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="currency"
                name="currency"
                required
                defaultValue={log?.currency || ''}
                placeholder="e.g. USD, BRL"
                maxLength={3}
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-ink mb-1.5">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue={log?.status || ''}
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              >
                <option value="">Select...</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="reference_id" className="block text-sm font-medium text-ink mb-1.5">Reference ID</label>
              <input
                type="text"
                id="reference_id"
                name="reference_id"
                defaultValue={log?.reference_id || ''}
                placeholder="External transaction reference"
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="tested_at" className="block text-sm font-medium text-ink mb-1.5">
                Tested At <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                id="tested_at"
                name="tested_at"
                required
                defaultValue={log?.tested_at ? log.tested_at.slice(0, 16) : ''}
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label htmlFor="account_id" className="block text-sm font-medium text-ink mb-1.5">Linked Account</label>
            <select
              id="account_id"
              name="account_id"
              defaultValue={log?.account_id ? String(log.account_id) : ''}
              className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            >
              <option value="">&mdash; None &mdash;</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.region_code} / {a.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Error Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="error_code" className="block text-sm font-medium text-ink mb-1.5">Error Code</label>
              <input
                type="text"
                id="error_code"
                name="error_code"
                defaultValue={log?.error_code || ''}
                placeholder="e.g. ERR_TIMEOUT"
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="error_message" className="block text-sm font-medium text-ink mb-1.5">Error Message</label>
              <input
                type="text"
                id="error_message"
                name="error_message"
                defaultValue={log?.error_message || ''}
                placeholder="e.g. Connection timed out after 30s"
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Request & Response Data</h3>

          <div>
            <label htmlFor="request_payload" className="block text-sm font-medium text-ink mb-1.5">Request Body (JSON)</label>
            <textarea
              id="request_payload"
              name="request_payload"
              rows={4}
              defaultValue={log?.request_payload || ''}
              placeholder="Paste the API request body sent to the partner"
              className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="response_payload" className="block text-sm font-medium text-ink mb-1.5">Response Body (JSON)</label>
            <textarea
              id="response_payload"
              name="response_payload"
              rows={4}
              defaultValue={log?.response_payload || ''}
              placeholder="Paste the API response received from the partner"
              className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <label htmlFor="notes" className="block text-sm font-medium text-ink mb-1.5">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={log?.notes || ''}
            placeholder="e.g. Retried after partner fixed routing config"
            className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {isPending
              ? (isEdit ? 'Updating...' : 'Creating...')
              : (isEdit ? 'Update Transaction' : 'Create Transaction')
            }
          </button>
          <a
            href="/penny-log"
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-border text-ink hover:bg-page transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </>
  );
}

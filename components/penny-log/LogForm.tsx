'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { createLog, updateLog } from '@/actions/penny-log';
import type { PennyLogActionResult } from '@/actions/penny-log';
import type { PennyTestLog, Account } from '@/types';
import { ErrorCircleIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
        <Card role="alert" className="mb-6 border-danger-border bg-danger-light/70">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <ErrorCircleIcon className="mt-0.5 h-5 w-5 text-danger" />
              <div>
                <p className="console-kicker text-danger/75">{t('transactions.fixErrors')}</p>
                <ul className="mt-3 list-inside list-disc text-sm leading-relaxed text-danger">
                  {state.errors.map((err, idx) => (
                    <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form action={formAction} className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="console-inline-label">{t('transactions.transactionDetails')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partner_name">
                  {t('transactions.partnerName')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Input
                  type="text"
                  id="partner_name"
                  name="partner_name"
                  required
                  defaultValue={log?.partner_name || ''}
                  placeholder={t('placeholder.partnerExample')}
                />
              </div>
              <div>
                <Label htmlFor="direction">
                  {t('common.direction')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Select name="direction" defaultValue={log?.direction || undefined} required>
                  <SelectTrigger id="direction">
                    <SelectValue placeholder={t('common.select') + '...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">{t('transactions.inbound')}</SelectItem>
                    <SelectItem value="outbound">{t('transactions.outbound')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">
                  {t('transactions.amount')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  step="any"
                  min="0"
                  defaultValue={log?.amount ?? ''}
                  placeholder="0.01"
                />
              </div>
              <div>
                <Label htmlFor="currency">
                  {t('transactions.currency')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Input
                  type="text"
                  id="currency"
                  name="currency"
                  required
                  defaultValue={log?.currency || ''}
                  placeholder={t('placeholder.currencyExample')}
                  maxLength={3}
                />
              </div>
              <div>
                <Label htmlFor="status">
                  {t('transactions.status')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Select name="status" defaultValue={log?.status || undefined} required>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('common.select') + '...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`transactions.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reference_id">{t('transactions.referenceId')}</Label>
                <Input
                  type="text"
                  id="reference_id"
                  name="reference_id"
                  defaultValue={log?.reference_id || ''}
                  placeholder={t('placeholder.referenceId')}
                />
              </div>
              <div>
                <Label htmlFor="tested_at">
                  {t('transactions.testedAt')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  id="tested_at"
                  name="tested_at"
                  required
                  defaultValue={log?.tested_at ? log.tested_at.slice(0, 16) : ''}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="account_id">{t('transactions.linkedAccount')}</Label>
              <Select name="account_id" defaultValue={log?.account_id ? String(log.account_id) : undefined}>
                <SelectTrigger id="account_id">
                  <SelectValue placeholder={t('common.noneOption')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t('common.noneOption')}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({a.region_code} / {a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="console-inline-label">{t('transactions.errorDetails')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="error_code">{t('transactions.errorCode')}</Label>
                <Input
                  type="text"
                  id="error_code"
                  name="error_code"
                  defaultValue={log?.error_code || ''}
                  placeholder={t('placeholder.errorCodeExample')}
                />
              </div>
              <div>
                <Label htmlFor="error_message">{t('transactions.errorMessage')}</Label>
                <Input
                  type="text"
                  id="error_message"
                  name="error_message"
                  defaultValue={log?.error_message || ''}
                  placeholder={t('placeholder.errorMessageExample')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="console-inline-label">{t('transactions.requestAndResponse')}</h3>

            <div>
              <Label htmlFor="request_payload">{t('transactions.requestBody')}</Label>
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
              <Label htmlFor="response_payload">{t('transactions.responseBody')}</Label>
              <textarea
                id="response_payload"
                name="response_payload"
                rows={4}
                defaultValue={log?.response_payload || ''}
                placeholder={t('placeholder.responseBody')}
                className="console-textarea font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={log?.notes || ''}
              placeholder={t('placeholder.operatorNotes')}
              className="console-textarea"
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={isPending}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? (isEdit ? t('transactions.updating') : t('transactions.creating'))
              : (isEdit ? t('transactions.updateTransaction') : t('transactions.createTransaction'))
            }
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/transactions">
              {t('common.cancel')}
            </Link>
          </Button>
        </div>
      </form>
    </>
  );
}

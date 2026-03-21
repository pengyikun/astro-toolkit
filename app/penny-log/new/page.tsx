import type { Metadata } from 'next';
import Link from 'next/link';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import LogForm from '@/components/penny-log/LogForm';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { ChevronLeftIcon } from '@/components/ui/Icons';

export const metadata: Metadata = { title: 'New Transaction' };

export default async function NewPennyLogPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/penny-log" className="inline-flex items-center gap-1 text-caption text-ink-secondary hover:text-ink transition-colors">
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          {t(dict, 'transactions.testTransactions')}
        </Link>
      </div>

      <h2 className="text-xl font-semibold text-ink mb-6">{t(dict, 'transactions.newTransaction')}</h2>

      <LogForm accounts={accountsResult.data} />
    </div>
  );
}

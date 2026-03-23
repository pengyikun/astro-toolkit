import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import LogForm from '@/components/penny-log/LogForm';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit Transaction #${id}` };
}

export default async function EditPennyLogPage({ params }: PageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const { id } = await params;
  const log = await PennyTestLogModel.findById(db, Number(id));
  if (!log) notFound();

  const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });

  return (
    <div className="max-w-4xl">
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.transactions'), href: '/penny-log' },
          { label: `Transaction #${log.id}`, href: `/penny-log/${log.id}` },
          { label: t(dict, 'common.edit') },
        ]}
        title={t(dict, 'transactions.editTransaction')}
      />

      <LogForm log={log} accounts={accountsResult.data} />
    </div>
  );
}

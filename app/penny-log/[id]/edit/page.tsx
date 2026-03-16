import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import LogForm from '@/components/penny-log/LogForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit Transaction #${id}` };
}

export default async function EditPennyLogPage({ params }: PageProps) {
  const { id } = await params;
  const log = await PennyTestLogModel.findById(db, Number(id));
  if (!log) notFound();

  const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/penny-log" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Test Transactions
        </Link>
      </div>

      <h2 className="text-xl font-semibold text-ink mb-6">Edit Transaction</h2>

      <LogForm log={log} accounts={accountsResult.data} />
    </div>
  );
}

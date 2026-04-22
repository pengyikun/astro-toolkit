import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

const IbanChecker = dynamic(() => import('@/components/iban/IbanChecker'), {
  loading: () => <div className="mt-8 text-ink-muted text-sm">Loading…</div>,
});

const BicChecker = dynamic(() => import('@/components/bic/BicChecker'), {
  loading: () => <div className="mt-8 text-ink-muted text-sm">Loading…</div>,
});

export const metadata: Metadata = { title: 'Validate' };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ValidatePage({ searchParams }: PageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const params = await searchParams;
  const mode = params.mode === 'bic' ? 'bic' : 'iban';
  const isBic = mode === 'bic';

  return (
    <>
      <PageHeader
        title={isBic ? t(dict, 'bic.checker') : t(dict, 'iban.checker')}
        actions={
          <div className="inline-flex rounded-md border border-border" role="group">
            <Link
              href="/validate?mode=iban"
              className={`px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors ${!isBic ? 'bg-surface-active text-ink' : 'text-ink-secondary hover:text-ink'}`}
            >
              IBAN
            </Link>
            <Link
              href="/validate?mode=bic"
              className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-l border-border transition-colors ${isBic ? 'bg-surface-active text-ink' : 'text-ink-secondary hover:text-ink'}`}
            >
              BIC
            </Link>
          </div>
        }
      />

      <div className="section-stack">
        {isBic ? <BicChecker /> : <IbanChecker />}
      </div>
    </>
  );
}

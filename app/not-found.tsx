import Link from 'next/link';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export default async function NotFound() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 12rem)' }}>
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-ink-muted mb-1">404</p>
        <h2 className="text-lg font-semibold text-ink mb-2">{t(dict, 'error.pageNotFound')}</h2>
        <p className="text-sm text-ink-secondary mb-6">{t(dict, 'error.pageNotFoundDescription')}</p>
        <Link href="/" className="console-button-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {t(dict, 'error.backToDashboard')}
        </Link>
      </div>
    </div>
  );
}

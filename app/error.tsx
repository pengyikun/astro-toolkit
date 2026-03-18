'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 12rem)' }}>
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <p className="text-sm font-medium text-ink-muted mb-1">500</p>
        <h2 className="text-lg font-semibold text-ink mb-2">{error.message || t('error.somethingWentWrong')}</h2>
        <p className="text-sm text-ink-secondary mb-6">{t('error.somethingWentWrongDescription')}</p>

        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="console-button-secondary">
            {t('error.tryAgain')}
          </button>
          <Link href="/" className="console-button-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            {t('error.backToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}

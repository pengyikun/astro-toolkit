import type { Metadata } from 'next';
import ExportImport from '@/components/data/ExportImport';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Settings' };

export default async function DataPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'data.workspace')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'data.settings')}</span>
        </div>
        <div>
          <h1 className="console-title">{t(dict, 'data.settings')}</h1>
        </div>
      </section>

      <div className="section-stack">
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'settings.language')}</h2>
          </div>
          <div className="console-panel p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink">{t(dict, 'settings.displayLanguage')}</div>
                <div className="text-xs text-ink-muted mt-0.5">{t(dict, 'settings.displayLanguageDescription')}</div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        <ExportImport />
      </div>
    </>
  );
}

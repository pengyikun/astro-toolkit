import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import ExportImport from '@/components/data/ExportImport';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Settings' };

export default async function DataPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'data.workspace') },
          { label: t(dict, 'data.settings') },
        ]}
        title={t(dict, 'data.settings')}
      />

      <div className="section-stack">
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'settings.language')}</h2>
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 max-w-xl">
                  <div className="text-sm font-medium text-ink">{t(dict, 'settings.displayLanguage')}</div>
                  <div className="mt-1 text-sm leading-6 text-ink-secondary">{t(dict, 'settings.displayLanguageDescription')}</div>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>
        </section>

        <ExportImport />
      </div>
    </>
  );
}

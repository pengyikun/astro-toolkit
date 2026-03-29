import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import ExportImport from '@/components/data/ExportImport';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { isAdminScope, requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Settings' };

export default async function DataPage() {
  const scope = await requireAccessScope();
  const admin = isAdminScope(scope);
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

        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'settings.access')}</h2>
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 max-w-xl">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-ink">{t(dict, 'settings.currentRole')}</div>
                    <Badge variant={admin ? 'brand' : 'neutral'}>
                      {admin ? t(dict, 'auth.roleAdmin') : t(dict, 'auth.roleOperator')}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm leading-6 text-ink-secondary">
                    {admin ? t(dict, 'settings.accessDescriptionAdmin') : t(dict, 'settings.accessDescriptionOperator')}
                  </div>
                </div>
                {admin ? (
                  <Button asChild variant="outline">
                    <Link href="/auth?mode=register">{t(dict, 'settings.createOperator')}</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        {admin ? <ExportImport /> : null}
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import ExportImport from '@/components/data/ExportImport';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { isAdminScope, requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Data — Settings' };

export default async function SettingsDataPage() {
  const scope = await requireAccessScope();
  const admin = isAdminScope(scope);
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader
        title={t(dict, 'settings.dataPage')}
      />

      <div className="section-stack">
        {admin ? (
          <ExportImport />
        ) : (
          <div className="text-sm text-ink-secondary">{t(dict, 'settings.dataAdminOnly')}</div>
        )}
      </div>
    </>
  );
}

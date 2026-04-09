import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getMailSettings } from '@/actions/mail';
import MailFetcher from '@/components/mail/MailFetcher';

export const metadata: Metadata = { title: 'Mail' };

export default async function MailPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const setting = await getMailSettings();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'mail.title') },
          { label: t(dict, 'mail.inbox') },
        ]}
        title={t(dict, 'mail.title')}
      />

      {setting ? (
        <MailFetcher configuredEmail={setting.email} />
      ) : (
        <Card className="mt-6">
          <CardContent className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-ink mb-1">{t(dict, 'mail.noSettings')}</p>
            <p className="text-sm text-ink-secondary mb-4">{t(dict, 'mail.noSettingsDescription')}</p>
            <Button asChild variant="outline">
              <Link href="/data">{t(dict, 'mail.goToSettings')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

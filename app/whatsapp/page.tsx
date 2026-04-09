import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getWhatsAppSettings } from '@/actions/whatsapp';
import WhatsAppFetcher from '@/components/whatsapp/WhatsAppFetcher';

export const metadata: Metadata = { title: 'WhatsApp' };

export default async function WhatsAppPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const setting = await getWhatsAppSettings();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'whatsapp.title') },
          { label: t(dict, 'whatsapp.chats') },
        ]}
        title={t(dict, 'whatsapp.title')}
      />

      {setting ? (
        <WhatsAppFetcher />
      ) : (
        <Card className="mt-6">
          <CardContent className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-ink mb-1">{t(dict, 'whatsapp.noSettings')}</p>
            <p className="text-sm text-ink-secondary mb-4">{t(dict, 'whatsapp.noSettingsDescription')}</p>
            <Button asChild variant="outline">
              <Link href="/data">{t(dict, 'whatsapp.goToSettings')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

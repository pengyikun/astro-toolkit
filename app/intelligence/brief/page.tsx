import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getMailSettings } from '@/actions/mail';
import { getWhatsAppSettings } from '@/actions/whatsapp';
import BriefPageClient from '@/components/intelligence/BriefPageClient';

export const metadata: Metadata = { title: 'Brief' };

export default async function IntelligenceBriefPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const mailSetting = await getMailSettings();
  const whatsappSetting = await getWhatsAppSettings();

  return (
    <>
      <PageHeader title={t(dict, 'intelligence.brief')} />

      <BriefPageClient
        hasMailConfig={!!mailSetting}
        hasWhatsAppConfig={!!whatsappSetting}
      />
    </>
  );
}

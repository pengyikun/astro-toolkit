import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import MailSettings from '@/components/data/MailSettings';
import WhatsAppSettings from '@/components/data/WhatsAppSettings';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getMailSettings } from '@/actions/mail';
import { getWhatsAppSettings } from '@/actions/whatsapp';

export const metadata: Metadata = { title: 'Connectors — Settings' };

export default async function SettingsConnectorsPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const mailSetting = await getMailSettings();
  const whatsappSetting = await getWhatsAppSettings();

  return (
    <>
      <PageHeader
        title={t(dict, 'settings.connectorsPage')}
      />

      <div className="section-stack">
        <MailSettings
          initialSetting={mailSetting ? {
            id: mailSetting.id,
            imap_host: mailSetting.imap_host,
            imap_port: mailSetting.imap_port,
            imap_encryption: mailSetting.imap_encryption,
            imap_login: mailSetting.imap_login,
            email: mailSetting.email,
          } : null}
        />

        <WhatsAppSettings
          initialSetting={whatsappSetting ? {
            id: whatsappSetting.id,
            db_path: whatsappSetting.db_path,
          } : null}
        />
      </div>
    </>
  );
}

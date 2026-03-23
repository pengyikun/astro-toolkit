import type { Metadata } from 'next';
import VaultForm from '@/components/vault/VaultForm';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Add Credential Set' };

export default async function NewVaultPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <div className="max-w-4xl">
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.vault'), href: '/vault' },
          { label: t(dict, 'vault.addCredentialSet') },
        ]}
        title={t(dict, 'vault.addCredentialSet')}
      />
      <VaultForm credential={null} />
    </div>
  );
}

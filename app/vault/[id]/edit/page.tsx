import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import VaultForm from '@/components/vault/VaultForm';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { getAccessScope, requireAccessScope } from '@/lib/access';

interface VaultEditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VaultEditPageProps): Promise<Metadata> {
  const { id } = await params;
  const scope = await getAccessScope();
  const credential = await CredentialModel.findById(db, Number(id), scope);
  return { title: credential ? `Edit ${credential.label}` : 'Credential Not Found' };
}

export default async function VaultEditPage({ params }: VaultEditPageProps) {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const { id } = await params;
  const credential = await CredentialModel.findById(db, Number(id), scope);

  if (!credential) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.vault'), href: '/vault' },
          { label: credential.partner_name, href: `/vault/${credential.id}` },
          { label: t(dict, 'common.edit') },
        ]}
        title={t(dict, 'vault.editCredentialSet')}
      />
      <VaultForm credential={credential} />
    </div>
  );
}

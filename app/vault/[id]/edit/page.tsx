import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import VaultForm from '@/components/vault/VaultForm';

interface VaultEditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VaultEditPageProps): Promise<Metadata> {
  const { id } = await params;
  const credential = await CredentialModel.findById(db, Number(id));
  return { title: credential ? `Edit ${credential.label}` : 'Credential Not Found' };
}

export default async function VaultEditPage({ params }: VaultEditPageProps) {
  const { id } = await params;
  const credential = await CredentialModel.findById(db, Number(id));

  if (!credential) {
    notFound();
  }

  return <VaultForm credential={credential} />;
}

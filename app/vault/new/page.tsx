import type { Metadata } from 'next';
import VaultForm from '@/components/vault/VaultForm';

export const metadata: Metadata = { title: 'Add Credential Set' };

export default function NewVaultPage() {
  return <VaultForm credential={null} />;
}

'use client';

import { useCallback } from 'react';
import { deleteCredential } from '@/actions/vault';
import { confirmDelete } from '@/components/ui/ConfirmModal';
import { useLocale } from '@/lib/i18n/client';

interface VaultDeleteButtonProps {
  id: number;
  label: string;
  partnerName: string;
  environment: string;
  /** Render as console-button-danger instead of table-action-link */
  variant?: 'link' | 'button';
}

export default function VaultDeleteButton({ id, label, partnerName, environment, variant = 'link' }: VaultDeleteButtonProps) {
  const { t } = useLocale();
  const handleClick = useCallback(() => {
    const message = `${t('vault.deleteConfirm')} "${label}" (${partnerName} / ${environment})`;
    confirmDelete(`/api/vault-delete/${id}`, message);
  }, [id, label, partnerName, environment, t]);

  if (variant === 'button') {
    return (
      <form action={deleteCredential}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="console-button-danger"
          onClick={(e) => {
            if (!window.confirm(`${t('vault.deleteConfirm')} "${label}" (${partnerName} / ${environment})`)) {
              e.preventDefault();
            }
          }}
        >
          {t('common.delete')}
        </button>
      </form>
    );
  }

  return (
    <form action={deleteCredential} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="table-action-link danger"
        onClick={(e) => {
          if (!window.confirm(`${t('vault.deleteConfirm')} "${label}" (${partnerName} / ${environment})`)) {
            e.preventDefault();
          }
        }}
      >
        {t('common.delete')}
      </button>
    </form>
  );
}
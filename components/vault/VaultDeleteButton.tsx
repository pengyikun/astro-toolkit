'use client';

import { useCallback } from 'react';
import { deleteCredential } from '@/actions/vault';
import { confirmDelete } from '@/components/ui/ConfirmModal';

interface VaultDeleteButtonProps {
  id: number;
  label: string;
  partnerName: string;
  environment: string;
  /** Render as console-button-danger instead of table-action-link */
  variant?: 'link' | 'button';
}

export default function VaultDeleteButton({ id, label, partnerName, environment, variant = 'link' }: VaultDeleteButtonProps) {
  const handleClick = useCallback(() => {
    const message = `Delete "${label}" (${partnerName} / ${environment})? All stored secrets and files will be permanently removed.`;
    confirmDelete(`/api/vault-delete/${id}`, message);
  }, [id, label, partnerName, environment]);

  if (variant === 'button') {
    return (
      <form action={deleteCredential}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="console-button-danger"
          onClick={(e) => {
            if (!window.confirm(`Delete "${label}" (${partnerName} / ${environment})? All stored secrets and files will be permanently removed.`)) {
              e.preventDefault();
            }
          }}
        >
          Delete
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
          if (!window.confirm(`Delete "${label}" (${partnerName} / ${environment})? All stored secrets and files will be permanently removed.`)) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}

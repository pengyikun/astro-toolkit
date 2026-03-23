'use client';

import { useState } from 'react';
import { deleteCredential } from '@/actions/vault';
import { useLocale } from '@/lib/i18n/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface VaultDeleteButtonProps {
  id: number;
  label: string;
  partnerName: string;
  environment: string;
  variant?: 'link' | 'button';
}

export default function VaultDeleteButton({ id, label, partnerName, environment, variant = 'link' }: VaultDeleteButtonProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const message = `${t('vault.deleteConfirm')} "${label}" (${partnerName} / ${environment})`;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === 'button' ? (
          <Button variant="destructive">{t('common.delete')}</Button>
        ) : (
          <Button type="button" size="sm" variant="destructive">
            {t('common.delete')}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('ui.confirmDeleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <form action={deleteCredential}>
            <input type="hidden" name="id" value={id} />
            <Button variant="destructive" type="submit" onClick={() => setOpen(false)}>
              {t('common.delete')}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

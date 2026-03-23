'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

let showModalFn: ((action: string, message?: string) => void) | null = null;

export function confirmDelete(action: string, message?: string) {
  showModalFn?.(action, message);
}

export default function ConfirmModal() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');

  showModalFn = useCallback((actionUrl: string, msg?: string) => {
    setAction(actionUrl);
    if (msg) setMessage(msg);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      showModalFn = null;
    };
  }, []);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('ui.confirmDeleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {message || t('ui.confirmDelete')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <form action={action} method="POST">
            <AlertDialogAction asChild>
              <Button variant="destructive" type="submit">
                {t('common.delete')}
              </Button>
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

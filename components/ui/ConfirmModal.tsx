'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale } from '@/lib/i18n/client';

let showModalFn: ((action: string, message?: string) => void) | null = null;

export function confirmDelete(action: string, message?: string) {
  showModalFn?.(action, message);
}

export default function ConfirmModal() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  showModalFn = useCallback((actionUrl: string, msg?: string) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setAction(actionUrl);
    if (msg) setMessage(msg);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    previousFocusRef.current?.focus();
  }, []);

  // Trap focus inside the modal
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Focus the first focusable element
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div ref={dialogRef} className="relative console-panel max-w-md w-full mx-4">
        <div className="console-panel-body">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-semibold text-ink">{t('ui.confirmDeleteTitle')}</h3>
              <p className="console-helper-copy mt-1">{message || t('ui.confirmDelete')}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="console-button-secondary" onClick={close}>
              {t('common.cancel')}
            </button>
            <form action={action} method="POST">
              <button type="submit" className="console-button-danger">
                {t('common.delete')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { CheckCircleIcon, ErrorCircleIcon } from '@/components/ui/Icons';

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

let listeners: Array<(toast: Toast) => void> = [];

export function showToast(type: Toast['type'], message: string) {
  const toast: Toast = { id: crypto.randomUUID(), type, message };
  listeners.forEach((fn) => fn(toast));
}

export default function FlashMessages() {
  const { t } = useLocale();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== toast.id));
    }, 5000);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      listeners = listeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <div aria-live="polite" aria-atomic="false">
      {toasts.map((item, i) => (
        <div
          key={item.id}
          className={`toast-enter fixed right-4 lg:right-8 z-50 px-4 py-3 rounded-[1.2rem] text-caption flex items-start gap-3 shadow-2xl border backdrop-blur-md ${
            item.type === 'success'
              ? 'bg-success-light/90 border-success-border text-success'
              : 'bg-danger-light/92 border-danger-border text-danger'
          }`}
          style={{ minWidth: 300, top: `${92 + i * 72}px` }}
        >
          {item.type === 'success' ? (
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <ErrorCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="text-2xs font-semibold uppercase tracking-[0.18em] opacity-70">
              {item.type === 'success' ? t('toast.success') : t('toast.error')}
            </div>
            <p className="mt-1 text-caption leading-relaxed">{item.message}</p>
          </div>
          <button
            onClick={() => dismiss(item.id)}
            className="mt-0.5 opacity-60 hover:opacity-100"
            aria-label={t('toast.dismiss')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

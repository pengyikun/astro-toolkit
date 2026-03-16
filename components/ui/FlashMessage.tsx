'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      listeners = listeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className={`toast-enter fixed right-4 lg:right-8 z-50 px-4 py-3 rounded-[1.2rem] text-[13px] flex items-start gap-3 shadow-2xl border backdrop-blur-md ${
            t.type === 'success'
              ? 'bg-success-light/90 border-success-border text-success'
              : 'bg-danger-light/92 border-danger-border text-danger'
          }`}
          style={{ minWidth: 300, top: `${92 + i * 72}px` }}
        >
          {t.type === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          )}
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
              {t.type === 'success' ? 'Update saved' : 'Needs attention'}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed">{t.message}</p>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="mt-0.5 opacity-60 hover:opacity-100"
            aria-label="Dismiss message"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </>
  );
}

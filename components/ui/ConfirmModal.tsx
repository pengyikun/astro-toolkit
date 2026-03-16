'use client';

import { useState, useCallback } from 'react';

let showModalFn: ((action: string, message?: string) => void) | null = null;

export function confirmDelete(action: string, message?: string) {
  showModalFn?.(action, message);
}

export default function ConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('Are you sure you want to delete this item? This action cannot be undone.');

  showModalFn = useCallback((actionUrl: string, msg?: string) => {
    setAction(actionUrl);
    if (msg) setMessage(msg);
    setIsOpen(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
      <div className="relative console-panel max-w-md w-full mx-4">
        <div className="console-panel-body">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Confirm Delete</h3>
              <p className="console-helper-copy mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="console-button-secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
            <form action={action} method="POST">
              <button type="submit" className="console-button-danger">
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

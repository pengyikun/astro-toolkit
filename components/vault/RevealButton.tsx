'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { showToast } from '@/components/ui/FlashMessage';

interface RevealButtonProps {
  credentialId: number;
  itemId: number;
}

export default function RevealButton({ credentialId, itemId }: RevealButtonProps) {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fetchSecret = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/vault/${credentialId}/reveal/${itemId}`);
      const data = await res.json();
      if (data.value !== undefined) {
        return data.value;
      }
      return null;
    } catch {
      showToast('error', 'Failed to reveal secret.');
      return null;
    }
  }, [credentialId, itemId]);

  const handleReveal = useCallback(async () => {
    if (revealed) {
      setRevealed(false);
      setValue('');
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    setLoading(true);
    const secret = await fetchSecret();
    setLoading(false);

    if (secret !== null) {
      setValue(secret);
      setRevealed(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setRevealed(false);
        setValue('');
      }, 10000);
    }
  }, [revealed, fetchSecret]);

  const handleCopy = useCallback(async () => {
    setLoading(true);
    const secret = await fetchSecret();
    setLoading(false);

    if (secret !== null) {
      try {
        await navigator.clipboard.writeText(secret);
        setCopyLabel('Copied');
        showToast('success', 'Secret copied to clipboard.');
        setTimeout(() => setCopyLabel('Copy'), 2000);
      } catch {
        showToast('error', 'Failed to copy secret.');
      }
    }
  }, [fetchSecret]);

  return (
    <div>
      <div className="mt-4 text-sm font-mono text-ink-muted">
        {revealed ? (
          <span className="vault-secret-value text-ink">{value}</span>
        ) : (
          <span className="vault-secret-mask">{'••••••••••••'}</span>
        )}
      </div>
      <div className="record-actions mt-2">
        <button
          type="button"
          className="table-action-link"
          onClick={handleReveal}
          disabled={loading}
        >
          {loading ? '...' : (revealed ? 'Hide' : 'Show')}
        </button>
        <button
          type="button"
          className="table-action-link"
          onClick={handleCopy}
          disabled={loading}
        >
          {copyLabel}
        </button>
      </div>
    </div>
  );
}

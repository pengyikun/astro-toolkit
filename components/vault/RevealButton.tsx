'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { showToast } from '@/components/ui/FlashMessage';
import { Button } from '@/components/ui/button';

interface RevealButtonProps {
  credentialId: number;
  itemId: number;
  itemKey?: string;
}

export default function RevealButton({ credentialId, itemId, itemKey = '' }: RevealButtonProps) {
  const { t } = useLocale();
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
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
      showToast('error', t('vault.revealFailed'));
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
        setCopied(true);
        showToast('success', t('vault.copiedToClipboard'));
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast('error', t('vault.copyFailed'));
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleReveal}
          disabled={loading}
          aria-label={revealed ? t('a11y.hideSecret', { key: itemKey }) : t('a11y.revealSecret', { key: itemKey })}
        >
          {loading ? '...' : (revealed ? t('vault.hide') : t('vault.reveal'))}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          disabled={loading}
          aria-label={t('a11y.copySecret', { key: itemKey })}
        >
          {copied ? t('vault.copied') : t('vault.copy')}
        </Button>
      </div>
    </div>
  );
}

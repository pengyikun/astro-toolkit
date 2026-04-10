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
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
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
  }, [credentialId, itemId, t]);

  const handleReveal = useCallback(async () => {
    if (revealed) {
      setRevealed(false);
      setValue('');
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      return;
    }

    setLoading(true);
    const secret = await fetchSecret();
    if (!isMountedRef.current) {
      return;
    }
    setLoading(false);

    if (secret !== null) {
      setValue(secret);
      setRevealed(true);

      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        setRevealed(false);
        setValue('');
      }, 10000);
    }
  }, [revealed, fetchSecret]);

  const handleCopy = useCallback(async () => {
    setLoading(true);
    const secret = await fetchSecret();
    if (!isMountedRef.current) {
      return;
    }
    setLoading(false);

    if (secret !== null) {
      try {
        await navigator.clipboard.writeText(secret);
        if (!isMountedRef.current) {
          return;
        }
        setCopied(true);
        showToast('success', t('vault.copiedToClipboard'));
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch {
        showToast('error', t('vault.copyFailed'));
      }
    }
  }, [fetchSecret, t]);

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

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { showToast } from '@/components/ui/FlashMessage';

interface SecretTableRowProps {
  credentialId: number;
  itemId: number;
  itemKey: string;
  itemType: 'text' | 'file';
  fileName: string | null;
  filePath: string | null;
}

export default function SecretTableRow({ credentialId, itemId, itemKey, itemType, fileName, filePath }: SecretTableRowProps) {
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

  if (itemType === 'file') {
    return (
      <tr>
        <td className="font-mono font-semibold">{itemKey}</td>
        <td><span className="signal-chip brand">{t('vault.itemTypeFile')}</span></td>
        <td><span className="text-ink-secondary">{fileName || t('vault.uploadedFile')}</span></td>
        <td className="text-right">
          <div className="table-actions justify-end">
            {filePath && (
              <a href={filePath} download={fileName || undefined} className="table-action-link">{t('vault.download')}</a>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="font-mono font-semibold">{itemKey}</td>
      <td><span className="signal-chip neutral">{t('vault.itemTypeText')}</span></td>
      <td>
        {revealed ? (
          <span className="vault-secret-value text-sm text-ink font-mono">{value}</span>
        ) : (
          <span className="vault-secret-mask text-sm text-ink-muted font-mono">{'••••••••••••'}</span>
        )}
      </td>
      <td className="text-right">
        <div className="table-actions justify-end">
          <button
            type="button"
            className="table-action-link"
            onClick={handleReveal}
            disabled={loading}
            aria-label={revealed ? t('a11y.hideSecret', { key: itemKey }) : t('a11y.revealSecret', { key: itemKey })}
          >
            {loading ? '...' : (revealed ? t('vault.hide') : t('vault.reveal'))}
          </button>
          <button
            type="button"
            className="table-action-link"
            onClick={handleCopy}
            disabled={loading}
            aria-label={t('a11y.copySecret', { key: itemKey })}
          >
            {copied ? t('vault.copied') : t('vault.copy')}
          </button>
        </div>
      </td>
    </tr>
  );
}

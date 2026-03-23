'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const labels = {
    key: t('common.key'),
    type: t('common.type'),
    value: t('common.value'),
    actions: t('common.actions'),
  };

  if (itemType === 'file') {
    return (
      <tr>
        <td data-label={labels.key} className="font-mono font-semibold">{itemKey}</td>
        <td data-label={labels.type}><Badge variant="brand">{t('vault.itemTypeFile')}</Badge></td>
        <td data-label={labels.value}><span className="text-ink-secondary">{fileName || t('vault.uploadedFile')}</span></td>
        <td data-label={labels.actions} data-cell-actions="true" className="text-right">
          <div className="table-actions justify-end">
            {filePath && (
              <Button asChild size="sm" variant="outline">
                <a href={filePath} download={fileName || undefined}>{t('vault.download')}</a>
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td data-label={labels.key} className="font-mono font-semibold">{itemKey}</td>
      <td data-label={labels.type}><Badge variant="neutral">{t('vault.itemTypeText')}</Badge></td>
      <td data-label={labels.value}>
        {revealed ? (
          <span className="vault-secret-value text-sm text-ink font-mono">{value}</span>
        ) : (
          <span className="vault-secret-mask text-sm text-ink-muted font-mono">{'••••••••••••'}</span>
        )}
      </td>
      <td data-label={labels.actions} data-cell-actions="true" className="text-right">
        <div className="table-actions justify-end">
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
      </td>
    </tr>
  );
}

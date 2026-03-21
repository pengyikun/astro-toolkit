'use client';

import { useLocale } from '@/lib/i18n/client';

const STATUS_TONES: Record<string, string> = {
  success: 'success',
  pending: 'warning',
  failed: 'danger',
  timeout: 'neutral',
  returned: 'brand',
  active: 'success',
  archived: 'neutral',
  sandbox: 'warning',
  staging: 'brand',
  uat: 'neutral',
  mock: 'neutral',
  real: 'success',
  inbound: 'brand',
  outbound: 'warning',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useLocale();
  const tone = STATUS_TONES[status] || 'neutral';
  const label = t(`status.${status}`);
  return (
    <span className={`signal-chip ${tone} ${className}`}>
      {label !== `status.${status}` ? label : status}
    </span>
  );
}

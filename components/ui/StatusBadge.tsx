'use client';

import { useLocale } from '@/lib/i18n/client';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const STATUS_TONES: Record<string, NonNullable<BadgeProps['variant']>> = {
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
  const tone = STATUS_TONES[status] ?? 'neutral';
  const label = t(`status.${status}`);
  return (
    <Badge variant={tone} className={className}>
      {label !== `status.${status}` ? label : status}
    </Badge>
  );
}

'use client';

import GlobalSearch from './GlobalSearch';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';

export default function Header() {
  const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development';
  const envTone: NonNullable<BadgeProps['variant']> = nodeEnv === 'production' ? 'danger' : 'warning';

  return (
    <div className="console-topbar">
      <div className="console-topbar-bar">
        <div className="console-topbar-actions">
          <GlobalSearch />
          <Badge variant={envTone}>
            <span className="ops-chip-dot" />
            {nodeEnv.toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  );
}

'use client';

import GlobalSearch from './GlobalSearch';

export default function Header() {
  const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development';
  const envTone = nodeEnv === 'production' ? 'danger' : 'warning';

  return (
    <div className="console-topbar">
      <div className="console-topbar-bar">
        <div className="console-topbar-actions">
          <GlobalSearch />
          <span className={`signal-chip ${envTone}`}>
            <span className="ops-chip-dot" />
            {nodeEnv.toUpperCase()}
          </span>
          <div className="console-avatar" aria-hidden="true">PM</div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import BriefForm from './BriefForm';
import BriefHistory from './BriefHistory';

interface BriefPageClientProps {
  hasMailConfig: boolean;
  hasWhatsAppConfig: boolean;
}

export default function BriefPageClient({ hasMailConfig, hasWhatsAppConfig }: BriefPageClientProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="section-stack">
      <BriefForm
        hasMailConfig={hasMailConfig}
        hasWhatsAppConfig={hasWhatsAppConfig}
        onBriefComplete={() => setRefreshKey((k) => k + 1)}
      />
      <BriefHistory refreshKey={refreshKey} />
    </div>
  );
}

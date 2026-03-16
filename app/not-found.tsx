import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 12rem)' }}>
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-ink-muted mb-1">404</p>
        <h2 className="text-lg font-semibold text-ink mb-2">Page not found</h2>
        <p className="text-sm text-ink-secondary mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="console-button-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

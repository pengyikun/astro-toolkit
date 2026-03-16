import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  filters?: Record<string, string>;
}

export default function Pagination({ page, totalPages, total, basePath, filters = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (p: number) => {
    const params = new URLSearchParams(filters);
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (Math.abs(i - page) <= 1 || i === 1 || i === totalPages) {
      pages.push(i);
    } else if (Math.abs(i - page) === 2) {
      pages.push('ellipsis');
    }
  }

  return (
    <nav className="px-4 py-4 border-t border-border/70 bg-white/50 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-ink-secondary">
        Page <span className="font-semibold text-ink">{page}</span> of <span className="font-semibold text-ink">{totalPages}</span>
        <span className="text-ink-muted"> / </span>
        <span className="font-semibold text-ink">{total}</span> records
      </p>
      <div className="flex flex-wrap gap-2">
        {page > 1 && (
          <Link href={buildUrl(page - 1)} className="console-button-secondary !min-h-0 !px-3.5 !py-2 !text-xs" aria-label="Previous page">
            Previous
          </Link>
        )}
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="inline-flex items-center px-1 text-ink-muted">...</span>
          ) : p === page ? (
            <span key={p} className="console-button-primary !min-h-0 !px-3.5 !py-2 !text-xs" aria-current="page">{p}</span>
          ) : (
            <Link key={p} href={buildUrl(p)} className="console-button-secondary !min-h-0 !px-3.5 !py-2 !text-xs" aria-label={`Page ${p}`}>
              {p}
            </Link>
          )
        )}
        {page < totalPages && (
          <Link href={buildUrl(page + 1)} className="console-button-secondary !min-h-0 !px-3.5 !py-2 !text-xs" aria-label="Next page">
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

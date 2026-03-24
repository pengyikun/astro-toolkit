import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  filters?: Record<string, string>;
}

export default async function Pagination({ page, totalPages, total, basePath, filters = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

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
    <nav className="rounded-xl border border-border bg-panel px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-ink-secondary">
        {t(dict, 'pagination.page')} <span className="font-semibold text-ink">{page}</span> {t(dict, 'pagination.of')} <span className="font-semibold text-ink">{totalPages}</span>
        <span className="text-ink-muted"> / </span>
        <span className="font-semibold text-ink">{total}</span> {t(dict, 'pagination.records')}
      </p>
      <div className="flex flex-wrap gap-2">
        {page > 1 && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildUrl(page - 1)} aria-label={t(dict, 'pagination.previousPage')}>
              {t(dict, 'pagination.previous')}
            </Link>
          </Button>
        )}
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="inline-flex items-center px-1 text-ink-muted">...</span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className={cn(buttonVariants({ size: 'sm' }), 'cursor-default')}
            >
              {p}
            </span>
          ) : (
            <Button variant="outline" size="sm" asChild key={p}>
              <Link href={buildUrl(p)} aria-label={t(dict, 'pagination.goToPage', { page: p })}>
                {p}
              </Link>
            </Button>
          )
        )}
        {page < totalPages && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildUrl(page + 1)} aria-label={t(dict, 'pagination.nextPage')}>
              {t(dict, 'pagination.next')}
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}

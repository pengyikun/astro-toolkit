import Link from 'next/link';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default async function NotFound() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <p className="mb-1 text-sm font-medium text-ink-muted">404</p>
          <h2 className="mb-2 text-lg font-semibold text-ink">{t(dict, 'error.pageNotFound')}</h2>
          <p className="mb-6 text-sm leading-6 text-ink-secondary">{t(dict, 'error.pageNotFoundDescription')}</p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              {t(dict, 'error.backToDashboard')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

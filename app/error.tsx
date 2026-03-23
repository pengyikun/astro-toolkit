'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { ErrorCircleIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center">
      <Card className="w-full max-w-md border-danger-border bg-danger-light/30">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger">
            <ErrorCircleIcon className="h-6 w-6" />
          </div>

          <p className="mb-1 text-sm font-medium text-ink-muted">500</p>
          <h2 className="mb-2 text-lg font-semibold text-ink">{error.message || t('error.somethingWentWrong')}</h2>
          <p className="mb-6 text-sm leading-6 text-ink-secondary">{t('error.somethingWentWrongDescription')}</p>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={reset}>
              {t('error.tryAgain')}
            </Button>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                {t('error.backToDashboard')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

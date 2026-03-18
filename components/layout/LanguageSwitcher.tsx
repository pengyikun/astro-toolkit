'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';
import { setLocaleCookie } from '@/lib/i18n/client';
import { locales, localeNames } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/types';

export default function LanguageSwitcher() {
  const { locale } = useLocale();
  const router = useRouter();

  function handleSwitch(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  const nextLocale = locales.find((l) => l !== locale) ?? locales[0];

  return (
    <button
      type="button"
      className="signal-chip"
      onClick={() => handleSwitch(nextLocale)}
      title={`Switch to ${localeNames[nextLocale]}`}
    >
      {localeNames[locale]}
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useLocale, setLocaleCookie } from '@/lib/i18n/client';
import { locales, localeNames } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/types';

export default function LanguageSwitcher() {
  const { locale, t } = useLocale();
  const router = useRouter();

  function handleSwitch(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <div className="locale-segmented" role="radiogroup" aria-label={t('a11y.languageSwitcher')}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === locale}
          className={`locale-segment ${l === locale ? 'is-active' : ''}`}
          onClick={() => handleSwitch(l)}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}

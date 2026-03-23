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

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = (index + direction + locales.length) % locales.length;
    handleSwitch(locales[nextIndex]);
  }

  return (
    <div className="locale-segmented" role="radiogroup" aria-label={t('a11y.languageSwitcher')}>
      {locales.map((l, index) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === locale}
          tabIndex={l === locale ? 0 : -1}
          className={`locale-segment ${l === locale ? 'is-active' : ''}`}
          onClick={() => handleSwitch(l)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}

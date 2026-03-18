'use client';

import { createContext, useContext } from 'react';
import type { Locale } from './types';
import type { Dictionary } from './index';

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  t: (key: string) => string;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const t = (key: string) => dict[key] ?? key;
  return (
    <LocaleContext.Provider value={{ locale, dict, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}

export function setLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

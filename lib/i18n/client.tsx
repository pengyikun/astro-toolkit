'use client';

import { createContext, useContext } from 'react';
import type { Locale } from './types';
import type { Dictionary } from './index';

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  t: (key: string, values?: Record<string, string | number>) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string;
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
  const t = (key: string, values?: Record<string, string | number>) => {
    const raw = dict[key] ?? key;
    if (!values) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
      k in values ? String(values[k]) : `{${k}}`
    );
  };
  const formatDate = (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(typeof value === 'string' ? new Date(value) : value);
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, options).format(value);
  const formatCurrency = (value: number, currency: string, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, { ...options, style: 'currency', currency }).format(value);
  return (
    <LocaleContext.Provider value={{ locale, dict, t, formatDate, formatNumber, formatCurrency }}>
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

import { cookies } from 'next/headers';
import type { Locale } from './types';
import { defaultLocale, locales, localeNames } from './types';
import en from './dictionaries/en';
import zhCN from './dictionaries/zh-CN';

export type { Locale };
export { defaultLocale, locales, localeNames };

export type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  'zh-CN': zhCN,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export async function getLocaleFromCookies(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get('locale')?.value;
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return defaultLocale;
}

export function t(dict: Dictionary, key: string, values?: Record<string, string | number>): string {
  const raw = dict[key] ?? key;
  if (!values) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in values ? String(values[k]) : `{${k}}`
  );
}

export function formatDate(locale: Locale, value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(typeof value === 'string' ? new Date(value) : value);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(locale: Locale, value: number, currency: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, { ...options, style: 'currency', currency }).format(value);
}

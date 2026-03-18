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

export function t(dict: Dictionary, key: string): string {
  return dict[key] ?? key;
}

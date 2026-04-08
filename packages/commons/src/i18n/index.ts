export type { Locale, LocaleStrings, NumberFormatConfig, DateFormatConfig } from './types.js';
export { en } from './en.js';
export { vi } from './vi.js';

import type { Locale, LocaleStrings, NumberFormatConfig } from './types.js';
import { en } from './en.js';
import { vi } from './vi.js';

const locales = new Map<string, LocaleStrings>([
  ['en', en],
  ['vi', vi],
]);

let currentLocale: Locale = 'en';
let currentStrings: LocaleStrings = en;

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  currentStrings = locales.get(locale) ?? en;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: keyof LocaleStrings): string {
  return currentStrings[key] ?? (en as any)[key] ?? key;
}

export function registerLocale(locale: string, strings: LocaleStrings): void {
  locales.set(locale, strings);
}

export function getLocaleStrings(locale?: string): LocaleStrings {
  return locales.get(locale ?? currentLocale) ?? en;
}

// Number formatting
export function formatNumber(value: number, precision = 2, locale?: string): string {
  const strings = locales.get(locale ?? currentLocale) ?? en;
  const dec = strings.numberDecimalSeparator;
  const grp = strings.numberGroupSeparator;

  const fixed = value.toFixed(precision);
  const [intPart, decPart] = fixed.split('.');

  // Group integer part
  const negative = intPart.startsWith('-');
  const digits = negative ? intPart.slice(1) : intPart;
  let grouped = '';
  for (let i = digits.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) grouped = grp + grouped;
    grouped = digits[i] + grouped;
  }
  if (negative) grouped = '-' + grouped;

  return decPart ? grouped + dec + decPart : grouped;
}

export function formatVND(value: number): string {
  return formatNumber(value, 0, 'vi');
}

export function formatVolumeLoc(value: number, locale?: string): string {
  const strings = locales.get(locale ?? currentLocale) ?? en;
  if (value >= 1e9) return formatNumber(value / 1e9, 2, locale ?? currentLocale) + 'B';
  if (value >= 1e6) return formatNumber(value / 1e6, 2, locale ?? currentLocale) + 'M';
  if (value >= 1e3) return formatNumber(value / 1e3, 2, locale ?? currentLocale) + 'K';
  return formatNumber(value, 0, locale ?? currentLocale);
}

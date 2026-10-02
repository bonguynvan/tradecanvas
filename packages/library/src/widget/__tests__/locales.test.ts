import { describe, it, expect, afterEach } from 'vitest';
import { WIDGET_LANGUAGES, registerWidgetLocales, ja, zhHant, pt } from '../locales/index.js';
import { EN_MESSAGES, findWidgetLocale, resolveMessages, registerWidgetLocale, fill } from '../i18n.js';

const keys = Object.keys(EN_MESSAGES) as (keyof typeof EN_MESSAGES)[];
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('built-in widget languages', () => {
  it.each(WIDGET_LANGUAGES.map((l) => [l.code, l] as const))('%s translates every string', (_code, language) => {
    for (const key of keys) {
      const text = language.messages[key];
      expect(text, `${language.code}: ${key}`).toBeTypeOf('string');
      expect(text.trim(), `${language.code}: ${key}`).not.toBe('');
      expect(placeholders(text), `${language.code}: ${key}`).toEqual(placeholders(EN_MESSAGES[key]));
    }
  });

  it('has a working number format for each language', () => {
    for (const language of WIDGET_LANGUAGES) {
      expect(() => new Intl.NumberFormat(language.numberLocale).format(1)).not.toThrow();
    }
  });

  it('has no duplicate codes', () => {
    const codes = WIDGET_LANGUAGES.map((l) => l.code.toLowerCase());
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('locale lookup', () => {
  afterEach(() => {
    registerWidgetLocale('ja', {});
    registerWidgetLocale('zh-hant', {});
    registerWidgetLocale('pt', {});
  });

  it('falls back from a region to its language, and Chinese regions to their script', () => {
    registerWidgetLocales();
    expect(findWidgetLocale('ja-JP')).toBe(ja);
    expect(findWidgetLocale('JA')).toBe(ja);
    expect(findWidgetLocale('pt-BR')).toBe(pt);
    expect(findWidgetLocale('zh-TW')).toBe(zhHant);
    expect(findWidgetLocale('zh_HK')).toBe(zhHant);
    expect(findWidgetLocale('zh-CN')).not.toBe(zhHant);
  });

  it('lets messages passed in win over the registered table', () => {
    const messages = resolveMessages('ja', { ...ja, 'watchlist.title': 'Mine' });
    expect(messages['watchlist.title']).toBe('Mine');
    expect(messages['toolbar.indicators']).toBe(ja['toolbar.indicators']);
  });
});

describe('fill', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(fill('{count} bars from {file}', { count: 3, file: 'a.csv' })).toBe('3 bars from a.csv');
    expect(fill('Hi {name}', {})).toBe('Hi {name}');
  });
});

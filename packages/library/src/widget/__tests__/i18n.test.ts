import { describe, it, expect } from 'vitest';
import { resolveMessages, createTranslator, EN_MESSAGES, VI_MESSAGES } from '../i18n.js';

describe('resolveMessages', () => {
  it('defaults to the full English table when no locale or overrides are given', () => {
    const messages = resolveMessages(undefined, undefined);
    expect(messages).toEqual(EN_MESSAGES);
  });

  it('layers a built-in locale over English, falling back key-by-key for untranslated entries', () => {
    const messages = resolveMessages('vi', undefined);
    expect(messages['toolbar.indicators']).toBe(VI_MESSAGES['toolbar.indicators']);
    // Every VI_MESSAGES key should win over its EN_MESSAGES counterpart.
    for (const key of Object.keys(VI_MESSAGES) as (keyof typeof VI_MESSAGES)[]) {
      expect(messages[key]).toBe(VI_MESSAGES[key]);
    }
  });

  it('ignores an unknown locale and falls back to English', () => {
    const messages = resolveMessages('fr', undefined);
    expect(messages).toEqual(EN_MESSAGES);
  });

  it('host-supplied messages take precedence over the built-in locale table', () => {
    const messages = resolveMessages('vi', { 'watchlist.title': 'Danh sách tùy chỉnh' });
    expect(messages['watchlist.title']).toBe('Danh sách tùy chỉnh');
    // Unrelated keys still come from the Vietnamese table.
    expect(messages['toolbar.indicators']).toBe(VI_MESSAGES['toolbar.indicators']);
  });
});

describe('createTranslator', () => {
  it('returns the resolved message for a known key', () => {
    const t = createTranslator(resolveMessages('vi', undefined));
    expect(t('status.live')).toBe('Trực tiếp');
  });

  it('falls back to the raw key when it is missing from both the table and EN_MESSAGES', () => {
    const t = createTranslator({ ...EN_MESSAGES } as Record<string, string> as Parameters<typeof createTranslator>[0]);
    // @ts-expect-error — deliberately querying a key outside the known union to exercise the fallback.
    expect(t('not.a.real.key')).toBe('not.a.real.key');
  });
});

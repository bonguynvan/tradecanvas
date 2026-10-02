import { describe, it, expect } from 'vitest';
import en from './locales/en';
import { DEFAULT_LANG, SITE_LANGUAGES, docsLang } from './languages';
import { localizePath, splitLang, switchLang } from './paths';
import { fill } from './messages';
import { DOC_SLUGS } from '../docs';

const dictionaries = import.meta.glob<{ default: unknown }>('./locales/*.ts', { eager: true });
const docPages = new Set(Object.keys(import.meta.glob('../docs/*/*.svelte')));

type Tree = string | Tree[] | { [key: string]: Tree };

/** Placeholders a string may use or leave out: the code always passes them. */
const OPTIONAL: Record<string, string[]> = { notTranslated: ['language'] };

const placeholders = (s: string, key: string) =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((name) => !OPTIONAL[key]?.includes(name)).sort();
const tags = (s: string) => [...s.matchAll(/<\/?([a-z]+)[^>]*>/g)].map((m) => m[0].startsWith('</') ? `/${m[1]}` : m[1]);

/** Every way `other` differs from `source`: missing or extra keys, array lengths, placeholders, markup. */
function differences(source: Tree, other: unknown, path: string, key = ''): string[] {
  if (typeof source === 'string') {
    if (typeof other !== 'string' || other.trim() === '') return [`${path}: not a string`];
    const out: string[] = [];
    if (placeholders(source, key).join() !== placeholders(other, key).join()) out.push(`${path}: placeholders differ`);
    if (key.endsWith('Html') && tags(source).sort().join() !== tags(other).sort().join()) out.push(`${path}: markup differs`);
    return out;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(other) || other.length !== source.length) return [`${path}: needs ${source.length} items`];
    return source.flatMap((item, i) => differences(item, other[i], `${path}[${i}]`, key));
  }
  if (typeof other !== 'object' || other === null || Array.isArray(other)) return [`${path}: not an object`];
  const theirs = other as Record<string, unknown>;
  const extra = Object.keys(theirs).filter((k) => !(k in source)).map((k) => `${path}.${k}: not in English`);
  return [...extra, ...Object.entries(source).flatMap(([k, v]) => differences(v, theirs[k], `${path}.${k}`, k))];
}

describe('site strings', () => {
  it('has a dictionary for every language', () => {
    for (const { code } of SITE_LANGUAGES) expect(dictionaries[`./locales/${code}.ts`], code).toBeDefined();
  });

  it.each(SITE_LANGUAGES.map((l) => l.code))('%s has the English keys, placeholders and markup', (code) => {
    const dictionary = dictionaries[`./locales/${code}.ts`]?.default;
    expect(differences(en as Tree, dictionary, code)).toEqual([]);
  });

  it('fills placeholders and leaves unknown ones', () => {
    expect(fill('{n} bars in {x}', { n: 3 })).toBe('3 bars in {x}');
  });
});

describe('docs pages', () => {
  it.each(SITE_LANGUAGES.filter((l) => l.docs).map((l) => l.code))('%s has every page', (code) => {
    const missing = DOC_SLUGS.filter((slug) => !docPages.has(`../docs/${code}/${slug}.svelte`));
    expect(missing).toEqual([]);
  });

  it('shows English docs for a language without its own', () => {
    expect(docsLang('fr')).toBe(DEFAULT_LANG);
    expect(docsLang('ja')).toBe('ja');
  });
});

describe('language paths', () => {
  it('keeps English at the root and prefixes the rest', () => {
    expect(localizePath('en', '/docs/api/')).toBe('/docs/api/');
    expect(localizePath('ja', '/docs/api/')).toBe('/ja/docs/api/');
    expect(localizePath('ja', '/')).toBe('/ja/');
  });

  it('reads the language off a path, and only real languages', () => {
    expect(splitLang('/zh-hant/examples/')).toEqual({ lang: 'zh-hant', path: '/examples/' });
    expect(splitLang('/docs/api/')).toEqual({ lang: 'en', path: '/docs/api/' });
    expect(splitLang('/en/')).toEqual({ lang: 'en', path: '/en/' });
  });

  it('switches a page to another language', () => {
    expect(switchLang('/vi/docs/api/', 'ko')).toBe('/ko/docs/api/');
    expect(switchLang('/vi/docs/api/', 'en')).toBe('/docs/api/');
  });
});

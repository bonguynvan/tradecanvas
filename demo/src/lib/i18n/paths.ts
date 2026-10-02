import { DEFAULT_LANG, isSiteLang } from './languages';

/**
 * `path` (from the site root, e.g. `/docs/api`) in `lang`: English stays at
 * the root, the others under their code (`/ja/docs/api`). No base path.
 */
export function localizePath(lang: string, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return clean;
  return clean === '/' ? `/${lang}/` : `/${lang}${clean}`;
}

/** The language a site path (without the base path) is in, and the path without it. */
export function splitLang(path: string): { lang: string; path: string } {
  const match = /^\/([^/]+)(\/.*)?$/.exec(path);
  if (match && match[1] !== DEFAULT_LANG && isSiteLang(match[1])) {
    return { lang: match[1], path: match[2] ?? '/' };
  }
  return { lang: DEFAULT_LANG, path: path || '/' };
}

/** The same page in another language. `path` is without the base path. */
export function switchLang(path: string, lang: string): string {
  return localizePath(lang, splitLang(path).path);
}

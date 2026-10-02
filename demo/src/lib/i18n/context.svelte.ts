import { getContext, setContext } from 'svelte';
import { base } from '$app/paths';
import { localizePath } from './paths';
import { siteLanguage, type SiteLanguage } from './languages';
import type { SiteMessages } from './messages';

/** The page's language and strings, shared by everything under the site layout. */
export class SiteI18n {
  lang = $state('en');
  m = $state.raw<SiteMessages>(null as unknown as SiteMessages);

  constructor(lang: string, messages: SiteMessages) {
    this.lang = lang;
    this.m = messages;
  }

  get language(): SiteLanguage {
    return siteLanguage(this.lang);
  }

  /** A link to `path` (from the site root, e.g. `/docs/api`) in the page's language, base path included. */
  href = (path: string): string => base + localizePath(this.lang, path);
}

const KEY = Symbol('site-i18n');

export function provideI18n(i18n: SiteI18n): SiteI18n {
  return setContext(KEY, i18n);
}

export function useI18n(): SiteI18n {
  const i18n = getContext<SiteI18n | undefined>(KEY);
  if (!i18n) throw new Error('useI18n() outside the site layout');
  return i18n;
}

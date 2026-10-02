/** A language the site is shown in. */
export interface SiteLanguage {
  /** The URL prefix (`/ja/…`), and the widget's locale code. English has no prefix. */
  code: string;
  /** The language's own name for itself, for the language menu. */
  name: string;
  /** BCP 47 tag for `<html lang>` and `hreflang`. */
  tag: string;
  /** Whether the docs pages are translated; the rest show the English docs. */
  docs: boolean;
  /** Open Graph locale (`og:locale`). */
  og: string;
}

export const DEFAULT_LANG = 'en';

/** Every language of the site, in the order the language menu lists them. */
export const SITE_LANGUAGES: readonly SiteLanguage[] = [
  { code: 'en', name: 'English', tag: 'en', docs: true, og: 'en_US' },
  { code: 'vi', name: 'Tiếng Việt', tag: 'vi', docs: true, og: 'vi_VN' },
  { code: 'zh', name: '简体中文', tag: 'zh-Hans', docs: true, og: 'zh_CN' },
  { code: 'zh-hant', name: '繁體中文', tag: 'zh-Hant', docs: false, og: 'zh_TW' },
  { code: 'ja', name: '日本語', tag: 'ja', docs: true, og: 'ja_JP' },
  { code: 'ko', name: '한국어', tag: 'ko', docs: true, og: 'ko_KR' },
  { code: 'es', name: 'Español', tag: 'es', docs: true, og: 'es_ES' },
  { code: 'pt', name: 'Português', tag: 'pt', docs: false, og: 'pt_BR' },
  { code: 'fr', name: 'Français', tag: 'fr', docs: false, og: 'fr_FR' },
  { code: 'de', name: 'Deutsch', tag: 'de', docs: false, og: 'de_DE' },
  { code: 'ru', name: 'Русский', tag: 'ru', docs: false, og: 'ru_RU' },
  { code: 'tr', name: 'Türkçe', tag: 'tr', docs: false, og: 'tr_TR' },
  { code: 'id', name: 'Bahasa Indonesia', tag: 'id', docs: false, og: 'id_ID' },
  { code: 'th', name: 'ไทย', tag: 'th', docs: false, og: 'th_TH' },
];

const BY_CODE = new Map(SITE_LANGUAGES.map((language) => [language.code, language]));

export function isSiteLang(code: string | undefined): code is string {
  return code !== undefined && BY_CODE.has(code);
}

export function siteLanguage(code: string): SiteLanguage {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LANG)!;
}

/** The language a docs page is shown in: its own when translated, else English. */
export function docsLang(code: string): string {
  return siteLanguage(code).docs ? code : DEFAULT_LANG;
}

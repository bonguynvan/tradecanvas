import type en from './locales/en';
import { DEFAULT_LANG } from './languages';

/** The site's strings: every language has the shape of the English ones. */
export type SiteMessages = typeof en;

// One chunk per language, loaded for the page's language only.
const loaders = import.meta.glob<{ default: SiteMessages }>('./locales/*.ts');

export async function loadMessages(lang: string): Promise<SiteMessages> {
  const load = loaders[`./locales/${lang}.ts`] ?? loaders[`./locales/${DEFAULT_LANG}.ts`];
  return (await load()).default;
}

/** `template` with each `{name}` replaced by `values.name`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

import type { Component } from 'svelte';
import { DEFAULT_LANG } from '$lib/i18n/languages';

/** The docs pages, in sidebar order. Each is `./<lang>/<slug>.svelte`. */
export const DOC_GROUPS = [
  { key: 'start', slugs: ['getting-started', 'frameworks', 'embed'] },
  { key: 'chart', slugs: ['api', 'styling', 'customization', 'chart-types', 'indicators', 'drawing-tools', 'plugins', 'performance'] },
  { key: 'trading', slugs: ['trading', 'finance', 'realtime', 'analytics'] },
] as const;

export type DocSlug = (typeof DOC_GROUPS)[number]['slugs'][number];

export const DOC_SLUGS: readonly DocSlug[] = DOC_GROUPS.flatMap((group) => group.slugs);

export function isDocSlug(slug: string): slug is DocSlug {
  return (DOC_SLUGS as readonly string[]).includes(slug);
}

// One chunk per page and language, loaded when the page is opened.
const pages = import.meta.glob<{ default: Component }>('./*/*.svelte');

/** A docs page in `lang`, else in English; null for an unknown page. */
export async function loadDocPage(lang: string, slug: string): Promise<{ component: Component; lang: string } | null> {
  for (const shown of lang === DEFAULT_LANG ? [lang] : [lang, DEFAULT_LANG]) {
    const load = pages[`./${shown}/${slug}.svelte`];
    if (load) return { component: (await load()).default, lang: shown };
  }
  return null;
}

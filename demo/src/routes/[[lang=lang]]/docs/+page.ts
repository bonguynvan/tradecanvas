import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { EntryGenerator, PageLoad } from './$types';
import { DEFAULT_LANG, SITE_LANGUAGES } from '$lib/i18n/languages';
import { localizePath } from '$lib/i18n/paths';

export const prerender = true;

/** `/docs/` in every language: nothing links to it, so the crawler would miss it. */
export const entries: EntryGenerator = () =>
  SITE_LANGUAGES.map((language) => (language.code === DEFAULT_LANG ? {} : { lang: language.code }));

export const load: PageLoad = ({ params }) => {
  redirect(308, base + localizePath(params.lang ?? DEFAULT_LANG, '/docs/getting-started'));
};

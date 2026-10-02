import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageLoad } from './$types';
import { DEFAULT_LANG } from '$lib/i18n/languages';
import { localizePath } from '$lib/i18n/paths';

export const prerender = true;

export const load: PageLoad = ({ params }) => {
  redirect(308, base + localizePath(params.lang ?? DEFAULT_LANG, '/docs/getting-started'));
};

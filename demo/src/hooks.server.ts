import type { Handle } from '@sveltejs/kit';
import { base } from '$app/paths';
import { siteLanguage } from '$lib/i18n/languages';
import { splitLang } from '$lib/i18n/paths';

/** `<html lang>` for the page's language (app.html has `%lang%`). */
export const handle: Handle = ({ event, resolve }) => {
  const path = event.url.pathname.slice(base.length) || '/';
  const tag = siteLanguage(splitLang(path).lang).tag;
  return resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', tag) });
};

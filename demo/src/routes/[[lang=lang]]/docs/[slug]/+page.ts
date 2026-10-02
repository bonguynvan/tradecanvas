import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';
import { DOC_SLUGS, isDocSlug, loadDocPage } from '$lib/docs';
import { DEFAULT_LANG, SITE_LANGUAGES, docsLang } from '$lib/i18n/languages';

/** Every page in every language: languages without translated docs show English ones. */
export const entries: EntryGenerator = () =>
  SITE_LANGUAGES.flatMap((language) =>
    DOC_SLUGS.map((slug) => (language.code === DEFAULT_LANG ? { slug } : { lang: language.code, slug })),
  );

export const load: PageLoad = async ({ params }) => {
  const lang = params.lang ?? DEFAULT_LANG;
  const page = isDocSlug(params.slug) ? await loadDocPage(docsLang(lang), params.slug) : null;
  if (!page) error(404, 'Not found');
  return { component: page.component, slug: params.slug, translated: page.lang === lang };
};

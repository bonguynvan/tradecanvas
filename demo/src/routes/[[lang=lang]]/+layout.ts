import type { LayoutLoad } from './$types';
import { DEFAULT_LANG } from '$lib/i18n/languages';
import { loadMessages } from '$lib/i18n/messages';

export const load: LayoutLoad = async ({ params }) => {
  const lang = params.lang ?? DEFAULT_LANG;
  return { lang, messages: await loadMessages(lang) };
};

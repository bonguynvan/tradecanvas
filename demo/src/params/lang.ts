import type { ParamMatcher } from '@sveltejs/kit';
import { DEFAULT_LANG, isSiteLang } from '$lib/i18n/languages';

/** A language prefix (`ja`, `zh-hant`…); English has none. */
export const match: ParamMatcher = (param) => param !== DEFAULT_LANG && isSiteLang(param);

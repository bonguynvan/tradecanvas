import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Any other path is a 404 inside the site's layout, in the path's language.
// Nothing links here, so it is rendered on demand (by the 404.html fallback).
export const prerender = false;

export const load: PageLoad = () => {
  error(404, 'Not found');
};

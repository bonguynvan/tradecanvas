import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export const prerender = true;

export function load() {
  throw redirect(308, `${base}/docs/getting-started`);
}

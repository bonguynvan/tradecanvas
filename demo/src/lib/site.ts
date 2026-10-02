import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/chart';
import type { Theme } from '@tradecanvas/chart';
import chartPkg from '../../../packages/library/package.json';

/** Published version of `@tradecanvas/chart`, read at build time. */
export const VERSION: string = chartPkg.version;

/** The published site, for absolute links (hreflang, sitemap). */
export const SITE_URL = 'https://bonguynvan.github.io/tradecanvas';

export const LINKS = {
  github: 'https://github.com/bonguynvan/tradecanvas',
  issues: 'https://github.com/bonguynvan/tradecanvas/issues',
  npm: 'https://www.npmjs.com/package/@tradecanvas/chart',
  npmReact: 'https://www.npmjs.com/package/@tradecanvas/react',
  npmVue: 'https://www.npmjs.com/package/@tradecanvas/vue',
  npmSvelte: 'https://www.npmjs.com/package/@tradecanvas/svelte',
  boGrid: 'https://bonguynvan.github.io/bo-grid/',
} as const;

export function isLightPage(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('light');
}

/**
 * The chart theme for the page's current light/dark mode. The site shows the
 * library's own defaults, so what you see here is what `theme: 'dark'` gives.
 */
export function siteTheme(): Theme {
  return isLightPage() ? LIGHT_THEME : DARK_THEME;
}

/** Calls `apply` with the new chart theme whenever the page toggles light/dark. */
export function onSiteThemeChange(apply: (theme: Theme) => void): () => void {
  if (typeof document === 'undefined') return () => {};
  // body's class list also changes for other reasons (the mobile drawer's
  // scroll lock): only re-theme when light/dark actually flipped.
  let light = isLightPage();
  const observer = new MutationObserver(() => {
    if (isLightPage() === light) return;
    light = isLightPage();
    apply(siteTheme());
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

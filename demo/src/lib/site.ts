import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/chart';
import type { Theme } from '@tradecanvas/chart';
import chartPkg from '../../../packages/library/package.json';

/** Published version of `@tradecanvas/chart`, read at build time. */
export const VERSION: string = chartPkg.version;

export const LINKS = {
  github: 'https://github.com/bonguynvan/tradecanvas',
  issues: 'https://github.com/bonguynvan/tradecanvas/issues',
  npm: 'https://www.npmjs.com/package/@tradecanvas/chart',
  npmReact: 'https://www.npmjs.com/package/@tradecanvas/react',
  npmVue: 'https://www.npmjs.com/package/@tradecanvas/vue',
  npmSvelte: 'https://www.npmjs.com/package/@tradecanvas/svelte',
  boGrid: 'https://bonguynvan.github.io/bo-grid/',
} as const;

/**
 * Chart themes matching the site palette (ink ground, mint/coral candles),
 * so the live charts sit flush with the page instead of floating on the
 * library's default colours. Also a working example of a custom `Theme`.
 */
const UP = '#3ccf91';
const DOWN = '#f0616d';

export const SITE_DARK_THEME: Theme = {
  ...DARK_THEME,
  name: 'tradecanvas-ink',
  background: '#0d1117',
  text: '#d9dde4',
  textSecondary: '#7d8696',
  grid: '#161b23',
  crosshair: '#8a93a3',
  candleUp: UP,
  candleDown: DOWN,
  candleUpWick: UP,
  candleDownWick: DOWN,
  lineColor: '#f2a93b',
  areaTopColor: 'rgba(242, 169, 59, 0.32)',
  areaBottomColor: 'rgba(242, 169, 59, 0)',
  volumeUp: 'rgba(60, 207, 145, 0.28)',
  volumeDown: 'rgba(240, 97, 109, 0.28)',
  axisLine: '#1f2630',
  axisLabel: '#c3c9d3',
  axisLabelBackground: '#1f2630',
};

export const SITE_LIGHT_THEME: Theme = {
  ...LIGHT_THEME,
  name: 'tradecanvas-paper',
  background: '#ffffff',
  text: '#0f131a',
  textSecondary: '#6b7380',
  grid: '#eef0f3',
  crosshair: '#8a93a3',
  candleUp: '#16a36a',
  candleDown: '#d9414f',
  candleUpWick: '#16a36a',
  candleDownWick: '#d9414f',
  lineColor: '#9a5a00',
  areaTopColor: 'rgba(154, 90, 0, 0.22)',
  areaBottomColor: 'rgba(154, 90, 0, 0)',
  volumeUp: 'rgba(22, 163, 106, 0.25)',
  volumeDown: 'rgba(217, 65, 79, 0.25)',
  axisLine: '#dde1e7',
  axisLabel: '#3f4754',
  axisLabelBackground: '#eef0f3',
};

export function isLightPage(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('light');
}

/** The chart theme for the page's current light/dark mode. */
export function siteTheme(): Theme {
  return isLightPage() ? SITE_LIGHT_THEME : SITE_DARK_THEME;
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

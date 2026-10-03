import type { Theme } from '../types/theme.js';
import { withAlpha } from '../utils/color.js';

/** The chart's own type: the system UI face, so text matches the page around it. */
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const DEFAULT_FONT = {
  family: DEFAULT_FONT_FAMILY,
  sizeSmall: 10,
  sizeMedium: 12,
  sizeLarge: 14,
};

/**
 * TradeCanvas palette. Themes pick their own candle colours for their
 * background; everything drawn on top of either theme (indicators, orders,
 * signals, drawings) uses the theme-neutral values below, which keep at
 * least 3:1 contrast on both the dark ink and a white background. `amber` is
 * the brand accent for dark surfaces (2:1 on white); light surfaces use
 * `LIGHT_THEME.lineColor` / `ochre` instead.
 */
export const TC_PALETTE = {
  /** Brand amber — the default series line and the accent. */
  amber: '#f2a93b',
  /** Rising / bullish, legible on dark and light. */
  up: '#1fa874',
  /** Falling / bearish, legible on dark and light. */
  down: '#e8505b',
  /** Amber deep enough for white backgrounds; auto-coloured series use it. */
  ochre: '#c98316',
  /** Secondary series, signal lines. */
  blue: '#4c8dff',
  violet: '#a57cff',
  cyan: '#1398a8',
  rose: '#e25592',
  /** Zero lines, neutral guides. */
  neutral: '#7d8696',
  /** Ink ground of the dark theme. */
  ink: '#0c1016',
} as const;

/**
 * How strongly volume bars show: the candle colour at this opacity, so they
 * read as a backdrop under the candles rather than a second chart.
 */
export const VOLUME_ALPHA = 0.22;

/** The volume bar colour for a candle colour. */
export function volumeColor(candleColor: string): string {
  return withAlpha(candleColor, VOLUME_ALPHA);
}

const DARK_UP = '#2eb88a';
const DARK_DOWN = '#e85a67';

/** Order in which overlay indicators are coloured when no colour is given. */
export const TC_SERIES_COLORS: readonly string[] = [
  TC_PALETTE.blue,
  TC_PALETTE.ochre,
  TC_PALETTE.violet,
  TC_PALETTE.cyan,
  TC_PALETTE.rose,
];

export const DARK_THEME: Theme = {
  name: 'dark',
  background: TC_PALETTE.ink,
  text: '#d9dde4',
  textSecondary: '#7d8696',
  grid: '#161b23',
  crosshair: '#8a93a3',
  candleUp: DARK_UP,
  candleDown: DARK_DOWN,
  candleUpWick: DARK_UP,
  candleDownWick: DARK_DOWN,
  lineColor: TC_PALETTE.amber,
  areaTopColor: 'rgba(242, 169, 59, 0.32)',
  areaBottomColor: 'rgba(242, 169, 59, 0.0)',
  volumeUp: volumeColor(DARK_UP),
  volumeDown: volumeColor(DARK_DOWN),
  axisLine: '#1f2630',
  axisLabel: '#9aa3b2',
  axisLabelBackground: '#1f2630',
  font: DEFAULT_FONT,
};

export const LIGHT_THEME: Theme = {
  name: 'light',
  background: '#ffffff',
  text: '#0f131a',
  textSecondary: '#6b7380',
  grid: '#eef0f3',
  crosshair: '#8a93a3',
  candleUp: '#16a36a',
  candleDown: '#d9414f',
  candleUpWick: '#16a36a',
  candleDownWick: '#d9414f',
  lineColor: '#c77a0a',
  areaTopColor: 'rgba(199, 122, 10, 0.24)',
  areaBottomColor: 'rgba(199, 122, 10, 0.0)',
  volumeUp: volumeColor('#16a36a'),
  volumeDown: volumeColor('#d9414f'),
  axisLine: '#dde1e7',
  axisLabel: '#5b6472',
  axisLabelBackground: '#eef0f3',
  font: DEFAULT_FONT,
};

export const DARK_TERMINAL: Theme = {
  name: 'terminal',
  background: '#0E0E0E',
  text: '#C0C0C0',
  textSecondary: '#8A8A8A',
  grid: '#1A1A1A',
  crosshair: '#666666',
  candleUp: '#00FF87',
  candleDown: '#FF3B4D',
  candleUpWick: '#00FF87',
  candleDownWick: '#FF3B4D',
  lineColor: '#3D8BFD',
  areaTopColor: 'rgba(61, 139, 253, 0.3)',
  areaBottomColor: 'rgba(61, 139, 253, 0.0)',
  volumeUp: 'rgba(0, 255, 135, 0.2)',
  volumeDown: 'rgba(255, 59, 77, 0.2)',
  axisLine: '#1A1A1A',
  axisLabel: '#8A8A8A',
  axisLabelBackground: '#1A1A1A',
  font: {
    family: "'Roboto Mono', 'JetBrains Mono', 'SF Mono', Consolas, monospace",
    sizeSmall: 10,
    sizeMedium: 12,
    sizeLarge: 14,
  },
};

/** The built-in themes' volume colours, to tell a preset's from a theme's own. */
const PRESET_VOLUME = new Set([DARK_THEME.volumeUp, DARK_THEME.volumeDown, LIGHT_THEME.volumeUp, LIGHT_THEME.volumeDown, DARK_TERMINAL.volumeUp, DARK_TERMINAL.volumeDown]);

/**
 * The volume bars' colours for `theme`: its own `volumeUp` / `volumeDown`,
 * except that a theme spread from a preset with new candle colours (and the
 * preset's volume left in place) gets volume in its candles' colours, as the
 * bars have always followed the candles.
 */
export function resolveVolumeColors(theme: Pick<Theme, 'candleUp' | 'candleDown' | 'volumeUp' | 'volumeDown'>): { up: string; down: string } {
  const pick = (volume: string, candle: string): string => {
    if (!PRESET_VOLUME.has(volume)) return volume;
    const derived = volumeColor(candle);
    return derived === candle ? volume : derived;
  };
  return { up: pick(theme.volumeUp, theme.candleUp), down: pick(theme.volumeDown, theme.candleDown) };
}

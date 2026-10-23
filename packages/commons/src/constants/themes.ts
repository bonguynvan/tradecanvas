import type { Theme } from '../types/theme.js';
import { withAlpha } from '../utils/color.js';

/**
 * The chart's own type: a monospaced face, so the figures on the axes, in the
 * legend and on the tags line up in columns, as in a printed price table.
 */
export const DEFAULT_FONT_FAMILY = "'Cascadia Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace";

/** Three sizes a third of φ apart (11, 13, 15), as the widget's type scale climbs. */
const DEFAULT_FONT = {
  family: DEFAULT_FONT_FAMILY,
  sizeSmall: 11,
  sizeMedium: 13,
  sizeLarge: 15,
};

/**
 * TradeCanvas palette. Themes pick their own candle colours for their
 * background; everything drawn on top of either theme (indicators, orders,
 * signals, drawings) uses the theme-neutral values below, which keep at
 * least 3:1 contrast on both the dark ink and the light paper. `amber` is
 * the brand accent for dark surfaces (2:1 on paper); light surfaces use
 * `ochre` instead.
 */
export const TC_PALETTE = {
  /** Brand amber, for marks on dark surfaces. */
  amber: '#f2a93b',
  /** Rising / bullish, legible on dark and light. */
  up: '#1c9e6d',
  /** Falling / bearish, legible on dark and light. */
  down: '#e8505b',
  /** Amber deep enough for white backgrounds; auto-coloured series use it. */
  ochre: '#c07c12',
  /** Secondary series, signal lines. */
  blue: '#4688fa',
  violet: '#9c73f8',
  cyan: '#1398a8',
  rose: '#e25592',
  /** Zero lines, neutral guides. */
  neutral: '#7d8696',
  /** Ink ground of the dark theme. */
  ink: '#131416',
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

/**
 * The built-in themes are paper and ink: an off-white and an off-black, never
 * pure, so text doesn't glare; grey for everything that is normal; colour
 * only where it means something (up, down, your orders). Volume is the ink at
 * low strength, lighter under falling bars: the candles above already say
 * which way the price went.
 */
const PAPER = '#fbfaf6';
const PAPER_INK = '#1b1d21';
const NIGHT = '#131416';
const NIGHT_INK = '#e6e3dc';
const LIGHT_UP = '#1f7a5c';
const LIGHT_DOWN = '#b8423f';
const DARK_UP = '#4fae8a';
const DARK_DOWN = '#e2706b';
/**
 * The crosshair is the ink faded into the ground, mixed rather than
 * translucent: bar tints and guides drawn in it at their own opacity keep
 * their strength. 3:1 on the ground, quiet beside the data.
 */
const NIGHT_CROSSHAIR = '#6a6966';
const PAPER_CROSSHAIR = '#8d8a84';

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
  background: NIGHT,
  text: NIGHT_INK,
  textSecondary: '#8d8b86',
  grid: '#1d1e21',
  crosshair: NIGHT_CROSSHAIR,
  candleUp: DARK_UP,
  candleDown: DARK_DOWN,
  candleUpWick: DARK_UP,
  candleDownWick: DARK_DOWN,
  lineColor: NIGHT_INK,
  areaTopColor: withAlpha(NIGHT_INK, 0.14),
  areaBottomColor: withAlpha(NIGHT_INK, 0),
  volumeUp: withAlpha(NIGHT_INK, 0.14),
  volumeDown: withAlpha(NIGHT_INK, 0.08),
  axisLine: '#2a2b2f',
  axisLabel: '#a9a6a0',
  axisLabelBackground: '#232427',
  font: DEFAULT_FONT,
};

export const LIGHT_THEME: Theme = {
  name: 'light',
  background: PAPER,
  text: PAPER_INK,
  textSecondary: '#6b6f76',
  grid: '#ece8df',
  crosshair: PAPER_CROSSHAIR,
  candleUp: LIGHT_UP,
  candleDown: LIGHT_DOWN,
  candleUpWick: LIGHT_UP,
  candleDownWick: LIGHT_DOWN,
  lineColor: PAPER_INK,
  areaTopColor: withAlpha(PAPER_INK, 0.12),
  areaBottomColor: withAlpha(PAPER_INK, 0),
  volumeUp: withAlpha(PAPER_INK, 0.13),
  volumeDown: withAlpha(PAPER_INK, 0.08),
  axisLine: '#cfcac0',
  axisLabel: '#4a4e57',
  axisLabelBackground: '#eeebe3',
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
  volumeUp: volumeColor('#00FF87'),
  volumeDown: volumeColor('#FF3B4D'),
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

/** The volume colours of the presets that draw volume in their candles' colours. */
const PRESET_VOLUME = new Set([DARK_TERMINAL.volumeUp, DARK_TERMINAL.volumeDown]);

/**
 * The volume bars' colours for `theme`: its own `volumeUp` / `volumeDown`,
 * except that a theme spread from a candle-coloured preset with new candle
 * colours (and the preset's volume left in place) gets volume in its new
 * candles' colours. Neutral volume stays neutral whatever the candles.
 */
export function resolveVolumeColors(theme: Pick<Theme, 'candleUp' | 'candleDown' | 'volumeUp' | 'volumeDown'>): { up: string; down: string } {
  const pick = (volume: string, candle: string): string => {
    if (!PRESET_VOLUME.has(volume)) return volume;
    const derived = volumeColor(candle);
    return derived === candle ? volume : derived;
  };
  return { up: pick(theme.volumeUp, theme.candleUp), down: pick(theme.volumeDown, theme.candleDown) };
}

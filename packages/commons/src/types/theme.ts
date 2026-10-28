import type { ResolvedChartStyle } from './style.js';

export type ThemeName = 'dark' | 'light';

export interface FontConfig {
  family: string;
  sizeSmall: number;
  sizeMedium: number;
  sizeLarge: number;
}

export interface ShapeConfig {
  /** Corner radius of price tags, axis pills and order badges, px (0: square; 999: pills). */
  tagRadius?: number;
}

/** The day's price limits' colours: their lines, names and axis tags. */
export interface PriceLimitColors {
  ceiling: string;
  floor: string;
  reference: string;
}

export interface Theme {
  name: string;
  background: string;
  text: string;
  textSecondary: string;
  grid: string;
  crosshair: string;
  candleUp: string;
  candleDown: string;
  candleUpWick: string;
  candleDownWick: string;
  lineColor: string;
  areaTopColor: string;
  areaBottomColor: string;
  volumeUp: string;
  volumeDown: string;
  axisLine: string;
  axisLabel: string;
  axisLabelBackground: string;
  font: FontConfig;
  /** The shapes the chart draws: its price tags and axis pills square, rounded or pills. */
  shape?: ShapeConfig;
  /**
   * The price limits' colours when the market's colour scheme gives none.
   * Whichever colour they take, their names and axis tags are shaded to
   * read at 4.5:1 on the theme's background.
   */
  priceLimits?: PriceLimitColors;
  /**
   * The finer looks the chart worked out from its overrides
   * (`chart.applyOverrides`). Set by the chart on the theme it draws with;
   * yours needn't have one.
   */
  style?: ResolvedChartStyle;
}

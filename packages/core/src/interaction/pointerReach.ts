/** What pressed the chart: a mouse (or pen) or a finger. */
export type PointerKind = 'mouse' | 'touch';

/** How far, px, a finger may land from something and still take it. */
export interface PointerReach {
  /** A drawing's line or shape. */
  line: number;
  /** A handle of the selected drawing, or a bracket's / an order draft's line. */
  handle: number;
  /** A price-alert line. */
  alert: number;
  /** An order or position line. */
  order: number;
  /** Around a button on an order or position line. */
  button: number;
  /** A divider between panes. */
  divider: number;
}

/**
 * A finger covers about 40 px and hides what it presses, so it reaches
 * further than a mouse (whose reach each part keeps as its default, 2 to
 * 8 px): a handle about as wide as Apple's 44 pt target, lines about half that
 * each side.
 */
export const TOUCH_REACH: Readonly<PointerReach> = {
  line: 16,
  handle: 22,
  alert: 16,
  order: 16,
  button: 8,
  divider: 12,
};

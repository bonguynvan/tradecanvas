import type { DrawingLevel, DrawingOptionDefs } from '@tradecanvas/commons';

/**
 * Each Fibonacci ratio's colour: the ends neutral, the ratios between each a
 * hue of its own among the ones drawn together (shades that keep 3:1 as lines
 * on dark and on paper; their text is deepened where it needs to read), so
 * the levels read apart at a glance.
 */
export const FIB_LEVEL_COLORS: Readonly<Record<number, string>> = {
  0: '#787b86',
  0.236: '#e8505b',
  0.25: '#e8505b',
  0.382: '#d97a0e',
  0.5: '#1a9a6a',
  0.618: '#0e93a3',
  0.75: '#2f7fd8',
  0.786: '#5b6cf0',
  1: '#787b86',
  1.272: '#b25ad1',
  1.414: '#d6487f',
  1.618: '#2f7fd8',
  2: '#7a5cff',
  2.618: '#e8505b',
  3.618: '#b25ad1',
  4.236: '#d6487f',
};

/** `levelList` with each ratio in its Fibonacci colour. */
export function fibLevelList(shown: readonly number[], hidden: readonly number[] = []): DrawingLevel[] {
  return levelList(shown, hidden).map((level) => {
    const color = FIB_LEVEL_COLORS[level.value];
    return color ? { ...level, color } : level;
  });
}

/** Levels from ratios: `shown` visible, `hidden` listed but off until the user turns them on. */
export function levelList(shown: readonly number[], hidden: readonly number[] = []): DrawingLevel[] {
  return [
    ...shown.map((value) => ({ value, visible: true })),
    ...hidden.map((value) => ({ value, visible: false })),
  ].sort((a, b) => a.value - b.value);
}

/** Extend a line past its anchors, to the edge of the chart. */
export function extendOptions(left = false, right = false): DrawingOptionDefs {
  return {
    extendLeft: { kind: 'boolean', label: 'Extend left', default: left },
    extendRight: { kind: 'boolean', label: 'Extend right', default: right },
  };
}

/** A level line's price on the plot, shown unless turned off. */
export const SHOW_PRICE_OPTION: DrawingOptionDefs = {
  showPrice: { kind: 'boolean', label: 'Show price', default: true },
};

/** A Fibonacci tool's dashed line through its points, and all its levels in the drawing's colour. */
export const FIB_EXTRA_OPTIONS: DrawingOptionDefs = {
  trendLine: { kind: 'boolean', label: 'Trend line', default: true },
  oneColor: { kind: 'boolean', label: 'Use one color', default: false },
};

/** What the labels of horizontal Fibonacci levels show, and on which side. */
export const LEVEL_LABEL_OPTIONS: DrawingOptionDefs = {
  showLevels: { kind: 'boolean', label: 'Show levels', default: true },
  showPrices: { kind: 'boolean', label: 'Show prices', default: true },
  labelPosition: {
    kind: 'choice',
    label: 'Labels',
    default: 'left',
    choices: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }],
  },
};

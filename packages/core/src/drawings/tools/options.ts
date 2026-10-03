import type { DrawingLevel, DrawingOptionDefs } from '@tradecanvas/commons';

/**
 * Each Fibonacci ratio's colour: the ends neutral, the ratios between in the
 * chart's palette (shades that keep their contrast on dark and on white), so
 * the levels read apart at a glance.
 */
export const FIB_LEVEL_COLORS: Readonly<Record<number, string>> = {
  0: '#7d8696',
  0.236: '#e8505b',
  0.25: '#e8505b',
  0.382: '#c98316',
  0.5: '#1fa874',
  0.618: '#1398a8',
  0.75: '#1398a8',
  0.786: '#4c8dff',
  1: '#7d8696',
  1.272: '#a57cff',
  1.414: '#e25592',
  1.618: '#4c8dff',
  2: '#a57cff',
  2.618: '#e8505b',
  3.618: '#a57cff',
  4.236: '#e25592',
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

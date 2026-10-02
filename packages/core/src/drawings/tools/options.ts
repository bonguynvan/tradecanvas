import type { DrawingLevel, DrawingOptionDefs } from '@tradecanvas/commons';

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

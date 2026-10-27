import type {
  AnchorPoint,
  DrawingState,
  DrawingStyle,
  DrawingToolType,
  ViewportState,
} from '@tradecanvas/commons';

/**
 * A "unit" viewport: barWidth=10, barSpacing=0, no offset, chart starts at (0,0).
 * → barIndex N maps to pixel x = N*10 + 5 (centered on bar).
 * → priceRange [0, 100] over height 100 means priceToY(p) = 100 - p, so p=50 → y=50.
 */
export const unitViewport: ViewportState = {
  visibleRange: { from: 0, to: 100 },
  priceRange: { min: 0, max: 100 },
  barWidth: 10,
  barSpacing: 0,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 1000, height: 100 },
};

export const defaultStyle: DrawingStyle = {
  color: '#4c8dff',
  lineWidth: 1,
  lineStyle: 'solid',
};

export function drawing(
  type: DrawingToolType,
  anchors: AnchorPoint[],
  overrides: Partial<DrawingState> = {},
): DrawingState {
  return {
    id: overrides.id ?? `${type}-test`,
    type,
    anchors,
    style: { ...defaultStyle, ...overrides.style },
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    options: overrides.options,
    intervals: overrides.intervals,
    meta: overrides.meta,
  };
}

/**
 * Canvas stand-in that records what a tool draws: every method call (with
 * args) and every text drawn. Property writes (fillStyle, font…) are
 * accepted and ignored; measureText reports 6px per character.
 */
export function recordingCtx(): {
  ctx: CanvasRenderingContext2D;
  calls: { name: string; args: unknown[] }[];
  texts: string[];
} {
  const calls: { name: string; args: unknown[] }[] = [];
  const texts: string[] = [];
  const props: Record<string, unknown> = {};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      if (key in props) return props[key];
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
        if (key === 'fillText') texts.push(String(args[0]));
      };
    },
    set(_t, key: string, value) {
      props[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, texts };
}

/** Width measureText reports for each character in `textCtx`. */
const CHAR_WIDTH = 6;

/** A text a tool filled, with the text state it was drawn in. */
export interface DrawnText {
  text: string;
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  width: number;
  /** Where the text's first glyph starts, from its alignment and width. */
  left: number;
}

/** Where a text of `width` drawn at `x` starts under `align`, left to right. */
function textLeft(x: number, width: number, align: CanvasTextAlign): number {
  if (align === 'right' || align === 'end') return x - width;
  if (align === 'center') return x - width / 2;
  return x;
}

/**
 * Canvas stand-in that keeps its properties on a real save/restore stack and
 * starts as a canvas does ('start', 'alphabetic'), so a test sees the text
 * state each fillText inherits. measureText reports 6px per character; every
 * other method does nothing.
 */
export function textCtx(): { ctx: CanvasRenderingContext2D; drawn: DrawnText[] } {
  const drawn: DrawnText[] = [];
  const stack: Record<string, unknown>[] = [];
  let props: Record<string, unknown> = { textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1 };
  const methods: Record<string, (...args: never[]) => unknown> = {
    save: () => { stack.push({ ...props }); },
    restore: () => { props = stack.pop() ?? props; },
    measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
    fillText: (text: string, x: number, y: number) => {
      const align = props.textAlign as CanvasTextAlign;
      const width = text.length * CHAR_WIDTH;
      drawn.push({ text, x, y, align, baseline: props.textBaseline as CanvasTextBaseline, width, left: textLeft(x, width, align) });
    },
  };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      if (key in methods) return methods[key];
      if (key in props) return props[key];
      return () => undefined;
    },
    set(_t, key: string, value) {
      props[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

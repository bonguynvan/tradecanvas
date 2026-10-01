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

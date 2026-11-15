import type { DepthData, DepthOverlayConfig, Theme, ViewportState } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';

const DEFAULT_BID = 'rgba(31, 168, 116,0.15)';
const DEFAULT_ASK = 'rgba(232, 80, 91,0.15)';
const DEFAULT_BEST_BID = '#1fa874';
const DEFAULT_BEST_ASK = '#e8505b';
const DEFAULT_MAX_WIDTH = 100;

/** One bar of the overlay: the size drawn at a price. */
export interface DepthBar {
  price: number;
  value: number;
}

/** A row size to use, or null: only a positive, finite number is one. */
function validRowSize(rowSize: number | undefined): number | null {
  return typeof rowSize === 'number' && Number.isFinite(rowSize) && rowSize > 0 ? rowSize : null;
}

/**
 * The levels added up into rows `rowSize` apart, each row centred on a multiple
 * of it. A level halfway between two rows goes to the one away from the market
 * (a bid down, an ask up), so a bid's row never reaches past an ask's.
 */
function bucket(levels: readonly DepthData['bids'][number][], rowSize: number, isBid: boolean): DepthData['bids'] {
  const rows = new Map<number, number>();
  for (const l of levels) {
    // To 12 digits: 0.15 / 0.1 is 1.4999999999999998, and a price on a row's edge must go by the rule.
    const at = Number((l.price / rowSize).toPrecision(12));
    const key = isBid ? Math.ceil(at - 0.5) : Math.floor(at + 0.5);
    rows.set(key, (rows.get(key) ?? 0) + l.volume);
  }
  return [...rows].map(([key, volume]) => ({ price: key * rowSize, volume }));
}

/**
 * The bars of a book, each side nearest the market first: a level's own size
 * (`'level'`) or its size plus every level nearer the market (`'cumulative'`).
 * Levels that are not numbers or rest no size are left out; the order a feed
 * lists them in does not matter. With a `rowSize` (in price), the levels are
 * added up into rows that far apart first. `max` is the longest bar, 0 with none.
 */
export function depthBars(
  depth: DepthData,
  mode: 'cumulative' | 'level' = 'cumulative',
  rowSize?: number,
): { bids: DepthBar[]; asks: DepthBar[]; max: number } {
  const size = validRowSize(rowSize);
  const side = (levels: DepthData['bids'], isBid: boolean): DepthBar[] => {
    const valid = levels.filter((l) => Number.isFinite(l.price) && Number.isFinite(l.volume) && l.volume > 0);
    const rows = size === null ? valid : bucket(valid, size, isBid);
    rows.sort((a, b) => (isBid ? b.price - a.price : a.price - b.price));
    let running = 0;
    return rows.map((l) => {
      running += l.volume;
      return { price: l.price, value: mode === 'cumulative' ? running : l.volume };
    });
  };
  const bids = side(depth.bids, true);
  const asks = side(depth.asks, false);
  let max = 0;
  for (const bar of bids) max = Math.max(max, bar.value);
  for (const bar of asks) max = Math.max(max, bar.value);
  return { bids, asks, max };
}

/** The pixels between the two bars nearest the market on a side; Infinity with fewer than two. */
function nearGap(bars: readonly DepthBar[], viewport: ViewportState): number {
  if (bars.length < 2) return Infinity;
  const d = Math.abs(priceToY(bars[0].price, viewport) - priceToY(bars[1].price, viewport));
  return d > 0 ? d : Infinity;
}

/**
 * The order book on the plot: bars from the right edge, bids and asks
 * in their own colours. It does not need trading to be on; the chart
 * hands it the book and the config.
 */
export class DepthOverlay {
  /** The bars of the last book and mode: a repaint with the book unchanged (the crosshair moving) sorts nothing. */
  private cache: { depth: DepthData; mode: string; rowSize: number | null; bars: ReturnType<typeof depthBars> } | null = null;

  /** Forget the bars: the book was given again (it may be the same object, changed). */
  invalidate(): void {
    this.cache = null;
  }

  render(ctx: CanvasRenderingContext2D, depth: DepthData, viewport: ViewportState, config: DepthOverlayConfig): void {
    if (!config.enabled) return;
    const mode = config.mode === 'level' ? 'level' : 'cumulative';
    const rowSize = validRowSize(config.rowSize);
    if (!this.cache || this.cache.depth !== depth || this.cache.mode !== mode || this.cache.rowSize !== rowSize) {
      this.cache = { depth, mode, rowSize, bars: depthBars(depth, mode, rowSize ?? undefined) };
    }
    const { bids, asks, max } = this.cache.bars;
    if (max === 0) return;

    const { chartRect } = viewport;
    const width = Math.min(Math.max(config.maxWidth ?? DEFAULT_MAX_WIDTH, 0), chartRect.width);
    const rightEdge = chartRect.x + chartRect.width;
    const gap = Math.min(nearGap(bids, viewport), nearGap(asks, viewport));
    const spacing = Number.isFinite(gap) ? gap : 4;
    // Cumulative bars touch and read as one shape; single levels leave a hairline between them.
    const height = Math.max(1, mode === 'level' ? spacing - 1 : spacing);
    const top = chartRect.y;
    const bottom = chartRect.y + chartRect.height;

    /** Where a bar goes up and down: its row's price span with a rowSize, else `height` round its price. */
    const span = (price: number): { y: number; h: number } | null => {
      if (rowSize === null) {
        const y = priceToY(price, viewport);
        return y < top || y > bottom ? null : { y: y - height / 2, h: height };
      }
      const a = priceToY(price + rowSize / 2, viewport);
      const b = priceToY(price - rowSize / 2, viewport);
      const y = Math.min(a, b);
      const full = Math.abs(b - a);
      // A row reaching below 0 on a log scale has no place there.
      if (!Number.isFinite(y) || !Number.isFinite(full)) return null;
      if (y + full < top || y > bottom) return null;
      const h = Math.max(1, mode === 'level' && full > 2 ? full - 1 : full);
      return { y, h };
    };

    const draw = (bars: DepthBar[], color: string): void => {
      ctx.fillStyle = color;
      for (const { price, value } of bars) {
        const at = span(price);
        if (!at) continue;
        const w = (value / max) * width;
        ctx.fillRect(rightEdge - w, at.y, w, at.h);
      }
    };
    draw(bids, config.bidColor ?? DEFAULT_BID);
    draw(asks, config.askColor ?? DEFAULT_ASK);

    if (config.markBest) {
      const mark = (bar: DepthBar | undefined, color: string): void => {
        if (!bar) return;
        const y = priceToY(bar.price, viewport);
        if (y < chartRect.y || y > chartRect.y + chartRect.height) return;
        ctx.fillStyle = color;
        ctx.fillRect(rightEdge - width, y - 0.5, width, 1);
      };
      mark(bids[0], config.bestBidColor ?? DEFAULT_BEST_BID);
      mark(asks[0], config.bestAskColor ?? DEFAULT_BEST_ASK);
    }
  }
}

/**
 * What a chart keeps of the book: the data and how to draw it, drawn clipped to the
 * plot, under the orders. The depth overlay draws without the trading layer.
 */
export class DepthOverlayLayer {
  private data: DepthData | null = null;
  private config: DepthOverlayConfig = {};
  private readonly overlay = new DepthOverlay();

  setData(depth: DepthData | null): void {
    this.data = depth;
    this.overlay.invalidate();
  }

  /** Change some of how it is drawn; keys left out are kept. */
  setConfig(config: DepthOverlayConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DepthOverlayConfig {
    return { ...this.config };
  }

  /** Whether `render` would draw: it is on and has a book. */
  isActive(): boolean {
    return !!this.config.enabled && this.data !== null;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, _theme: Theme): void {
    if (!this.data || !this.config.enabled) return;
    const { chartRect } = viewport;
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
      ctx.clip();
      this.overlay.render(ctx, this.data, viewport, this.config);
    } finally {
      ctx.restore();
    }
  }
}

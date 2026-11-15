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

/**
 * The bars of a book, each side nearest the market first: a level's own size
 * (`'level'`) or its size plus every level nearer the market (`'cumulative'`).
 * Levels that are not numbers or rest no size are left out; the order a feed
 * lists them in does not matter. `max` is the longest bar, 0 with none.
 */
export function depthBars(
  depth: DepthData,
  mode: 'cumulative' | 'level' = 'cumulative',
): { bids: DepthBar[]; asks: DepthBar[]; max: number } {
  const side = (levels: DepthData['bids'], nearestFirst: (a: number, b: number) => number): DepthBar[] => {
    const valid = levels.filter((l) => Number.isFinite(l.price) && Number.isFinite(l.volume) && l.volume > 0);
    valid.sort((a, b) => nearestFirst(a.price, b.price));
    let running = 0;
    return valid.map((l) => {
      running += l.volume;
      return { price: l.price, value: mode === 'cumulative' ? running : l.volume };
    });
  };
  const bids = side(depth.bids, (a, b) => b - a);
  const asks = side(depth.asks, (a, b) => a - b);
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
  private cache: { depth: DepthData; mode: string; bars: ReturnType<typeof depthBars> } | null = null;

  /** Forget the bars: the book was given again (it may be the same object, changed). */
  invalidate(): void {
    this.cache = null;
  }

  render(ctx: CanvasRenderingContext2D, depth: DepthData, viewport: ViewportState, config: DepthOverlayConfig): void {
    if (!config.enabled) return;
    const mode = config.mode === 'level' ? 'level' : 'cumulative';
    if (!this.cache || this.cache.depth !== depth || this.cache.mode !== mode) {
      this.cache = { depth, mode, bars: depthBars(depth, mode) };
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

    const draw = (bars: DepthBar[], color: string): void => {
      ctx.fillStyle = color;
      for (const { price, value } of bars) {
        const y = priceToY(price, viewport);
        if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;
        const w = (value / max) * width;
        ctx.fillRect(rightEdge - w, y - height / 2, w, height);
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

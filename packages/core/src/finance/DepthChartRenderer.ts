import type { DepthChartOptions, DepthLevel, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  AREA_FILL_ALPHA,
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  axisFormat,
  decimalsFor,
  defaultFormat,
  drawTooltip,
  drawValueAxis,
  fontOf,
  niceScale,
  scaleToPx,
  strokeHairline,
  type Measure,
  type NiceScale,
  type Rect,
  type TooltipLine,
} from './chartKit.js';

/** A price and the volume resting from the best price out to it. */
interface CumulativeLevel {
  price: number;
  cumulativeVolume: number;
}

export interface DepthLayout {
  plot: Rect;
  /** Cumulative volume, up the left side. */
  volume: NiceScale;
  /** The prices at the plot's left and right edges: the middle price is half-way. */
  priceMin: number;
  priceMax: number;
  /** Best price first, each with the volume from the best price to it. */
  bids: readonly CumulativeLevel[];
  asks: readonly CumulativeLevel[];
  /** Half-way between the best bid and the best ask, and the gap between them; null for a book with one side. */
  mid: number | null;
  spread: number;
}

/** How far past the furthest level the prices run, as a share of the range. */
const PRICE_EXTEND_FACTOR = 0.2;
/** The share of the price shown each side of a book that has one price only. */
const ONE_PRICE_RANGE = 0.01;
/** Room between two price labels along the axis, px. */
const PRICE_LABEL_GAP = 24;
/** Height of the line the spread is written on, over the plot. */
const SPREAD_LINE = 16;
const SPREAD_LABEL = 'Spread';

/** Levels from the best price outwards, each with the volume up to it. */
function cumulative(levels: readonly DepthLevel[], side: 'bid' | 'ask'): CumulativeLevel[] {
  const sorted = levels
    .filter((l) => Number.isFinite(l.price) && Number.isFinite(l.volume))
    .sort((a, b) => (side === 'bid' ? b.price - a.price : a.price - b.price));
  let total = 0;
  return sorted.map((l) => ({ price: l.price, cumulativeVolume: (total += l.volume) }));
}

/** Where the book goes, for a chart `width` by `height`. */
export function computeDepthLayout(options: DepthChartOptions, width: number, height: number, measure: Measure): DepthLayout {
  const bids = cumulative(options.data.bids, 'bid');
  const asks = cumulative(options.data.asks, 'ask');
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const twoSided = bestBid !== undefined && bestAsk !== undefined;
  const center = twoSided ? (bestBid + bestAsk) / 2 : bestBid ?? bestAsk ?? 0;
  const lowestBid = bids.length > 0 ? bids[bids.length - 1].price : center;
  const highestAsk = asks.length > 0 ? asks[asks.length - 1].price : center;
  // One level on one side spans no prices: show a little about it instead.
  const reach = (Math.max(center - lowestBid, highestAsk - center) || Math.abs(center) * ONE_PRICE_RANGE || 1) * (1 + PRICE_EXTEND_FACTOR);

  // The highest the running volume gets: its last value, unless a volume below zero takes some back.
  const top = Math.max(0, ...bids.map((l) => l.cumulativeVolume), ...asks.map((l) => l.cumulativeVolume));
  const volume = niceScale(0, top || 1, 5);
  const format = options.volumeFormat ?? axisFormat(volume);
  const tickWidth = Math.max(0, ...volume.ticks.map((t) => measure(format(t), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const showSpread = twoSided && options.midPriceLine !== false && options.spreadLabel !== false;
  const y = CHART_PAD + (showSpread ? SPREAD_LINE : 0);
  const plot: Rect = { x: left, y, width: Math.max(1, width - left - CHART_PAD), height: Math.max(1, height - y - CHART_PAD - BOTTOM_LABELS) };
  return { plot, volume, priceMin: center - reach, priceMax: center + reach, bids, asks, mid: twoSided ? center : null, spread: twoSided ? bestAsk - bestBid : 0 };
}

/**
 * A side with one level spans no prices, so its step has no width to show:
 * its volume is carried out to the plot's edge, as a shelf.
 */
function shelved(levels: readonly CumulativeLevel[], edge: number): readonly CumulativeLevel[] {
  return levels.length === 1 ? [levels[0], { price: edge, cumulativeVolume: levels[0].cumulativeVolume }] : levels;
}

/** The furthest level of a side that `price` reaches, with the volume from the best price to it; null when `price` is inside the best. */
function levelAt(levels: readonly CumulativeLevel[], price: number, side: 'bid' | 'ask'): CumulativeLevel | null {
  let reached: CumulativeLevel | null = null;
  for (const level of levels) {
    if (side === 'bid' ? level.price < price : level.price > price) break;
    reached = level;
  }
  return reached;
}

export function renderDepthChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: DepthChartOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
  measure?: Measure,
): void {
  if (width <= 0 || height <= 0) return;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  const { data } = options;
  if (data.bids.length === 0 && data.asks.length === 0) return;

  const measureText: Measure = measure ?? ((text, size = LABEL_SIZE) => {
    ctx.font = fontOf(theme, size);
    return ctx.measureText(text).width;
  });
  const layout = computeDepthLayout(options, width, height, measureText);
  const { plot, volume, priceMin, priceMax, bids, asks, mid, spread } = layout;
  const bottom = plot.y + plot.height;
  const toX = (price: number): number => plot.x + ((price - priceMin) / (priceMax - priceMin)) * plot.width;
  const toY = (vol: number): number => scaleToPx(volume, vol, plot.y, plot.height, true);

  // Prices in full: as many decimals as the book's own prices are written with.
  const decimals = decimalsFor([...bids, ...asks].map((l) => l.price));
  const fixed = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const priceFormat = options.priceFormat ?? ((p: number) => fixed.format(p));
  const volumeFormat = options.volumeFormat ?? defaultFormat;

  drawValueAxis(ctx, plot, volume, 'vertical', theme, options.volumeFormat ?? axisFormat(volume));
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.strokeStyle = theme.grid;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // As many price labels as fit side by side, each as wide as the book's prices are written.
  const labelWidth = measureText(priceFormat(priceMax), LABEL_SIZE) + PRICE_LABEL_GAP;
  const prices = niceScale(priceMin, priceMax, Math.max(2, Math.floor(plot.width / labelWidth)));
  const tickFormat = options.priceFormat ?? axisFormat(prices);
  ctx.font = fontOf(theme, LABEL_SIZE);
  for (const p of prices.ticks) {
    if (p < priceMin || p > priceMax) continue;
    strokeHairline(ctx, toX(p), plot.y, toX(p), bottom);
    ctx.fillText(tickFormat(p), Math.round(toX(p)), bottom + LABEL_GAP);
  }
  ctx.restore();

  const side = (levels: readonly CumulativeLevel[], line: string, fill: string): void => {
    if (levels.length === 0) return;
    // Steps: each level's volume holds out to the next level's price.
    const steps = (): void => {
      for (let i = 1; i < levels.length; i++) {
        ctx.lineTo(toX(levels[i].price), toY(levels[i - 1].cumulativeVolume));
        ctx.lineTo(toX(levels[i].price), toY(levels[i].cumulativeVolume));
      }
    };
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(toX(levels[0].price), bottom);
    ctx.lineTo(toX(levels[0].price), toY(levels[0].cumulativeVolume));
    steps();
    ctx.lineTo(toX(levels[levels.length - 1].price), bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(toX(levels[0].price), toY(levels[0].cumulativeVolume));
    steps();
    ctx.stroke();
  };
  const bidColor = options.bidColor ?? theme.candleUp;
  const askColor = options.askColor ?? theme.candleDown;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.width, plot.height);
  ctx.clip();
  side(shelved(bids, priceMin), bidColor, options.bidFillColor ?? withAlpha(bidColor, AREA_FILL_ALPHA));
  side(shelved(asks, priceMax), askColor, options.askFillColor ?? withAlpha(askColor, AREA_FILL_ALPHA));
  ctx.restore();

  // A book with one side has no middle and no spread to mark.
  if (mid !== null && options.midPriceLine !== false) {
    ctx.save();
    ctx.strokeStyle = theme.textSecondary;
    ctx.setLineDash([4, 4]);
    strokeHairline(ctx, toX(mid), plot.y, toX(mid), bottom);
    ctx.setLineDash([]);
    if (options.spreadLabel !== false) {
      ctx.font = fontOf(theme, LABEL_SIZE);
      ctx.fillStyle = theme.textSecondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${SPREAD_LABEL}: ${priceFormat(spread)}`, Math.round(toX(mid)), CHART_PAD + SPREAD_LINE / 2 - 2);
    }
    ctx.restore();
  }

  if (!crosshairPos || crosshairPos.x < plot.x || crosshairPos.x > plot.x + plot.width) return;
  const price = priceMin + ((crosshairPos.x - plot.x) / plot.width) * (priceMax - priceMin);
  ctx.save();
  ctx.strokeStyle = theme.crosshair;
  ctx.setLineDash([4, 4]);
  strokeHairline(ctx, crosshairPos.x, plot.y, crosshairPos.x, bottom);
  ctx.restore();
  // The price of the level the volume is counted to: the book's own price, not a point between two.
  const bid = levelAt(bids, price, 'bid');
  const ask = levelAt(asks, price, 'ask');
  const lines: TooltipLine[] = [{ text: priceFormat((bid ?? ask)?.price ?? price), bold: true }];
  if (bid) lines.push({ text: volumeFormat(bid.cumulativeVolume), color: bidColor });
  if (ask) lines.push({ text: volumeFormat(ask.cumulativeVolume), color: askColor });
  drawTooltip(ctx, lines, crosshairPos, { x: 0, y: 0, width, height }, theme);
}

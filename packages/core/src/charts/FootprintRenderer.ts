import type { DataSeries, FootprintBar, FootprintCells, FootprintLevel, Theme, ViewportState } from '@tradecanvas/commons';
import { barTimeUnit } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { CandlestickRenderer } from './CandlestickRenderer.js';
import { isDense } from './denseBars.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import type { FootprintImbalance, FootprintStats, FootprintStore } from './footprint.js';
import { footprintImbalances, footprintRowFactor, footprintStats, footprintText, mergeFootprintRows } from './footprint.js';

/** The gap between one bar's footprint and the next, px: a footprint takes the rest of its bar's slot, whatever the bars' own gap. */
export const FOOTPRINT_SLOT_GAP = 4;
/** Footprints narrower than this are candles: one that thin says nothing. */
export const FOOTPRINT_MIN_BAR_WIDTH = 16;
/** Footprints at least this wide carry both sides' numbers. */
export const FOOTPRINT_TEXT_BAR_WIDTH = 76;
/** How wide a bar's slot may get on a footprint chart, px: room for both sides' numbers with thousands in them. */
export const FOOTPRINT_MAX_SLOT = 164;
/** One number a row (the delta, the volume) fits a narrower bar. */
const SINGLE_TEXT_BAR_WIDTH = 48;
/** How many times one side has to outdo the other to be marked, unless told otherwise. */
export const FOOTPRINT_IMBALANCE = 3;
/** Rows are drawn at least this tall where numbers are written, px. */
const TEXT_ROW_PX = 12;
/** Rows are drawn at least this tall where they are bars only, px. */
const BAR_ROW_PX = 3;
/** The candle by the cells: this share of the bar, between these widths, px. */
const CANDLE_SHARE = 0.06;
const CANDLE_MIN = 3;
const CANDLE_MAX = 7;
const CANDLE_GAP = 3;
const ROW_GAP = 1;
const TEXT_PAD = 4;
/** A number of five characters is about this many times its font's size wide. */
const NUMBER_EMS = 3;
/** Numbers are never written smaller than this, px. */
const MIN_FONT = 8;
/** The tint under a number: from this (a cell with next to nothing) to this (the bar's largest). */
const TINT_MIN = 0.06;
const TINT_MAX = 0.34;
/** A cell where one side outdid the other is this strong. */
const TINT_MARKED = 0.62;
/** Bars with no numbers: a plain cell, and a marked one. */
const BAR_ALPHA = 0.7;
const BAR_ALPHA_MARKED = 1;
const POC_ALPHA = 0.8;
/** Under a bar's lowest row: this much room over its totals and under them, and this much between their two lines, px. */
const TOTALS_GAP = 3;
const TOTALS_LINE_GAP = 2;
/** The plate the totals stand on: the chart's ground, this strong, so they read over a grid line or the volume behind them. */
const TOTALS_PLATE_ALPHA = 0.85;

/** A bar's rows as drawn: merged to the row height on screen, with their sums and marks. */
interface DrawnBar {
  factor: number;
  ratio: number;
  rows: readonly FootprintLevel[];
  stats: FootprintStats;
  marks: FootprintImbalance[];
}

/** Where a bar's parts go, px. */
interface Slot {
  left: number;
  candle: number;
  cellsLeft: number;
  cellsWidth: number;
}

/**
 * The footprint chart: by each bar, what traded at every price inside it.
 * A wide bar carries numbers (what the sellers took at the bid on the left,
 * what the buyers took at the ask on the right, or their difference, or
 * their sum), a narrower one a bar for each side, and bars too narrow for
 * either are candles. A slim candle stands at the left of each footprint.
 * Rows too thin to read are drawn several to one.
 */
export class FootprintRenderer implements ChartRendererInterface {
  private readonly candles = new CandlestickRenderer();
  private store: FootprintStore | null = null;
  private cells: FootprintCells = 'bidAsk';
  private imbalance = FOOTPRINT_IMBALANCE;
  /** Whether what a bar's rows add up to is written under it. */
  private totals = false;
  /** Bars from this time on show no cells (a replay has not reached them); null shows all. */
  private shownUntil: number | null = null;
  /** What was worked out for a bar's rows, until they or the row height change. */
  private drawn = new WeakMap<FootprintBar, DrawnBar>();

  setStore(store: FootprintStore | null): void {
    this.store = store;
  }

  setCells(cells: FootprintCells): void {
    this.cells = cells;
  }

  /** How many times one side has to outdo the other to be marked; 1 or less marks none. */
  setImbalance(ratio: number): void {
    this.imbalance = Number.isFinite(ratio) && ratio >= 0 ? ratio : FOOTPRINT_IMBALANCE;
  }

  /**
   * Write under each bar what its rows add up to: bought less sold, and both
   * together. Off until told: the chart turns it on unless its
   * `footprint.totals` option says otherwise.
   */
  setTotals(on: boolean): void {
    this.totals = on === true;
  }

  /**
   * The room the totals take under a bar, px: what the price scale leaves
   * under the lowest bar so they are not cut. None with totals off, none
   * where the bars are too narrow to have them, and none where no bar on
   * view has a footprint to add up.
   */
  totalsRoom(viewport: ViewportState, theme: Theme, data: DataSeries): number {
    const width = footprintWidth(viewport);
    if (!this.totals || width < FOOTPRINT_MIN_BAR_WIDTH || isDense(viewport) || !this.writesTotals(width)) return 0;
    if (!this.anyOnView(data, viewport)) return 0;
    return totalsHeight(totalsFont(theme, Infinity));
  }

  /** Whether a bar on view has a footprint with rows in it, one a replay has shown. */
  private anyOnView(data: DataSeries, viewport: ViewportState): boolean {
    if (!this.store) return false;
    const unit = barTimeUnit(data);
    const { from, to } = viewport.visibleRange;
    for (let i = Math.max(0, from); i <= to && i < data.length; i++) {
      const time = data[i].time * unit;
      if (this.shownUntil !== null && time >= this.shownUntil) continue;
      if ((this.store.get(time)?.levels.length ?? 0) > 0) return true;
    }
    return false;
  }

  /** Draw cells only for bars before `time`, as a replay that has shown the bars up to it would; null for all. */
  setShownUntil(time: number | null): void {
    this.shownUntil = time !== null && Number.isFinite(time) ? time : null;
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { min, max } = viewport.priceRange;
    if (max === min) return;
    const width = footprintWidth(viewport);
    if (width < FOOTPRINT_MIN_BAR_WIDTH || isDense(viewport)) {
      this.candles.render(ctx, data, viewport, theme);
      return;
    }
    const { from, to } = viewport.visibleRange;
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const boxLeft = -viewport.offset + viewport.chartRect.x;
    const toY = priceToYMapper(viewport);
    const unit = barTimeUnit(data);
    const text = this.writesNumbers(width);
    const totals = this.writesTotals(width);
    const factor = this.rowFactor(viewport, toY, text);

    ctx.save();
    for (let i = Math.max(0, from); i <= to && i < data.length; i++) {
      const bar = data[i];
      const slot = slotOf(i * barUnit + boxLeft, width);
      drawCandle(ctx, bar, slot, toY, theme);
      const time = bar.time * unit;
      if (this.shownUntil !== null && time >= this.shownUntil) continue;
      const footprint = this.store?.get(time);
      if (footprint) this.drawCells(ctx, this.drawnBar(footprint, factor), factor, slot, viewport, toY, theme, text, totals);
    }
    ctx.restore();
  }

  private writesNumbers(width: number): boolean {
    return width >= (this.cells === 'bidAsk' ? FOOTPRINT_TEXT_BAR_WIDTH : SINGLE_TEXT_BAR_WIDTH);
  }

  /** Totals are one number a line: they fit a bar that one number fits, whatever its rows show. */
  private writesTotals(width: number): boolean {
    return this.totals && width >= SINGLE_TEXT_BAR_WIDTH;
  }

  /** How many kept rows make a drawn one: measured in the middle of the scale, one for every bar, so rows line up across them. */
  private rowFactor(viewport: ViewportState, toY: (price: number) => number, text: boolean): number {
    const rowSize = this.store?.getRowSize() ?? 0;
    if (!(rowSize > 0)) return 1;
    const { min, max } = viewport.priceRange;
    const mid = (min + max) / 2;
    return footprintRowFactor(Math.abs(toY(mid) - toY(mid + rowSize)), text ? TEXT_ROW_PX : BAR_ROW_PX);
  }

  private drawnBar(footprint: FootprintBar, factor: number): DrawnBar {
    const had = this.drawn.get(footprint);
    if (had && had.factor === factor && had.ratio === this.imbalance) return had;
    const rowSize = this.store!.getRowSize();
    const rows = mergeFootprintRows(footprint.levels, rowSize, factor);
    const drawn: DrawnBar = {
      factor,
      ratio: this.imbalance,
      rows,
      stats: footprintStats(rows),
      marks: footprintImbalances(rows, rowSize * factor, this.imbalance),
    };
    this.drawn.set(footprint, drawn);
    return drawn;
  }

  private drawCells(
    ctx: CanvasRenderingContext2D,
    bar: DrawnBar,
    factor: number,
    slot: Slot,
    viewport: ViewportState,
    toY: (price: number) => number,
    theme: Theme,
    text: boolean,
    totals: boolean,
  ): void {
    const tall = this.store!.getRowSize() * factor;
    const top = viewport.chartRect.y;
    const bottom = top + viewport.chartRect.height;
    if (text) {
      ctx.textBaseline = 'middle';
    }
    /** Where the lowest row on the screen ends: the totals go under it. */
    let lowest = -Infinity;
    for (let r = 0; r < bar.rows.length; r++) {
      const row = bar.rows[r];
      const a = toY(row.price);
      const b = toY(row.price + tall);
      const y = Math.round(Math.min(a, b));
      const height = Math.max(1, Math.round(Math.max(a, b)) - y - ROW_GAP);
      lowest = Math.max(lowest, y + height);
      if (y + height < top || y > bottom) continue;
      const box = { x: slot.cellsLeft, y, width: slot.cellsWidth, height };
      if (text) this.drawNumbers(ctx, row, bar, bar.marks[r], box, theme);
      else this.drawBars(ctx, row, bar, bar.marks[r], box, theme);
      if (text && row.price === bar.stats.poc) outline(ctx, box, theme);
    }
    if (totals && Number.isFinite(lowest)) drawTotals(ctx, bar.stats, slot, lowest + ROW_GAP, top, bottom, theme);
  }

  /** A wide bar's row: its numbers, each on a tint as strong as its share of the bar's largest. */
  private drawNumbers(
    ctx: CanvasRenderingContext2D,
    row: FootprintLevel,
    bar: DrawnBar,
    mark: FootprintImbalance,
    box: Box,
    theme: Theme,
  ): void {
    // As large as the row is tall and its half is wide: a number stays in its own cell.
    const half = Math.floor(box.width / 2);
    const room = this.cells === 'bidAsk' ? half : box.width;
    const size = Math.max(MIN_FONT, Math.min(theme.font.sizeSmall, box.height - 2, Math.floor((room - TEXT_PAD) / NUMBER_EMS)));
    const plain = `${size}px ${theme.font.family}`;
    const bold = `bold ${plain}`;
    const middle = box.y + box.height / 2;
    if (this.cells === 'bidAsk') {
      const mid = box.x + half;
      tint(ctx, box.x, box.y, half, box.height, theme.candleDown, tintOf(row.sell, bar.stats.maxSide, mark.sell));
      tint(ctx, mid, box.y, box.width - half, box.height, theme.candleUp, tintOf(row.buy, bar.stats.maxSide, mark.buy));
      ctx.fillStyle = theme.text;
      ctx.font = mark.sell ? bold : plain;
      ctx.textAlign = 'right';
      ctx.fillText(footprintText(row.sell), mid - TEXT_PAD, middle);
      ctx.font = mark.buy ? bold : plain;
      ctx.textAlign = 'left';
      ctx.fillText(footprintText(row.buy), mid + TEXT_PAD, middle);
      return;
    }
    const delta = row.buy - row.sell;
    const color = delta >= 0 ? theme.candleUp : theme.candleDown;
    const share = this.cells === 'delta' ? [Math.abs(delta), bar.stats.maxDelta] : [row.buy + row.sell, bar.stats.maxVolume];
    // One number, one tint: as strong as the number is large. A mark is told by the bold alone.
    tint(ctx, box.x, box.y, box.width, box.height, color, tintOf(share[0], share[1], false));
    ctx.fillStyle = theme.text;
    ctx.font = mark.buy || mark.sell ? bold : plain;
    ctx.textAlign = 'center';
    ctx.fillText(footprintText(this.cells === 'delta' ? delta : row.buy + row.sell), box.x + box.width / 2, middle);
  }

  /** A narrower bar's row: a bar for each side from the middle, as long as its share of the bar's largest. */
  private drawBars(
    ctx: CanvasRenderingContext2D,
    row: FootprintLevel,
    bar: DrawnBar,
    mark: FootprintImbalance,
    box: Box,
    theme: Theme,
  ): void {
    const half = box.width / 2;
    const mid = box.x + half;
    if (this.cells === 'bidAsk') {
      const sold = lengthOf(row.sell, bar.stats.maxSide, half);
      const bought = lengthOf(row.buy, bar.stats.maxSide, half);
      tint(ctx, mid - sold, box.y, sold, box.height, theme.candleDown, mark.sell ? BAR_ALPHA_MARKED : BAR_ALPHA);
      tint(ctx, mid, box.y, bought, box.height, theme.candleUp, mark.buy ? BAR_ALPHA_MARKED : BAR_ALPHA);
      return;
    }
    const delta = row.buy - row.sell;
    const color = delta >= 0 ? theme.candleUp : theme.candleDown;
    const alpha = mark.buy || mark.sell ? BAR_ALPHA_MARKED : BAR_ALPHA;
    if (this.cells === 'delta') {
      const length = lengthOf(Math.abs(delta), bar.stats.maxDelta, half);
      tint(ctx, delta >= 0 ? mid : mid - length, box.y, length, box.height, color, alpha);
      return;
    }
    tint(ctx, box.x, box.y, lengthOf(row.buy + row.sell, bar.stats.maxVolume, box.width), box.height, color, alpha);
  }
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How wide a bar's footprint is, px: its slot on the time axis less the gap
 * to the next. Not the bar's own body: a layout that leaves a third of the
 * slot empty beside a candle would leave it empty beside the numbers too.
 */
export function footprintWidth(viewport: Pick<ViewportState, 'barWidth' | 'barSpacing'>): number {
  return viewport.barWidth + viewport.barSpacing - FOOTPRINT_SLOT_GAP;
}

/** The parts of the footprint `width` wide that starts at `left`: a slim candle, a gap, the cells. */
function slotOf(left: number, width: number): Slot {
  const candle = Math.max(CANDLE_MIN, Math.min(CANDLE_MAX, Math.round(width * CANDLE_SHARE)));
  const x = Math.round(left);
  return { left: x, candle, cellsLeft: x + candle + CANDLE_GAP, cellsWidth: Math.max(1, Math.round(width) - candle - CANDLE_GAP) };
}

/** The bar's own candle, slim, at the left of its box: where it opened, closed and reached. */
function drawCandle(ctx: CanvasRenderingContext2D, bar: DataSeries[number], slot: Slot, toY: (price: number) => number, theme: Theme): void {
  const up = bar.close >= bar.open;
  const high = Math.round(toY(bar.high));
  const low = Math.round(toY(bar.low));
  ctx.fillStyle = up ? theme.candleUpWick : theme.candleDownWick;
  ctx.fillRect(slot.left + Math.floor(slot.candle / 2), Math.min(high, low), 1, Math.max(1, Math.abs(low - high)));
  const open = Math.round(toY(bar.open));
  const close = Math.round(toY(bar.close));
  ctx.fillStyle = up ? theme.candleUp : theme.candleDown;
  ctx.fillRect(slot.left, Math.min(open, close), slot.candle, Math.max(1, Math.abs(close - open)));
}

/** The size the totals are written in under cells `room` wide: the theme's small size, or as a number of five characters fits, and never smaller than a number is written. */
function totalsFont(theme: Theme, room: number): number {
  return Math.max(MIN_FONT, Math.min(theme.font.sizeSmall, Math.floor((room - TEXT_PAD) / NUMBER_EMS)));
}

/** How tall a bar's totals are with their numbers `size` high, px: two lines, and room over, between and under them. */
function totalsHeight(size: number): number {
  return TOTALS_GAP + size + TOTALS_LINE_GAP + size + TOTALS_GAP;
}

/**
 * What a bar's rows add up to, from `y` down under the lowest of them:
 * bought less sold in the colour of its sign, then both together in the
 * quiet ink, on a plate of the chart's ground. Not drawn outside the plot.
 */
function drawTotals(ctx: CanvasRenderingContext2D, stats: FootprintStats, slot: Slot, y: number, top: number, bottom: number, theme: Theme): void {
  const size = totalsFont(theme, slot.cellsWidth);
  const height = totalsHeight(size);
  if (y + height < top || y > bottom) return;
  tint(ctx, slot.cellsLeft, y, slot.cellsWidth, height, theme.background, TOTALS_PLATE_ALPHA);
  const x = slot.cellsLeft + slot.cellsWidth / 2;
  const first = y + TOTALS_GAP + size / 2;
  ctx.font = `${size}px ${theme.font.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = stats.delta > 0 ? theme.candleUp : stats.delta < 0 ? theme.candleDown : theme.textSecondary;
  ctx.fillText((stats.delta > 0 ? '+' : '') + footprintText(stats.delta), x, first);
  ctx.fillStyle = theme.textSecondary;
  ctx.fillText(footprintText(stats.volume), x, first + size + TOTALS_LINE_GAP);
}

/** How strong a cell's tint is: its share of the bar's largest, on a square root so mid sizes show. */
function tintOf(amount: number, largest: number, marked: boolean): number {
  if (!(amount > 0) || !(largest > 0)) return 0;
  if (marked) return TINT_MARKED;
  return TINT_MIN + (TINT_MAX - TINT_MIN) * Math.sqrt(Math.min(1, amount / largest));
}

/** How long a bar is: its share of the bar's largest, of `room`; what traded at all shows a pixel. */
function lengthOf(amount: number, largest: number, room: number): number {
  if (!(amount > 0) || !(largest > 0)) return 0;
  return Math.max(1, Math.min(1, amount / largest) * room);
}

function tint(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string, alpha: number): void {
  if (!(alpha > 0) || !(width > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = 1;
}

/** A line round the row most traded at. */
function outline(ctx: CanvasRenderingContext2D, box: Box, theme: Theme): void {
  ctx.globalAlpha = POC_ALPHA;
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);
  ctx.globalAlpha = 1;
}

import type { OrderSide, Point, ViewportState, Theme } from '@tradecanvas/commons';
import { priceTagText, stepDecimals } from '@tradecanvas/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import { onGrid, onGridBeyond, withinBounds, type PriceBounds, type PriceRounding } from '../viewport/priceGrid.js';
import { inPlot, levelLine } from './plot.js';
import { drawAxisBadge, drawTags, type AxisBadge, type TradingTag } from './tradingTags.js';

export type BracketHandle = 'entry' | 'sl' | 'tp';

export interface BracketDraft {
  side: OrderSide;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  /** The quantity it is for, from its size (`BracketSize`); unset with none. */
  quantity?: number;
}

/** What sizes a bracket: a quantity, or the money put at risk between its entry and its stop. */
export interface BracketSize {
  /** The quantity to trade. */
  quantity?: number;
  /**
   * The money lost when the stop is hit. The quantity is then this over the
   * stop's distance from the entry, and follows the lines as they are
   * dragged. It takes the place of `quantity`.
   */
  risk?: number;
  /** What a quantity from `risk` is rounded down to a multiple of: a lot, `0.001`… Unset: not rounded. */
  quantityStep?: number;
  /** What a move of one in price is worth for one unit, for `risk`: a contract's multiplier. Default 1. */
  multiplier?: number;
}

/** Room for a quotient a hair under a whole number of steps (0.3 / 0.1). */
const STEP_SLACK = 1e-9;

const positive = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value > 0;

/**
 * The quantity of a bracket of this `size`: its `quantity`, or with `risk`
 * the money at risk over what the stop's distance costs a unit, rounded down
 * to `quantityStep`. Undefined with nothing to size by: no size, a stop on
 * the entry, a risk that buys less than a step.
 */
export function bracketQuantity(draft: Pick<BracketDraft, 'entry' | 'stopLoss'>, size: BracketSize | undefined): number | undefined {
  if (!size) return undefined;
  if (size.risk === undefined) return positive(size.quantity) ? size.quantity : undefined;
  if (!positive(size.risk)) return undefined;
  const lossPerUnit = Math.abs(draft.entry - draft.stopLoss) * (positive(size.multiplier) ? size.multiplier : 1);
  if (!positive(lossPerUnit)) return undefined;
  const raw = size.risk / lossPerUnit;
  // A sum with no end (a risk past any number, a stop a hair from the entry) sizes nothing.
  if (!positive(raw)) return undefined;
  if (!positive(size.quantityStep)) return raw;
  const steps = Math.floor(raw / size.quantityStep + STEP_SLACK);
  // Three steps of 0.1 are 0.30000000000000004: written to the step's own decimals.
  return steps > 0 ? Number((steps * size.quantityStep).toFixed(stepDecimals(size.quantityStep))) : undefined;
}

/** The decimals a quantity is written to on the entry's tag. */
const QUANTITY_DECIMALS = 4;

/** A quantity on a tag: four decimals of it at most (four figures of one under 1), no zeros after them. */
function quantityText(quantity: number): string {
  return String(Number(quantity >= 1 ? quantity.toFixed(QUANTITY_DECIMALS) : quantity.toPrecision(QUANTITY_DECIMALS)));
}

export interface BracketDefaultsOptions {
  /** Stop distance as a fraction of entry price. Default 0.01 (1%). */
  riskFraction?: number;
  /** Reward-to-risk ratio for the take-profit. Default 2. */
  riskReward?: number;
}

/**
 * Default SL/TP for a fresh bracket: stop `riskFraction` away from entry on the
 * losing side, take-profit `riskReward`× the stop distance on the winning side.
 * Pure — used by the tool and directly testable.
 */
export function computeBracketDefaults(
  side: OrderSide,
  entry: number,
  opts: BracketDefaultsOptions = {},
): BracketDraft {
  // Floor the stop distance so a zero (or near-zero) entry price doesn't
  // collapse SL/TP onto the entry, producing a degenerate zero-risk bracket.
  const risk = Math.max(Math.abs(entry) * (opts.riskFraction ?? 0.01), 1e-8);
  const reward = risk * (opts.riskReward ?? 2);
  if (side === 'buy') {
    return { side, entry, stopLoss: entry - risk, takeProfit: entry + reward };
  }
  return { side, entry, stopLoss: entry + risk, takeProfit: entry - reward };
}

/** Reward-to-risk ratio of a draft, or 0 when the stop distance is zero. */
export function bracketRiskReward(draft: BracketDraft): number {
  const risk = Math.abs(draft.entry - draft.stopLoss);
  if (risk === 0) return 0;
  return Math.abs(draft.takeProfit - draft.entry) / risk;
}

const HANDLE_TOLERANCE = 6;
/** How strongly the reward and risk zones tint the plot. */
const ZONE_ALPHA = 0.12;
/** The entry's line: dashed, as a price not yet traded. */
const ENTRY_DASH = [6, 3];

/**
 * In-progress bracket-order placement: an entry line plus draggable stop-loss
 * and take-profit handles, rendered as shaded risk/reward zones. Geometry only
 * — the `TradingManager` owns lifecycle and emits the place event on confirm.
 */
export class BracketTool {
  private draft: BracketDraft | null = null;
  /** The draft as the drag found it, to put back if the drag is called off. */
  private dragStart: BracketDraft | null = null;
  private dragging: BracketHandle | null = null;
  private defaults: BracketDefaultsOptions;
  /** What sizes the bracket in hand. */
  private size: BracketSize | undefined;
  /** How its prices are put on the market's grid; null leaves them as they come. */
  private round: PriceRounding | null = null;

  setRound(round: PriceRounding | null): void {
    this.round = round;
  }

  /** The prices its entry may be at today, asked as it is needed; none holds it nowhere. */
  private bounds: () => PriceBounds | null = () => null;

  setOrderBounds(bounds: () => PriceBounds | null): void {
    this.bounds = bounds;
  }

  constructor(defaults: BracketDefaultsOptions = {}) {
    this.defaults = defaults;
  }

  /** Start a bracket at `entry`, of this `size` (none: it has no quantity). */
  start(side: OrderSide, entry: number, size?: BracketSize): void {
    // Its entry is an order of today's: inside the day's limits. Its stop and its target go where they are put.
    this.draft = this.beyondEntry(computeBracketDefaults(side, withinBounds(this.bounds(), onGrid(this.round, entry)), this.defaults));
    this.size = size ? { ...size } : undefined;
    this.dragging = null;
  }

  /** Size the bracket in hand anew (a quantity typed in a field); with none in hand it does nothing. */
  setSize(size: BracketSize | undefined): void {
    if (this.draft) this.size = size ? { ...size } : undefined;
  }

  cancel(): void {
    this.draft = null;
    this.size = undefined;
    this.dragging = null;
  }

  isActive(): boolean {
    return this.draft !== null;
  }

  /** The bracket in hand, with the quantity its size gives it now. */
  getDraft(): BracketDraft | null {
    if (!this.draft) return null;
    const quantity = bracketQuantity(this.draft, this.size);
    return quantity === undefined ? { ...this.draft } : { ...this.draft, quantity };
  }

  /** Which handle (if any) is under the pointer. */
  hitTest(pos: Point, viewport: ViewportState, tolerance = HANDLE_TOLERANCE): BracketHandle | null {
    if (!this.draft) return null;
    const handles: BracketHandle[] = ['entry', 'sl', 'tp'];
    let best: BracketHandle | null = null;
    let bestDist = tolerance;
    for (const h of handles) {
      const y = priceToY(this.priceOf(h), viewport);
      const dist = Math.abs(y - pos.y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = h;
      }
    }
    return best;
  }

  beginDrag(pos: Point, viewport: ViewportState, tolerance?: number): boolean {
    const handle = this.hitTest(pos, viewport, tolerance);
    return handle !== null && this.beginDragOn(handle);
  }

  /** Drag `handle`, pressed by its tag: by which it is, whatever line is nearer. */
  beginDragOn(handle: BracketHandle): boolean {
    if (!this.draft) return false;
    this.dragging = handle;
    this.dragStart = this.draft;
    return true;
  }

  /** Call the drag off: the handle goes back to where it was. */
  cancelDrag(): void {
    if (this.dragging && this.dragStart) this.draft = this.dragStart;
    this.dragging = null;
    this.dragStart = null;
  }

  drag(pos: Point, viewport: ViewportState): boolean {
    if (!this.draft || !this.dragging) return false;
    const at = onGrid(this.round, yToPrice(pos.y, viewport));
    const price = this.dragging === 'entry' ? withinBounds(this.bounds(), at) : at;
    this.draft = this.beyondEntry(applyHandlePrice(this.draft, this.dragging, price));
    return true;
  }

  /**
   * Put the bracket in hand where it may be placed now: its entry inside the
   * day's limits, which may have come, or moved, since it was started or last
   * dragged; its stop and its target moved with it, their distances kept.
   */
  settle(): void {
    if (!this.draft) return;
    const entry = withinBounds(this.bounds(), this.draft.entry);
    if (entry !== this.draft.entry) this.draft = this.beyondEntry(applyHandlePrice(this.draft, 'entry', entry));
  }

  /**
   * The draft with its stop and its target on the market's grid, each a step
   * or more its own side of the entry: on a grid coarser than they are away
   * (a handle pulled onto the entry, a bracket moved to where the step is
   * larger) they would round onto it, and a bracket with no risk has no size.
   * With no grid told, the draft as it is.
   */
  private beyondEntry(draft: BracketDraft): BracketDraft {
    if (!this.round) return draft;
    const up = draft.side === 'buy' ? 1 : -1;
    return {
      ...draft,
      stopLoss: onGridBeyond(this.round, draft.entry, draft.stopLoss, up > 0 ? -1 : 1),
      takeProfit: onGridBeyond(this.round, draft.entry, draft.takeProfit, up > 0 ? 1 : -1),
    };
  }

  endDrag(): void {
    this.dragging = null;
    this.dragStart = null;
  }

  isDragging(): boolean {
    return this.dragging !== null;
  }

  private priceOf(handle: BracketHandle): number {
    const d = this.draft!;
    return handle === 'entry' ? d.entry : handle === 'sl' ? d.stopLoss : d.takeProfit;
  }

  /** The zones, the lines and their tags (`pricePrecision` is for the axis badges, drawn apart). */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, _pricePrecision?: number): void {
    this.renderLines(ctx, viewport, theme);
    drawTags(ctx, this.tags(viewport, theme), viewport, theme, []);
  }

  /** The reward zone (entry to target) and the risk zone (entry to stop), and the three lines. */
  renderLines(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const d = this.draft;
    if (!d) return;
    const { chartRect } = viewport;
    const yEntry = priceToY(d.entry, viewport);
    const ySl = priceToY(d.stopLoss, viewport);
    const yTp = priceToY(d.takeProfit, viewport);
    const { profit, loss } = bracketColors(theme);
    ctx.save();
    ctx.globalAlpha = ZONE_ALPHA;
    ctx.fillStyle = profit;
    ctx.fillRect(chartRect.x, Math.min(yEntry, yTp), chartRect.width, Math.abs(yTp - yEntry));
    ctx.fillStyle = loss;
    ctx.fillRect(chartRect.x, Math.min(yEntry, ySl), chartRect.width, Math.abs(ySl - yEntry));
    ctx.globalAlpha = 1;
    levelLine(ctx, viewport, yEntry, theme.text, ENTRY_DASH);
    levelLine(ctx, viewport, yTp, profit, []);
    levelLine(ctx, viewport, ySl, loss, []);
    ctx.restore();
  }

  /**
   * The tags, each a handle for its line: the side, the quantity when it
   * has one and the reward to risk on the entry, how far away in percent on
   * the target and the stop.
   */
  tags(viewport: ViewportState, theme: Theme): TradingTag[] {
    const d = this.draft;
    if (!d) return [];
    const { profit, loss } = bracketColors(theme);
    const direction = d.side === 'buy' ? 1 : -1;
    const percent = (price: number) => {
      const pct = d.entry === 0 ? 0 : ((price - d.entry) / d.entry) * 100 * direction;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    };
    const quantity = bracketQuantity(d, this.size);
    const tags: TradingTag[] = [
      { y: priceToY(d.entry, viewport), color: theme.text, grab: { kind: 'bracket', handle: 'entry' }, cells: [
        { kind: 'stamp', text: d.side === 'buy' ? 'Long' : 'Short' },
        ...(quantity === undefined ? [] : [{ kind: 'text' as const, text: quantityText(quantity) }]),
        { kind: 'text', text: `${bracketRiskReward(d).toFixed(2)}R` },
      ] },
      { y: priceToY(d.takeProfit, viewport), color: profit, grab: { kind: 'bracket', handle: 'tp' }, cells: [
        { kind: 'stamp', text: 'TP' },
        { kind: 'text', text: percent(d.takeProfit), color: profit },
      ] },
      { y: priceToY(d.stopLoss, viewport), color: loss, grab: { kind: 'bracket', handle: 'sl' }, cells: [
        { kind: 'stamp', text: 'SL' },
        { kind: 'text', text: percent(d.stopLoss), color: loss },
      ] },
    ];
    // None for a line off the plot: it would show as a sliver at its edge.
    return tags.filter((tag) => inPlot(tag.y, viewport));
  }

  /** The entry, the target and the stop on the price axis. */
  renderAxisBadges(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, pricePrecision?: number): void {
    for (const badge of this.axisBadges(viewport, theme, pricePrecision)) {
      drawAxisBadge(ctx, badge.y, badge.text, badge.color, viewport, theme);
    }
  }

  /** The prices it puts on the axis (on the plot): the target, the stop, the entry. */
  axisBadges(viewport: ViewportState, theme: Theme, pricePrecision?: number): AxisBadge[] {
    const d = this.draft;
    if (!d) return [];
    const { profit, loss } = bracketColors(theme);
    const badges: AxisBadge[] = [];
    for (const [price, color] of [[d.takeProfit, profit], [d.stopLoss, loss], [d.entry, theme.text]] as const) {
      const y = priceToY(price, viewport);
      if (inPlot(y, viewport)) badges.push({ y, text: priceTagText(price, viewport, pricePrecision), color });
    }
    return badges;
  }
}

/** As the positions will draw: the style keys' colours, else the candles'. */
function bracketColors(theme: Theme): { profit: string; loss: string } {
  return { profit: theme.style?.trading.profit ?? theme.candleUp, loss: theme.style?.trading.loss ?? theme.candleDown };
}

/** Move a handle to `price`, keeping SL/TP on the correct side of entry. */
function applyHandlePrice(draft: BracketDraft, handle: BracketHandle, price: number): BracketDraft {
  const isLong = draft.side === 'buy';
  if (handle === 'entry') {
    // Translate the whole bracket so SL/TP offsets are preserved.
    const delta = price - draft.entry;
    return {
      side: draft.side,
      entry: price,
      stopLoss: draft.stopLoss + delta,
      takeProfit: draft.takeProfit + delta,
    };
  }
  if (handle === 'sl') {
    const sl = isLong ? Math.min(price, draft.entry) : Math.max(price, draft.entry);
    return { ...draft, stopLoss: sl };
  }
  const tp = isLong ? Math.max(price, draft.entry) : Math.min(price, draft.entry);
  return { ...draft, takeProfit: tp };
}

import type { OrderSide, Point, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';

export type BracketHandle = 'entry' | 'sl' | 'tp';

export interface BracketDraft {
  side: OrderSide;
  entry: number;
  stopLoss: number;
  takeProfit: number;
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

/**
 * In-progress bracket-order placement: an entry line plus draggable stop-loss
 * and take-profit handles, rendered as shaded risk/reward zones. Geometry only
 * — the `TradingManager` owns lifecycle and emits the place event on confirm.
 */
export class BracketTool {
  private draft: BracketDraft | null = null;
  private dragging: BracketHandle | null = null;
  private defaults: BracketDefaultsOptions;

  constructor(defaults: BracketDefaultsOptions = {}) {
    this.defaults = defaults;
  }

  start(side: OrderSide, entry: number): void {
    this.draft = computeBracketDefaults(side, entry, this.defaults);
    this.dragging = null;
  }

  cancel(): void {
    this.draft = null;
    this.dragging = null;
  }

  isActive(): boolean {
    return this.draft !== null;
  }

  getDraft(): BracketDraft | null {
    return this.draft ? { ...this.draft } : null;
  }

  /** Which handle (if any) is under the pointer. */
  hitTest(pos: Point, viewport: ViewportState): BracketHandle | null {
    if (!this.draft) return null;
    const handles: BracketHandle[] = ['entry', 'sl', 'tp'];
    let best: BracketHandle | null = null;
    let bestDist = HANDLE_TOLERANCE;
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

  beginDrag(pos: Point, viewport: ViewportState): boolean {
    const handle = this.hitTest(pos, viewport);
    if (!handle) return false;
    this.dragging = handle;
    return true;
  }

  drag(pos: Point, viewport: ViewportState): boolean {
    if (!this.draft || !this.dragging) return false;
    const price = yToPrice(pos.y, viewport);
    this.draft = applyHandlePrice(this.draft, this.dragging, price);
    return true;
  }

  endDrag(): void {
    this.dragging = null;
  }

  isDragging(): boolean {
    return this.dragging !== null;
  }

  private priceOf(handle: BracketHandle): number {
    const d = this.draft!;
    return handle === 'entry' ? d.entry : handle === 'sl' ? d.stopLoss : d.takeProfit;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, pricePrecision = 2): void {
    const d = this.draft;
    if (!d) return;
    const { chartRect } = viewport;
    const x0 = chartRect.x;
    const x1 = chartRect.x + chartRect.width;
    const yEntry = priceToY(d.entry, viewport);
    const ySl = priceToY(d.stopLoss, viewport);
    const yTp = priceToY(d.takeProfit, viewport);

    const profit = theme.candleUp;
    const loss = theme.candleDown;

    ctx.save();

    // Reward zone (entry → TP) and risk zone (entry → SL), translucent.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = profit;
    ctx.fillRect(x0, Math.min(yEntry, yTp), chartRect.width, Math.abs(yTp - yEntry));
    ctx.fillStyle = loss;
    ctx.fillRect(x0, Math.min(yEntry, ySl), chartRect.width, Math.abs(ySl - yEntry));
    ctx.globalAlpha = 1;

    drawLine(ctx, x0, x1, yEntry, theme.text, [6, 3]);
    drawLine(ctx, x0, x1, yTp, profit, []);
    drawLine(ctx, x0, x1, ySl, loss, []);

    const rr = bracketRiskReward(d);
    const sideLabel = d.side === 'buy' ? 'LONG' : 'SHORT';
    label(ctx, x0 + 6, yEntry, `${sideLabel} entry ${d.entry.toFixed(pricePrecision)}`, theme.text, theme.background);
    label(ctx, x0 + 6, yTp, `TP ${d.takeProfit.toFixed(pricePrecision)}  ·  ${rr.toFixed(2)}R`, profit, theme.background);
    label(ctx, x0 + 6, ySl, `SL ${d.stopLoss.toFixed(pricePrecision)}`, loss, theme.background);

    // Drag handles (small knobs at the right edge).
    for (const [price, color] of [[d.entry, theme.text], [d.takeProfit, profit], [d.stopLoss, loss]] as const) {
      const y = priceToY(price, viewport);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1 - 6, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
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

function drawLine(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string, dash: number[]): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x0, Math.round(y) + 0.5);
  ctx.lineTo(x1, Math.round(y) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, bg: string): void {
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const w = ctx.measureText(text).width;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = bg;
  ctx.fillRect(x - 3, y - 8, w + 6, 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 0.5);
}

import { belowKeepOut, drawPill, formatPercent, labelBlocked, pillWidth, pillHeight, rightOfKeepOut, takeLabelBox } from './labels.js';
import type { AnchorPoint, DataSeries, DrawingState, OrderSide, Point, ViewportState } from '@tradecanvas/commons';
import { autoPricePrecision, formatPrice, priceTagText, withAlpha } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawingLook, handleRadius, roleFont } from '../drawingLook.js';
import { drawAnchorHandles } from '../handles.js';
import { positionOutcome, type PositionOutcome } from './positionOutcome.js';

/** How strongly the profit and loss zones are tinted. */
const ZONE_ALPHA = 0.14;
/** How strongly the zones' far edges (the target and the stop) show. */
const EDGE_ALPHA = 0.6;

/** Narrowest the zones are drawn, so a position placed with one click is still visible. */
const MIN_WIDTH_PX = 40;
/** Handle indexes: the entry (0), the stop and the target at the left edge, the right edge on the entry. */
const STOP_HANDLE = 1;
const TARGET_HANDLE = 2;
const END_HANDLE = 3;
/** How strongly the part of a zone the trade went through is tinted, over the zone's own tint. */
const OUTCOME_ALPHA = 0.22;
/** The dashes of the line from the entry to where the trade closed. */
const OUTCOME_DASH = [4, 3];
/** Drawings whose played trade is kept; past it the store starts again. */
const MAX_KEPT_OUTCOMES = 64;
/** What the outcome's tag calls each way a trade ends. */
const OUTCOME_LABEL: Record<PositionOutcome['kind'], string> = { target: 'Target hit', stop: 'Stop hit', ended: 'Closed', open: 'Open' };
const MIN_RATIO = 0.1;
const MAX_RATIO = 100;
/** Largest account size or risk amount taken: big enough for any account, small enough to stay finite. */
const MAX_MONEY = 1e15;
/** Decimals the reward and the risk show: money, not prices. */
const MONEY_DECIMALS = 2;
/** Most decimals the R:R shows; a whole ratio shows none (R:R 2, R:R 1.5). */
const RATIO_DECIMALS = 2;
/** Gap between a tag slid right and what it slid clear of (px). */
const TAG_SLIDE_GAP = 4;
/** Gap between the entry's handle and its tag (px), past what the handle grows to under the pointer. */
const HANDLE_TAG_GAP = 6;

/**
 * What a Long/Short Position drawing stands for as a trade: the order an app
 * would place from it. The numbers its tags show, unrounded; every one finite,
 * and the quantity above zero.
 */
export interface PositionLevels {
  /** `'buy'` for a long (the stop below the entry), `'sell'` for a short. */
  side: OrderSide;
  /** The entry's price. */
  entry: number;
  /** The stop's price: below the entry for a long, above it for a short. */
  stopLoss: number;
  /** The target's price: the reward:risk ratio away from the entry, on the other side of it. */
  takeProfit: number;
  /**
   * Units the risk buys at the stop's distance, unrounded: the drawing writes
   * it at `quantityDecimals`, and a broker takes it at its own lot size.
   */
  quantity: number;
  /** The decimals the drawing writes the quantity in (its `qtyDecimals`). */
  quantityDecimals: number;
  /** What the stop loses, in the account's money: the risk set on the drawing. */
  riskAmount: number;
  /** What the target makes, in the account's money: the quantity times the target's distance. */
  rewardAmount: number;
  /** Reward over risk: the drawing's `rewardRatio`. */
  riskReward: number;
}

/** A tag of a position: its text, the row it belongs on and its colour. */
interface PositionTag {
  text: string;
  y: number;
  color: string;
  /** Where on its row it may start at the earliest, px: past a handle there. */
  start?: number;
}

/**
 * "Long/Short Position": drag from the entry to the stop; the target sits the
 * reward:risk ratio away on the other side. Four handles: the entry, the stop
 * and the target on the entry's edge, and its other edge on the entry line,
 * which sets how long the trade runs. From the account size and the risk (a percent
 * of it, or a sum), it works out the quantity and what the target and the stop
 * are worth. Long or short follows from the stop being below or above the
 * entry. Over the bars in its span it plays the trade out (`positionOutcome`):
 * the part it went through tinted, a dashed line to where it closed, and what
 * it made there.
 *
 * Its second anchor holds the stop's price and the right edge's time.
 */
export class RiskRewardTool extends DrawingBase {
  descriptor = {
    type: 'riskReward' as const,
    name: 'Long/Short Position',
    priceOnly: true,
    requiredAnchors: 2,
    options: {
      rewardRatio: { kind: 'number' as const, label: 'Reward:risk', default: 2, min: MIN_RATIO, max: MAX_RATIO, step: 0.1 },
      accountSize: { kind: 'number' as const, label: 'Account size', default: 1000, min: 0, max: MAX_MONEY },
      riskMode: {
        kind: 'choice' as const,
        label: 'Risk as',
        default: 'percent',
        choices: [{ value: 'percent', label: 'Percent of account' }, { value: 'amount', label: 'Amount' }],
      },
      risk: { kind: 'number' as const, label: 'Risk', default: 1, min: 0, max: MAX_MONEY },
      qtyDecimals: { kind: 'number' as const, label: 'Quantity decimals', default: 2, min: 0, max: 8, step: 1 },
      showOutcome: { kind: 'boolean' as const, label: 'Show the trade over the bars', default: true },
      showLabels: { kind: 'boolean' as const, label: 'Show labels', default: true },
    },
  };

  private dataGetter: (() => DataSeries) | null = null;
  /** Moves when a bar of the same array was replaced: a played trade is stale. */
  private dataRevision: () => number = () => 0;
  /**
   * The last trade played for each drawing, kept while its bars and levels
   * are the same: hover hit-testing redraws on every pointer move, and a
   * span can hold thousands of bars. Keyed by what the bars are, not the
   * array itself, so a series let go is not kept alive here.
   */
  private outcomes = new Map<string, { key: readonly number[]; result: PositionOutcome | null }>();

  setDataGetter(getter: () => DataSeries, revision: () => number = () => 0): void {
    this.dataGetter = getter;
    this.dataRevision = revision;
    this.outcomes.clear();
  }

  private geometry(state: DrawingState) {
    const entry = state.anchors[0].price;
    const stop = state.anchors[1].price;
    const ratio = this.option<number>(state, 'rewardRatio');
    const riskPerUnit = Math.abs(entry - stop);
    const isLong = stop < entry;
    const target = isLong ? entry + riskPerUnit * ratio : entry - riskPerUnit * ratio;
    const risk = this.option<number>(state, 'risk');
    const riskAmount = this.option<string>(state, 'riskMode') === 'amount'
      ? risk
      : (this.option<number>(state, 'accountSize') * risk) / 100;
    const qty = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
    return { entry, stop, target, ratio, isLong, qty, riskAmount, rewardAmount: qty * riskPerUnit * ratio };
  }

  /**
   * How the trade went over the bars in the span; null with no bars or
   * levels, with the option off, or on a chart whose bars are not the
   * series' (Renko, Kagi, line break…), where a bar's time has no place.
   * Heikin Ashi bars stand where the real ones do: the trade is played on
   * the real prices.
   */
  private outcome(state: DrawingState, levels: PositionLevels | null, viewport: ViewportState): PositionOutcome | null {
    if (!levels || !this.dataGetter || !this.option<boolean>(state, 'showOutcome')) return null;
    const data = this.dataGetter();
    const n = data.length;
    if (n === 0) return null;
    const shown = viewport.data;
    if (shown && (shown.length !== n || shown[0].time !== data[0].time || shown[n - 1].time !== data[n - 1].time)) return null;
    const first = data[0];
    const last = data[n - 1];
    const from = state.anchors[0].time;
    const to = state.anchors[1].time;
    // The forming bar changes in place: its prices are part of the key.
    const key = [this.dataRevision(), n, first.time, last.time, last.open, last.high, last.low, last.close, from, to,
      levels.entry, levels.stopLoss, levels.takeProfit, levels.quantity];
    const kept = this.outcomes.get(state.id);
    if (kept && kept.key.length === key.length && kept.key.every((v, i) => v === key[i])) return kept.result;
    const result = positionOutcome(levels, data, from, to);
    if (this.outcomes.size >= MAX_KEPT_OUTCOMES) this.outcomes.clear();
    this.outcomes.set(state.id, { key, result });
    return result;
  }

  /** The trade the drawing stands for (`positionLevels`), worked out as its tags are. */
  levels(state: DrawingState): PositionLevels | null {
    if (state.type !== 'riskReward' || state.anchors.length < 2) return null;
    const g = this.geometry(state);
    // A stop on the entry (while the position is being placed) or no risk set
    // (an account of 0) buys nothing, and a price that is not a number can't
    // be ordered at: no trade, rather than one a broker would be sent wrong.
    const numbers = [g.entry, g.stop, g.target, g.qty, g.riskAmount, g.rewardAmount];
    if (g.entry === g.stop || !numbers.every(Number.isFinite) || !(g.qty > 0)) return null;
    return {
      side: g.isLong ? 'buy' : 'sell',
      entry: g.entry,
      stopLoss: g.stop,
      takeProfit: g.target,
      quantity: g.qty,
      quantityDecimals: this.option<number>(state, 'qtyDecimals'),
      riskAmount: g.riskAmount,
      rewardAmount: g.rewardAmount,
      riskReward: g.ratio,
    };
  }

  /** The zones' left edge and width: from the entry to the stop's time, never too thin. */
  private span(state: DrawingState, viewport: ViewportState) {
    const p0 = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    return { x: Math.min(p0.x, p1.x), width: Math.max(Math.abs(p1.x - p0.x), MIN_WIDTH_PX), stopX: p1.x };
  }

  /** The entry, the stop and the target at the entry's side, the right edge on the entry line. */
  private handles(state: DrawingState, viewport: ViewportState): Point[] {
    const { target } = this.geometry(state);
    const [entryAnchor, endAnchor] = state.anchors;
    const entry = this.anchorToPixel(entryAnchor, viewport);
    const stopY = this.anchorToPixel({ time: entryAnchor.time, price: endAnchor.price }, viewport).y;
    const targetY = this.anchorToPixel({ time: entryAnchor.time, price: target }, viewport).y;
    // The edge as drawn: a position placed with one click is drawn wider than its anchors.
    const { x, width, stopX } = this.span(state, viewport);
    const edgeX = stopX >= entry.x ? x + width : x;
    return [entry, { x: entry.x, y: stopY }, { x: entry.x, y: targetY }, { x: edgeX, y: entry.y }];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const g = this.geometry(state);
    const { x, width } = this.span(state, viewport);
    const [entryPt, stopPt, targetPt] = this.handles(state, viewport);

    // The loss and profit zones in the theme's colours, each edged at its far price.
    const look = drawingLook();
    ctx.fillStyle = withAlpha(look.fall, ZONE_ALPHA);
    ctx.fillRect(x, Math.min(entryPt.y, stopPt.y), width, Math.abs(stopPt.y - entryPt.y));
    ctx.fillStyle = withAlpha(look.rise, ZONE_ALPHA);
    ctx.fillRect(x, Math.min(entryPt.y, targetPt.y), width, Math.abs(targetPt.y - entryPt.y));
    ctx.save();
    for (const [edgeY, color] of [[stopPt.y, look.fall], [targetPt.y, look.rise]] as const) {
      this.applyGuideStyle(ctx, color);
      ctx.globalAlpha = EDGE_ALPHA;
      this.strokeHorizontal(ctx, x, x + width, edgeY);
    }
    ctx.restore();

    // How the trade went: the part of a zone it went through, and a dashed line to where it closed.
    const levels = this.levels(state);
    const played = this.outcome(state, levels, viewport);
    const closedAt = played && levels ? this.drawOutcome(ctx, viewport, levels, played) : null;

    // The entry in the drawing's line, sharp.
    this.applyLineStyle(ctx, state.style);
    ctx.setLineDash([]);
    this.strokeHorizontal(ctx, x, x + width, entryPt.y);
    this.resetLineStyle(ctx);

    const { chartRect } = viewport;
    const plotLeft = chartRect.x;
    const plotRight = chartRect.x + chartRect.width;
    // Tags only while the zone is on the plot: they'd otherwise stick to its edge.
    if (this.option<boolean>(state, 'showLabels') && x + width >= plotLeft && x <= plotRight) {
      // The market's decimals when it sets them, else as many as keep the stop
      // and the target apart; grouped in the number locale, as the axis is.
      const decimals = viewport.pricePrecision ?? autoPricePrecision(Math.min(g.stop, g.target), Math.max(g.stop, g.target));
      const locale = viewport.numberLocale ?? 'en-US';
      const qtyDecimals = this.option<number>(state, 'qtyDecimals');
      const pct = (price: number) => (g.entry !== 0 ? ((price - g.entry) / g.entry) * 100 : 0);
      // In the locale too, as the quantity and the amounts beside it are.
      const ratio = g.ratio.toLocaleString(locale, { maximumFractionDigits: RATIO_DECIMALS });
      ctx.font = roleFont('label');
      const price = (p: number) => priceTagText(p, viewport, decimals);
      const money = (amount: number) => formatPrice(amount, MONEY_DECIMALS, locale);
      const signed = (p: number) => `${p >= g.entry ? '+' : '−'}${formatPercent(Math.abs(pct(p)), viewport)}%`;
      // Tags: the entry's on its line, the target's and the stop's just outside
      // their zones, pushed apart when the zones are thin so none overlap, and
      // kept on the plot.
      const gap = pillHeight() + 2;
      const half = pillHeight() / 2;
      const outside = (edgeY: number) => {
        const up = edgeY < entryPt.y;
        const y = edgeY + (up ? -1 : 1) * (half + 2);
        const apart = up ? Math.min(y, entryPt.y - gap) : Math.max(y, entryPt.y + gap);
        return Math.min(Math.max(apart, chartRect.y + half), chartRect.y + chartRect.height - half);
      };
      // Tags start at the zone's left edge, moved left when they'd run off the plot.
      // Where the legend or a label drawn before covers one, it slides right of
      // them on its own row, else goes down under them (by the plot's top on a
      // phone). They are laid out top to bottom, so moved ones still read in
      // the order of their prices.
      const place = ({ text, y, start }: PositionTag): { left: number; top: number } => {
        const w = pillWidth(ctx, text);
        let left = Math.max(plotLeft + 4, Math.min(Math.max(x + 4, start ?? -Infinity), plotRight - 4 - w));
        let top = y - half;
        if (labelBlocked(left, top, left + w, top + pillHeight())) {
          const beside = (rightOfKeepOut(top, top + pillHeight()) ?? left) + TAG_SLIDE_GAP;
          if (beside + w <= plotRight - 4 && !labelBlocked(beside, top, beside + w, top + pillHeight())) left = beside;
          else top = belowKeepOut(left, left + w, top) + 2;
        }
        takeLabelBox(left, top, left + w, top + pillHeight());
        return { left, top };
      };
      const tags: PositionTag[] = [
        { text: `${g.isLong ? 'Long' : 'Short'} · Qty ${formatPrice(g.qty, qtyDecimals, locale)} · R:R ${ratio}`, y: entryPt.y, color: state.style.color,
          // Past the entry's handle on its row, selected or not, so the tag doesn't jump when it's picked.
          start: entryPt.x + handleRadius(state.style.lineWidth) + HANDLE_TAG_GAP },
      ];
      // A stop on the entry (while it's being placed) has no zones to label yet.
      if (Math.abs(stopPt.y - entryPt.y) >= 1) {
        tags.push(
          { text: `Target ${price(g.target)} (${signed(g.target)}) · ${money(g.rewardAmount)}`, y: outside(targetPt.y), color: look.rise },
          { text: `Stop ${price(g.stop)} (${signed(g.stop)}) · ${money(g.riskAmount)}`, y: outside(stopPt.y), color: look.fall },
        );
      }
      // Where the trade closed: how, and what it made, past the close.
      if (played && closedAt) {
        const pnl = `${played.pnl >= 0 ? '+' : '−'}${money(Math.abs(played.pnl))}`;
        tags.push({
          text: `${OUTCOME_LABEL[played.kind]} · ${pnl}`,
          y: Math.min(Math.max(closedAt.y, chartRect.y + half), chartRect.y + chartRect.height - half),
          color: played.pnl >= 0 ? look.rise : look.fall,
          start: closedAt.x + HANDLE_TAG_GAP,
        });
      }
      // Placed top to bottom, drawn entry first as before.
      const spots = new Map([...tags].sort((a, b) => a.y - b.y).map((t) => [t, place(t)] as const));
      for (const t of tags) {
        const spot = spots.get(t)!;
        drawPill(ctx, t.text, spot.left, spot.top + half, t.color);
      }
    }

    if (selected) this.renderHandles(ctx, state, viewport);
  }

  /**
   * The trade's move from its entry bar to where it closed: that part tinted in
   * the colour of what it made, over the zones, and a dashed line along it.
   * Returns where it closed, for its tag.
   */
  private drawOutcome(ctx: CanvasRenderingContext2D, viewport: ViewportState, levels: PositionLevels, played: PositionOutcome): Point | null {
    const data = this.dataGetter?.();
    if (!data) return null;
    const from = this.anchorToPixel({ time: data[played.entryIndex].time, price: levels.entry }, viewport);
    const to = this.anchorToPixel({ time: data[played.exitIndex].time, price: played.exitPrice }, viewport);
    const look = drawingLook();
    const color = played.pnl >= 0 ? look.rise : look.fall;
    ctx.fillStyle = withAlpha(color, OUTCOME_ALPHA);
    ctx.fillRect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(OUTCOME_DASH);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
    return to;
  }

  private renderHandles(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    drawAnchorHandles(ctx, state, this.handles(state, viewport));
  }

  override hitTestAnchor(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): number {
    if (state.anchors.length < 2) return super.hitTestAnchor(point, state, viewport, tolerance);
    return this.handles(state, viewport).findIndex((p) => Math.hypot(point.x - p.x, point.y - p.y) <= tolerance);
  }

  /**
   * The entry moves in time and price; the stop sets its price and the right
   * edge its time (the two halves of the second anchor); the target sets the
   * reward:risk ratio, never past the entry.
   */
  moveHandle(state: DrawingState, index: number, anchor: AnchorPoint): DrawingState {
    const [entryAnchor, endAnchor] = state.anchors;
    if (index === STOP_HANDLE) return { ...state, anchors: [{ ...entryAnchor }, { time: endAnchor.time, price: anchor.price }] };
    if (index === END_HANDLE) return { ...state, anchors: [{ ...entryAnchor }, { time: anchor.time, price: endAnchor.price }] };
    if (index !== TARGET_HANDLE) {
      const anchors = state.anchors.map((a, i) => (i === index ? { ...anchor } : { ...a }));
      return { ...state, anchors };
    }
    const { entry, isLong } = this.geometry(state);
    const riskPerUnit = Math.abs(entry - state.anchors[1].price);
    const reward = isLong ? anchor.price - entry : entry - anchor.price;
    const ratio = riskPerUnit > 0 ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, reward / riskPerUnit)) : MIN_RATIO;
    return { ...state, options: { ...state.options, rewardRatio: Math.round(ratio * 100) / 100 } };
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { x, width } = this.span(state, viewport);
    const ys = this.handles(state, viewport).map((p) => p.y);
    return point.x >= x - tolerance && point.x <= x + width + tolerance
      && point.y >= Math.min(...ys) - tolerance && point.y <= Math.max(...ys) + tolerance;
  }
}

/** Made when first asked for: importing `positionLevels` builds no tool. */
let positionTool: RiskRewardTool | null = null;

/**
 * The trade a Long/Short Position drawing stands for: its side, entry,
 * stop-loss, take-profit and the quantity its risk buys, as its tags show
 * them. `null` for any other drawing, for a position whose stop is still on
 * its entry, for one with no risk set (so no quantity), and for prices that
 * are not finite. For an app that places an order from the drawing:
 * `positionLevels(chart.getDrawings().find((d) => d.id === id))`.
 */
export function positionLevels(drawing: DrawingState | null | undefined): PositionLevels | null {
  if (!drawing) return null;
  positionTool ??= new RiskRewardTool();
  return positionTool.levels(drawing);
}

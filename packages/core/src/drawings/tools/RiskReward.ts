import { belowKeepOut, drawPill, formatPercent, labelBlocked, pillWidth, pillHeight, rightOfKeepOut, takeLabelBox } from './labels.js';
import type { AnchorPoint, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { autoPricePrecision, formatPrice, priceTagText, withAlpha } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawingLook, handleRadius, roleFont } from '../drawingLook.js';
import { drawAnchorHandles } from '../handles.js';

/** How strongly the profit and loss zones are tinted. */
const ZONE_ALPHA = 0.14;
/** How strongly the zones' far edges (the target and the stop) show. */
const EDGE_ALPHA = 0.6;

/** Narrowest the zones are drawn, so a position placed with one click is still visible. */
const MIN_WIDTH_PX = 40;
/** Handle index of the target (0 is the entry, 1 the stop). */
const TARGET_HANDLE = 2;
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
 * reward:risk ratio away on the other side, and has a handle of its own.
 * From the account size and the risk (a percent of it, or a sum), it works out
 * the quantity and what the target and the stop are worth. Long or short
 * follows from the stop being below or above the entry.
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
      showLabels: { kind: 'boolean' as const, label: 'Show labels', default: true },
    },
  };

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

  /** The zones' left edge and width: from the entry to the stop's time, never too thin. */
  private span(state: DrawingState, viewport: ViewportState) {
    const p0 = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    return { x: Math.min(p0.x, p1.x), width: Math.max(Math.abs(p1.x - p0.x), MIN_WIDTH_PX), stopX: p1.x };
  }

  private handles(state: DrawingState, viewport: ViewportState): Point[] {
    const { target } = this.geometry(state);
    const entry = this.anchorToPixel(state.anchors[0], viewport);
    const stop = this.anchorToPixel(state.anchors[1], viewport);
    const targetY = this.anchorToPixel({ time: state.anchors[1].time, price: target }, viewport).y;
    return [entry, stop, { x: stop.x, y: targetY }];
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
      // Placed top to bottom, drawn entry first as before.
      const spots = new Map([...tags].sort((a, b) => a.y - b.y).map((t) => [t, place(t)] as const));
      for (const t of tags) {
        const spot = spots.get(t)!;
        drawPill(ctx, t.text, spot.left, spot.top + half, t.color);
      }
    }

    if (selected) this.renderHandles(ctx, state, viewport);
  }

  private renderHandles(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    drawAnchorHandles(ctx, state, this.handles(state, viewport));
  }

  override hitTestAnchor(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): number {
    if (state.anchors.length < 2) return super.hitTestAnchor(point, state, viewport, tolerance);
    return this.handles(state, viewport).findIndex((p) => Math.hypot(point.x - p.x, point.y - p.y) <= tolerance);
  }

  /** The entry and the stop are anchors; the target sets the reward:risk ratio, never past the entry. */
  moveHandle(state: DrawingState, index: number, anchor: AnchorPoint): DrawingState {
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

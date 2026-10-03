import { drawingFont, drawPill, pillWidth, PILL_HEIGHT } from './labels.js';
import type { AnchorPoint, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { autoPricePrecision } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

/** Narrowest the zones are drawn, so a position placed with one click is still visible. */
const MIN_WIDTH_PX = 40;
/** Handle index of the target (0 is the entry, 1 the stop). */
const TARGET_HANDLE = 2;
const MIN_RATIO = 0.1;
const MAX_RATIO = 100;
/** Largest account size or risk amount taken: big enough for any account, small enough to stay finite. */
const MAX_MONEY = 1e15;

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

    ctx.fillStyle = 'rgba(232, 80, 91, 0.18)';
    ctx.fillRect(x, Math.min(entryPt.y, stopPt.y), width, Math.abs(stopPt.y - entryPt.y));
    ctx.fillStyle = 'rgba(31, 168, 116, 0.18)';
    ctx.fillRect(x, Math.min(entryPt.y, targetPt.y), width, Math.abs(targetPt.y - entryPt.y));

    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, entryPt.y);
    ctx.lineTo(x + width, entryPt.y);
    ctx.stroke();

    const { chartRect } = viewport;
    const plotLeft = chartRect.x;
    const plotRight = chartRect.x + chartRect.width;
    // Tags only while the zone is on the plot: they'd otherwise stick to its edge.
    if (this.option<boolean>(state, 'showLabels') && x + width >= plotLeft && x <= plotRight) {
      const decimals = autoPricePrecision(Math.min(g.stop, g.target), Math.max(g.stop, g.target));
      const qtyDecimals = this.option<number>(state, 'qtyDecimals');
      const pct = (price: number) => (g.entry !== 0 ? ((price - g.entry) / g.entry) * 100 : 0).toFixed(2);
      const ratio = Number(g.ratio.toFixed(2));
      ctx.font = drawingFont(11);
      const price = (p: number) => viewport.formatPrice?.(p) ?? p.toFixed(decimals);
      const signed = (p: number) => `${p >= g.entry ? '+' : '−'}${Math.abs(Number(pct(p))).toFixed(2)}%`;
      // Tags: the entry's on its line, the target's and the stop's just outside
      // their zones, pushed apart when the zones are thin so none overlap, and
      // kept on the plot.
      const gap = PILL_HEIGHT + 2;
      const half = PILL_HEIGHT / 2;
      const outside = (edgeY: number) => {
        const up = edgeY < entryPt.y;
        const y = edgeY + (up ? -1 : 1) * (half + 2);
        const apart = up ? Math.min(y, entryPt.y - gap) : Math.max(y, entryPt.y + gap);
        return Math.min(Math.max(apart, chartRect.y + half), chartRect.y + chartRect.height - half);
      };
      // Tags start at the zone's left edge, moved left when they'd run off the plot.
      const tag = (text: string, y: number, color: string) => {
        drawPill(ctx, text, Math.max(plotLeft + 4, Math.min(x + 4, plotRight - 4 - pillWidth(ctx, text))), y, color);
      };
      tag(`${g.isLong ? 'Long' : 'Short'} · Qty ${g.qty.toFixed(qtyDecimals)} · R:R ${ratio}`, entryPt.y, state.style.color);
      // A stop on the entry (while it's being placed) has no zones to label yet.
      if (Math.abs(stopPt.y - entryPt.y) >= 1) {
        tag(`Target ${price(g.target)} (${signed(g.target)}) · ${g.rewardAmount.toFixed(2)}`, outside(targetPt.y), '#1fa874');
        tag(`Stop ${price(g.stop)} (${signed(g.stop)}) · ${g.riskAmount.toFixed(2)}`, outside(stopPt.y), '#e8505b');
      }
    }

    if (selected) this.renderHandles(ctx, state, viewport);
  }

  private renderHandles(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    const size = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    for (const p of this.handles(state, viewport)) {
      ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
      ctx.strokeRect(p.x - size, p.y - size, size * 2, size * 2);
    }
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

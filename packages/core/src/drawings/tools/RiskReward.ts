import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

const DEFAULT_REWARD_RATIO = 2;

/**
 * TradingView's "Long/Short Position" tool: drag from an entry price to a
 * stop price, and it draws the risk zone between them plus a reward zone of
 * equal width on the far side — sized by a fixed reward:risk ratio — with
 * labels for the $ and % at each level. Direction (long vs short) is
 * inferred from whether the stop anchor sits below or above the entry.
 */
export class RiskRewardTool extends DrawingBase {
  descriptor = { type: 'riskReward' as const, name: 'Long/Short Position', requiredAnchors: 2 };

  private geometry(state: DrawingState) {
    const entryPrice = state.anchors[0].price;
    const stopPrice = state.anchors[1].price;
    const risk = Math.abs(entryPrice - stopPrice);
    const isLong = stopPrice < entryPrice;
    const targetPrice = isLong ? entryPrice + risk * DEFAULT_REWARD_RATIO : entryPrice - risk * DEFAULT_REWARD_RATIO;
    return { entryPrice, stopPrice, targetPrice, risk, isLong };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { entryPrice, stopPrice, targetPrice, risk, isLong } = this.geometry(state);

    const p0 = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p0.x, p1.x);
    const w = Math.max(Math.abs(p1.x - p0.x), 40);

    const entryY = p0.y;
    const stopY = p1.y;
    const targetY = this.anchorToPixel({ time: state.anchors[1].time, price: targetPrice }, viewport).y;

    const riskTop = Math.min(entryY, stopY);
    const riskH = Math.abs(stopY - entryY);
    const rewardTop = Math.min(entryY, targetY);
    const rewardH = Math.abs(targetY - entryY);

    ctx.fillStyle = 'rgba(239, 83, 80, 0.18)';
    ctx.fillRect(x, riskTop, w, riskH);
    ctx.fillStyle = 'rgba(38, 166, 154, 0.18)';
    ctx.fillRect(x, rewardTop, w, rewardH);

    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, entryY); ctx.lineTo(x + w, entryY);
    ctx.stroke();

    const pct = (price: number) => (entryPrice !== 0 ? ((price - entryPrice) / entryPrice) * 100 : 0);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#EF5350';
    ctx.fillText(`Risk ${risk.toFixed(2)} (${pct(stopPrice).toFixed(2)}%)`, x + 4, (entryY + stopY) / 2);
    ctx.fillStyle = '#26A69A';
    const ratioLabel = `R:R 1:${DEFAULT_REWARD_RATIO}`;
    ctx.fillText(
      `Reward ${(risk * DEFAULT_REWARD_RATIO).toFixed(2)} (${pct(targetPrice).toFixed(2)}%) · ${ratioLabel}`,
      x + 4,
      (entryY + targetY) / 2,
    );
    ctx.fillStyle = state.style.color;
    ctx.fillText(isLong ? 'Long' : 'Short', x + 4, entryY - 8);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { targetPrice } = this.geometry(state);
    const p0 = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    const targetY = this.anchorToPixel({ time: state.anchors[1].time, price: targetPrice }, viewport).y;

    const x1 = Math.min(p0.x, p1.x) - tolerance;
    const x2 = Math.max(p0.x, p1.x) + tolerance;
    const y1 = Math.min(p0.y, p1.y, targetY) - tolerance;
    const y2 = Math.max(p0.y, p1.y, targetY) + tolerance;
    return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
  }
}

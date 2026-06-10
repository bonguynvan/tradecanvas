import type { DepthData, DepthLevel, ViewportState, Theme } from '@tradecanvas/commons';
import { timeToX, priceToY } from '../viewport/ScaleMapping.js';
import { DepthHeatmapBuffer } from './DepthHeatmapBuffer.js';

/**
 * Order-book liquidity heatmap. Each accumulated depth snapshot becomes a
 * vertical strip at its time position; every price level is a cell whose
 * brightness scales with resting size (bids green, asks red). Reveals where
 * liquidity walls sit and persist over time — the classic crypto "heatmap".
 *
 * Snapshots are fed via `push()` (typically alongside the depth overlay) and
 * stored in a fixed-capacity ring buffer.
 */
export class DepthHeatmapRenderer {
  private buffer = new DepthHeatmapBuffer(240);
  private visible = false;
  private opacity = 0.7;

  setVisible(v: boolean): void {
    this.visible = v;
  }
  isVisible(): boolean {
    return this.visible;
  }
  setOpacity(o: number): void {
    this.opacity = Math.max(0.1, Math.min(1, o));
  }
  setCapacity(n: number): void {
    this.buffer.setCapacity(n);
  }

  push(time: number, depth: DepthData): void {
    this.buffer.push(time, depth);
  }

  clear(): void {
    this.buffer.clear();
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.visible) return;
    const snapshots = this.buffer.snapshots();
    if (snapshots.length === 0) return;

    const max = this.buffer.maxVolume();
    if (max <= 0) return;
    const invMax = 1 / max;

    const { chartRect } = viewport;
    const stripWidth = Math.max(2, viewport.barWidth + viewport.barSpacing);
    const left = chartRect.x;
    const right = chartRect.x + chartRect.width;
    const top = chartRect.y;
    const bottom = chartRect.y + chartRect.height;

    ctx.save();
    for (const snap of snapshots) {
      const cx = timeToX(snap.time, viewport);
      if (cx < left - stripWidth || cx > right + stripWidth) continue;
      const x = cx - stripWidth / 2;
      this.drawSide(ctx, snap.bids, theme.candleUp, x, stripWidth, viewport, invMax, top, bottom);
      this.drawSide(ctx, snap.asks, theme.candleDown, x, stripWidth, viewport, invMax, top, bottom);
    }
    ctx.restore();
  }

  private drawSide(
    ctx: CanvasRenderingContext2D,
    levels: DepthLevel[],
    color: string,
    x: number,
    width: number,
    viewport: ViewportState,
    invMax: number,
    top: number,
    bottom: number,
  ): void {
    if (levels.length === 0) return;
    const cellH = levelCellHeight(levels, viewport);
    ctx.fillStyle = color;
    for (const level of levels) {
      const y = priceToY(level.price, viewport);
      if (y < top - cellH || y > bottom + cellH) continue;
      // Perceptual ramp — sqrt makes mid-size walls visible without washing out.
      ctx.globalAlpha = Math.min(1, Math.sqrt(level.volume * invMax)) * this.opacity;
      ctx.fillRect(x, y - cellH / 2, width, cellH);
    }
    ctx.globalAlpha = 1;
  }
}

/** Cell height in px from the median price spacing of the levels. */
function levelCellHeight(levels: DepthLevel[], viewport: ViewportState): number {
  if (levels.length < 2) return 3;
  const prices = levels.map((l) => l.price).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const g = prices[i] - prices[i - 1];
    if (g > 0) gaps.push(g);
  }
  if (gaps.length === 0) return 3;
  gaps.sort((a, b) => a - b);
  const step = gaps[Math.floor(gaps.length / 2)];
  const px = Math.abs(priceToY(prices[0], viewport) - priceToY(prices[0] + step, viewport));
  return Math.max(2, Math.min(px, 12));
}

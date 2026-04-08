import type { DrawingState, Point, ViewportState, DataSeries } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Anchored VWAP drawing tool.
 * One anchor sets the start bar. The VWAP line is computed from that bar
 * to the end of visible data using cumulative (price * volume) / volume.
 * Optionally renders +/-1 and +/-2 standard deviation bands.
 */
export class AnchoredVWAPTool extends DrawingBase {
  descriptor = { type: 'anchoredVWAP' as const, name: 'Anchored VWAP', requiredAnchors: 1 };

  private dataGetter: (() => DataSeries) | null = null;
  private showBands = true;

  setDataGetter(getter: () => DataSeries): void {
    this.dataGetter = getter;
  }

  setShowBands(show: boolean): void {
    this.showBands = show;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1 || !this.dataGetter) return;

    const data = this.dataGetter();
    const startIdx = Math.max(0, Math.round(state.anchors[0].time));
    if (startIdx >= data.length) return;

    // Compute anchored VWAP from startIdx to end
    const { vwap, upper1, lower1, upper2, lower2 } = this.computeVWAP(data, startIdx);

    const { chartRect } = viewport;
    const barUnit = viewport.barWidth + viewport.barSpacing;

    // Draw VWAP line
    this.applyLineStyle(ctx, state.style);
    ctx.lineWidth = state.style.lineWidth + 0.5;

    this.drawLine(ctx, vwap, startIdx, viewport, chartRect, barUnit);

    // Draw bands
    if (this.showBands && vwap.length > 1) {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(0.5, state.style.lineWidth * 0.6);
      ctx.setLineDash([4, 3]);

      this.drawLine(ctx, upper1, startIdx, viewport, chartRect, barUnit);
      this.drawLine(ctx, lower1, startIdx, viewport, chartRect, barUnit);

      ctx.globalAlpha = 0.25;
      this.drawLine(ctx, upper2, startIdx, viewport, chartRect, barUnit);
      this.drawLine(ctx, lower2, startIdx, viewport, chartRect, barUnit);

      ctx.globalAlpha = 1;
    }

    this.resetLineStyle(ctx);

    // Label
    if (vwap.length > 0) {
      const lastPrice = vwap[vwap.length - 1];
      const lastIdx = startIdx + vwap.length - 1;
      const x = barIndexToX(lastIdx, viewport);
      const y = priceToY(lastPrice, viewport);
      if (x >= chartRect.x && x <= chartRect.x + chartRect.width) {
        ctx.fillStyle = state.style.color;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`AVWAP ${lastPrice.toFixed(2)}`, x + 6, y);
      }
    }

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    prices: number[],
    startIdx: number,
    viewport: ViewportState,
    chartRect: { x: number; width: number },
    barUnit: number,
  ): void {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < prices.length; i++) {
      const x = barIndexToX(startIdx + i, viewport);
      if (x < chartRect.x - barUnit) continue;
      if (x > chartRect.x + chartRect.width + barUnit) break;
      const y = priceToY(prices[i], viewport);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private computeVWAP(data: DataSeries, startIdx: number): {
    vwap: number[];
    upper1: number[];
    lower1: number[];
    upper2: number[];
    lower2: number[];
  } {
    const len = data.length - startIdx;
    const vwap: number[] = new Array(len);
    const upper1: number[] = new Array(len);
    const lower1: number[] = new Array(len);
    const upper2: number[] = new Array(len);
    const lower2: number[] = new Array(len);

    let cumPV = 0;
    let cumV = 0;
    let cumPV2 = 0; // For standard deviation

    for (let i = 0; i < len; i++) {
      const bar = data[startIdx + i];
      const tp = (bar.high + bar.low + bar.close) / 3; // Typical price
      const vol = bar.volume ?? 1;

      cumPV += tp * vol;
      cumV += vol;
      cumPV2 += tp * tp * vol;

      const v = cumV > 0 ? cumPV / cumV : tp;
      vwap[i] = v;

      // Standard deviation of price from VWAP
      const variance = cumV > 0 ? (cumPV2 / cumV) - v * v : 0;
      const stdDev = Math.sqrt(Math.max(0, variance));

      upper1[i] = v + stdDev;
      lower1[i] = v - stdDev;
      upper2[i] = v + 2 * stdDev;
      lower2[i] = v - 2 * stdDev;
    }

    return { vwap, upper1, lower1, upper2, lower2 };
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1 || !this.dataGetter) return false;

    const data = this.dataGetter();
    const startIdx = Math.max(0, Math.round(state.anchors[0].time));
    if (startIdx >= data.length) return false;

    const { vwap } = this.computeVWAP(data, startIdx);

    // Check if point is close to any segment of the VWAP line
    for (let i = 1; i < vwap.length; i++) {
      const p1x = barIndexToX(startIdx + i - 1, viewport);
      const p1y = priceToY(vwap[i - 1], viewport);
      const p2x = barIndexToX(startIdx + i, viewport);
      const p2y = priceToY(vwap[i], viewport);
      const dist = this.distanceToLine(point, { x: p1x, y: p1y }, { x: p2x, y: p2y });
      if (dist <= tolerance) return true;
    }

    return false;
  }
}

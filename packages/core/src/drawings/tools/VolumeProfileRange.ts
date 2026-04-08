import type { DrawingState, Point, ViewportState, DataSeries } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Volume Profile (Visible/Fixed Range) drawing tool.
 * Two anchors define a time range. The tool computes volume distribution
 * across price levels within that range and renders a horizontal histogram.
 */
export class VolumeProfileRangeTool extends DrawingBase {
  descriptor = { type: 'volumeProfileRange' as const, name: 'Volume Profile (Range)', requiredAnchors: 2 };

  private dataGetter: (() => DataSeries) | null = null;
  private numBins = 40;

  setDataGetter(getter: () => DataSeries): void {
    this.dataGetter = getter;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2 || !this.dataGetter) return;

    const data = this.dataGetter();
    const startIdx = Math.max(0, Math.min(Math.round(state.anchors[0].time), Math.round(state.anchors[1].time)));
    const endIdx = Math.min(data.length - 1, Math.max(Math.round(state.anchors[0].time), Math.round(state.anchors[1].time)));

    if (startIdx >= data.length || endIdx < 0 || startIdx > endIdx) return;

    // Find price range within the selected bars
    let pMin = Infinity, pMax = -Infinity;
    for (let i = startIdx; i <= endIdx; i++) {
      if (data[i].low < pMin) pMin = data[i].low;
      if (data[i].high > pMax) pMax = data[i].high;
    }
    if (pMin >= pMax) return;

    // Build volume histogram
    const binSize = (pMax - pMin) / this.numBins;
    const bins = new Float64Array(this.numBins);
    let maxBinVol = 0;

    for (let i = startIdx; i <= endIdx; i++) {
      const bar = data[i];
      const vol = bar.volume ?? 1;
      // Distribute volume across the bins the bar spans
      const lowBin = Math.max(0, Math.floor((bar.low - pMin) / binSize));
      const highBin = Math.min(this.numBins - 1, Math.floor((bar.high - pMin) / binSize));
      const span = highBin - lowBin + 1;
      const volPerBin = vol / span;
      for (let b = lowBin; b <= highBin; b++) {
        bins[b] += volPerBin;
        if (bins[b] > maxBinVol) maxBinVol = bins[b];
      }
    }

    if (maxBinVol === 0) return;

    // Find POC (Point of Control)
    let pocBin = 0;
    for (let i = 1; i < this.numBins; i++) {
      if (bins[i] > bins[pocBin]) pocBin = i;
    }

    // Render histogram on the right side of the selected range
    const rightX = barIndexToX(endIdx, viewport) + viewport.barWidth;
    const maxBarWidth = 100; // Max histogram bar width in pixels
    const color = state.style.color;
    const pocColor = state.style.fillColor ?? '#FF9800';

    ctx.save();

    for (let b = 0; b < this.numBins; b++) {
      const ratio = bins[b] / maxBinVol;
      const barW = ratio * maxBarWidth;

      const priceTop = pMin + (b + 1) * binSize;
      const priceBot = pMin + b * binSize;
      const yTop = priceToY(priceTop, viewport);
      const yBot = priceToY(priceBot, viewport);
      const barH = Math.abs(yBot - yTop);

      ctx.globalAlpha = 0.35;
      ctx.fillStyle = b === pocBin ? pocColor : color;
      ctx.fillRect(rightX, Math.min(yTop, yBot), barW, Math.max(1, barH - 0.5));
    }

    // POC line
    const pocPrice = pMin + (pocBin + 0.5) * binSize;
    const pocY = priceToY(pocPrice, viewport);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = pocColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const leftX = barIndexToX(startIdx, viewport) - viewport.barWidth / 2;
    ctx.moveTo(leftX, pocY);
    ctx.lineTo(rightX + maxBarWidth, pocY);
    ctx.stroke();

    // POC label
    ctx.fillStyle = pocColor;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = 0.8;
    ctx.fillText(`POC ${pocPrice.toFixed(2)}`, rightX + maxBarWidth + 4, pocY - 2);

    ctx.restore();

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;

    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    const left = Math.min(p1.x, p2.x) - tolerance;
    const right = Math.max(p1.x, p2.x) + 100 + tolerance; // +100 for histogram width
    const top = Math.min(p1.y, p2.y) - tolerance;
    const bottom = Math.max(p1.y, p2.y) + tolerance;

    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  }
}

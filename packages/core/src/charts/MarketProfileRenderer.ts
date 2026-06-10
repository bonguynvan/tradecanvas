import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { computeMarketProfile } from './marketProfile.js';

/**
 * Market Profile (TPO) — a horizontal histogram of *time at price* over the
 * visible range. Each bar contributes one TPO to every price bucket its
 * [low, high] range touched; the widest row is the Point of Control and the
 * shaded band is the value area (≈70% of TPOs by default).
 *
 * Distinct from the Volume Profile (which weights by traded volume): this
 * weights by time, and is left-pinned so the two can be shown together.
 * Re-bins against the current viewport on every pan/zoom.
 */
export class MarketProfileRenderer {
  private visible = false;
  private buckets = 48;
  private widthRatio = 0.18;
  private opacity = 0.32;
  private valueAreaPct = 0.7;
  private highlightPoC = true;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }
  setBuckets(n: number): void { this.buckets = Math.max(8, Math.min(200, Math.floor(n))); }
  setWidthRatio(r: number): void { this.widthRatio = Math.max(0.05, Math.min(0.5, r)); }
  setOpacity(o: number): void { this.opacity = Math.max(0.05, Math.min(1, o)); }
  setValueAreaPct(p: number): void { this.valueAreaPct = Math.max(0.3, Math.min(0.95, p)); }
  setHighlightPoC(enabled: boolean): void { this.highlightPoC = enabled; }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;

    const { from, to } = viewport.visibleRange;
    const { chartRect, priceRange } = viewport;
    const start = Math.max(0, from);
    const end = Math.min(to, data.length - 1);
    if (end < start) return;

    const slice = data.slice(start, end + 1);
    const profile = computeMarketProfile(slice, priceRange.min, priceRange.max, {
      buckets: this.buckets,
      valueAreaPct: this.valueAreaPct,
    });
    if (!profile) return;

    const n = profile.buckets.length;
    const profileWidth = chartRect.width * this.widthRatio;
    const left = chartRect.x;
    const bucketHeight = chartRect.height / n;
    const inv = 1 / profile.maxCount;

    ctx.save();

    // Bars: value-area rows use the accent (up) colour, the rest a muted tint.
    for (let b = 0; b < n; b++) {
      const bucket = profile.buckets[b];
      if (bucket.count === 0) continue;
      const y = chartRect.y + chartRect.height - (b + 1) * bucketHeight;
      const w = bucket.count * inv * profileWidth;
      const inVA = bucket.mid >= profile.valueAreaLow && bucket.mid <= profile.valueAreaHigh;
      ctx.globalAlpha = inVA ? Math.min(1, this.opacity + 0.18) : this.opacity;
      ctx.fillStyle = inVA ? theme.candleUp : theme.textSecondary;
      ctx.fillRect(left, y + 0.5, w, bucketHeight - 1);
    }

    // Point of control — dashed line across the busiest price row.
    if (this.highlightPoC) {
      const b = profile.pocIndex;
      const y = chartRect.y + chartRect.height - (b + 0.5) * bucketHeight;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(left, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

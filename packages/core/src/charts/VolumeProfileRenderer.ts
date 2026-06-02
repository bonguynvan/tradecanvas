import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';

/**
 * Volume Profile — horizontal histogram of traded volume bucketed by price.
 *
 * Distributes each bar's volume across the price range it covered (low → high)
 * using a simple uniform distribution. The result is a side histogram pinned
 * to the right edge of the chart that shows where the market spent the most
 * volume — the "value area" and "point of control" come from this shape.
 *
 * Tradeoffs (intentional):
 *   - Uniform low→high allocation, not VWAP-weighted. Cheaper to compute and
 *     close enough for visual reading at chart-zoom scales.
 *   - Buckets are computed against the *visible price range*, so the profile
 *     rebins on pan/zoom — what you see is always relative to the current
 *     viewport.
 *   - No look-ahead: only bars currently inside `visibleRange` contribute.
 */
export class VolumeProfileRenderer {
  private visible = false;
  /** Number of horizontal buckets the visible price range is split into. */
  private buckets = 48;
  /** Profile width as a fraction of chart width. 0.18 ≈ 18%. */
  private widthRatio = 0.18;
  /** Opacity of the histogram bars. */
  private opacity = 0.32;
  /** Highlight the highest-volume bucket (point of control). */
  private highlightPoC = true;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }
  setBuckets(n: number): void { this.buckets = Math.max(8, Math.min(200, Math.floor(n))); }
  setWidthRatio(r: number): void { this.widthRatio = Math.max(0.05, Math.min(0.5, r)); }
  setOpacity(o: number): void { this.opacity = Math.max(0.05, Math.min(1, o)); }
  setHighlightPoC(enabled: boolean): void { this.highlightPoC = enabled; }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;

    const { from, to } = viewport.visibleRange;
    const { chartRect, priceRange } = viewport;
    const priceSpan = priceRange.max - priceRange.min;
    if (priceSpan <= 0) return;

    const buckets = new Float64Array(this.buckets);
    let upBuckets = new Float64Array(this.buckets);
    let downBuckets = new Float64Array(this.buckets);

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      if (bar.volume <= 0) continue;
      const lo = Math.max(bar.low, priceRange.min);
      const hi = Math.min(bar.high, priceRange.max);
      if (hi <= lo) continue;

      // Uniformly spread the bar's volume across the bucket(s) it covers.
      const loFrac = (lo - priceRange.min) / priceSpan;
      const hiFrac = (hi - priceRange.min) / priceSpan;
      const loBucket = Math.max(0, Math.floor(loFrac * this.buckets));
      const hiBucket = Math.min(this.buckets - 1, Math.floor(hiFrac * this.buckets));
      const span = Math.max(1, hiBucket - loBucket + 1);
      const perBucket = bar.volume / span;
      const isUp = bar.close >= bar.open;

      for (let b = loBucket; b <= hiBucket; b++) {
        buckets[b] += perBucket;
        if (isUp) upBuckets[b] += perBucket;
        else downBuckets[b] += perBucket;
      }
    }

    let maxBucket = 0;
    let pocIndex = -1;
    for (let b = 0; b < buckets.length; b++) {
      if (buckets[b] > maxBucket) {
        maxBucket = buckets[b];
        pocIndex = b;
      }
    }
    if (maxBucket === 0) return;

    const profileWidth = chartRect.width * this.widthRatio;
    const profileRight = chartRect.x + chartRect.width;
    const bucketHeight = chartRect.height / this.buckets;
    const inv = 1 / maxBucket;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Draw stacked up/down per bucket. Each bucket: [low price row] → up at
    // bottom, down on top. Right-aligned, growing leftward.
    for (let b = 0; b < this.buckets; b++) {
      const total = buckets[b];
      if (total === 0) continue;

      const y = chartRect.y + chartRect.height - (b + 1) * bucketHeight;
      const totalW = (total * inv) * profileWidth;
      const upW = (upBuckets[b] * inv) * profileWidth;
      const downW = (downBuckets[b] * inv) * profileWidth;

      // Layered: green block first, red stacks on top of it horizontally.
      if (upW > 0) {
        ctx.fillStyle = theme.candleUp;
        ctx.fillRect(profileRight - upW, y + 0.5, upW, bucketHeight - 1);
      }
      if (downW > 0) {
        ctx.fillStyle = theme.candleDown;
        ctx.fillRect(profileRight - totalW, y + 0.5, downW, bucketHeight - 1);
      }

      // Point of control — overlay a thin outline + brighter alpha so it
      // pops as the high-volume bucket.
      if (this.highlightPoC && b === pocIndex) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.crosshair;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(chartRect.x, y + bucketHeight / 2 + 0.5);
        ctx.lineTo(profileRight - totalW - 2, y + bucketHeight / 2 + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = this.opacity;
      }
    }

    ctx.restore();
    // Silence "unused" linter chatter on dev rebuilds — these arrays escape
    // the closure intentionally; we keep them as separate references for
    // future per-direction extensions (e.g., delta volume profile).
    void upBuckets; void downBuckets;
  }
}

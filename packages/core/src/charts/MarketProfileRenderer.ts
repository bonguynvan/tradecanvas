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
export interface MarketProfileStats {
  /** Point-of-control price (busiest bucket midpoint). */
  poc: number;
  /** Value-area high price. */
  vah: number;
  /** Value-area low price. */
  val: number;
  /** Fraction of TPOs inside the value area (the configured target). */
  valueAreaPct: number;
}

export class MarketProfileRenderer {
  private visible = false;
  private buckets = 48;
  private widthRatio = 0.18;
  private opacity = 0.32;
  private valueAreaPct = 0.7;
  private highlightPoC = true;
  private showStats = true;
  private lastStats: MarketProfileStats | null = null;

  setVisible(v: boolean): void { this.visible = v; if (!v) this.lastStats = null; }
  isVisible(): boolean { return this.visible; }
  setBuckets(n: number): void { this.buckets = Math.max(8, Math.min(200, Math.floor(n))); }
  setWidthRatio(r: number): void { this.widthRatio = Math.max(0.05, Math.min(0.5, r)); }
  setOpacity(o: number): void { this.opacity = Math.max(0.05, Math.min(1, o)); }
  setValueAreaPct(p: number): void { this.valueAreaPct = Math.max(0.3, Math.min(0.95, p)); }
  setHighlightPoC(enabled: boolean): void { this.highlightPoC = enabled; }
  setShowStats(enabled: boolean): void { this.showStats = enabled; }

  /** POC / VAH / VAL from the most recent render, or null if not drawn. */
  getStats(): MarketProfileStats | null {
    return this.lastStats;
  }

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
    if (!profile) { this.lastStats = null; return; }

    const pocPrice = profile.buckets[profile.pocIndex].mid;
    this.lastStats = {
      poc: pocPrice,
      vah: profile.valueAreaHigh,
      val: profile.valueAreaLow,
      valueAreaPct: this.valueAreaPct,
    };

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

    const priceToYLinear = (price: number): number =>
      chartRect.y + chartRect.height * (1 - (price - priceRange.min) / (priceRange.max - priceRange.min));

    // Value-area boundary lines (VAH / VAL) — faint dotted guides.
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = theme.candleUp;
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 3]);
    for (const price of [profile.valueAreaHigh, profile.valueAreaLow]) {
      const y = priceToYLinear(price);
      ctx.beginPath();
      ctx.moveTo(left, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Point of control — dashed line across the busiest price row.
    if (this.highlightPoC) {
      const y = priceToYLinear(pocPrice);
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

    // Stats readout — POC / VAH / VAL in a compact label, top-left of profile.
    if (this.showStats) {
      this.drawStats(ctx, chartRect.x + 6, chartRect.y + 6, pocPrice, profile.valueAreaHigh, profile.valueAreaLow, theme);
    }

    ctx.restore();
  }

  private drawStats(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    poc: number,
    vah: number,
    val: number,
    theme: Theme,
  ): void {
    const digits = pricePrecision(poc);
    const rows: [string, string, string][] = [
      ['POC', poc.toFixed(digits), theme.crosshair],
      ['VAH', vah.toFixed(digits), theme.candleUp],
      ['VAL', val.toFixed(digits), theme.candleUp],
    ];
    ctx.globalAlpha = 1;
    ctx.font = `600 10px ${theme.font.family}`;
    ctx.textBaseline = 'middle';
    const lineH = 14;
    const padX = 6;
    const labelW = 26;
    let maxValW = 0;
    for (const [, value] of rows) maxValW = Math.max(maxValW, ctx.measureText(value).width);
    const boxW = padX * 2 + labelW + maxValW;
    const boxH = padX + rows.length * lineH;

    ctx.fillStyle = theme.background;
    ctx.globalAlpha = 0.82;
    roundRect(ctx, x, y, boxW, boxH, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    rows.forEach(([label, value, color], i) => {
      const ry = y + padX / 2 + lineH / 2 + i * lineH;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(label, x + padX, ry);
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'right';
      ctx.fillText(value, x + boxW - padX, ry);
    });
    ctx.textAlign = 'left';
  }
}

function pricePrecision(price: number): number {
  const abs = Math.abs(price);
  if (abs >= 1000) return 2;
  if (abs >= 1) return 4;
  return 6;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

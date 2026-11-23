import type { DepthData, DepthLevel, ViewportState, Theme } from '@tradecanvas/commons';
import { timeToX, priceToY } from '../viewport/ScaleMapping.js';
import { DepthHeatmapBuffer, levelStep } from './DepthHeatmapBuffer.js';

/**
 * Order-book liquidity heatmap. Each accumulated depth snapshot becomes a
 * vertical strip at its time position; every price level is a cell whose
 * brightness scales with resting size (bids green, asks red). Reveals where
 * liquidity walls sit and persist over time — the classic crypto "heatmap".
 *
 * Snapshots are fed via `push()` (typically alongside the depth overlay) and
 * stored in a fixed-capacity ring buffer.
 */
/** How the liquidity heatmap is drawn. */
export interface DepthHeatmapConfig {
  opacity: number;
  /** How many snapshots it keeps. */
  capacity: number;
  /** The bids' colour; null is the theme's rising candle. */
  bidColor: string | null;
  /** The asks' colour; null is the theme's falling candle. */
  askColor: string | null;
}

/** A colour given for a layer: a string with something in it, else none (the theme's). */
function ownColor(color: string | null): string | null {
  return typeof color === 'string' && color.trim() !== '' ? color : null;
}

export class DepthHeatmapRenderer {
  private buffer = new DepthHeatmapBuffer(240);
  private visible = false;
  private opacity = 0.7;
  private bidColor: string | null = null;
  private askColor: string | null = null;
  /** Books from this time on are not drawn (a replay has not reached them); null draws all. */
  private shownUntil: number | null = null;

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
  /**
   * Colours of its own for the bids and the asks; null (or left out as they start) is the theme's
   * rising and falling candles. A chart that hides its candles, or colours them for something
   * else, keeps its heatmap with these.
   */
  setColors(colors: { bidColor?: string | null; askColor?: string | null }): void {
    if (colors.bidColor !== undefined) this.bidColor = ownColor(colors.bidColor);
    if (colors.askColor !== undefined) this.askColor = ownColor(colors.askColor);
  }

  /** Its opacity, how many snapshots it keeps and its own colours (null: the theme's), as the setters left them. */
  getConfig(): DepthHeatmapConfig {
    return { opacity: this.opacity, capacity: this.buffer.getCapacity(), bidColor: this.bidColor, askColor: this.askColor };
  }

  /**
   * Draw only the books stamped before `time`, as a replay that has shown
   * the bars up to it would; null draws them all again. The books are kept.
   */
  setShownUntil(time: number | null): void {
    this.shownUntil = time !== null && Number.isFinite(time) ? time : null;
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
    const until = this.shownUntil;
    for (const snap of snapshots) {
      if (until !== null && snap.time >= until) continue;
      const cx = timeToX(snap.time, viewport);
      if (cx < left - stripWidth || cx > right + stripWidth) continue;
      const x = cx - stripWidth / 2;
      this.drawSide(ctx, snap.bids, snap.bidStep ?? levelStep(snap.bids), this.bidColor ?? theme.candleUp, x, stripWidth, viewport, invMax, top, bottom);
      this.drawSide(ctx, snap.asks, snap.askStep ?? levelStep(snap.asks), this.askColor ?? theme.candleDown, x, stripWidth, viewport, invMax, top, bottom);
    }
    ctx.restore();
  }

  private drawSide(
    ctx: CanvasRenderingContext2D,
    levels: DepthLevel[],
    step: number,
    color: string,
    x: number,
    width: number,
    viewport: ViewportState,
    invMax: number,
    top: number,
    bottom: number,
  ): void {
    if (levels.length === 0) return;
    // Measured at the side's lower end, whichever way the levels are listed (bids best first, asks lowest first).
    const cellH = levelCellHeight(Math.min(levels[0].price, levels[levels.length - 1].price), step, viewport);
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

/** Cell height in px: the levels' spacing (`levelStep`) on screen at `price`. */
function levelCellHeight(price: number, step: number, viewport: ViewportState): number {
  if (!(step > 0)) return 3;
  const px = Math.abs(priceToY(price, viewport) - priceToY(price + step, viewport));
  return Math.max(2, Math.min(px, 12));
}

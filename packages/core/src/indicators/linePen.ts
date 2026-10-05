/**
 * Indicator lines that stay cheap when zoomed out. Below about one bar per
 * pixel a polyline of thousands of segments costs the browser a lot to
 * rasterise and draws no more than one pixel column can show. There the pen
 * fills one vertical span per pixel column instead (the column's lowest to
 * highest point, joined to the column before, padded by half the line width),
 * which covers the same pixels for a fraction of the cost. Spread-out points
 * are stroked as before.
 */

import type { ViewportState } from '@tradecanvas/commons';

/**
 * Whether each bar's slot (bar and gap) is under a pixel, so every pixel
 * column holds at least one point: there the pen fills columns. A wider slot
 * (zoomed out, a bar can take up to two pixels) would leave columns empty.
 */
export function isDenseSlots(viewport: Pick<ViewportState, 'barWidth' | 'barSpacing'>): boolean {
  return viewport.barWidth + viewport.barSpacing < 1;
}

/** Whether `count` points between `x0` and `x1` come more than about one per pixel. */
export function isDenseLine(count: number, x0: number, x1: number): boolean {
  return count > 1.5 * (Math.abs(x1 - x0) + 1);
}

export class LinePen {
  private started = false;
  private lastX = NaN;
  private lastY = NaN;
  // The open column while dense: its x and its span.
  private col = NaN;
  private lo = 0;
  private hi = 0;
  private readonly width: number;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    color: string,
    width: number,
    private readonly dense: boolean,
    /** Dashes for the stroked line; zoomed out (dense) there are no dashes to see. */
    private readonly dash: readonly number[] = [],
  ) {
    this.width = Number.isFinite(width) && width > 0 ? width : 1;
    ctx.beginPath();
    if (dense) {
      ctx.fillStyle = color;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = this.width;
      ctx.lineJoin = 'round';
    }
  }

  /** The next point of the line, joined to the one before. */
  add(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (this.dense) this.addDense(x, y);
    else if (!this.started) this.ctx.moveTo(x, y);
    else this.ctx.lineTo(x, y);
    this.started = true;
    this.lastX = x;
    this.lastY = y;
  }

  /** A break: the next point starts a new piece. */
  gap(): void {
    this.flush();
    this.started = false;
    this.lastY = NaN;
  }

  /** A segment from `(x0, y0)` to `(x1, y1)`, joined on when it starts where the line is. */
  segment(x0: number, y0: number, x1: number, y1: number): void {
    if (!this.started || x0 !== this.lastX || y0 !== this.lastY) {
      this.gap();
      this.add(x0, y0);
    }
    this.add(x1, y1);
  }

  /** Draw what was added. */
  finish(): void {
    this.flush();
    if (this.dense) {
      this.ctx.fill();
    } else if (this.dash.length > 0) {
      this.ctx.setLineDash([...this.dash]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    } else {
      this.ctx.stroke();
    }
  }

  private addDense(x: number, y: number): void {
    const c = Math.floor(x);
    if (c !== this.col) {
      this.flush();
      this.col = c;
      // Start from where the line left the column before, so the spans join.
      this.lo = this.hi = Number.isNaN(this.lastY) ? y : this.lastY;
    }
    if (y < this.lo) this.lo = y;
    if (y > this.hi) this.hi = y;
  }

  private flush(): void {
    if (Number.isNaN(this.col)) return;
    // As wide as the line is thick, centred on the column, so a dense line
    // weighs what a stroked one does.
    const half = this.width / 2;
    const w = Math.max(1, this.width);
    this.ctx.rect(this.col + 0.5 - w / 2, this.lo - half, w, this.hi - this.lo + 2 * half);
    this.col = NaN;
  }
}

/**
 * A band between two lines (`tops` above `bottoms` on screen), filled per
 * pixel column: each column from its highest top to its lowest bottom, also
 * reaching the column before's last edges so the fill has no seams.
 */
export function fillDenseBand(
  ctx: CanvasRenderingContext2D,
  xs: ArrayLike<number>,
  tops: ArrayLike<number>,
  bottoms: ArrayLike<number>,
  color: string,
  count = xs.length,
): void {
  ctx.beginPath();
  ctx.fillStyle = color;
  let col = NaN;
  let top = 0;
  let bottom = 0;
  let lastTop = NaN;
  let lastBottom = NaN;
  const flush = () => {
    if (!Number.isNaN(col)) ctx.rect(col, top, 1, bottom - top);
  };
  for (let i = 0; i < count; i++) {
    const c = Math.floor(xs[i]);
    const t = Math.min(tops[i], bottoms[i]);
    const b = Math.max(tops[i], bottoms[i]);
    if (c !== col) {
      flush();
      col = c;
      top = Number.isNaN(lastTop) ? t : Math.min(t, lastTop);
      bottom = Number.isNaN(lastBottom) ? b : Math.max(b, lastBottom);
    }
    if (t < top) top = t;
    if (b > bottom) bottom = b;
    lastTop = t;
    lastBottom = b;
  }
  flush();
  ctx.fill();
}

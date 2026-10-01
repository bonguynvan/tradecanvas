import type { Point, ViewportState, Theme } from '@tradecanvas/commons';

/** A box smaller than this (px) in both directions counts as a click, not a selection. */
export const SELECTION_BOX_MIN_SIZE = 6;

/** Normalised pixel rectangle of a finished selection box. */
export interface SelectionBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** True when the pointer barely moved — treat as a click at (x1, y1). */
  isClick: boolean;
}

/**
 * Ctrl/⌘-drag selection box. While dragging it draws a translucent dashed
 * rectangle; on release the chart selects the drawings inside it. Transient
 * like the measure ruler: never saved, no undo.
 */
export class SelectionBoxOverlay {
  private start: Point | null = null;
  private current: Point | null = null;

  isActive(): boolean {
    return this.start !== null;
  }

  begin(pos: Point): void {
    this.start = pos;
    this.current = pos;
  }

  update(pos: Point): void {
    if (this.start) this.current = pos;
  }

  /** Finish the box; null if none was in progress. */
  end(): SelectionBox | null {
    const start = this.start;
    const current = this.current;
    this.cancel();
    if (!start || !current) return null;
    const x0 = Math.min(start.x, current.x);
    const x1 = Math.max(start.x, current.x);
    const y0 = Math.min(start.y, current.y);
    const y1 = Math.max(start.y, current.y);
    const isClick = x1 - x0 < SELECTION_BOX_MIN_SIZE && y1 - y0 < SELECTION_BOX_MIN_SIZE;
    return { x0, y0, x1, y1, isClick };
  }

  cancel(): void {
    this.start = null;
    this.current = null;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.start || !this.current) return;
    const { chartRect } = viewport;
    const clampX = (x: number) => Math.max(chartRect.x, Math.min(chartRect.x + chartRect.width, x));
    const clampY = (y: number) => Math.max(chartRect.y, Math.min(chartRect.y + chartRect.height, y));
    const x0 = clampX(Math.min(this.start.x, this.current.x));
    const x1 = clampX(Math.max(this.start.x, this.current.x));
    const y0 = clampY(Math.min(this.start.y, this.current.y));
    const y1 = clampY(Math.max(this.start.y, this.current.y));

    ctx.save();
    ctx.fillStyle = theme.crosshair;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(x1 - x0), Math.round(y1 - y0));
    ctx.restore();
  }
}

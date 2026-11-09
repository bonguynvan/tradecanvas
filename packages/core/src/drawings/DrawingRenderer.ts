import type { Theme, ViewportState } from '@tradecanvas/commons';
import { setDrawingKeepOut, setDrawingTheme, type LabelKeepOut } from './tools/labels.js';
import type { DrawingManager } from './DrawingManager.js';

export class DrawingRenderer {
  private keepOut: (() => readonly LabelKeepOut[]) | null = null;
  private formatTime: ((time: number) => string) | null = null;

  constructor(private manager: DrawingManager) {}

  /** What drawing labels keep clear of on each pass: the legend's boxes, read as the pass starts. */
  setKeepOut(boxes: (() => readonly LabelKeepOut[]) | null): void {
    this.keepOut = boxes;
  }

  /** How drawings write a bar's time (a vertical line's label): as the crosshair does. */
  setTimeFormat(format: ((time: number) => string) | null): void {
    this.formatTime = format;
  }

  /** The boxes labels keep clear of now. */
  getKeepOut(): readonly LabelKeepOut[] {
    return this.keepOut?.() ?? [];
  }

  /** The pointer's layer: the drawing under the pointer, glowing (see `DrawingManager.renderHover`). */
  renderHover(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme?: Theme): void {
    setDrawingTheme(theme ?? null);
    try {
      this.manager.renderHover(ctx, viewport);
    } finally {
      setDrawingTheme(null);
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme?: Theme): void {
    // Drawing text: the theme's font, on a halo of the chart's background, clear of the legend.
    setDrawingTheme(theme ?? null);
    setDrawingKeepOut(this.getKeepOut());
    try {
      this.manager.render(ctx, this.formatTime ? { ...viewport, formatTime: this.formatTime } : viewport);
    } finally {
      setDrawingKeepOut(null);
      // Helpers drawn outside a pass (a compare's labels) don't take this chart's look.
      setDrawingTheme(null);
    }
  }
}

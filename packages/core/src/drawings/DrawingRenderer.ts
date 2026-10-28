import type { Theme, ViewportState } from '@tradecanvas/commons';
import { setDrawingKeepOut, setDrawingTheme, type LabelKeepOut } from './tools/labels.js';
import type { DrawingManager } from './DrawingManager.js';

export class DrawingRenderer {
  private keepOut: (() => readonly LabelKeepOut[]) | null = null;

  constructor(private manager: DrawingManager) {}

  /** What drawing labels keep clear of on each pass: the legend's boxes, read as the pass starts. */
  setKeepOut(boxes: (() => readonly LabelKeepOut[]) | null): void {
    this.keepOut = boxes;
  }

  /** The boxes labels keep clear of now. */
  getKeepOut(): readonly LabelKeepOut[] {
    return this.keepOut?.() ?? [];
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme?: Theme): void {
    // Drawing text: the theme's font, on a halo of the chart's background, clear of the legend.
    setDrawingTheme(theme ?? null);
    setDrawingKeepOut(this.getKeepOut());
    try {
      this.manager.render(ctx, viewport);
    } finally {
      setDrawingKeepOut(null);
    }
  }
}

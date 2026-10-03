import type { Theme, ViewportState } from '@tradecanvas/commons';
import { setDrawingTheme } from './tools/labels.js';
import type { DrawingManager } from './DrawingManager.js';

export class DrawingRenderer {
  constructor(private manager: DrawingManager) {}

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme?: Theme): void {
    // Drawing text: the theme's font, on a halo of the chart's background.
    setDrawingTheme(theme ?? null);
    this.manager.render(ctx, viewport);
  }
}

import type { Theme, ViewportState } from '@tradecanvas/commons';
import { setLabelHalo } from './tools/labels.js';
import type { DrawingManager } from './DrawingManager.js';

export class DrawingRenderer {
  constructor(private manager: DrawingManager) {}

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme?: Theme): void {
    // Drawing text sits on a halo of the chart's background.
    if (theme) setLabelHalo(theme.background);
    this.manager.render(ctx, viewport);
  }
}

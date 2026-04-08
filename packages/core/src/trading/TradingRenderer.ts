import type { ViewportState, Theme } from '@chart-lib/commons';
import type { TradingManager } from './TradingManager.js';

export class TradingRenderer {
  constructor(private manager: TradingManager) {}

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.manager.render(ctx, viewport, theme);
  }
}

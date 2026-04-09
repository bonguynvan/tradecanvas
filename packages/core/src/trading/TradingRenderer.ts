import type { ViewportState, Theme } from '@chart-lib/commons';
import type { TradingManager } from './TradingManager.js';

export class TradingRenderer {
  constructor(private manager: TradingManager) {}

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.manager.render(ctx, viewport, theme);
  }

  /**
   * Draw position/order price badges on the price axis. Call this from the
   * UI layer AFTER priceAxis.render() so the badges paint on top of the
   * regular tick labels — matching MT4/MT5 behaviour.
   */
  renderAxisBadges(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.manager.renderAxisBadges(ctx, viewport, theme);
  }
}

import type { TradingPosition, TradingConfig, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH } from '@tradecanvas/commons';
import {
  buildPositionLabelContext,
  pickPnLColor,
  resolvePositionLabel,
} from './positionFormat.js';

export class PositionRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    positions: TradingPosition[],
    currentPrice: number | null,
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
  ): void {
    const { chartRect } = viewport;
    const profitColor = config.positionColors?.profit ?? '#26A69A';
    const lossColor = config.positionColors?.loss ?? '#EF5350';
    const entryColor = config.positionColors?.entry ?? '#2196F3';
    const precision = config.pricePrecision ?? 2;

    for (const pos of positions) {
      const entryY = priceToY(pos.entryPrice, viewport);

      // Entry line
      ctx.strokeStyle = entryColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(entryY) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(entryY) + 0.5);
      ctx.stroke();

      // P&L zone
      if (currentPrice !== null) {
        const currentY = priceToY(currentPrice, viewport);
        const labelCtx = buildPositionLabelContext(pos, currentPrice, precision);
        const pnl = labelCtx.pnl;
        const isProfit = pnl >= 0;
        const fallbackZone = isProfit ? profitColor : lossColor;
        const zoneColor = pickPnLColor(pnl, config.pnlThresholds, fallbackZone);

        ctx.fillStyle = zoneColor;
        ctx.globalAlpha = 0.08;
        const top = Math.min(entryY, currentY);
        const height = Math.abs(currentY - entryY);
        ctx.fillRect(chartRect.x, top, chartRect.width, height);
        ctx.globalAlpha = 1;

        // Partial-close strip on the left edge — proportional dim band signalling
        // the closed fraction of the position.
        if (labelCtx.closedQuantity > 0 && pos.quantity > 0) {
          const closedFrac = labelCtx.closedQuantity / pos.quantity;
          ctx.fillStyle = entryColor;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(chartRect.x, top, Math.max(2, chartRect.width * closedFrac * 0.04) + 2, height);
          ctx.globalAlpha = 1;
        }

        const pnlText = resolvePositionLabel(config.positionLabel, labelCtx);
        ctx.font = `bold 11px ${theme.font.family}`;
        const lblWidth = ctx.measureText(pnlText).width + 12;
        const lblX = chartRect.x + 8;
        ctx.fillStyle = zoneColor;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(lblX, entryY - 10, lblWidth, 20);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(pnlText, lblX + 6, entryY);
      }

      // Entry badge on axis — rendered separately via renderAxisBadges()
      // on the UI layer so it paints on top of the price axis labels.

      // SL line
      if (pos.stopLoss !== undefined) {
        const slY = priceToY(pos.stopLoss, viewport);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = lossColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartRect.x, Math.round(slY) + 0.5);
        ctx.lineTo(chartRect.x + chartRect.width, Math.round(slY) + 0.5);
        ctx.stroke();

        ctx.font = `bold 10px ${theme.font.family}`;
        ctx.fillStyle = lossColor;
        ctx.fillRect(chartRect.x + 4, slY - 8, 24, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('SL', chartRect.x + 8, slY);
      }

      // TP line
      if (pos.takeProfit !== undefined) {
        const tpY = priceToY(pos.takeProfit, viewport);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = profitColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartRect.x, Math.round(tpY) + 0.5);
        ctx.lineTo(chartRect.x + chartRect.width, Math.round(tpY) + 0.5);
        ctx.stroke();

        ctx.font = `bold 10px ${theme.font.family}`;
        ctx.fillStyle = profitColor;
        ctx.fillRect(chartRect.x + 4, tpY - 8, 24, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('TP', chartRect.x + 8, tpY);
      }

      ctx.setLineDash([]);
    }
  }

  /**
   * Draw position entry badges on the price axis. Called from the UI layer
   * so they paint ON TOP of the regular axis tick labels.
   */
  renderAxisBadges(
    ctx: CanvasRenderingContext2D,
    positions: TradingPosition[],
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
  ): void {
    const { chartRect } = viewport;
    const entryColor = config.positionColors?.entry ?? '#2196F3';
    const precision = config.pricePrecision ?? 2;
    const axisX = chartRect.x + chartRect.width + 1;

    for (const pos of positions) {
      const entryY = priceToY(pos.entryPrice, viewport);
      ctx.fillStyle = entryColor;
      ctx.fillRect(axisX, entryY - 9, PRICE_AXIS_WIDTH - 2, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `11px ${theme.font.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.entryPrice.toFixed(precision), axisX + 5, entryY);
    }
  }
}

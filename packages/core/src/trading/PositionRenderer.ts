import type { TradingPosition, TradingConfig, ViewportState, Theme } from '@chart-lib/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH } from '@chart-lib/commons';

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
        const pnl = (currentPrice - pos.entryPrice) * pos.quantity * (pos.side === 'buy' ? 1 : -1);
        const isProfit = pnl >= 0;
        const zoneColor = isProfit ? profitColor : lossColor;

        ctx.fillStyle = zoneColor;
        ctx.globalAlpha = 0.08;
        const top = Math.min(entryY, currentY);
        const height = Math.abs(currentY - entryY);
        ctx.fillRect(chartRect.x, top, chartRect.width, height);
        ctx.globalAlpha = 1;

        // P&L label at entry
        const pnlText = `${pos.side.toUpperCase()} ${pos.quantity} | P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(precision)}`;
        ctx.font = `bold 11px ${theme.font.family}`;
        const lblWidth = ctx.measureText(pnlText).width + 12;
        const lblX = chartRect.x + chartRect.width - lblWidth - 8;
        ctx.fillStyle = isProfit ? profitColor : lossColor;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(lblX, entryY - 10, lblWidth, 20);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(pnlText, lblX + 6, entryY);
      }

      // Entry badge on axis
      const axisX = chartRect.x + chartRect.width + 1;
      ctx.fillStyle = entryColor;
      ctx.fillRect(axisX, entryY - 9, PRICE_AXIS_WIDTH - 2, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `11px ${theme.font.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.entryPrice.toFixed(precision), axisX + 5, entryY);

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
}

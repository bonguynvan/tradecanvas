import type { TradingPosition, TradingConfig, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH } from '@tradecanvas/commons';
import {
  buildPositionLabelContext,
  pickPnLColor,
  resolvePositionLabel,
} from './positionFormat.js';
import { drawCloseButton, drawReverseButton, type LineButton } from './lineButtons.js';

/** Side of the buttons on a position's label (px), and on its SL / TP labels. */
const BUTTON = 20;
const STOP_BUTTON = 16;

export class PositionRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    positions: TradingPosition[],
    currentPrice: number | null,
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
    buttons: LineButton[] = [],
  ): void {
    const { chartRect } = viewport;
    const profitColor = config.positionColors?.profit ?? '#1fa874';
    const lossColor = config.positionColors?.loss ?? '#e8505b';
    const entryColor = config.positionColors?.entry ?? '#4c8dff';
    const precision = config.pricePrecision ?? 2;
    const show = config.lineButtons ?? {};

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
        this.renderButtons(ctx, pos.id, lblX + lblWidth + 2, entryY, zoneColor, show, buttons);
      } else {
        this.renderButtons(ctx, pos.id, chartRect.x + 8, entryY, entryColor, show, buttons);
      }

      // Entry badge on axis — rendered separately via renderAxisBadges()
      // after the price axis so it paints on top of its labels.

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
        if (show.removeStops !== false) this.renderStopButton(ctx, pos.id, 'stopLoss', chartRect.x + 30, slY, lossColor, buttons);
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
        if (show.removeStops !== false) this.renderStopButton(ctx, pos.id, 'takeProfit', chartRect.x + 30, tpY, profitColor, buttons);
      }

      ctx.setLineDash([]);
    }
  }

  /** ⇅ reverses the position, × closes it; each one when switched on. */
  private renderButtons(
    ctx: CanvasRenderingContext2D,
    positionId: string,
    x: number,
    y: number,
    color: string,
    show: NonNullable<TradingConfig['lineButtons']>,
    buttons: LineButton[],
  ): void {
    const top = y - BUTTON / 2;
    let at = x;
    ctx.globalAlpha = 0.9;
    if (show.reverse !== false) {
      drawReverseButton(ctx, at, top, BUTTON, color);
      buttons.push({ x: at, y: top, size: BUTTON, action: { type: 'reversePosition', positionId } });
      at += BUTTON + 2;
    }
    if (show.close !== false) {
      drawCloseButton(ctx, at, top, BUTTON, color);
      buttons.push({ x: at, y: top, size: BUTTON, action: { type: 'closePosition', positionId } });
    }
    ctx.globalAlpha = 1;
  }

  /** × beside an SL or TP label removes that stop. */
  private renderStopButton(
    ctx: CanvasRenderingContext2D,
    positionId: string,
    which: 'stopLoss' | 'takeProfit',
    x: number,
    y: number,
    color: string,
    buttons: LineButton[],
  ): void {
    const top = y - STOP_BUTTON / 2;
    drawCloseButton(ctx, x, top, STOP_BUTTON, color);
    buttons.push({ x, y: top, size: STOP_BUTTON, action: { type: 'removeStop', positionId, which } });
  }

  /**
   * Draw position entry badges on the price axis. Called after the price axis
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
    const entryColor = config.positionColors?.entry ?? '#4c8dff';
    const precision = config.pricePrecision ?? 2;
    const axisX = chartRect.x + chartRect.width + 1;

    for (const pos of positions) {
      const entryY = priceToY(pos.entryPrice, viewport);
      ctx.fillStyle = entryColor;
      ctx.fillRect(axisX, entryY - 9, (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `11px ${theme.font.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.entryPrice.toFixed(precision), axisX + 5, entryY);
    }
  }
}

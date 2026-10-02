import type { FillEvent, TradingConfig, ViewportState } from '@tradecanvas/commons';
import { priceToY, timeToX } from '../viewport/ScaleMapping.js';

/** Half the width of a fill mark, and how far it stands off its price (px). */
const HALF = 5;
const HEIGHT = 7;
const GAP = 2;

/**
 * A fill's time on the bars' clock: fills are in milliseconds, bars may be in
 * seconds.
 */
export function fillBarTime(timeMs: number, viewport: ViewportState): number {
  const data = viewport.data;
  const last = data && data.length > 0 ? data[data.length - 1].time : 0;
  return last > 0 && last < 1e12 ? timeMs / 1000 : timeMs;
}

/**
 * A small triangle at each fill's price and bar: under the price pointing up
 * for a buy, over it pointing down for a sell. A fill that opened a position
 * is solid; one that closed it (by hand, a reverse, its stop or target) is
 * hollow.
 */
export function renderFillMarks(
  ctx: CanvasRenderingContext2D,
  fills: readonly FillEvent[],
  viewport: ViewportState,
  config: TradingConfig,
): void {
  if (fills.length === 0) return;
  const { chartRect } = viewport;
  const buyColor = config.orderColors?.buy ?? '#1fa874';
  const sellColor = config.orderColors?.sell ?? '#e8505b';
  ctx.lineWidth = 1.5;
  for (const fill of fills) {
    const x = timeToX(fillBarTime(fill.time, viewport), viewport);
    const y = priceToY(fill.price, viewport);
    if (x < chartRect.x || x > chartRect.x + chartRect.width || y < chartRect.y || y > chartRect.y + chartRect.height) continue;
    const buy = fill.side === 'buy';
    const tip = buy ? y + GAP : y - GAP;
    const base = buy ? tip + HEIGHT : tip - HEIGHT;
    ctx.beginPath();
    ctx.moveTo(x, tip);
    ctx.lineTo(x - HALF, base);
    ctx.lineTo(x + HALF, base);
    ctx.closePath();
    const color = buy ? buyColor : sellColor;
    if (!fill.reason || fill.reason === 'order') {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
}

import type { OHLCBar, DataSeries } from '@tradecanvas/commons';

export interface RenkoConfig {
  brickSize: number;      // Price change per brick
  useATR?: boolean;       // Auto-calculate brick size from ATR
  atrPeriod?: number;     // Default: 14
}

/**
 * Transform OHLC data to Renko bricks.
 * Each brick represents a fixed price movement.
 * No time axis — bricks form only when price moves by brickSize.
 */
export function toRenko(data: DataSeries, config: RenkoConfig): DataSeries {
  if (data.length === 0) return [];

  let brickSize = config.brickSize;
  if (config.useATR && data.length > 2) {
    brickSize = computeATRBrickSize(data, config.atrPeriod ?? 14);
  }
  // Nothing to size by (a flat market): a hundredth of the price.
  if (!(brickSize > 0)) brickSize = Math.abs(data[data.length - 1].close) / 100 || 1;

  const bricks: OHLCBar[] = [];
  let lastClose = Math.round(data[0].close / brickSize) * brickSize;
  let lastTime = data[0].time;

  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    const diff = price - lastClose;
    const numBricks = Math.floor(Math.abs(diff) / brickSize);

    if (numBricks >= 1) {
      const direction = diff > 0 ? 1 : -1;
      for (let j = 0; j < numBricks; j++) {
        const open = lastClose;
        lastClose += direction * brickSize;
        bricks.push({
          time: lastTime++, // Increment for ordering
          open,
          high: Math.max(open, lastClose),
          low: Math.min(open, lastClose),
          close: lastClose,
          volume: data[i].volume / numBricks,
        });
      }
    }
  }

  return bricks;
}

/**
 * The average true range of the last `period` closed bars (the forming one
 * left out, so a tick doesn't re-brick the history), to two significant
 * digits so it holds still while the market moves a little.
 */
function computeATRBrickSize(data: DataSeries, period: number): number {
  const end = data.length - 1; // the forming bar
  const from = Math.max(1, end - period);
  let sum = 0;
  for (let i = from; i < end; i++) {
    sum += Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close),
    );
  }
  const atr = end > from ? sum / (end - from) : 0;
  if (!(atr > 0)) return 0;
  const scale = 10 ** (Math.floor(Math.log10(atr)) - 1);
  return Math.round(atr / scale) * scale;
}

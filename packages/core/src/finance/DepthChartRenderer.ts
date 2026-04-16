import type { DepthChartOptions, DepthLevel, Theme } from '@tradecanvas/commons';
import { computeTickStep } from '@tradecanvas/commons';

interface CumulativeLevel {
  price: number;
  cumulativeVolume: number;
}

interface DepthLayout {
  left: number;
  right: number;
  top: number;
  bottom: number;
  plotWidth: number;
  plotHeight: number;
}

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 60;
const PADDING_TB = 20;
const PRICE_EXTEND_FACTOR = 0.2;

function buildCumulativeBids(bids: readonly DepthLevel[]): readonly CumulativeLevel[] {
  const sorted = [...bids].sort((a, b) => b.price - a.price);
  const result: CumulativeLevel[] = [];
  let cumVol = 0;
  for (const level of sorted) {
    cumVol += level.volume;
    result.push({ price: level.price, cumulativeVolume: cumVol });
  }
  return result;
}

function buildCumulativeAsks(asks: readonly DepthLevel[]): readonly CumulativeLevel[] {
  const sorted = [...asks].sort((a, b) => a.price - b.price);
  const result: CumulativeLevel[] = [];
  let cumVol = 0;
  for (const level of sorted) {
    cumVol += level.volume;
    result.push({ price: level.price, cumulativeVolume: cumVol });
  }
  return result;
}

function computeLayout(width: number, height: number): DepthLayout {
  return {
    left: MARGIN_LEFT,
    right: width - MARGIN_RIGHT,
    top: PADDING_TB,
    bottom: height - PADDING_TB,
    plotWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
    plotHeight: height - PADDING_TB * 2,
  };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bg: string,
): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: DepthLayout,
  priceMin: number,
  priceMax: number,
  volMax: number,
  theme: Theme,
  priceFormat: (p: number) => string,
  volumeFormat: (v: number) => string,
): void {
  const { left, right, top, bottom, plotWidth, plotHeight } = layout;

  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = theme.axisLabel;
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;

  // Horizontal grid (volume)
  const volStep = computeTickStep(0, volMax, 5);
  for (let v = 0; v <= volMax; v += volStep) {
    const y = bottom - (v / volMax) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(volumeFormat(v), left - 4, y);
  }

  // Vertical grid (price)
  const priceRange = priceMax - priceMin;
  const priceStep = computeTickStep(priceMin, priceMax, 6);
  const firstTick = Math.ceil(priceMin / priceStep) * priceStep;
  for (let p = firstTick; p <= priceMax; p += priceStep) {
    const x = left + ((p - priceMin) / priceRange) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(priceFormat(p), x, bottom + 4);
  }

  ctx.restore();
}

function drawStepArea(
  ctx: CanvasRenderingContext2D,
  levels: readonly CumulativeLevel[],
  layout: DepthLayout,
  priceMin: number,
  priceRange: number,
  volMax: number,
  fillColor: string,
  lineColor: string,
  direction: 'bid' | 'ask',
): void {
  if (levels.length === 0) return;

  const { left, bottom, plotWidth, plotHeight } = layout;
  const toX = (price: number): number => left + ((price - priceMin) / priceRange) * plotWidth;
  const toY = (vol: number): number => bottom - (vol / volMax) * plotHeight;

  // Build step path
  ctx.beginPath();
  if (direction === 'bid') {
    // Bids go right-to-left (highest price first in the sorted array)
    ctx.moveTo(toX(levels[0].price), bottom);
    for (let i = 0; i < levels.length; i++) {
      const x = toX(levels[i].price);
      const y = toY(levels[i].cumulativeVolume);
      ctx.lineTo(x, y);
      if (i < levels.length - 1) {
        ctx.lineTo(toX(levels[i + 1].price), y);
      }
    }
    ctx.lineTo(toX(levels[levels.length - 1].price), bottom);
  } else {
    // Asks go left-to-right (lowest price first)
    ctx.moveTo(toX(levels[0].price), bottom);
    for (let i = 0; i < levels.length; i++) {
      const x = toX(levels[i].price);
      const y = toY(levels[i].cumulativeVolume);
      ctx.lineTo(x, y);
      if (i < levels.length - 1) {
        ctx.lineTo(toX(levels[i + 1].price), y);
      }
    }
    ctx.lineTo(toX(levels[levels.length - 1].price), bottom);
  }
  ctx.closePath();

  // Fill
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Stroke the step line
  ctx.beginPath();
  if (direction === 'bid') {
    ctx.moveTo(toX(levels[0].price), toY(levels[0].cumulativeVolume));
    for (let i = 0; i < levels.length; i++) {
      const x = toX(levels[i].price);
      const y = toY(levels[i].cumulativeVolume);
      if (i > 0) {
        ctx.lineTo(x, toY(levels[i - 1].cumulativeVolume));
      }
      ctx.lineTo(x, y);
    }
  } else {
    ctx.moveTo(toX(levels[0].price), toY(levels[0].cumulativeVolume));
    for (let i = 1; i < levels.length; i++) {
      const prevY = toY(levels[i - 1].cumulativeVolume);
      const x = toX(levels[i].price);
      const y = toY(levels[i].cumulativeVolume);
      ctx.lineTo(x, prevY);
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawMidPriceLine(
  ctx: CanvasRenderingContext2D,
  midPrice: number,
  spread: number,
  layout: DepthLayout,
  priceMin: number,
  priceRange: number,
  theme: Theme,
  showSpreadLabel: boolean,
  priceFormat: (p: number) => string,
): void {
  const { left, top, bottom, plotWidth } = layout;
  const x = left + ((midPrice - priceMin) / priceRange) * plotWidth;

  ctx.save();
  ctx.strokeStyle = theme.textSecondary;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.restore();

  if (showSpreadLabel) {
    const label = `Spread: ${priceFormat(spread)}`;
    ctx.save();
    ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, top - 2);
    ctx.restore();
  }
}

function drawCrosshairTooltip(
  ctx: CanvasRenderingContext2D,
  crosshairPos: { x: number; y: number },
  cumBids: readonly CumulativeLevel[],
  cumAsks: readonly CumulativeLevel[],
  layout: DepthLayout,
  priceMin: number,
  priceRange: number,
  volMax: number,
  theme: Theme,
  priceFormat: (p: number) => string,
  volumeFormat: (v: number) => string,
): void {
  const { left, top, bottom, plotWidth, plotHeight } = layout;
  const mx = crosshairPos.x;

  if (mx < left || mx > layout.right) return;

  const price = priceMin + ((mx - left) / plotWidth) * priceRange;

  // Find cumulative volume at this price
  let cumVol = 0;
  let side = '';
  // Check bids (sorted descending by price)
  if (cumBids.length > 0 && price <= cumBids[0].price) {
    side = 'Bid';
    for (const level of cumBids) {
      if (price <= level.price) {
        cumVol = level.cumulativeVolume;
      } else {
        break;
      }
    }
  }
  // Check asks (sorted ascending by price)
  if (cumAsks.length > 0 && price >= cumAsks[0].price) {
    side = 'Ask';
    for (const level of cumAsks) {
      if (price >= level.price) {
        cumVol = level.cumulativeVolume;
      } else {
        break;
      }
    }
  }

  // Draw vertical crosshair line
  ctx.save();
  ctx.strokeStyle = theme.crosshair;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(mx, top);
  ctx.lineTo(mx, bottom);
  ctx.stroke();

  // Draw horizontal line at volume level
  if (cumVol > 0) {
    const vy = bottom - (cumVol / volMax) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(left, vy);
    ctx.lineTo(layout.right, vy);
    ctx.stroke();
  }
  ctx.restore();

  // Tooltip
  const lines = [
    `Price: ${priceFormat(price)}`,
    side ? `${side} Vol: ${volumeFormat(cumVol)}` : '',
  ].filter(Boolean);

  ctx.save();
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  const maxTextWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
  const tooltipW = maxTextWidth + 16;
  const tooltipH = lines.length * (theme.font.sizeSmall + 4) + 12;

  let tx = mx + 10;
  let ty = crosshairPos.y - tooltipH / 2;
  if (tx + tooltipW > layout.right) tx = mx - tooltipW - 10;
  if (ty < top) ty = top;
  if (ty + tooltipH > bottom) ty = bottom - tooltipH;

  ctx.fillStyle = theme.axisLabelBackground;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(tx, ty, tooltipW, tooltipH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.text;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tx + 8, ty + 6 + i * (theme.font.sizeSmall + 4));
  }
  ctx.restore();
}

function defaultPriceFormat(price: number): string {
  return price.toFixed(2);
}

function defaultVolumeFormat(vol: number): string {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toFixed(0);
}

export function renderDepthChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: DepthChartOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
): void {
  const { data } = options;
  if (data.bids.length === 0 && data.asks.length === 0) return;
  if (width <= 0 || height <= 0) return;

  const bidColor = options.bidColor ?? theme.candleUp;
  const askColor = options.askColor ?? theme.candleDown;
  const bidFillColor = options.bidFillColor ?? (bidColor + '40');
  const askFillColor = options.askFillColor ?? (askColor + '40');
  const midPriceLine = options.midPriceLine !== false;
  const spreadLabel = options.spreadLabel !== false;
  const priceFormat = options.priceFormat ?? defaultPriceFormat;
  const volumeFormat = options.volumeFormat ?? defaultVolumeFormat;

  const cumBids = buildCumulativeBids(data.bids);
  const cumAsks = buildCumulativeAsks(data.asks);

  // Compute ranges
  const highestBid = cumBids.length > 0 ? cumBids[0].price : 0;
  const lowestAsk = cumAsks.length > 0 ? cumAsks[0].price : 0;
  const midPrice = cumBids.length > 0 && cumAsks.length > 0
    ? (highestBid + lowestAsk) / 2
    : highestBid || lowestAsk;
  const spread = cumAsks.length > 0 && cumBids.length > 0
    ? lowestAsk - highestBid
    : 0;

  const lowestBid = cumBids.length > 0 ? cumBids[cumBids.length - 1].price : midPrice;
  const highestAsk = cumAsks.length > 0 ? cumAsks[cumAsks.length - 1].price : midPrice;
  const rawRange = Math.max(midPrice - lowestBid, highestAsk - midPrice);
  const extendedRange = rawRange * (1 + PRICE_EXTEND_FACTOR);

  const priceMin = midPrice - extendedRange;
  const priceMax = midPrice + extendedRange;
  const priceRange = priceMax - priceMin;

  const maxBidVol = cumBids.length > 0 ? cumBids[cumBids.length - 1].cumulativeVolume : 0;
  const maxAskVol = cumAsks.length > 0 ? cumAsks[cumAsks.length - 1].cumulativeVolume : 0;
  const volMax = Math.max(maxBidVol, maxAskVol) || 1;

  const layout = computeLayout(width, height);

  drawBackground(ctx, width, height, theme.background);
  drawGrid(ctx, layout, priceMin, priceMax, volMax, theme, priceFormat, volumeFormat);

  drawStepArea(ctx, cumBids, layout, priceMin, priceRange, volMax, bidFillColor, bidColor, 'bid');
  drawStepArea(ctx, cumAsks, layout, priceMin, priceRange, volMax, askFillColor, askColor, 'ask');

  if (midPriceLine) {
    drawMidPriceLine(ctx, midPrice, spread, layout, priceMin, priceRange, theme, spreadLabel, priceFormat);
  }

  if (crosshairPos) {
    drawCrosshairTooltip(
      ctx, crosshairPos, cumBids, cumAsks,
      layout, priceMin, priceRange, volMax,
      theme, priceFormat, volumeFormat,
    );
  }
}

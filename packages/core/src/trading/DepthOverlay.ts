import type { DepthData, TradingConfig, ViewportState } from '@chart-lib/commons';
import { priceToY } from '../viewport/ScaleMapping.js';

export class DepthOverlay {
  render(
    ctx: CanvasRenderingContext2D,
    depth: DepthData,
    viewport: ViewportState,
    config: TradingConfig,
  ): void {
    if (!config.depthOverlay?.enabled) return;

    const { chartRect } = viewport;
    const bidColor = config.depthOverlay.bidColor ?? 'rgba(38,166,154,0.15)';
    const askColor = config.depthOverlay.askColor ?? 'rgba(239,83,80,0.15)';
    const maxWidth = config.depthOverlay.maxWidth ?? 100;

    // Compute cumulative volumes
    let maxCumVol = 0;
    const bidCum: { price: number; cumVol: number }[] = [];
    let cumVol = 0;
    for (const level of depth.bids) {
      cumVol += level.volume;
      bidCum.push({ price: level.price, cumVol });
      if (cumVol > maxCumVol) maxCumVol = cumVol;
    }

    const askCum: { price: number; cumVol: number }[] = [];
    cumVol = 0;
    for (const level of depth.asks) {
      cumVol += level.volume;
      askCum.push({ price: level.price, cumVol });
      if (cumVol > maxCumVol) maxCumVol = cumVol;
    }

    if (maxCumVol === 0) return;

    // Estimate bar height from price spacing
    const barHeight = Math.max(1, (depth.bids.length > 1
      ? Math.abs(priceToY(depth.bids[0].price, viewport) - priceToY(depth.bids[1].price, viewport))
      : 4));

    const rightEdge = chartRect.x + chartRect.width;

    // Draw bids (right-aligned, growing left)
    ctx.fillStyle = bidColor;
    for (const { price, cumVol: cv } of bidCum) {
      const y = priceToY(price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;
      const barW = (cv / maxCumVol) * maxWidth;
      ctx.fillRect(rightEdge - barW, y - barHeight / 2, barW, barHeight);
    }

    // Draw asks
    ctx.fillStyle = askColor;
    for (const { price, cumVol: cv } of askCum) {
      const y = priceToY(price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;
      const barW = (cv / maxCumVol) * maxWidth;
      ctx.fillRect(rightEdge - barW, y - barHeight / 2, barW, barHeight);
    }
  }
}

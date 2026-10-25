import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { TC_PALETTE } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { priceToYMapper } from '../../viewport/ScaleMapping.js';
import { profileRowAlpha } from '../../style/profileRows.js';

/** The busiest row's width, as a share of the plot's width. */
const MAX_WIDTH_SHARE = 0.3;
/** A row with more than this share of the busiest row's volume takes the second colour. */
const HIGH_VOLUME_SHARE = 0.7;

export class VolumeProfileIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'volumeProfile',
    name: 'Volume Profile',
    placement: 'overlay' as const,
    defaultConfig: { rows: 24 },
    shortName: 'VP',
    plots: [],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const rows = getIntParam(config, 'rows', 24, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let minPrice = Infinity, maxPrice = -Infinity;
    for (const bar of data) {
      if (bar.low < minPrice) minPrice = bar.low;
      if (bar.high > maxPrice) maxPrice = bar.high;
    }

    const range = maxPrice - minPrice || 1;
    const rowHeight = range / rows;
    const bins = new Array(rows).fill(0);

    for (const bar of data) {
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      const bin = Math.min(rows - 1, Math.floor((typicalPrice - minPrice) / rowHeight));
      bins[bin] += bar.volume;
    }

    // Store bins as values keyed by a synthetic timestamp (row index)
    for (let i = 0; i < rows; i++) {
      const price = minPrice + (i + 0.5) * rowHeight;
      values.set(i, { price, volume: bins[i], rowIndex: i });
    }

    return {
      values,
      series,
      meta: { minPrice, maxPrice, rows, rowHeight, bins, maxVolume: Math.max(...bins) },
    };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const { chartRect } = viewport;
    const meta = output.meta as { minPrice: number; maxPrice: number; rows: number; rowHeight: number; bins: number[]; maxVolume: number } | undefined;
    if (!meta || meta.maxVolume === 0) return;

    const { minPrice, rows, rowHeight, bins, maxVolume } = meta;
    const maxBarWidth = chartRect.width * MAX_WIDTH_SHARE;
    const toY = priceToYMapper(viewport);
    const color = style.colors[0] ?? TC_PALETTE.blue;
    const highColor = style.colors[1] ?? TC_PALETTE.amber;

    ctx.save();
    // The rows sit at the left of the plot, under the legend and over the
    // candles, so they are see-through for both to read; the colours the
    // chart hands out are opaque. The busiest rows stand out by colour alone.
    ctx.globalAlpha = profileRowAlpha(style.opacity);
    for (let i = 0; i < rows; i++) {
      const width = (bins[i] / maxVolume) * maxBarWidth;
      if (width <= 0) continue;
      // Each row covers its own price band, wherever the scale puts it.
      const yLow = toY(minPrice + i * rowHeight);
      const yHigh = toY(minPrice + (i + 1) * rowHeight);
      ctx.fillStyle = bins[i] > maxVolume * HIGH_VOLUME_SHARE ? highColor : color;
      ctx.fillRect(chartRect.x, Math.min(yLow, yHigh), width, Math.max(Math.abs(yLow - yHigh) - 1, 1));
    }
    ctx.restore();
  }
}

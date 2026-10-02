import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { priceToYMapper } from '../../viewport/ScaleMapping.js';

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
    const maxBarWidth = chartRect.width * 0.3;
    const toY = priceToYMapper(viewport);

    for (let i = 0; i < rows; i++) {
      // Each row covers its own price band, wherever the scale puts it.
      const yLow = toY(minPrice + i * rowHeight);
      const yHigh = toY(minPrice + (i + 1) * rowHeight);
      const width = (bins[i] / maxVolume) * maxBarWidth;

      ctx.fillStyle = bins[i] > maxVolume * 0.7
        ? (style.colors[1] ?? 'rgba(242, 169, 59, 0.5)')
        : (style.colors[0] ?? 'rgba(76, 141, 255, 0.3)');
      ctx.fillRect(chartRect.x, Math.min(yLow, yHigh), width, Math.max(Math.abs(yLow - yHigh) - 1, 1));
    }
  }
}

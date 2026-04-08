import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';

export class VolumeProfileIndicator extends IndicatorBase {
  descriptor = {
    id: 'volumeProfile',
    name: 'Volume Profile',
    placement: 'panel' as const,
    defaultConfig: { rows: 24 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const rows = config.params.rows as number;
    const values = new Map<number, IndicatorValue>();
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

    const { minPrice, maxPrice, rows, rowHeight, bins, maxVolume } = meta;
    const priceRange = maxPrice - minPrice || 1;
    const barHeight = chartRect.height / rows;
    const maxBarWidth = chartRect.width * 0.3;

    for (let i = 0; i < rows; i++) {
      const price = minPrice + (i + 0.5) * rowHeight;
      const ratio = (price - viewport.priceRange.min) / (viewport.priceRange.max - viewport.priceRange.min);
      const y = chartRect.y + chartRect.height * (1 - ratio);
      const width = (bins[i] / maxVolume) * maxBarWidth;

      ctx.fillStyle = bins[i] > maxVolume * 0.7
        ? (style.colors[1] ?? 'rgba(255, 152, 0, 0.5)')
        : (style.colors[0] ?? 'rgba(33, 150, 243, 0.3)');
      ctx.fillRect(chartRect.x, y - barHeight / 2, width, Math.max(barHeight - 1, 1));
    }
  }
}

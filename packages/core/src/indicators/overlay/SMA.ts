import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { LinePen, isDenseSlots } from '../linePen.js';
import { plotLook } from '../plots.js';

export class SMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'sma',
    name: 'Simple Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'SMA',
    inputs: { source: { source: true } },
    plots: [{ key: 'value', title: 'SMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period - 1) {
        const val: IndicatorValue = { value: sum / period };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      this.writePoint(prev, data, i, { value: sum / period });
    }
    return prev;
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const look = plotLook(style, 'value', style.lineWidths[0]);
    if (!look.visible) return;
    const pen = new LinePen(ctx, style.colors[0], style.lineWidths[0], isDenseSlots(viewport), look.dash);
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      pen.add(x, y);
    }
    pen.finish();
  }
}

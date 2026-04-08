import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class AroonIndicator extends IndicatorBase {
  descriptor = {
    id: 'aroon',
    name: 'Aroon',
    placement: 'panel' as const,
    defaultConfig: { period: 25 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period; i < data.length; i++) {
      let highIdx = 0, lowIdx = 0;
      let high = -Infinity, low = Infinity;
      for (let j = 0; j <= period; j++) {
        const k = i - period + j;
        if (data[k].high > high) { high = data[k].high; highIdx = j; }
        if (data[k].low < low) { low = data[k].low; lowIdx = j; }
      }
      const val: IndicatorValue = {
        up: (highIdx / period) * 100,
        down: (lowIdx / period) * 100,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - v / 100);

    const drawLine = (key: string, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidths[0];
      ctx.lineJoin = 'round';
      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        if (!val || val[key] === undefined) continue;
        const x = barIndexToX(i, viewport);
        const y = toY(val[key]!);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('up', style.colors[0]);
    drawLine('down', style.colors[1] ?? '#EF5350');
  }
}

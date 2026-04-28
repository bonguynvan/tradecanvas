import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class AwesomeOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'ao',
    name: 'Awesome Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 5, slow: 34 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 5, 1);
    const slow = getIntParam(config, 'slow', 34, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < slow) return { values, series };

    const median: number[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      median[i] = (data[i].high + data[i].low) / 2;
    }

    let fastSum = 0;
    let slowSum = 0;
    let prevAo: number | undefined;
    for (let i = 0; i < data.length; i++) {
      slowSum += median[i];
      if (i >= slow) slowSum -= median[i - slow];
      fastSum += median[i];
      if (i >= fast) fastSum -= median[i - fast];

      if (i >= slow - 1) {
        const ao = fastSum / fast - slowSum / slow;
        const up = prevAo === undefined ? true : ao >= prevAo;
        const val: IndicatorValue = { value: ao, up: up ? 1 : 0 };
        values.set(data[i].time, val);
        series[i] = val;
        prevAo = ao;
      }
    }
    return { values, series };
  }

  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v === undefined) continue;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    if (minVal === Infinity) return;
    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal)) || 1;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));
    const zeroY = toY(0);
    const halfBar = viewport.barWidth / 2;

    const upColor = style.colors[0] ?? '#26A69A';
    const downColor = style.colors[1] ?? '#EF5350';

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = toY(val.value);
      const top = Math.min(y, zeroY);
      const h = Math.max(Math.abs(y - zeroY), 1);
      ctx.fillStyle = val.up ? upColor : downColor;
      ctx.fillRect(x - halfBar, top, viewport.barWidth, h);
    }
  }
}

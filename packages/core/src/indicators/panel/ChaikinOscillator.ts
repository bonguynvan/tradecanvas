import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';
import { getIntParam } from '../params.js';

/**
 * Chaikin Oscillator = EMA(ADL, fast) - EMA(ADL, slow)
 * where ADL = cumulative Σ Money Flow Volume,
 * and Money Flow Volume = ((close - low) - (high - close)) / (high - low) * volume.
 */
export class ChaikinOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'chaikinOsc',
    name: 'Chaikin Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 3, slow: 10 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 3, 1);
    const slow = getIntParam(config, 'slow', 10, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < slow) return { values, series };

    const fastMult = 2 / (fast + 1);
    const slowMult = 2 / (slow + 1);

    let adl = 0;
    let emaFast = 0;
    let emaSlow = 0;

    for (let i = 0; i < data.length; i++) {
      const { high, low, close, volume } = data[i];
      const range = high - low;
      const mfm = range === 0 ? 0 : ((close - low) - (high - close)) / range;
      adl += mfm * volume;

      if (i === 0) {
        emaFast = adl;
        emaSlow = adl;
      } else {
        emaFast = (adl - emaFast) * fastMult + emaFast;
        emaSlow = (adl - emaSlow) * slowMult + emaSlow;
      }

      if (i >= slow - 1) {
        const osc = emaFast - emaSlow;
        const val: IndicatorValue = { value: osc, adl };
        values.set(data[i].time, val);
        series[i] = val;
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
      ctx.fillStyle = val.value >= 0 ? upColor : downColor;
      ctx.fillRect(x - halfBar, top, viewport.barWidth, h);
    }
  }
}

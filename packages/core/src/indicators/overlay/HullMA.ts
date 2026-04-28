import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { getIntParam } from '../params.js';

/**
 * Hull Moving Average — HMA(n) = WMA( 2*WMA(close, n/2) - WMA(close, n), sqrt(n) )
 * Designed to reduce lag while preserving smoothness.
 */
export class HullMAIndicator extends IndicatorBase {
  descriptor = {
    id: 'hma',
    name: 'Hull Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 21 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 21, 2);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < period) return { values, series };

    const closes = data.map((b) => b.close);
    const halfPeriod = Math.max(2, Math.floor(period / 2));
    const sqrtPeriod = Math.max(2, Math.floor(Math.sqrt(period)));

    const wmaFull = wma(closes, period);
    const wmaHalf = wma(closes, halfPeriod);
    const diff = closes.map((_, i) =>
      wmaFull[i] === null || wmaHalf[i] === null ? null : 2 * (wmaHalf[i] as number) - (wmaFull[i] as number),
    );
    const hma = wmaNullable(diff, sqrtPeriod);

    for (let i = 0; i < data.length; i++) {
      if (hma[i] === null) continue;
      const val: IndicatorValue = { value: hma[i] as number };
      values.set(data[i].time, val);
      series[i] = val;
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
    const { from, to } = viewport.visibleRange;

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';

    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function wma(data: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return out;
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let k = 0; k < period; k++) {
      sum += data[i - k] * (period - k);
    }
    out[i] = sum / denom;
  }
  return out;
}

function wmaNullable(data: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(data.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    let ok = true;
    for (let k = 0; k < period; k++) {
      const v = data[i - k];
      if (v === null) {
        ok = false;
        break;
      }
      sum += v * (period - k);
    }
    if (ok) out[i] = sum / denom;
  }
  return out;
}

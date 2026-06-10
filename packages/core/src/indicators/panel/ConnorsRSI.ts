import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Connors RSI — a composite mean-reversion oscillator (Larry Connors) averaging
 * three 0–100 components:
 *   1. a short RSI of price (default period 3),
 *   2. an RSI of the up/down streak length (default period 2),
 *   3. the percent-rank of the 1-bar rate of change over a lookback (default 100).
 * Extreme readings (< 10 / > 90) flag oversold / overbought conditions.
 */
export class ConnorsRSIIndicator extends IndicatorBase {
  descriptor = {
    id: 'crsi',
    name: 'Connors RSI',
    placement: 'panel' as const,
    defaultConfig: { rsiPeriod: 3, streakPeriod: 2, rankPeriod: 100 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const rsiPeriod = getIntParam(config, 'rsiPeriod', 3, 1);
    const streakPeriod = getIntParam(config, 'streakPeriod', 2, 1);
    const rankPeriod = getIntParam(config, 'rankPeriod', 100, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const close = data.map((b) => b.close);

    // Component 1: short RSI of price.
    const priceRsi = wilderRSI(close, rsiPeriod);

    // Component 2: RSI of the up/down streak length.
    const streak = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      if (close[i] > close[i - 1]) streak[i] = streak[i - 1] > 0 ? streak[i - 1] + 1 : 1;
      else if (close[i] < close[i - 1]) streak[i] = streak[i - 1] < 0 ? streak[i - 1] - 1 : -1;
      else streak[i] = 0;
    }
    const streakRsi = wilderRSI(streak, streakPeriod);

    // Component 3: percent-rank of the 1-bar ROC over `rankPeriod`.
    const roc = new Array(n).fill(0);
    for (let i = 1; i < n; i++) roc[i] = close[i - 1] !== 0 ? ((close[i] - close[i - 1]) / close[i - 1]) * 100 : 0;

    for (let i = 0; i < n; i++) {
      if (i < rankPeriod + 1) continue;
      const a = priceRsi[i];
      const b = streakRsi[i];
      if (a === undefined || b === undefined) continue;
      let count = 0;
      for (let j = i - rankPeriod; j < i; j++) if (roc[j] < roc[i]) count++;
      const rank = (count / rankPeriod) * 100;
      const crsi = (a + b + rank) / 3;
      const val: IndicatorValue = { value: crsi };
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

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [10, 90]) {
      const y = toY(level);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = toY(val.value);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Wilder's RSI over an arbitrary value series. Output aligned to input indices. */
function wilderRSI(vals: number[], period: number): (number | undefined)[] {
  const n = vals.length;
  const out: (number | undefined)[] = new Array(n).fill(undefined);
  if (n <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = vals[i] - vals[i - 1];
    if (ch >= 0) avgGain += ch;
    else avgLoss -= ch;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const ch = vals[i] - vals[i - 1];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

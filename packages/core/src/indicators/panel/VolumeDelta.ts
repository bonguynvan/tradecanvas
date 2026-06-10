import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getNumberParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Directional volume ("volume delta") panel. Approximates buy/sell pressure
 * from OHLCV: a bar that closes at or above its open contributes positive
 * volume, otherwise negative. `mode: 0` shows the per-bar delta histogram;
 * `mode: 1` shows the cumulative delta line. (A true tick-delta needs per-trade
 * bid/ask data, which an OHLCV series doesn't carry.)
 */
export class VolumeDeltaIndicator extends IndicatorBase {
  descriptor = {
    id: 'voldelta',
    name: 'Volume Delta',
    placement: 'panel' as const,
    defaultConfig: { mode: 0 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const cumulative = getNumberParam(config, 'mode', 0) >= 1;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let running = 0;
    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const up = bar.close >= bar.open;
      const delta = up ? bar.volume : -bar.volume;
      running += delta;
      const val: IndicatorValue = {
        value: cumulative ? running : delta,
        up: up ? 1 : 0,
      };
      values.set(bar.time, val);
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
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;

    let absMax = 0;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v !== undefined && Math.abs(v) > absMax) absMax = Math.abs(v);
    }
    if (absMax === 0) return;

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

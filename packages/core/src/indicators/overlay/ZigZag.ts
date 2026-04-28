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
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * ZigZag — connects swing highs/lows that exceed a percentage move threshold.
 * Pivots are written to series[i].pivot (price) when bar i is a confirmed swing.
 * meta.pivots holds the ordered list of pivot bar indices for fast rendering.
 */
export class ZigZagIndicator extends IndicatorBase {
  descriptor = {
    id: 'zigzag',
    name: 'ZigZag',
    placement: 'overlay' as const,
    defaultConfig: { deviation: 5 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const devPct = Math.max(0.01, getNumberParam(config, 'deviation', 5)) / 100;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series, meta: { pivots: [] } };

    const pivots: { idx: number; price: number; type: 'high' | 'low' }[] = [];
    let direction: 'up' | 'down' | null = null;
    let lastPivotIdx = 0;
    let lastPivotPrice = data[0].close;

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;

      if (direction === null) {
        if (high >= lastPivotPrice * (1 + devPct)) {
          pivots.push({ idx: lastPivotIdx, price: lastPivotPrice, type: 'low' });
          direction = 'up';
          lastPivotIdx = i;
          lastPivotPrice = high;
        } else if (low <= lastPivotPrice * (1 - devPct)) {
          pivots.push({ idx: lastPivotIdx, price: lastPivotPrice, type: 'high' });
          direction = 'down';
          lastPivotIdx = i;
          lastPivotPrice = low;
        }
        continue;
      }

      if (direction === 'up') {
        if (high > lastPivotPrice) {
          lastPivotIdx = i;
          lastPivotPrice = high;
        } else if (low <= lastPivotPrice * (1 - devPct)) {
          pivots.push({ idx: lastPivotIdx, price: lastPivotPrice, type: 'high' });
          direction = 'down';
          lastPivotIdx = i;
          lastPivotPrice = low;
        }
      } else {
        if (low < lastPivotPrice) {
          lastPivotIdx = i;
          lastPivotPrice = low;
        } else if (high >= lastPivotPrice * (1 + devPct)) {
          pivots.push({ idx: lastPivotIdx, price: lastPivotPrice, type: 'low' });
          direction = 'up';
          lastPivotIdx = i;
          lastPivotPrice = high;
        }
      }
    }

    pivots.push({
      idx: lastPivotIdx,
      price: lastPivotPrice,
      type: direction === 'up' ? 'high' : 'low',
    });

    for (const p of pivots) {
      const val: IndicatorValue = { pivot: p.price };
      values.set(data[p.idx].time, val);
      series[p.idx] = val;
    }

    return { values, series, meta: { pivots } };
  }

  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void {
    const pivots = output.meta?.pivots as
      | { idx: number; price: number }[]
      | undefined;
    if (!pivots || pivots.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';

    for (let k = 0; k < pivots.length; k++) {
      const p = pivots[k];
      const x = barIndexToX(p.idx, viewport);
      const y = priceToY(p.price, viewport);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

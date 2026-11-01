import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { withAlpha, TC_SERIES_COLORS } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { plotLook } from '../plots.js';

/** Index of the lagging span's colour in the indicator's colours. */
const CHIKOU_COLOR = 4;
/** The series palette's fifth colour, so four colours of one's own don't paint it as the conversion line. */
const CHIKOU_FALLBACK = TC_SERIES_COLORS[CHIKOU_COLOR];

/**
 * Ichimoku Kinko Hyo: the conversion and base lines, the two lead lines with
 * the cloud between them, and the lagging span, each bar's close plotted the
 * displacement back (26 bars by default), so it reads against the price of
 * then. The lead lines go the displacement ahead: each bar's cloud is the one
 * worked out that many bars before, and the last bars' cloud, ahead of the
 * latest bar, is kept in `meta.ahead` and drawn past it.
 */
export class IchimokuIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ichimoku',
    name: 'Ichimoku Cloud',
    placement: 'overlay' as const,
    defaultConfig: { tenkan: 9, kijun: 26, senkou: 52, displacement: 26 },
    shortName: 'Ichimoku',
    plots: [
      { key: 'tenkan', title: 'Conversion', color: 0 },
      { key: 'kijun', title: 'Base', color: 1 },
      { key: 'senkouA', title: 'Lead A', color: 2 },
      { key: 'senkouB', title: 'Lead B', color: 3 },
      { key: 'chikou', title: 'Lagging Span', color: CHIKOU_COLOR },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const tenkanPeriod = getIntParam(config, 'tenkan', 9, 1);
    const kijunPeriod = getIntParam(config, 'kijun', 26, 1);
    const senkouBPeriod = getIntParam(config, 'senkou', 52, 1);
    const displacement = getIntParam(config, 'displacement', 26, 0);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    // Precompute rolling high/low for each period using deque-style sliding window
    const rollingHL = (period: number): { highs: Float64Array; lows: Float64Array } => {
      const highs = new Float64Array(data.length);
      const lows = new Float64Array(data.length);
      for (let i = 0; i < data.length; i++) {
        let high = -Infinity;
        let low = Infinity;
        const start = Math.max(0, i - period + 1);
        for (let j = start; j <= i; j++) {
          if (data[j].high > high) high = data[j].high;
          if (data[j].low < low) low = data[j].low;
        }
        highs[i] = high;
        lows[i] = low;
      }
      return { highs, lows };
    };

    const tenkanHL = rollingHL(tenkanPeriod);
    const kijunHL = rollingHL(kijunPeriod);
    const senkouBHL = rollingHL(senkouBPeriod);
    const midpoint = (hl: { highs: Float64Array; lows: Float64Array }, period: number, i: number): number | undefined =>
      i >= period - 1 ? (hl.highs[i] + hl.lows[i]) / 2 : undefined;
    /** The lead lines as worked out on bar `i`, before they are moved ahead. */
    const leadAt = (i: number): IndicatorValue => {
      const tenkan = midpoint(tenkanHL, tenkanPeriod, i);
      const kijun = midpoint(kijunHL, kijunPeriod, i);
      const lead: IndicatorValue = {};
      if (tenkan !== undefined && kijun !== undefined) lead.senkouA = (tenkan + kijun) / 2;
      const senkouB = midpoint(senkouBHL, senkouBPeriod, i);
      if (senkouB !== undefined) lead.senkouB = senkouB;
      return lead;
    };

    for (let i = 0; i < data.length; i++) {
      const val: IndicatorValue = {};
      const tenkan = midpoint(tenkanHL, tenkanPeriod, i);
      if (tenkan !== undefined) val.tenkan = tenkan;
      const kijun = midpoint(kijunHL, kijunPeriod, i);
      if (kijun !== undefined) val.kijun = kijun;
      if (i >= displacement) Object.assign(val, leadAt(i - displacement));
      // The lagging span: the close of the bar the displacement on, so the last bars have none yet.
      if (i + displacement < data.length) {
        val.chikou = data[i + displacement].close;
      }

      if (Object.keys(val).length > 0) {
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    // The cloud of the last bars, for the bars ahead of the latest: `ahead[k]`
    // goes on bar `aheadFrom + k`, past the last one even with fewer bars than the displacement.
    const first = Math.max(0, data.length - displacement);
    const ahead: IndicatorValue[] = [];
    for (let i = first; i < data.length; i++) ahead.push(leadAt(i));
    return { values, series, meta: { ahead, aheadFrom: first + displacement } };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const ahead = output.meta?.ahead as readonly IndicatorValue[] | undefined;
    const aheadFrom = (output.meta?.aheadFrom as number | undefined) ?? series.length;

    // Single pass to collect points using typed arrays
    const maxPts = to - from + 1;
    const leadPts = maxPts + (ahead?.length ?? 0);
    const tenkanXs = new Float64Array(maxPts); const tenkanYs = new Float64Array(maxPts); let tenkanN = 0;
    const kijunXs = new Float64Array(maxPts); const kijunYs = new Float64Array(maxPts); let kijunN = 0;
    const senkouAXs = new Float64Array(leadPts); const senkouAYs = new Float64Array(leadPts); let senkouAN = 0;
    const senkouBXs = new Float64Array(leadPts); const senkouBYs = new Float64Array(leadPts); let senkouBN = 0;
    const chikouXs = new Float64Array(maxPts); const chikouYs = new Float64Array(maxPts); let chikouN = 0;
    // The cloud, only where both lead lines are: Lead B starts later than Lead A.
    const cloudXs = new Float64Array(leadPts); const cloudAYs = new Float64Array(leadPts); const cloudBYs = new Float64Array(leadPts); let cloudN = 0;
    const addLead = (x: number, val: IndicatorValue): void => {
      const a = val.senkouA;
      const b = val.senkouB;
      if (a !== undefined) { senkouAXs[senkouAN] = x; senkouAYs[senkouAN] = priceToY(a, viewport); senkouAN++; }
      if (b !== undefined) { senkouBXs[senkouBN] = x; senkouBYs[senkouBN] = priceToY(b, viewport); senkouBN++; }
      if (a !== undefined && b !== undefined) {
        cloudXs[cloudN] = x; cloudAYs[cloudN] = senkouAYs[senkouAN - 1]; cloudBYs[cloudN] = senkouBYs[senkouBN - 1]; cloudN++;
      }
    };

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      const x = barIndexToX(i, viewport);
      if (val.tenkan !== undefined) { tenkanXs[tenkanN] = x; tenkanYs[tenkanN] = priceToY(val.tenkan, viewport); tenkanN++; }
      if (val.kijun !== undefined) { kijunXs[kijunN] = x; kijunYs[kijunN] = priceToY(val.kijun, viewport); kijunN++; }
      addLead(x, val);
      if (val.chikou !== undefined) { chikouXs[chikouN] = x; chikouYs[chikouN] = priceToY(val.chikou, viewport); chikouN++; }
    }

    // The cloud ahead of the latest bar, as far as the plot's right edge.
    if (ahead) {
      const left = viewport.chartRect.x - viewport.barWidth - viewport.barSpacing;
      const right = viewport.chartRect.x + viewport.chartRect.width + viewport.barWidth + viewport.barSpacing;
      for (let k = 0; k < ahead.length; k++) {
        const x = barIndexToX(aheadFrom + k, viewport);
        if (x > right) break;
        if (x >= left) addLead(x, ahead[k]);
      }
    }

    if (cloudN > 1) {
      ctx.beginPath();
      ctx.moveTo(cloudXs[0], cloudAYs[0]);
      for (let i = 1; i < cloudN; i++) ctx.lineTo(cloudXs[i], cloudAYs[i]);
      for (let i = cloudN - 1; i >= 0; i--) ctx.lineTo(cloudXs[i], cloudBYs[i]);
      ctx.closePath();
      ctx.fillStyle = withAlpha(style.colors[2] ?? '#1fa874', 0.15);
      ctx.fill();
    }

    // Lines — set state once per line
    const drawTypedLine = (key: string, xs: Float64Array, ys: Float64Array, n: number, color: string, lw: number) => {
      const look = plotLook(style, key, lw);
      if (n < 2 || !look.visible) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.setLineDash(look.dash);
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawTypedLine('tenkan', tenkanXs, tenkanYs, tenkanN, style.colors[0], style.lineWidths[0]);
    drawTypedLine('kijun', kijunXs, kijunYs, kijunN, style.colors[1] ?? '#f2a93b', style.lineWidths[0]);
    drawTypedLine('senkouA', senkouAXs, senkouAYs, senkouAN, style.colors[2] ?? '#1fa874', 1);
    drawTypedLine('senkouB', senkouBXs, senkouBYs, senkouBN, style.colors[3] ?? '#e8505b', 1);
    drawTypedLine('chikou', chikouXs, chikouYs, chikouN, style.colors[CHIKOU_COLOR] ?? CHIKOU_FALLBACK, 1);
  }
}

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataSeries, OHLCBar } from '@tradecanvas/commons';
import { ChartWidget } from '../ChartWidget.js';
import { decodeWidgetState } from '../widgetShareState.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 1);
/** Bricks, lines or columns a chart type that reshapes the bars by a size may make (core's MAX_RESHAPED_BARS). */
const MAX_RESHAPED_BARS = 100_000;
/** What opening the link and drawing it may take: a box of 1e-9 once filled the tab's memory instead. */
const OPEN_AND_DRAW_MS = 3_000;
/** Frames enough for the chart to draw the shared view (requestAnimationFrame runs on a 16 ms timer here). */
const FRAMES_MS = 80;

/** 300 hourly bars of a seeded walk near 60,000, the last one flat. */
function nearSixtyThousand(): DataSeries {
  let seed = 11;
  let price = 60_000;
  const bars: OHLCBar[] = Array.from({ length: 299 }, (_, i) => {
    seed = (seed * 16_807) % 2_147_483_647;
    const open = price;
    price += (seed / 2_147_483_647 - 0.5) * 120;
    return { time: T0 + i * HOUR, open, high: Math.max(open, price) + 5, low: Math.min(open, price) - 5, close: price, volume: 1 };
  });
  return [...bars, { time: T0 + 299 * HOUR, open: price, high: price, low: price, close: price, volume: 1 }];
}

/** A link written by hand, as anyone can: JSON allows sizes no chart could use, 1e999 (Infinity) among them. */
function craftedToken(chartType: string, chartTypeOptions: string): string {
  const json = `{"v":1,"symbol":"AAA","timeframe":"1h","chartType":"${chartType}","scaleMode":"regular",`
    + `"indicators":[],"drawings":[],"settings":{"chartTypeOptions":${chartTypeOptions}}}`;
  return Buffer.from(json, 'utf8').toString('base64url');
}

type Probe = { getDisplayData(): OHLCBar[] };

let host: HTMLDivElement;
let widget: ChartWidget;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(900, 500);
  widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], timeframe: '1h', layouts: false });
  widget.setData(nearSixtyThousand());
});

afterEach(() => {
  widget.destroy();
  host.remove();
  document.querySelectorAll('.tcw-portal').forEach((p) => p.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a shared link’s chart type sizes', () => {
  it('reads only sizes that are finite numbers above 0, and drops the rest', () => {
    const token = craftedToken('renko', '{"renko":{"boxSize":1e999,"atrPeriod":14},"kagi":{"reversal":-4},'
      + '"pointAndFigure":{"boxSize":"5","reversal":3},"rangeBars":{"range":0},"lineBreak":{"lines":1e999}}');
    expect(decodeWidgetState(token)!.settings!.chartTypeOptions).toEqual({
      renko: { atrPeriod: 14 },
      kagi: {},
      pointAndFigure: { reversal: 3 },
      rangeBars: {},
      lineBreak: {},
    });
  });

  it.each([
    ['renko', '{"renko":{"boxSize":1e-9}}'],
    ['kagi', '{"kagi":{"reversal":1e-9,"reversalType":"price"}}'],
    ['pointAndFigure', '{"pointAndFigure":{"boxSize":1e-9}}'],
    ['rangeBars', '{"rangeBars":{"range":1e-9}}'],
  ])('opens a %s link with a size of 1e-9 and draws it in time, at most the cap', async (chartType, options) => {
    const start = performance.now();
    expect(await widget.importState(craftedToken(chartType, options))).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, FRAMES_MS));
    const shown = (widget.getChart() as unknown as Probe).getDisplayData();
    expect(performance.now() - start).toBeLessThan(OPEN_AND_DRAW_MS);
    expect(widget.getChart().getChartType()).toBe(chartType);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThanOrEqual(MAX_RESHAPED_BARS + 1);
  });
});

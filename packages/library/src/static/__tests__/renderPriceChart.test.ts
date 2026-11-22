import { describe, it, expect, vi } from 'vitest';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { renderPriceChart } from '../renderPriceChart.js';
import { PaintPath, painted, someBars } from './paintKit.js';

const SIZE = { width: 800, height: 400 };
const path2D = PaintPath as unknown as typeof Path2D;
const bars = someBars(120);

/** A candle is a wick and a body, a rectangle each. */
const RECTS_A_BAR = 2;

/** The rectangles in the paths a frame fills: with volume off, the candles' wicks and bodies and little else. */
function barRects(paints: readonly string[]): number {
  return paints.filter((p) => p.startsWith('fill ')).reduce((sum, p) => sum + (p.match(/rect\(/g)?.length ?? 0), 0);
}

describe('the price chart drawn on a context of the caller’s', () => {
  it('needs no page: there is none here, and the chart draws', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const { ctx, paints, texts, rects } = painted();
    renderPriceChart(ctx, { data: bars, path2D }, SIZE);
    // Its own ground first, the whole size.
    expect(rects[0]).toEqual([0, 0, 800, 400, DARK_THEME.background]);
    expect(paints.length).toBeGreaterThan(20);
    // Prices on the scale, months on the axis, the last bar's prices in the legend.
    expect(texts).toEqual(expect.arrayContaining(['100', '120', 'Feb', 'Mar', 'O', 'H', 'L', 'C']));
  });

  it('says what is missing where there is no Path2D, and leaves the global as it found it', () => {
    expect(typeof Path2D).toBe('undefined');
    const { ctx } = painted();
    expect(() => renderPriceChart(ctx, { data: bars }, SIZE)).toThrow(/Path2D/);
    renderPriceChart(ctx, { data: bars, path2D }, SIZE);
    expect(typeof Path2D).toBe('undefined');
    // A drawing that throws puts it back too.
    expect(() => renderPriceChart(ctx, { data: bars, path2D, indicators: [{ id: 'no-such-indicator' }] }, SIZE)).toThrow(/no-such-indicator/);
    expect(typeof Path2D).toBe('undefined');
  });

  it('draws every bar given, and only those of a range asked for', () => {
    const all = painted();
    renderPriceChart(all.ctx, { data: bars, path2D, features: { volume: false } }, SIZE);
    const some = painted();
    renderPriceChart(some.ctx, { data: bars, path2D, features: { volume: false }, visibleRange: { from: bars[60].time, to: bars[99].time } }, SIZE);
    const none = painted();
    renderPriceChart(none.ctx, { data: [], path2D, features: { volume: false } }, SIZE);
    const other = barRects(none.paints);
    expect(barRects(all.paints) - other).toBe(120 * RECTS_A_BAR);
    // Forty bars asked for, and the right margin's room past them.
    expect(barRects(some.paints) - other).toBeGreaterThanOrEqual(40 * RECTS_A_BAR);
    expect(barRects(some.paints) - other).toBeLessThan(60 * RECTS_A_BAR);
  });

  it('draws in the theme and the font the options name, the dark one with none', () => {
    const ground = (options: Parameters<typeof renderPriceChart>[1]): string => {
      const { ctx, rects } = painted();
      renderPriceChart(ctx, options, SIZE);
      return rects[0][4];
    };
    expect(ground({ data: bars, path2D })).toBe(DARK_THEME.background);
    expect(ground({ data: bars, path2D, theme: 'light' })).toBe(LIGHT_THEME.background);
    expect(ground({ data: bars, path2D, theme: { ...LIGHT_THEME, background: '#abcdef' } })).toBe('#abcdef');
    const { ctx, paints } = painted();
    renderPriceChart(ctx, { data: bars, path2D, font: { family: 'Menlo' } }, SIZE);
    const fonts = paints.filter((p) => p.startsWith('fillText')).map((p) => /font=([^;]*)/.exec(p)?.[1] ?? '');
    expect(fonts.length).toBeGreaterThan(5);
    expect(fonts.every((font) => font.includes('Menlo'))).toBe(true);
  });

  it('names the symbol and the interval in the legend, and leaves the legend out when told to', () => {
    const named = painted();
    renderPriceChart(named.ctx, { data: bars, path2D, symbol: 'VNM', timeframe: '1d' }, SIZE);
    expect(named.texts.join(' ')).toMatch(/VNM/);
    const bare = painted();
    renderPriceChart(bare.ctx, { data: bars, path2D, symbol: 'VNM', timeframe: '1d', features: { legend: false } }, SIZE);
    expect(bare.texts.join(' ')).not.toMatch(/VNM/);
  });

  it('draws an indicator on the price pane and one in a pane of its own under it', () => {
    const plain = painted();
    renderPriceChart(plain.ctx, { data: bars, path2D }, SIZE);
    const studied = painted();
    renderPriceChart(studied.ctx, { data: bars, path2D, indicators: [{ id: 'sma', params: { period: 10 } }, { id: 'rsi' }] }, SIZE);
    expect(studied.paints.length).toBeGreaterThan(plain.paints.length);
    // The pane under its title, on a scale of its own from 0 to 100.
    expect(studied.texts).toEqual(expect.arrayContaining(['Relative Strength Index', '0', '50']));
    expect(plain.texts).not.toContain('Relative Strength Index');
    expect(plain.texts).not.toContain('50');
    // The price pane gave the pane its room: the candles are shorter.
    const tallest = (paints: readonly string[]): number =>
      Math.max(...paints.filter((p) => p.startsWith('fill ')).flatMap((p) => [...p.matchAll(/rect\(([^)]*)\)/g)].map((m) => Number(m[1].split(',')[1]) + Number(m[1].split(',')[3]))));
    expect(tallest(studied.paints)).toBeLessThan(tallest(plain.paints));
  });

  it('draws an indicator in another’s pane, and one that reads another’s line', () => {
    const { ctx, paints } = painted();
    renderPriceChart(
      ctx,
      {
        data: bars,
        path2D,
        indicators: [
          { id: 'rsi', instanceId: 'momentum' },
          { id: 'sma', params: { period: 5, source: 'ind:momentum:rsi' } },
          { id: 'stochastic', pane: 'momentum' },
        ],
      },
      SIZE,
    );
    const one = painted();
    renderPriceChart(one.ctx, { data: bars, path2D, indicators: [{ id: 'rsi', instanceId: 'momentum' }] }, SIZE);
    // One pane for the three, and more lines in it.
    expect(paints.length).toBeGreaterThan(one.paints.length);
    const paneGrounds = (list: readonly string[]): number => list.filter((p) => /^fillRect\(0,\d/.test(p) && p.includes(`fillStyle=${DARK_THEME.background}`)).length;
    expect(paneGrounds(paints)).toBe(paneGrounds(one.paints));
  });

  it('draws nothing at a size that is none, and a chart of no bars without a word', () => {
    for (const size of [{ width: 0, height: 300 }, { width: 400, height: Number.NaN }, { width: -5, height: 5 }]) {
      const { ctx, paints } = painted();
      renderPriceChart(ctx, { data: bars, path2D }, size);
      expect(paints).toEqual([]);
    }
    const empty = painted();
    expect(() => renderPriceChart(empty.ctx, { data: [], path2D }, SIZE)).not.toThrow();
    expect(empty.rects[0]).toEqual([0, 0, 800, 400, DARK_THEME.background]);
  });

  it('shows prices to the decimals asked for, and no last price where it is switched off', () => {
    const fine = painted();
    renderPriceChart(fine.ctx, { data: bars, path2D, pricePrecision: 4 }, SIZE);
    const last = bars[bars.length - 1].close;
    expect(fine.texts).toContain(last.toFixed(4));
    const plain = painted();
    renderPriceChart(plain.ctx, { data: bars, path2D }, SIZE);
    expect(plain.texts).toContain(last.toFixed(2));
    expect(plain.texts).not.toContain(last.toFixed(4));
    // The tag at the last close is the one text on the axis in the bar's own colour: gone with the line.
    const off = painted();
    renderPriceChart(off.ctx, { data: bars, path2D, lastPriceLine: false, features: { legend: false } }, SIZE);
    expect(off.texts).not.toContain(last.toFixed(2));
    expect(off.paints.length).toBeLessThan(plain.paints.length);
  });

  it('shows the newest bars where they do not all fit, and says so for options that are no options', () => {
    const many = someBars(6000);
    const { ctx, paints, texts } = painted();
    renderPriceChart(ctx, { data: many, path2D, features: { volume: false } }, SIZE);
    const none = painted();
    renderPriceChart(none.ctx, { data: [], path2D, features: { volume: false } }, SIZE);
    const drawn = (barRects(paints) - barRects(none.paints)) / RECTS_A_BAR;
    expect(drawn).toBeGreaterThan(100);
    expect(drawn).toBeLessThan(900);
    expect(texts).toContain(many[many.length - 1].close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    const blank = painted();
    expect(() => renderPriceChart(blank.ctx, { data: 'bars' as never, path2D }, SIZE)).toThrow(/data/);
    expect(() => renderPriceChart(blank.ctx, null as never, SIZE)).toThrow(/options/);
    expect(() => renderPriceChart(null as never, { data: bars, path2D }, SIZE)).toThrow(/context/);
    expect(() => renderPriceChart(blank.ctx, { data: bars, path2D, timeZone: 'Mars/Olympus' }, SIZE)).toThrow(/Mars\/Olympus/);
    expect(blank.paints).toEqual([]);
  });

  it('names the option that is wrong before anything is drawn', () => {
    const wrong: [Record<string, unknown>, RegExp][] = [
      [{ indicators: 'rsi' }, /indicators/],
      [{ indicators: [null] }, /indicators\[0\]/],
      [{ indicators: [{ params: {} }] }, /indicators\[0\]/],
      [{ indicators: [{ id: 'rsi', instanceId: 'a' }, { id: 'macd', instanceId: 'a' }] }, /'a'/],
      [{ drawings: 'x' }, /drawings/],
      [{ drawings: [null] }, /drawings\[0\]/],
      [{ drawings: [{ type: 'trendLine' }] }, /drawings\[0\]/],
      [{ markers: [{ time: 'now' }] }, /markers\[0\]/],
      [{ plugins: [null] }, /plugins\[0\]/],
      [{ theme: 'sepia' }, /theme/],
      [{ rightMargin: Number.NaN }, /rightMargin/],
      [{ rightMargin: -3 }, /rightMargin/],
      [{ pricePrecision: 99 }, /pricePrecision/],
      [{ pricePrecision: 1.5 }, /pricePrecision/],
      [{ visibleRange: { from: 'a', to: 2 } }, /visibleRange/],
      [{ symbolSeries: { OTHER: 'bars' } }, /symbolSeries/],
      [{ features: 'none' }, /features/],
    ];
    for (const [options, named] of wrong) {
      const { ctx, paints } = painted();
      expect(() => renderPriceChart(ctx, { data: bars, path2D, ...options } as never, SIZE), JSON.stringify(options)).toThrow(named);
      expect(paints, JSON.stringify(options)).toEqual([]);
    }
    // A size that is none, or no number at all, draws nothing; a margin past any chart's is held to one that is not.
    for (const size of [{ width: Number.POSITIVE_INFINITY, height: 300 }, { width: '800', height: 400 }]) {
      const { ctx, paints } = painted();
      renderPriceChart(ctx, { data: bars, path2D }, size as never);
      expect(paints).toEqual([]);
    }
    const far = painted();
    const began = performance.now();
    renderPriceChart(far.ctx, { data: bars, path2D, rightMargin: 1e9 }, SIZE);
    expect(performance.now() - began).toBeLessThan(2000);
    expect(far.paints.length).toBeGreaterThan(10);
  });

  it('says so, as the chart does, for a style key it leaves out, and draws the rest', () => {
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { ctx, paints } = painted();
    renderPriceChart(ctx, { data: bars, path2D, overrides: { 'no.such.key': 1, 'grid.vertical.visible': false } as never }, SIZE);
    expect(warned).toHaveBeenCalledTimes(1);
    expect(String(warned.mock.calls[0][0])).toContain('no.such.key');
    expect(paints.length).toBeGreaterThan(20);
    warned.mockRestore();
  });

  it('reads `exchange` as UTC, having no exchange to ask', () => {
    const utc = painted();
    renderPriceChart(utc.ctx, { data: bars, path2D, timeZone: 'UTC' }, SIZE);
    const exchange = painted();
    renderPriceChart(exchange.ctx, { data: bars, path2D, timeZone: 'exchange' }, SIZE);
    expect(exchange.paints).toEqual(utc.paints);
  });

  it('leaves the context as it found it, and unclipped when a plugin of the caller’s throws', () => {
    const { ctx, paints } = painted();
    ctx.fillStyle = '#010203';
    ctx.font = '7px serif';
    renderPriceChart(ctx, { data: bars, path2D }, SIZE);
    expect(ctx.fillStyle).toBe('#010203');
    expect(ctx.font).toBe('7px serif');
    const broken = {
      kind: 'overlay' as const,
      plugin: {
        descriptor: { id: 'broken', name: 'Broken', layer: 'main' as const },
        render: () => {
          throw new Error('the plugin broke');
        },
      },
    };
    expect(() => renderPriceChart(ctx, { data: bars, path2D, plugins: [broken] }, SIZE)).toThrow(/the plugin broke/);
    expect(typeof Path2D).toBe('undefined');
    // The plot's clip, which the plugin threw inside, is gone: what is drawn next is not cut to it.
    paints.length = 0;
    ctx.fillRect(1, 2, 3, 4);
    expect(paints[0]).toMatch(/clip\[\]$/);
  });

  it('leaves out a bar that is no bar, as the chart does', () => {
    const broken = [...bars.slice(0, 50), { time: bars[50].time, open: Number.NaN, high: 1, low: 1, close: 1, volume: 1 }, ...bars.slice(51)];
    const whole = painted();
    renderPriceChart(whole.ctx, { data: bars, path2D, features: { volume: false } }, SIZE);
    const { ctx, paints } = painted();
    renderPriceChart(ctx, { data: broken, path2D, features: { volume: false } }, SIZE);
    expect(barRects(whole.paints) - barRects(paints)).toBe(RECTS_A_BAR);
  });
});

describe('renderPriceChart: a footprint’s rows', () => {
  const size = { width: 800, height: 400 };
  const data = someBars(40);

  it('says what is wrong with rows that are none', () => {
    const draw = (footprint: unknown) => renderPriceChart(painted(800, 400).ctx, { data, path2D, chartType: 'footprint', footprint: footprint as never }, size);
    expect(() => draw('rows')).toThrow(/options\.footprint is an array/);
    expect(() => draw([{ levels: [] }])).toThrow(/options\.footprint\[0\] needs a time/);
    expect(() => draw([{ time: data[0].time }])).toThrow(/options\.footprint\[0\] needs levels/);
    expect(() => draw([{ time: data[0].time, levels: [] }])).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
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

  it('leaves out a bar that is no bar, as the chart does', () => {
    const broken = [...bars.slice(0, 50), { time: bars[50].time, open: Number.NaN, high: 1, low: 1, close: 1, volume: 1 }, ...bars.slice(51)];
    const whole = painted();
    renderPriceChart(whole.ctx, { data: bars, path2D, features: { volume: false } }, SIZE);
    const { ctx, paints } = painted();
    renderPriceChart(ctx, { data: broken, path2D, features: { volume: false } }, SIZE);
    expect(barRects(whole.paints) - barRects(paints)).toBe(RECTS_A_BAR);
  });
});

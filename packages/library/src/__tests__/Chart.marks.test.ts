// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartMark, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100, volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hourly(200));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const state = () => (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState();
/** Where the badge of the bar `fromEnd` bars before the last is drawn. */
function badgeOf(fromEnd: number): { x: number; y: number } {
  const manager = (chart as unknown as { chartMarkManager: { badges(v: ViewportState): { x: number; y: number; marks: ChartMark[] }[] } }).chartMarkManager;
  const time = T0 + (199 - fromEnd) * HOUR;
  const badge = manager.badges(state()).find((b) => b.marks.some((m) => m.time === time));
  if (!badge) throw new Error(`no badge at ${fromEnd} bars from the end`);
  return { x: badge.x, y: badge.y };
}
const move = (at: { x: number; y: number }) => host.dispatchEvent(new MouseEvent('mousemove', { clientX: at.x, clientY: at.y, bubbles: true }));
const click = (at: { x: number; y: number }) => {
  host.dispatchEvent(new MouseEvent('mousedown', { clientX: at.x, clientY: at.y, button: 0, bubbles: true }));
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: at.x, clientY: at.y, button: 0, bubbles: true }));
};
const cursor = () => [host, ...host.querySelectorAll<HTMLElement>('*')].find((el) => el.style.cursor)?.style.cursor ?? '';

describe('Chart marks', () => {
  it('keeps the marks it is given, cleaned as untrusted input, earliest first', () => {
    chart.setMarks([
      { id: 'b', time: T0 + 150 * HOUR, title: 'Later', url: 'javascript:alert(1)' },
      { id: 'a', time: T0 + 100 * HOUR, title: 'Earlier', kind: 'earnings', url: 'https://example.com/q3' },
      { id: 'c', time: T0 + 120 * HOUR } as unknown as ChartMark,
    ]);
    expect(chart.getMarks()).toEqual([
      { id: 'a', time: T0 + 100 * HOUR, title: 'Earlier', kind: 'earnings', url: 'https://example.com/q3' },
      { id: 'b', time: T0 + 150 * HOUR, title: 'Later' },
    ]);
  });

  it('draws none on bricks and boxes, whose bars are not times, and draws them again on candles', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline', kind: 'news' }]);
    const at = badgeOf(9);
    const clicked = vi.fn();
    chart.on('markClick', clicked);
    chart.setChartType('renko');
    expect(() => badgeOf(9)).toThrow();
    click(at);
    expect(clicked).not.toHaveBeenCalled();
    // The marks are kept: they are back with the bars that have times.
    expect(chart.getMarks()).toHaveLength(1);
    chart.setChartType('candlestick');
    click(badgeOf(9));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('adds one and takes it away, and clears them all', () => {
    const id = chart.addMark({ time: T0 + 190 * HOUR, title: 'Dividend', kind: 'dividend' });
    expect(id).toBeTruthy();
    expect(chart.addMark({ time: Number.NaN, title: 'No time' })).toBeNull();
    chart.addMark({ id: 'mine', time: T0 + 180 * HOUR, title: 'Mine' });
    expect(chart.getMarks().map((m) => m.title)).toEqual(['Mine', 'Dividend']);
    chart.removeMark(id!);
    expect(chart.getMarks().map((m) => m.id)).toEqual(['mine']);
    chart.clearMarks();
    expect(chart.getMarks()).toEqual([]);
  });

  it('says which marks the pointer is over, once on the way in and once on the way out', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline', kind: 'news' }]);
    const heard: (string[] | null)[] = [];
    chart.on('markHover', (e) => heard.push(e.payload.marks?.map((m) => m.id) ?? null));
    const at = badgeOf(9);
    move(at);
    move({ x: at.x + 1, y: at.y });
    expect(heard).toEqual([['n']]);
    move({ x: at.x, y: at.y - 120 });
    expect(heard).toEqual([['n'], null]);
  });

  it('says the pointer is off a badge when the badge goes from under it', () => {
    const heard: (string[] | null)[] = [];
    chart.on('markHover', (e) => heard.push(e.payload.marks?.map((m) => m.id) ?? null));
    const hover = () => {
      chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline' }]);
      heard.length = 0;
      const at = badgeOf(9);
      move({ x: at.x, y: at.y - 150 });
      move(at);
      expect(heard).toEqual([['n']]);
      return at;
    };
    // Switched off, taken away, cleared, replaced: each says so once, with the pointer still.
    hover();
    chart.setFeatures({ marks: false });
    expect(heard).toEqual([['n'], null]);
    chart.setFeatures({ marks: true });
    hover();
    chart.removeMark('n');
    expect(heard).toEqual([['n'], null]);
    hover();
    chart.clearMarks();
    expect(heard).toEqual([['n'], null]);
    const at = hover();
    chart.setChartType('renko');
    expect(heard).toEqual([['n'], null]);
    // And nothing more on the next move; the hand goes with it.
    move({ x: at.x + 1, y: at.y });
    expect(heard).toEqual([['n'], null]);
    expect(cursor()).not.toBe('pointer');
  });

  it('tells a signal marker\u2019s listeners the pointer left it, when it left for a badge', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline' }]);
    const at = badgeOf(9);
    const price = (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState().priceRange;
    // A marker whose arrow is drawn over the badge's bar, well above the badge.
    chart.setSignalMarkers([{ id: 's', time: T0 + 190 * HOUR, price: (price.min + price.max) / 2, direction: 'long', confidence: 1, source: 't' }]);
    const heard: (string | null)[] = [];
    chart.on('signalMarkerHover', (e) => heard.push(e.payload.marker?.id ?? null));
    const marker = (chart as unknown as { signalMarkerManager: { markerAt(p: { x: number; y: number }, v: ViewportState): unknown } }).signalMarkerManager;
    let on: { x: number; y: number } | null = null;
    for (let y = 0; y < at.y - 30 && !on; y += 2) if (marker.markerAt({ x: at.x, y }, state())) on = { x: at.x, y };
    if (!on) throw new Error('no signal marker found above the badge');
    move(on);
    expect(heard).toEqual(['s']);
    move(at);
    expect(heard).toEqual(['s', null]);
  });

  it('says the marks changed when one is said again under the id it had', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline' }]);
    const heard = vi.fn();
    chart.on('marksChange', heard);
    chart.addMark({ id: 'n', time: T0 + 190 * HOUR, title: 'Headline, corrected' });
    expect(heard).toHaveBeenCalledTimes(1);
    chart.addMark({ time: Number.NaN, title: 'Not a mark' });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('gives a click on a badge its marks, and keeps it from being a click on the chart', () => {
    chart.setMarks([
      { id: 'n1', time: T0 + 190 * HOUR, title: 'One', url: 'https://example.com/1' },
      { id: 'n2', time: T0 + 190 * HOUR, title: 'Two' },
    ]);
    const clicked: string[][] = [];
    const plain = vi.fn();
    chart.on('markClick', (e) => clicked.push(e.payload.marks.map((m) => m.id)));
    chart.on('click', plain);
    const at = badgeOf(9);
    click(at);
    expect(clicked).toEqual([['n1', 'n2']]);
    expect(plain).not.toHaveBeenCalled();
    // Off the badge it is the chart's click again.
    click({ x: at.x, y: at.y - 150 });
    expect(plain).toHaveBeenCalledTimes(1);
    expect(clicked).toHaveLength(1);
  });

  it('shows a hand over a badge', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline' }]);
    const at = badgeOf(9);
    move(at);
    expect(cursor()).toBe('pointer');
    move({ x: at.x, y: at.y - 150 });
    expect(cursor()).not.toBe('pointer');
  });

  it('draws none, and reads none under the pointer, with the feature off', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline' }]);
    const at = badgeOf(9);
    chart.setFeatures({ marks: false });
    const heard = vi.fn();
    chart.on('markHover', heard);
    chart.on('markClick', heard);
    move(at);
    click(at);
    expect(heard).not.toHaveBeenCalled();
    // They are kept, and come back with the feature.
    expect(chart.getMarks()).toHaveLength(1);
    chart.setFeatures({ marks: true });
    move({ x: at.x + 1, y: at.y });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('keeps the marks through new bars and a new set of data, and drops none on its own', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'Headline' }]);
    chart.appendBar({ time: T0 + 200 * HOUR, open: 100, high: 101, low: 99, close: 100, volume: 1 });
    chart.setData(hourly(120));
    expect(chart.getMarks().map((m) => m.id)).toEqual(['n']);
  });

  it('says how many marks there are whenever they change', () => {
    const counts: number[] = [];
    chart.on('marksChange', (e) => counts.push(e.payload.count));
    chart.setMarks([{ id: 'a', time: T0 + 100 * HOUR, title: 'One' }, { id: 'b', time: T0 + 110 * HOUR, title: 'Two' }]);
    chart.addMark({ id: 'c', time: T0 + 120 * HOUR, title: 'Three' });
    chart.addMark({ time: Number.NaN, title: 'Not one' });
    chart.removeMark('a');
    chart.removeMark('nobody');
    chart.clearMarks();
    chart.clearMarks();
    expect(counts).toEqual([2, 3, 2, 0]);
  });

  it('leaves them out of a saved state: they are the feed\u2019s, not the user\u2019s', () => {
    chart.setMarks([{ id: 'n', time: T0 + 190 * HOUR, title: 'A headline nobody saved' }]);
    expect(chart.saveState() ?? '').not.toContain('A headline nobody saved');
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChartMark, NewsItem } from '@tradecanvas/commons';
import { WidgetMarks, newsMarks, type MarksHost } from '../WidgetMarks.js';
import { SymbolNews } from '../symbolInfoView.js';

const T = Date.UTC(2026, 10, 12, 9);
const headline = (id: string, minutes: number, over: Partial<NewsItem> = {}): NewsItem =>
  ({ id, title: `Headline ${id}`, time: T + minutes * 60_000, source: 'Wire', url: `https://example.com/${id}`, ...over });

/** A chart that keeps its marks and its listeners, as the real one does. */
class FakeChart {
  marks = new Map<string, ChartMark>();
  aligned = true;
  isTimeAligned(): boolean { return this.aligned; }
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  addMark(mark: ChartMark): string { this.marks.set(mark.id, mark); this.emit('marksChange', { count: this.marks.size }); return mark.id; }
  /** The host's `chart.setMarks`: every mark replaced, and said so. */
  setMarks(list: ChartMark[]): void { this.marks = new Map(list.map((m) => [m.id, m])); this.emit('marksChange', { count: this.marks.size }); }
  getMarks(): ChartMark[] { return [...this.marks.values()]; }
  removeMark(id: string): void { this.marks.delete(id); }
  on(event: string, cb: (e: { payload: unknown }) => void): void { this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]); }
  emit(event: string, payload: unknown): void { for (const cb of this.listeners.get(event) ?? []) cb({ payload }); }
}

let chart: FakeChart;
let opened: string[];
let menus: { entries: { id: string; label: string; icon?: string }[]; x: number; y: number; pick: (id: string) => void }[];
let host: MarksHost & { symbol: string; destroyed: boolean; featureState: { marks: boolean }; options: { news?: unknown; newsMarks?: boolean; adapter?: unknown } };
let marks: WidgetMarks;
let lifts: number[];
/** `chartOptions.features.marks` as the host set it. */
let chartFeature: boolean;
let hides: boolean[];

beforeEach(() => {
  chart = new FakeChart();
  chartFeature = true;
  opened = [];
  menus = [];
  lifts = [];
  hides = [];
  host = {
    chart: chart as never,
    options: {},
    featureState: { marks: true },
    // The widget's switch, and the host's chart features leaving the marks on.
    get marksOn() { return host.featureState.marks && chartFeature; },
    symbol: 'AAA',
    destroyed: false,
    news: new SymbolNews(),
    openMenu: (entries, x, y, pick) => menus.push({ entries: entries as never, x, y, pick }),
    openLink: (url) => opened.push(url),
    liftNavigation: (px) => lifts.push(px),
    hideNavigation: (hidden) => hides.push(hidden),
  } as never;
  marks = new WidgetMarks(host);
});

const settled = () => new Promise((r) => setTimeout(r, 0));

describe('headlines as marks', () => {
  it('turns each headline into a news mark: its title, its source under it, its link', () => {
    expect(newsMarks([headline('a', 0), headline('b', 5, { source: undefined, url: undefined })])).toEqual([
      { id: 'news:a', time: T, kind: 'news', title: 'Headline a', text: 'Wire', url: 'https://example.com/a' },
      { id: 'news:b', time: T + 300_000, kind: 'news', title: 'Headline b' },
    ]);
    // One with no id of its own is told apart by when it was and what it says.
    const [one, two] = newsMarks([{ title: 'Same minute', time: T }, { title: 'Another', time: T }]);
    expect(one.id).not.toBe(two.id);
  });

  it('puts the symbol\u2019s headlines on the chart, from the widget\u2019s news source', async () => {
    host.options.news = vi.fn(async () => [headline('a', 0), headline('b', 5)]);
    marks.start();
    await settled();
    expect([...chart.marks.keys()]).toEqual(['news:b', 'news:a']);
    expect(host.options.news).toHaveBeenCalledWith('AAA', expect.any(Number));
  });

  it('uses the adapter\u2019s headlines when the widget was given no source of its own', async () => {
    const adapter = { fetchNews: vi.fn(async () => [headline('a', 0)]) };
    host.options.adapter = adapter;
    marks.start();
    await settled();
    expect([...chart.marks.keys()]).toEqual(['news:a']);
  });

  it('replaces them when the symbol changes, and leaves the host\u2019s own marks alone', async () => {
    chart.addMark({ id: 'mine', time: T, title: 'An earnings date the host set', kind: 'earnings' });
    host.options.news = vi.fn(async (symbol: string) => [headline(symbol === 'AAA' ? 'a' : 'b', 0)]);
    marks.start();
    await settled();
    host.symbol = 'BBB';
    marks.load();
    // The old symbol's are gone at once, before the new ones answer.
    expect([...chart.marks.keys()]).toEqual(['mine']);
    await settled();
    expect([...chart.marks.keys()]).toEqual(['mine', 'news:b']);
  });

  it('keeps them through the host replacing the chart\u2019s marks with its own', async () => {
    host.options.news = vi.fn(async () => [headline('a', 0), headline('b', 5)]);
    marks.start();
    await settled();
    chart.setMarks([{ id: 'mine', time: T, title: 'An earnings date the host set', kind: 'earnings' }]);
    expect([...chart.marks.keys()].sort()).toEqual(['mine', 'news:a', 'news:b']);
    // The host clearing them all: the symbol's headlines are still the widget's to show.
    chart.setMarks([]);
    expect([...chart.marks.keys()].sort()).toEqual(['news:a', 'news:b']);
  });

  it('puts none back once the symbol has changed, or the marks are told off', async () => {
    host.options.news = vi.fn(async (symbol: string) => (symbol === 'AAA' ? [headline('a', 0)] : []));
    marks.start();
    await settled();
    host.symbol = 'BBB';
    marks.load();
    await settled();
    chart.setMarks([{ id: 'mine', time: T, title: 'The host\u2019s' }]);
    expect([...chart.marks.keys()]).toEqual(['mine']);
    host.symbol = 'AAA';
    marks.load();
    await settled();
    host.options.newsMarks = false;
    marks.load();
    chart.setMarks([]);
    expect(chart.marks.size).toBe(0);
  });

  it('drops an answer that comes after the symbol has changed again', async () => {
    let release: (items: NewsItem[]) => void = () => {};
    host.options.news = vi.fn((symbol: string) => (symbol === 'AAA' ? new Promise<NewsItem[]>((r) => { release = r; }) : Promise.resolve([headline('b', 0)])));
    marks.start();
    host.symbol = 'BBB';
    marks.load();
    await settled();
    release([headline('late', 0)]);
    await settled();
    expect([...chart.marks.keys()]).toEqual(['news:b']);
  });

  it('puts none on the chart with no source, with the marks switched off, or when told not to', async () => {
    marks.start();
    await settled();
    expect(chart.marks.size).toBe(0);
    const source = vi.fn(async () => [headline('a', 0)]);
    host.options.news = source;
    host.featureState.marks = false;
    marks.load();
    await settled();
    host.featureState.marks = true;
    host.options.newsMarks = false;
    marks.load();
    await settled();
    expect(chart.marks.size).toBe(0);
    expect(source).not.toHaveBeenCalled();
  });

  it('asks for none when the host\u2019s chart features turned the marks off', async () => {
    const source = vi.fn(async () => [headline('a', 0)]);
    host.options.news = source;
    chartFeature = false;
    chart.addMark({ id: 'mine', time: T, title: 'A mark nobody sees' });
    marks.start();
    await settled();
    expect(source).not.toHaveBeenCalled();
    expect(lifts.at(-1)).toBe(0);
  });

  it('leaves the chart as it is when the headlines cannot be loaded, or the widget is gone', async () => {
    host.options.news = vi.fn(async () => { throw new Error('down'); });
    marks.start();
    await settled();
    expect(chart.marks.size).toBe(0);
    host.options.news = vi.fn(async () => [headline('a', 0)]);
    host.symbol = 'CCC';
    marks.load();
    host.destroyed = true;
    await settled();
    expect(chart.marks.size).toBe(0);
  });
});

describe('the chart\u2019s navigation buttons, which sit where the badges are', () => {
  beforeEach(() => marks.start());

  it('stand above the badges while the chart has marks, and back when it has none', () => {
    chart.emit('marksChange', { count: 3 });
    chart.emit('marksChange', { count: 0 });
    expect(lifts.at(-2)).toBeGreaterThan(18);
    expect(lifts.at(-1)).toBe(0);
  });

  it('stay where they were with the marks switched off', () => {
    chart.addMark({ id: 'mine', time: T, title: 'A mark of the host’s own' });
    host.featureState.marks = false;
    chart.emit('marksChange', { count: 1 });
    expect(lifts.at(-1)).toBe(0);
    // Switched on again, the marks that are there count.
    host.featureState.marks = true;
    marks.load();
    expect(lifts.at(-1)).toBeGreaterThan(18);
  });

  it('stay where they were on bricks and boxes, where no mark is drawn', () => {
    chart.addMark({ id: 'mine', time: T, title: 'A mark of the host\u2019s own' });
    expect(lifts.at(-1)).toBeGreaterThan(18);
    chart.aligned = false;
    chart.emit('chartTypeChange', { type: 'renko', previous: 'candlestick' });
    expect(lifts.at(-1)).toBe(0);
    chart.aligned = true;
    chart.emit('chartTypeChange', { type: 'candlestick', previous: 'renko' });
    expect(lifts.at(-1)).toBeGreaterThan(18);
  });

  it('step aside while the pointer reads a badge, whose words they would cover', () => {
    chart.emit('markHover', { marks: [{ id: 'n', time: T, title: 'One' }], x: 1, y: 1 });
    chart.emit('markHover', { marks: null, x: 1, y: 1 });
    expect(hides).toEqual([true, false]);
  });
});

describe('a click on a mark', () => {
  const click = (list: ChartMark[]) => chart.emit('markClick', { marks: list, x: 120, y: 300 });

  beforeEach(() => marks.start());

  it('opens the one headline it marks', () => {
    click([{ id: 'n', time: T, title: 'One', url: 'https://example.com/one' }]);
    expect(opened).toEqual(['https://example.com/one']);
    expect(menus).toEqual([]);
  });

  it('does nothing for one mark with nowhere to go: the pointer has read it already', () => {
    click([{ id: 'n', time: T, title: 'An earnings date' }]);
    expect(opened).toEqual([]);
    expect(menus).toEqual([]);
  });

  it('lists several where the click was, and opens the one picked', () => {
    click([
      { id: 'a', time: T, title: 'First', url: 'https://example.com/a' },
      { id: 'b', time: T, title: 'No link' },
      { id: 'c', time: T, title: 'Third', url: 'https://example.com/c' },
    ]);
    expect(opened).toEqual([]);
    expect(menus).toHaveLength(1);
    // The newest first, as the pointer read them.
    expect(menus[0].entries.map((e) => [e.id, e.label, e.icon])).toEqual([['c', 'Third', 'link'], ['b', 'No link', undefined], ['a', 'First', 'link']]);
    expect([menus[0].x, menus[0].y]).toEqual([120, 300]);
    menus[0].pick('c');
    menus[0].pick('b');
    expect(opened).toEqual(['https://example.com/c']);
  });

  it('lists the newest dozen of a badge that gathers more', () => {
    click(Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, time: T + i, title: `Mark ${i}` })));
    expect(menus[0].entries.map((e) => e.id)).toEqual(Array.from({ length: 12 }, (_, i) => `m${39 - i}`));
  });

  it('opens nothing with the marks switched off', () => {
    host.featureState.marks = false;
    click([{ id: 'n', time: T, title: 'One', url: 'https://example.com/one' }]);
    expect(opened).toEqual([]);
  });
});

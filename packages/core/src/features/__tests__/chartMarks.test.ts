import { describe, it, expect, beforeEach } from 'vitest';
import { readChartMarks, MAX_CHART_MARKS, DARK_THEME, type ChartMark, type OHLCBar, type ViewportState } from '@tradecanvas/commons';
import { ChartMarkManager, MARK_BADGE_SIZE } from '../ChartMarkManager.js';
import { recordingCtx } from '../../drawings/__tests__/fixtures.js';

/** A hundred bars a minute apart from t = 0, ten pixels each, on a plot 1000 x 400. */
const MINUTE = 60_000;
const bars: OHLCBar[] = Array.from({ length: 100 }, (_, i) => ({ time: i * MINUTE, open: 10, high: 11, low: 9, close: 10, volume: 1 }));
const viewport: ViewportState = {
  visibleRange: { from: 0, to: 100 },
  priceRange: { min: 0, max: 100 },
  barWidth: 10,
  barSpacing: 0,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 1000, height: 400 },
};
const mark = (id: string, time: number, over: Partial<ChartMark> = {}): ChartMark => ({ id, time, title: `Headline ${id}`, ...over });

describe('the most marks a chart keeps', () => {
  it('takes no new mark past it, and still replaces one it has', () => {
    const manager = new ChartMarkManager();
    manager.setMarks(Array.from({ length: MAX_CHART_MARKS }, (_, i) => mark(`m${i}`, i * 1000)));
    expect(manager.addMark(mark('one-more', 5))).toBeNull();
    expect(manager.count()).toBe(MAX_CHART_MARKS);
    expect(manager.addMark(mark('m7', 7000, { title: 'Said again' }))).toBe('m7');
    expect(manager.count()).toBe(MAX_CHART_MARKS);
    expect(manager.getMarks().find((m) => m.id === 'm7')?.title).toBe('Said again');
  });
});

describe('marks read from a feed or a host', () => {
  it('keeps what has a title and a time, newest last, and drops the rest', () => {
    const marks = readChartMarks([
      { id: 'b', time: 2000, title: ' Later ' },
      { time: 1000, title: 'Earlier', kind: 'earnings', label: 'E', text: 'Q3', url: 'https://example.com/a', color: '#f2a93b' },
      { time: 3000 },
      { title: 'No time' },
      null,
      'nonsense',
      { time: Number.NaN, title: 'Not a time' },
    ]);
    expect(marks.map((m) => m.title)).toEqual(['Earlier', 'Later']);
    expect(marks[0]).toMatchObject({ kind: 'earnings', label: 'E', text: 'Q3', url: 'https://example.com/a', color: '#f2a93b' });
    // One with no id gets one, and no two share one.
    expect(new Set(marks.map((m) => m.id)).size).toBe(2);
    expect(readChartMarks('not a list')).toEqual([]);
  });

  it('keeps only links that are web pages, a kind it knows, and a short label', () => {
    const [m] = readChartMarks([{ time: 1, title: 'x', url: 'javascript:alert(1)', kind: 'rumour', label: 'NEWS!' }]);
    expect(m.url).toBeUndefined();
    expect(m.kind).toBeUndefined();
    expect(m.label).toBe('NE');
    expect(readChartMarks([{ time: 1, title: 'x', url: 'data:text/html,hi' }])[0].url).toBeUndefined();
  });

  it('cuts a title and a text to a length that fits a tooltip, and stops at its limit', () => {
    const [m] = readChartMarks([{ time: 1, title: 'a'.repeat(900), text: 'b'.repeat(5000) }]);
    expect(m.title.length).toBeLessThanOrEqual(300);
    expect(m.text!.length).toBeLessThanOrEqual(1000);
    expect(readChartMarks(Array.from({ length: 50 }, (_, i) => ({ time: i, title: 't' })), 10)).toHaveLength(10);
  });
});

describe('ChartMarkManager', () => {
  let manager: ChartMarkManager;
  beforeEach(() => {
    manager = new ChartMarkManager();
    manager.setDataGetter(() => bars);
  });

  it('puts a mark on the bar that holds its time, at the foot of the plot', () => {
    // 20.5 minutes: inside bar 20, whose centre is at x 205.
    manager.setMarks([mark('a', 20.5 * MINUTE)]);
    const [badge] = manager.badges(viewport);
    expect(badge.x).toBe(205);
    expect(badge.marks.map((m) => m.id)).toEqual(['a']);
    expect(badge.y).toBeGreaterThan(400 - MARK_BADGE_SIZE * 1.5);
    expect(badge.y + MARK_BADGE_SIZE / 2).toBeLessThanOrEqual(400);
  });

  it('gathers marks that would cover one another into one badge, the earliest first', () => {
    // Bars 30 and 31 are 10 px apart, closer than a badge is wide; bar 60 stands alone.
    manager.setMarks([mark('c', 60 * MINUTE), mark('b', 31 * MINUTE), mark('a', 30 * MINUTE), mark('a2', 30 * MINUTE)]);
    const badges = manager.badges(viewport);
    expect(badges.map((b) => b.marks.map((m) => m.id))).toEqual([['a', 'a2', 'b'], ['c']]);
    expect(badges[0].x).toBe(305);
  });

  it('draws none before the first bar, after the bar now forming, or off the plot', () => {
    manager.setMarks([mark('early', -5 * MINUTE), mark('last', 99.9 * MINUTE), mark('late', 130 * MINUTE)]);
    expect(manager.badges(viewport).map((b) => b.marks[0].id)).toEqual(['last']);
    // Scrolled on by 50 bars: bar 20 is off the left edge.
    manager.setMarks([mark('gone', 20 * MINUTE), mark('seen', 70 * MINUTE)]);
    expect(manager.badges({ ...viewport, offset: 500 }).map((b) => b.marks[0].id)).toEqual(['seen']);
    // No bars, nothing to put them on.
    manager.setDataGetter(() => []);
    expect(manager.badges(viewport)).toEqual([]);
  });

  it('finds the badge under the pointer, a few pixels around it too, and nothing elsewhere', () => {
    manager.setMarks([mark('a', 20 * MINUTE), mark('b', 60 * MINUTE)]);
    const [a, b] = manager.badges(viewport);
    expect(manager.badgeAt({ x: a.x, y: a.y }, viewport)?.marks[0].id).toBe('a');
    expect(manager.badgeAt({ x: b.x + MARK_BADGE_SIZE / 2 + 5, y: b.y }, viewport)?.marks[0].id).toBe('b');
    expect(manager.badgeAt({ x: b.x + MARK_BADGE_SIZE / 2 + 9, y: b.y }, viewport)).toBeNull();
    // Between two that stand side by side, the nearer one.
    manager.setMarks([mark('l', 20 * MINUTE), mark('r', 22 * MINUTE)]);
    const [l, r] = manager.badges(viewport);
    expect(r.x - l.x).toBe(20);
    expect(manager.badgeAt({ x: l.x + 9, y: l.y }, viewport)?.marks[0].id).toBe('l');
    expect(manager.badgeAt({ x: l.x + 11, y: l.y }, viewport)?.marks[0].id).toBe('r');
    manager.setMarks([mark('a', 20 * MINUTE), mark('b', 60 * MINUTE)]);
    expect(manager.badgeAt({ x: 400, y: a.y }, viewport)).toBeNull();
    expect(manager.badgeAt({ x: a.x, y: 100 }, viewport)).toBeNull();
    // Off the plot is nobody's.
    expect(manager.badgeAt({ x: a.x, y: 500 }, viewport)).toBeNull();
  });

  it('adds, removes and clears, asking for a redraw each time', () => {
    let draws = 0;
    manager.setRequestRender(() => draws++);
    const id = manager.addMark({ time: 10 * MINUTE, title: 'Added' });
    expect(manager.getMarks().map((m) => m.title)).toEqual(['Added']);
    manager.addMark({ id: 'mine', time: 11 * MINUTE, title: 'Second' });
    manager.removeMark(id);
    expect(manager.getMarks().map((m) => m.id)).toEqual(['mine']);
    manager.clearMarks();
    expect(manager.getMarks()).toEqual([]);
    expect(draws).toBe(4);
    // What it is given is its own: changing the list handed in changes nothing here.
    const list = [mark('x', 1)];
    manager.setMarks(list);
    list.push(mark('y', 2));
    expect(manager.getMarks()).toHaveLength(1);
  });

  it('shows in a replay only the marks it has reached', () => {
    manager.setMarks([mark('a', 20 * MINUTE), mark('b', 60 * MINUTE)]);
    manager.setRevealUntil(40 * MINUTE);
    expect(manager.badges(viewport).map((b) => b.marks[0].id)).toEqual(['a']);
    expect(manager.badgeAt({ x: 605, y: manager.badges(viewport)[0].y }, viewport)).toBeNull();
    manager.setRevealUntil(null);
    expect(manager.badges(viewport)).toHaveLength(2);
  });

  it('writes a badge\u2019s letter, or how many it holds', () => {
    manager.setMarks([mark('n', 20 * MINUTE, { kind: 'news' }), mark('e', 60 * MINUTE, { kind: 'earnings', label: 'Q3' }), mark('x', 80 * MINUTE), mark('y', 80 * MINUTE), mark('z', 80 * MINUTE)]);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, viewport, DARK_THEME);
    expect(texts).toEqual(['N', 'Q3', '3']);
  });

  it('says what the hovered badge marks: its titles, the newest first, and how many more', () => {
    manager.setMarks(['a', 'b', 'c', 'd', 'e'].map((id, i) => mark(id, 50 * MINUTE + i * 1000, { text: `Source ${id}` })));
    const [badge] = manager.badges(viewport);
    manager.setHovered(badge);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, viewport, DARK_THEME);
    // The badge's count, then the newest three, each with its second line, then the rest as a number.
    expect(texts).toEqual(['5', 'Headline e', 'Source e', 'Headline d', 'Source d', 'Headline c', 'Source c', '+2']);
    // Nothing hovered, nothing said.
    manager.setHovered(null);
    const quiet = recordingCtx();
    manager.render(quiet.ctx, viewport, DARK_THEME);
    expect(quiet.texts).toEqual(['5']);
  });

  it('keeps the hovered badge\u2019s words on the plot, by either edge', () => {
    for (const bar of [0, 99]) {
      manager.setMarks([mark('a', bar * MINUTE, { title: 'A headline long enough to need the room it is given on the plot' })]);
      const [badge] = manager.badges(viewport);
      manager.setHovered(badge);
      const { ctx, calls } = recordingCtx();
      manager.render(ctx, viewport, DARK_THEME);
      const box = manager.tooltipBox();
      expect(box, `bar ${bar}`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1000);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(calls.length).toBeGreaterThan(0);
    }
  });
});

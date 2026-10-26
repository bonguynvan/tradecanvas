import { describe, it, expect } from 'vitest';
import { TimeMarker, markKind, type TimeMark } from '../timeMarks.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Bar = { time: number };

function weekdays(from: number, to: number): Bar[] {
  const out: Bar[] = [];
  for (let t = from; t <= to; t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) out.push({ time: t });
  }
  return out;
}

const hourly = (from: number, count: number): Bar[] => Array.from({ length: count }, (_, i) => ({ time: from + i * HOUR }));

const iso = (m: TimeMark) => new Date(m.time).toISOString().slice(0, 16);

/** Marks over slots `from`..`to`, at least `gapBars` slots apart, in UTC. */
function marks(data: Bar[], gapBars: number, from = 0, to = data.length - 1): TimeMark[] {
  return new TimeMarker().marks(data, { from, to, gapBars, tz: 0, timesPastData: true });
}

describe('TimeMarker', () => {
  it('marks the first bar of each year when only years fit', () => {
    const data = weekdays(Date.UTC(2020, 0, 1), Date.UTC(2026, 9, 21));
    const out = marks(data, 200);
    // A lesser mark only where a year leaves room, at the ends.
    const years = out.filter((m) => markKind(m.weight) === 'year');
    expect(out.length - years.length).toBeLessThanOrEqual(2);
    expect(years.map(iso)).toEqual(['2021-01-01T00:00', '2022-01-03T00:00', '2023-01-02T00:00', '2024-01-01T00:00', '2025-01-01T00:00', '2026-01-01T00:00']);
  });

  it('fills in months between the years when they fit, quarters first', () => {
    const data = weekdays(Date.UTC(2024, 0, 1), Date.UTC(2025, 11, 31));
    const out = marks(data, 40);
    const kinds = out.map((m) => markKind(m.weight));
    expect(kinds).toContain('year');
    expect(kinds).toContain('month');
    // The month and year marks start their months (weekends aside).
    const starts = out.filter((m) => markKind(m.weight) !== 'day' && markKind(m.weight) !== 'time');
    for (const m of starts) expect(new Date(m.time).getUTCDate()).toBeLessThanOrEqual(4);
    const months = starts.map((m) => new Date(m.time).getUTCMonth());
    expect(months.filter((m) => m % 3 === 0).length).toBeGreaterThanOrEqual(months.filter((m) => m % 3 !== 0).length);
  });

  it('keeps marks at least the gap apart', () => {
    const data = hourly(Date.UTC(2025, 0, 1), 5000);
    for (const gap of [3, 7, 24, 100, 700]) {
      const out = marks(data, gap);
      for (let i = 1; i < out.length; i++) expect(out[i].index - out[i - 1].index).toBeGreaterThanOrEqual(gap);
    }
  });

  it('shows the years on hourly bars over years', () => {
    const data = hourly(Date.UTC(2021, 5, 1), 5 * 365 * 24);
    const out = marks(data, 4000);
    const years = out.filter((m) => markKind(m.weight) === 'year');
    expect(years.map((m) => new Date(m.time).getUTCFullYear())).toEqual([2022, 2023, 2024, 2025, 2026]);
  });

  it('prefers round hours within a day', () => {
    const data = hourly(Date.UTC(2025, 2, 3, 1), 22);
    const out = marks(data, 5);
    const hours = out.filter((m) => markKind(m.weight) === 'time').map((m) => new Date(m.time).getUTCHours());
    expect(hours).toEqual([6, 12, 18]);
  });

  it('keeps the same marks on the same bars when older history is put in front', () => {
    const all = weekdays(Date.UTC(2015, 0, 1), Date.UTC(2026, 9, 21));
    const recent = all.slice(-1500);
    const before = marks(recent, 25, recent.length - 300, recent.length - 1).map(iso);
    const shift = all.length - recent.length;
    const after = marks(all, 25, shift + recent.length - 300, shift + recent.length - 1).map(iso);
    expect(after).toEqual(before);
  });

  it('gives nothing left of the first bar, and marks the future past the last when asked', () => {
    const data = hourly(Date.UTC(2025, 0, 1, 20), 10);
    const marker = new TimeMarker();
    const out = marker.marks(data, { from: -50, to: 40, gapBars: 3, tz: 0, timesPastData: true });
    expect(out.every((m) => m.index >= 0)).toBe(true);
    expect(out.some((m) => m.index > 9)).toBe(true);
    const none = marker.marks(data, { from: -50, to: 40, gapBars: 3, tz: 0, timesPastData: false });
    expect(none.every((m) => m.index >= 0 && m.index <= 9)).toBe(true);
  });

  it('reads the day in the display zone', () => {
    // 17:00 UTC is midnight at UTC+7: the day starts there.
    const data = hourly(Date.UTC(2025, 0, 1, 10), 12);
    const out = new TimeMarker().marks(data, { from: 0, to: 11, gapBars: 12, tz: 420, timesPastData: false });
    expect(out.map(iso)).toEqual(['2025-01-01T17:00']);
  });

  it('starts the month of daily bars built at the exchange’s midnight on its own first day, in any zone shown', () => {
    // Days of Ho Chi Minh City (UTC+7), each stamped at 17:00 UTC the day before: 26 September to 5 October.
    const data = Array.from({ length: 10 }, (_, i) => ({ time: Date.UTC(2026, 8, 25, 17) + i * DAY }));
    for (const tz of [0, -240]) {
      const out = new TimeMarker().marks(data, { from: 0, to: 9, gapBars: 10, tz, timesPastData: false, exchangeZone: 'Asia/Ho_Chi_Minh' });
      // 1 October there is the bar stamped 17:00 UTC on 30 September.
      expect(out.map(iso)).toEqual(['2026-09-30T17:00']);
    }
  });

  it('starts the month of dated daily bars on the date they name, in any zone shown', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ time: Date.UTC(2026, 8, 26) + i * DAY }));
    const out = new TimeMarker().marks(data, { from: 0, to: 9, gapBars: 10, tz: 'America/New_York', timesPastData: false });
    expect(out.map(iso)).toEqual(['2026-10-01T00:00']);
  });
});

describe('TimeMarker — live series', () => {
  const query = (to: number) => ({ from: 0, to, gapBars: 30, tz: 0 as const, timesPastData: true });

  it('gives the marks a fresh marker would after bars are appended or the last one replaced', () => {
    const all = hourly(Date.UTC(2025, 0, 1), 3000);
    const marker = new TimeMarker();
    const live = all.slice(0, 2000);
    marker.marks(live, query(2100));
    // A new array with the same times (a derived series rebuilt on a tick), then appends.
    marker.marks(live.map((b) => ({ ...b })), query(2100));
    const grown = all.slice(0, 2600);
    expect(marker.marks(grown, query(2700))).toEqual(new TimeMarker().marks(grown, query(2700)));
    // History in front: the times no longer line up, so everything is weighed again.
    const older = [...hourly(Date.UTC(2024, 11, 1), 50).map((b) => ({ time: b.time })), ...grown];
    expect(marker.marks(older, query(2700))).toEqual(new TimeMarker().marks(older, query(2700)));
  });
});

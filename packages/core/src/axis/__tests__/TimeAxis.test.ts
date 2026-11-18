import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TimeAxis, TZ_LABEL_GAP_PX } from '../TimeAxis.js';
import { madeFrom } from '../../charts/transforms/axisTimes.js';

/** Records each fillText with the font it was drawn in; text is 6 px a character. */
function recordingCtx(): { ctx: CanvasRenderingContext2D; drawn: { text: string; x: number; align: string }[]; fonts: string[] } {
  const drawn: { text: string; x: number; align: string }[] = [];
  const fonts: string[] = [];
  const state: Record<string, unknown> = { font: '', textAlign: 'start' };
  const ctx = new Proxy(state, {
    get: (t, p) => {
      if (p === 'fillText') return (text: string, x: number) => { drawn.push({ text, x, align: String(t.textAlign) }); fonts.push(String(t.font)); };
      if (p === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (p in t) return t[p as string];
      return () => {};
    },
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn, fonts };
}

const HOUR = 3_600_000;
const data = Array.from({ length: 100 }, (_, i) => ({
  time: Date.UTC(2026, 9, 1) + i * HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1,
}));

function viewport(offset: number): ViewportState {
  return {
    chartRect: { x: 0, y: 0, width: 400, height: 300 },
    barWidth: 8,
    barSpacing: 2,
    offset,
    priceRange: { min: 0, max: 2 },
    visibleRange: { from: 0, to: 99 },
  } as unknown as ViewportState;
}

describe('TimeAxis', () => {
  it('never draws a tick label over the timezone tag', () => {
    const axis = new TimeAxis();
    axis.setTimezoneOffset(420); // "UTC+7"
    // Scan offsets so a tick lands at every distance from the right edge.
    for (let offset = 560; offset < 640; offset += 1) {
      const { ctx, drawn } = recordingCtx();
      axis.render(ctx, viewport(offset), DARK_THEME, data);
      const tz = drawn.find((d) => d.align === 'right');
      expect(tz?.text).toBe('UTC+7');
      const tzLeft = 400 - 4 - tz!.text.length * 6;
      for (const tick of drawn.filter((d) => d.align === 'center')) {
        expect(tick.x + (tick.text.length * 6) / 2, `offset ${offset}: "${tick.text}"`).toBeLessThanOrEqual(tzLeft - TZ_LABEL_GAP_PX + 0.001);
      }
    }
  });

  it('still labels the rest of the axis', () => {
    const { ctx, drawn } = recordingCtx();
    new TimeAxis().render(ctx, viewport(600), DARK_THEME, data);
    // Two ticks, and at the left end the date tag in place of the one there.
    expect(drawn.filter((d) => d.align === 'center').length).toBeGreaterThanOrEqual(2);
    expect(drawn.filter((d) => d.align === 'left').map((d) => d.text)).toEqual(['Oct 2026']);
  });
});

describe('TimeAxis date labels', () => {
  const DAY = 24 * HOUR;
  const series = (step: number, n = 100) => Array.from({ length: n }, (_, i) => ({
    time: Date.UTC(2026, 8, 25) + i * step, open: 1, high: 1, low: 1, close: 1, volume: 1,
  }));
  const ticks = (bars: ReturnType<typeof series>) => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    axis.render(ctx, viewport(0), DARK_THEME, bars);
    return drawn.filter((d) => d.align === 'center').map((d) => d.text);
  };

  it('labels hourly bars with the day where it starts and round hours between', () => {
    const labels = ticks(series(HOUR));
    expect(labels).toContain('26');
    expect(labels.some((t) => /^(06|12|18):00$/.test(t))).toBe(true);
    expect(labels.filter((t) => /^\d{4}$/.test(t))).toEqual([]);
  });

  it('labels daily bars with the month where it starts and days between, no times', () => {
    const labels = ticks(series(DAY));
    expect(labels).toContain('Oct');
    expect(labels.some((t) => /^\d{1,2}$/.test(t))).toBe(true);
    expect(labels.filter((t) => t.includes(':'))).toEqual([]);
  });

  it('labels the year where it starts, in bold', () => {
    const { ctx, drawn, fonts } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    const bars = Array.from({ length: 100 }, (_, i) => ({ time: Date.UTC(2025, 11, 1) + i * DAY, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    axis.render(ctx, viewport(0), DARK_THEME, bars);
    const year = drawn.findIndex((d) => d.text === '2026');
    expect(year).toBeGreaterThanOrEqual(0);
    expect(fonts[year]).toMatch(/^600 /);
  });

  it('writes month names in its locale', () => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    axis.setLocale('vi-VN');
    axis.render(ctx, viewport(0), DARK_THEME, series(DAY));
    const october = new Intl.DateTimeFormat('vi-VN', { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, 9, 15));
    expect(drawn.map((d) => d.text)).toContain(october);
  });

  it('hands its own formatter the kind of step each label starts', () => {
    const kinds: string[] = [];
    const { ctx } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    axis.setTimeFormatter((_t, c) => { kinds.push(c.kind); return c.kind; });
    axis.render(ctx, viewport(0), DARK_THEME, series(DAY));
    expect(kinds).toContain('month');
    expect(kinds).toContain('day');
  });

  describe('slots past the data', () => {
    // Twelve bars at the right of the plot: bar 0 is centred at x = 284.
    const few = data.slice(0, 12);
    const ticks = (axis: TimeAxis) => {
      const { ctx, drawn } = recordingCtx();
      // A fixed zone: the timezone tag's width, and so what fits beside it, mustn't depend on the machine's.
      axis.setTimezoneOffset(420);
      axis.render(ctx, viewport(-280), DARK_THEME, few);
      return drawn.filter((d) => d.align === 'center');
    };

    it('are labelled with times extrapolated from the bars by default, in the future only', () => {
      // Panned so the twelve bars sit at the left and the future fills the rest.
      const { ctx, drawn } = recordingCtx();
      new TimeAxis().render(ctx, viewport(0), DARK_THEME, few);
      expect(drawn.filter((d) => d.align === 'center').some((t) => t.x > 12 * 10)).toBe(true);
      // Left of the oldest bar: nothing.
      expect(ticks(new TimeAxis()).every((t) => t.x >= 284)).toBe(true);
    });

    it('stay blank when bars are not evenly spaced in time, as tick bars are', () => {
      const axis = new TimeAxis();
      axis.setTimesPastData(false);
      const labels = ticks(axis);
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.every((t) => t.x >= 284)).toBe(true);
    });
  });

  it('dates millisecond bars from before 2001 by their real year', () => {
    // Daily bars from 2000-07-28: in milliseconds these are below 1e12.
    const DAY = 24 * HOUR;
    const daily = Array.from({ length: 300 }, (_, i) => ({
      time: Date.UTC(2000, 6, 28) + i * DAY, open: 1, high: 1, low: 1, close: 1, volume: 1,
    }));
    const { ctx, drawn } = recordingCtx();
    new TimeAxis().render(ctx, { ...viewport(0), visibleRange: { from: 0, to: 39 } } as ViewportState, DARK_THEME, daily);
    const labels = drawn.filter((d) => d.align === 'center').map((d) => d.text);
    expect(labels.length).toBeGreaterThan(0);
    // No year 32,000: August 2000 at the left end (the tag stands in for the "Aug" there), days after it.
    expect(drawn.filter((d) => d.align === 'left').map((d) => d.text)).toEqual(['Aug 2000']);
    for (const label of labels) expect(label, label).toMatch(/^([A-Z][a-z]{2}|\d{1,2}|2000|2001)$/);
  });

  it('labels no slot left of the oldest bar, where it has no date to give', () => {
    const { ctx, drawn } = recordingCtx();
    // Panned 200 px past the oldest bar.
    new TimeAxis().render(ctx, viewport(-200), DARK_THEME, data);
    for (const tick of drawn.filter((d) => d.align === 'center')) {
      expect(tick.x, tick.text).toBeGreaterThanOrEqual(200 + 4 - 0.001);
    }
  });

  it('shows the date where the day changes, a new month on the same day of the month too', () => {
    // 4h bars, one label every 30 days: each lands on the same day of a new month.
    const FOUR = 4 * HOUR;
    const bars = Array.from({ length: 1200 }, (_, i) => ({
      time: Date.UTC(2025, 10, 9) + i * FOUR, open: 1, high: 1, low: 1, close: 1, volume: 1,
    }));
    const { ctx, drawn } = recordingCtx();
    const vp = { ...viewport(0), barWidth: 0.4, barSpacing: 0.045, visibleRange: { from: 0, to: 898 } } as ViewportState;
    new TimeAxis().render(ctx, vp, DARK_THEME, bars);
    const labels = drawn.filter((d) => d.align === 'center').map((d) => d.text);
    expect(labels.length).toBeGreaterThan(1);
    // A label a month on is a month (or the year), never a bare time.
    for (const label of labels) expect(label, labels.join(' | ')).not.toMatch(/^\d\d:\d\d$/);
  });

  it('keeps wide labels from running into each other', () => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    axis.setTimeFormatter((t, c) => `${c.kind} ${new Date(t).toISOString().slice(0, 16)}`);
    axis.render(ctx, viewport(0), DARK_THEME, series(HOUR));
    const ticks = drawn.filter((d) => d.align === 'center').sort((a, b) => a.x - b.x);
    expect(ticks.length).toBeGreaterThan(0);
    for (let i = 1; i < ticks.length; i++) {
      const prevRight = ticks[i - 1].x + (ticks[i - 1].text.length * 6) / 2;
      expect(ticks[i].x - (ticks[i].text.length * 6) / 2).toBeGreaterThanOrEqual(prevRight);
    }
  });

  it('never draws a tick label past the plot’s left edge, where it would be cut', () => {
    const axis = new TimeAxis();
    axis.setTimezoneOffset(420);
    // Scan offsets so a tick lands at every distance from the left edge; the plot starts at 40 (a left scale).
    for (let offset = 0; offset < 80; offset += 1) {
      const { ctx, drawn } = recordingCtx();
      const vp = viewport(offset);
      axis.render(ctx, { ...vp, chartRect: { ...vp.chartRect, x: 40 } }, DARK_THEME, data);
      for (const tick of drawn.filter((d) => d.align === 'center')) {
        expect(tick.x - (tick.text.length * 6) / 2, `offset ${offset}: "${tick.text}"`).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it('shows seconds on bars within a minute', () => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    // Bars a second apart, so seconds are labelled between the minutes: five seconds apart, the only
    // room for them is left of the first minute, where the date tag goes.
    const secs = Array.from({ length: 100 }, (_, i) => ({ time: Date.UTC(2026, 0, 5, 9, 30) + i * 1_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    axis.render(ctx, viewport(0), DARK_THEME, secs);
    expect(drawn.some((d) => /^\d\d:\d\d:\d\d$/.test(d.text))).toBe(true);
  });
});

describe('TimeAxis on a stretch of history with no new year on view', () => {
  const DAY = 24 * HOUR;
  const bars = (first: number, step: number, n = 100) => Array.from({ length: n }, (_, i) => ({
    time: first + i * step, open: 1, high: 1, low: 1, close: 1, volume: 1,
  }));
  const render = (series: ReturnType<typeof bars>, setup: (axis: TimeAxis) => void = () => {}, vp: ViewportState = viewport(0)) => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    setup(axis);
    axis.render(ctx, vp, DARK_THEME, series);
    return { drawn, axis, tag: drawn.filter((d) => d.align === 'left').map((d) => d.text) };
  };

  it('writes the year at the left end when the months on view do not reach a new year', () => {
    // Daily bars from 1 March 2023: April starts on view, January never does.
    expect(render(bars(Date.UTC(2023, 2, 1), DAY)).tag).toEqual(['2023']);
  });

  it('writes the month and the year when the labels on view are days', () => {
    // Hourly bars from 10 March 2023: days start on view, no month does.
    expect(render(bars(Date.UTC(2023, 2, 10), HOUR)).tag).toEqual(['Mar 2023']);
  });

  it('writes the whole date when the labels on view are times of one day', () => {
    expect(render(bars(Date.UTC(2023, 2, 15, 9), 60_000)).tag).toEqual(['Mar 15, 2023']);
  });

  it('dates the tag by the first bar on view, not the first bar loaded', () => {
    // Daily bars from 1 December 2022, panned to start on 2 March 2023 (bar 91).
    expect(render(bars(Date.UTC(2022, 11, 1), DAY, 200), () => {}, viewport(910)).tag).toEqual(['2023']);
  });

  it('stands in for a label it would cover, and says what that label said', () => {
    // Panned so 1 March 2023 (bar 90) is the first bar on view: its "Mar" is under the tag.
    const { drawn, tag } = render(bars(Date.UTC(2022, 11, 1), DAY, 200), () => {}, viewport(900));
    expect(tag).toEqual(['Mar 2023']);
    const ticks = drawn.filter((d) => d.align === 'center').map((d) => d.text);
    expect(ticks).not.toContain('Mar');
    expect(ticks).toContain('Apr');
  });

  it('is dated by the label it stands in for, so the days after it read as that month’s', () => {
    // From 27 February 2023: the tag covers the "Mar" a few bars in, and a "15" after it is 15 March.
    const { drawn, tag } = render(bars(Date.UTC(2023, 1, 27), DAY));
    expect(tag).toEqual(['Mar 2023']);
    expect(drawn.filter((d) => d.align === 'center').map((d) => d.text)).toContain('15');
  });

  it('dates the slots past the last bar by the times they are given', () => {
    // A hundred days from 1 March 2023, panned 500 slots on: July 2024, the "15" at the left end under the tag.
    expect(render(bars(Date.UTC(2023, 2, 1), DAY), () => {}, viewport(5000)).tag).toEqual(['Jul 15, 2024']);
  });

  it('leaves the labels as they were where it has no room', () => {
    const narrow = { ...viewport(0), chartRect: { x: 0, y: 0, width: 70, height: 300 } } as ViewportState;
    const series = bars(Date.UTC(2023, 2, 15, 9), 60_000);
    const { drawn, tag } = render(series, () => {}, narrow);
    expect(tag).toEqual([]);
    const { ctx, drawn: plain } = recordingCtx();
    const formatted = new TimeAxis();
    formatted.setTimezoneOffset(0);
    // Your formatter's labels never get a tag: the same ticks, as the axis places them without one.
    formatted.setTimeFormatter((t) => new Date(t).toISOString().slice(11, 16));
    formatted.render(ctx, narrow, DARK_THEME, series);
    expect(drawn.filter((d) => d.align === 'center')).toEqual(plain.filter((d) => d.align === 'center'));
  });

  it('writes the exchange’s date on its daily bars', () => {
    // Ho Chi Minh City's days from 1 March 2023, stamped at 17:00 UTC the day before: the first is 28 February in UTC.
    const vn = bars(Date.UTC(2023, 1, 28, 17), DAY, 40);
    const wide = { ...viewport(0), chartRect: { x: 0, y: 0, width: 1100, height: 300 }, barWidth: 90, barSpacing: 10 } as ViewportState;
    const { tag } = render(vn, (axis) => axis.setExchangeTimeZone('Asia/Ho_Chi_Minh'), wide);
    expect(tag).toEqual(['Mar 2023']);
  });

  it('writes no tag when a new year is labelled on view', () => {
    expect(render(bars(Date.UTC(2025, 11, 1), DAY)).tag).toEqual([]);
  });

  it('writes the tag in its locale', () => {
    const { tag } = render(bars(Date.UTC(2023, 2, 10), HOUR), (axis) => axis.setLocale('vi-VN'));
    const march = new Intl.DateTimeFormat('vi-VN', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(2023, 2, 15));
    expect(tag).toEqual([march]);
  });

  it('leaves the labels to your own formatter when one is set', () => {
    expect(render(bars(Date.UTC(2023, 2, 1), DAY), (axis) => axis.setTimeFormatter(() => 'x')).tag).toEqual([]);
  });

  it('keeps the other labels clear of the tag, and lists its span for the crosshair', () => {
    for (let offset = 0; offset < 60; offset += 3) {
      const { drawn, axis } = render(bars(Date.UTC(2023, 2, 10), HOUR), () => {}, viewport(offset));
      const tag = drawn.find((d) => d.align === 'left')!;
      const tagRight = tag.x + tag.text.length * 6;
      for (const tick of drawn.filter((d) => d.align === 'center')) {
        expect(tick.x - (tick.text.length * 6) / 2, `offset ${offset}: "${tick.text}"`).toBeGreaterThanOrEqual(tagRight);
      }
      expect(axis.labelColumns()).toContainEqual({ left: tag.x, right: tagRight });
    }
  });
});

describe('TimeAxis daily bars of an exchange', () => {
  const DAY = 24 * HOUR;
  /** Ten bars a slot apart, each labelled: 100 px a bar on a 1100 px axis. */
  const wide = { ...viewport(0), chartRect: { x: 0, y: 0, width: 1100, height: 300 }, barWidth: 90, barSpacing: 10 } as ViewportState;
  const days = (first: number) => Array.from({ length: 10 }, (_, i) => ({ time: first + i * DAY, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  const labels = (bars: ReturnType<typeof days>, tz: string | number, exchange: string | null) => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(tz);
    axis.setExchangeTimeZone(exchange);
    axis.render(ctx, wide, DARK_THEME, bars);
    return drawn.filter((d) => d.align === 'center').map((d) => d.text);
  };

  it('writes the exchange’s dates on days built at its midnight, shown in UTC or in New York', () => {
    // Ho Chi Minh City's 20 to 29 October, stamped at 17:00 UTC the day before. The first bar has no label.
    const vn = days(Date.UTC(2026, 9, 19, 17));
    for (const tz of ['UTC', 'America/New_York']) {
      const shown = labels(vn, tz, 'Asia/Ho_Chi_Minh');
      expect(shown).toContain('29');
      expect(shown).not.toContain('20');
    }
  });

  it('writes the dates bars stamped at 00:00 UTC name, in New York too', () => {
    const shown = labels(days(Date.UTC(2026, 9, 20)), 'America/New_York', null);
    expect(shown).toContain('29');
    expect(shown).not.toContain('20');
  });
});


describe('TimeAxis on bars a transform built', () => {
  it('leaves a lone day out from among the years and months of point & figure columns', () => {
    // Columns finished months apart, two in one month: the second would be a day mark on its own.
    const finished = [
      Date.UTC(2025, 6, 10), Date.UTC(2025, 9, 5), Date.UTC(2026, 0, 15),
      Date.UTC(2026, 6, 3), Date.UTC(2026, 6, 31), Date.UTC(2026, 9, 2),
    ];
    const columns = finished.map((t, i) => madeFrom({ time: i, open: 1, high: 2, low: 1, close: 2, volume: 1 }, t));
    const axis = new TimeAxis();
    const vp = { ...viewport(0), chartRect: { x: 0, y: 0, width: 1000, height: 300 }, barWidth: 120, barSpacing: 30 } as ViewportState;
    const { ctx, drawn } = recordingCtx();
    axis.render(ctx, vp, DARK_THEME, columns);
    const labels = drawn.filter((d) => d.align === 'center').map((d) => d.text);
    expect(labels, labels.join(' ')).not.toContain('31');
    expect(labels).toContain('2026');
  });
});

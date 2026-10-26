import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TimeAxis, TZ_LABEL_GAP_PX } from '../TimeAxis.js';

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
    expect(drawn.filter((d) => d.align === 'center').length).toBeGreaterThanOrEqual(3);
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
    // No year 32,000: months of 2000, and days between.
    expect(labels).toContain('Aug');
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

  it('shows seconds on bars within a minute', () => {
    const { ctx, drawn } = recordingCtx();
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    const secs = Array.from({ length: 100 }, (_, i) => ({ time: Date.UTC(2026, 0, 5, 9, 30) + i * 5_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    axis.render(ctx, viewport(0), DARK_THEME, secs);
    expect(drawn.some((d) => /^\d\d:\d\d:\d\d$/.test(d.text))).toBe(true);
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


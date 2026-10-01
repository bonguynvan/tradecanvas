// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import type { OHLCBar } from '@tradecanvas/commons';
import { CrosshairTooltip, formatTooltipTime } from '../CrosshairTooltip.js';

let host: HTMLDivElement;
let tip: CrosshairTooltip;

const card = (): HTMLElement => host.firstElementChild as HTMLElement;
const text = (): string => card().textContent ?? '';
const box = { width: 800, height: 400 };

const bar = (o: Partial<OHLCBar> = {}): OHLCBar => ({
  time: Date.UTC(2026, 2, 4, 14, 5),
  open: 100,
  high: 104,
  low: 99,
  close: 103,
  volume: 1_250_000,
  ...o,
});

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  tip = new CrosshairTooltip();
  tip.create(host);
  tip.setTimezoneOffset(0);
});

afterEach(() => {
  tip.destroy();
  host.remove();
});

describe('CrosshairTooltip', () => {
  it('shows O/H/L/C, the change from the previous close and the volume', () => {
    tip.show({ x: 100, y: 100 }, bar(), DARK_THEME, box, { prevClose: 102, priceRange: { min: 90, max: 110 } });
    expect(text()).toContain('100.00');
    expect(text()).toContain('104.00');
    expect(text()).toContain('103.00');
    expect(text()).toContain('+0.98%'); // (103 − 102) / 102
    expect(text()).toContain('1.25M');
    expect(tip.isVisible()).toBe(true);
  });

  it('keeps sub-cent prices instead of rounding them to 0.00', () => {
    const tiny = bar({ open: 0.00001234, high: 0.00001301, low: 0.0000119, close: 0.0000127 });
    tip.show({ x: 100, y: 100 }, tiny, DARK_THEME, box, { priceRange: { min: 0.0000115, max: 0.0000135 } });
    // textContent runs the cells together: "…C0.00001270VOL…".
    expect(text()).toContain('C0.00001270');
    expect(text()).not.toMatch(/O0\.00H/);
  });

  it('uses a fixed market precision when one is set', () => {
    tip.setPricePrecision(4);
    tip.show({ x: 100, y: 100 }, bar(), DARK_THEME, box);
    expect(text()).toContain('103.0000');
  });

  it('marks a fall with a minus sign', () => {
    tip.show({ x: 100, y: 100 }, bar({ close: 98 }), DARK_THEME, box, { prevClose: 100 });
    expect(text()).toContain('−2.00%');
  });

  it('flips to the left of the pointer near the price axis', () => {
    tip.show({ x: 760, y: 100 }, bar(), DARK_THEME, box);
    const m = /translate\((-?\d+)px/.exec(card().style.transform);
    expect(Number(m?.[1])).toBeLessThan(760);
  });

  it('recolours when the theme changes, and only then', () => {
    tip.show({ x: 100, y: 100 }, bar(), DARK_THEME, box);
    card().style.background = 'red';
    tip.show({ x: 110, y: 100 }, bar(), DARK_THEME, box);
    expect(card().style.background).toBe('red');
    tip.show({ x: 120, y: 100 }, bar(), LIGHT_THEME, box);
    expect(card().style.background).not.toBe('red');
  });

  it('formats numbers in the chart locale', () => {
    tip.setLocale('de-DE');
    tip.show({ x: 100, y: 100 }, bar(), DARK_THEME, box, { priceRange: { min: 90, max: 110 } });
    expect(text()).toContain('103,00');
  });

  it('stays inside the plot rect', () => {
    const plot = { x: 0, y: 0, width: 500, height: 300 };
    tip.show({ x: 490, y: 295 }, bar(), DARK_THEME, box, { plot });
    const [, x, y] = /translate\((-?\d+)px, (-?\d+)px\)/.exec(card().style.transform) ?? [];
    expect(Number(x)).toBeLessThan(490);
    expect(Number(y)).toBeLessThanOrEqual(300);
  });

  it('keeps the pill readable when the up/down colour is not hex or rgb', () => {
    const theme = { ...DARK_THEME, candleUp: 'oklch(70% 0.15 160)' };
    tip.show({ x: 100, y: 100 }, bar(), theme, box, { prevClose: 100 });
    const pill = [...card().querySelectorAll('div')].find((d) => d.textContent === '+3.00%') as HTMLElement;
    expect(pill.style.background).not.toBe(pill.style.color);
  });

  it('removes its card on destroy', () => {
    tip.show({ x: 100, y: 100 }, bar(), DARK_THEME, box);
    tip.destroy();
    expect(host.childElementCount).toBe(0);
    expect(tip.isVisible()).toBe(false);
  });

  it('hides', () => {
    tip.show({ x: 100, y: 100 }, bar(), DARK_THEME, box);
    tip.hide();
    expect(tip.isVisible()).toBe(false);
    expect(card().style.display).toBe('none');
  });
});

describe('formatTooltipTime', () => {
  it('shows date and time for intraday bars, in the chart timezone', () => {
    expect(formatTooltipTime(Date.UTC(2026, 2, 4, 14, 5), 0)).toBe('Mar 4 · 14:05');
    expect(formatTooltipTime(Date.UTC(2026, 2, 4, 14, 5), 420)).toBe('Mar 4 · 21:05');
  });

  it('shows the date with the year for daily bars (no 00:00)', () => {
    expect(formatTooltipTime(Date.UTC(2026, 2, 4), 0)).toBe('Mar 4, 2026');
  });

  it('uses the bar spacing: a midnight bar of an hourly series keeps its time', () => {
    expect(formatTooltipTime(Date.UTC(2026, 2, 4), 0, 3_600_000)).toBe('Mar 4 · 00:00');
    expect(formatTooltipTime(Date.UTC(2026, 2, 4), 0, 86_400_000)).toBe('Mar 4, 2026');
  });

  it('adds seconds for sub-minute bars', () => {
    expect(formatTooltipTime(Date.UTC(2026, 2, 4, 14, 5, 30), 0, 5_000)).toBe('Mar 4 · 14:05:30');
  });

  it('accepts timestamps in seconds', () => {
    expect(formatTooltipTime(Date.UTC(2026, 2, 4, 14, 5) / 1000, 0)).toBe('Mar 4 · 14:05');
  });
});

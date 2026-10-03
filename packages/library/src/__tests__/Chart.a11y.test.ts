// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2026, 0, 5, 14);
const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: T0 + i * 3_600_000, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 10 + i,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart?.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const live = () => host.querySelector<HTMLElement>('.tc-sr-live')!;
const key = (k: string, init: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));

describe('chart accessibility', () => {
  it('keeps its screen-reader text out of mouse selection, so a press stays a pan', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    expect(host.style.userSelect).toBe('none');
  });

  it('is a focusable chart with a summary a screen reader reads', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    expect(host.getAttribute('role')).toBe('application');
    expect(host.getAttribute('aria-roledescription')).toBe('chart');
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 160.00.');
    const keys = document.getElementById(host.getAttribute('aria-describedby')!)!;
    expect(keys.textContent).toContain('Comma and period');
  });

  it('says what is on screen after the keys move the view', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    host.focus();
    key('ArrowLeft');
    expect(live().textContent).toBe('');
    vi.advanceTimersByTime(500);
    expect(live().textContent).toMatch(/^Showing \d+ bars, .+ to .+\. High [\d.]+, low [\d.]+\.$/);
  });

  it('reads the bars one at a time with comma and period', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    host.focus();
    key('.');
    const last = live().textContent!;
    expect(last).toMatch(/open 159\.00, high 161\.00, low 158\.00, close 160\.00, volume 69\.$/);
    key(',');
    expect(live().textContent).toMatch(/close 159\.00, volume 68\.$/);
    key('.');
    key('.'); // past the last bar: stays on it
    expect(live().textContent).toBe(last);
  });

  it('takes labels of its own, and can be left out', () => {
    chart = new Chart(host, {
      chartType: 'line',
      a11y: { labels: { role: 'biểu đồ', summary: '{what}. Giá cuối {close}.', typeName: (t) => (t === 'line' ? 'đường' : t) } },
    });
    chart.setData(bars);
    expect(host.getAttribute('aria-roledescription')).toBe('biểu đồ');
    expect(host.getAttribute('aria-label')).toBe('đường. Giá cuối 160.00.');
    chart.destroy();
    host.remove();
    host = sizedHost();
    chart = new Chart(host, { a11y: false });
    expect(host.getAttribute('role')).toBeNull();
    expect(host.querySelector('.tc-sr-live')).toBeNull();
  });
});

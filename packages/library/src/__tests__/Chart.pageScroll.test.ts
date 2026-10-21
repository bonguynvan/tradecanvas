// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

let host: HTMLDivElement;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const wheel = (init: WheelEventInit = {}) => {
  const e = new WheelEvent('wheel', { deltaY: 40, clientX: 100, clientY: 100, cancelable: true, bubbles: true, ...init });
  host.dispatchEvent(e);
  return e;
};

describe('Chart — pageScroll', () => {
  it('lets the plain wheel scroll the page and zooms on Ctrl + wheel', () => {
    const chart = new Chart(host, { pageScroll: true });
    expect(chart.getPageScroll()).toBe(true);
    expect(wheel().defaultPrevented).toBe(false);
    expect(wheel({ ctrlKey: true }).defaultPrevented).toBe(true);
    chart.destroy();
  });

  it('is off by default and switches while running', () => {
    const chart = new Chart(host, {});
    expect(chart.getPageScroll()).toBe(false);
    expect(wheel().defaultPrevented).toBe(true);
    chart.setPageScroll(true);
    expect(wheel().defaultPrevented).toBe(false);
    chart.destroy();
  });
});

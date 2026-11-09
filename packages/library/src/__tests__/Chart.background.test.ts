// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

let host: HTMLDivElement;
let chart: Chart | undefined;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart?.destroy();
  chart = undefined;
  host.remove();
  vi.unstubAllGlobals();
});

// jsdom writes colours as rgb().
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};

describe('the chart’s background', () => {
  it('is the theme’s from the start, so a dark chart on a light page draws on dark', () => {
    chart = new Chart(host, { theme: 'dark' });
    expect(host.style.backgroundColor).toBe(rgb(DARK_THEME.background));
  });

  it('follows a theme set later', () => {
    chart = new Chart(host, { theme: 'dark' });
    chart.setTheme('light');
    expect(host.style.backgroundColor).toBe(rgb(LIGHT_THEME.background));
  });

  it('leaves a background the host gave its element', () => {
    host.style.backgroundColor = 'rgb(1, 2, 3)';
    chart = new Chart(host, { theme: 'dark' });
    expect(host.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });
});

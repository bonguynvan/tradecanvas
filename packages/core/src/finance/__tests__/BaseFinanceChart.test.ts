// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BaseFinanceChart } from '../BaseFinanceChart.js';

class Blank extends BaseFinanceChart {
  get surface(): HTMLCanvasElement {
    return this.canvas;
  }
  protected renderChart(): void {}
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a finance chart', () => {
  it('draws its text without the page’s OpenType features, and keeps the page’s figures', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
    const host = document.createElement('div');
    host.style.fontFeatureSettings = "'ss01', 'cv11'";
    document.body.appendChild(host);
    const chart = new Blank(host);
    expect(chart.surface.style.fontFeatureSettings).toBe('normal');
    expect(chart.surface.style.getPropertyValue('font-variant-numeric')).toBe('');
    chart.destroy();
  });
});

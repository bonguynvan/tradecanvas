// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CanvasLayer } from '../CanvasLayer.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('a chart layer', () => {
  it('draws its text without the page’s OpenType features, and keeps the page’s figures', () => {
    // jsdom has no 2D context; the layer only holds on to it.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
    const host = document.createElement('div');
    host.style.fontFeatureSettings = "'ss01', 'cv11'";
    document.body.appendChild(host);
    const layer = new CanvasLayer(host, 0);
    expect(layer.canvas.style.fontFeatureSettings).toBe('normal');
    // Tabular figures the page sets still reach the axes: the legend's columns are sized for them.
    expect(layer.canvas.style.getPropertyValue('font-variant-numeric')).toBe('');
  });
});

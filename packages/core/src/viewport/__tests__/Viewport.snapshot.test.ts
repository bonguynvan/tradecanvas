import { describe, it, expect } from 'vitest';
import { Viewport } from '../Viewport.js';

const bars = Array.from({ length: 300 }, (_, i) => ({ time: i * 60_000, open: 100 + i, high: 103 + i, low: 98 + i, close: 101 + i, volume: 10 }));

describe('a viewport put back as it was', () => {
  it('is the page’s again after a frame laid out at another size', () => {
    const viewport = new Viewport(800, 400);
    viewport.updateData(bars, true);
    viewport.zoomToBarRange(100, 179);
    viewport.setScaleMargins({ top: 0.2, bottom: 0.1 });
    viewport.fitToPrices(150, 320);
    const before = JSON.stringify(viewport.getState());
    const margins = viewport.getScaleMargins();
    const kept = viewport.snapshot();

    viewport.setPriceAxisWidth(96);
    viewport.setChartRect({ x: 40, y: 0, width: 1500, height: 820 });
    viewport.zoomToBarRange(0, 299);
    viewport.setScaleMargins({ top: 0.05, bottom: 0.05 });
    viewport.fitToPrices(1, 9);
    viewport.setLogScale(true);
    expect(JSON.stringify(viewport.getState())).not.toBe(before);

    viewport.restore(kept);
    expect(JSON.stringify(viewport.getState())).toBe(before);
    expect(viewport.getScaleMargins()).toEqual(margins);
    // Its own again, not the snapshot's: moving on from here leaves what was kept alone.
    viewport.scrollBy(120);
    viewport.restore(kept);
    expect(JSON.stringify(viewport.getState())).toBe(before);
    // The scale's width went back with it: a size taken now leaves the plot the page had.
    viewport.resize(800, 400);
    expect(viewport.getState().chartRect.width).toBe(JSON.parse(before).chartRect.width);
  });
});

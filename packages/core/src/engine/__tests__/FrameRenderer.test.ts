import { describe, it, expect, vi } from 'vitest';
import type { Theme, ViewportState } from '@tradecanvas/commons';
import { FrameRenderer } from '../RenderEngine.js';
import type { RenderContext } from '../RenderEngine.js';

/** A context that takes any call or assignment: no canvas behind it. */
function anyContext(): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = {};
  return new Proxy(store, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** A frame of a series, a grid, a crosshair and a legend, each saying what it drew on. */
function frameOf(width = 300, height = 200): { ctx: RenderContext; calls: [string, CanvasRenderingContext2D][] } {
  const calls: [string, CanvasRenderingContext2D][] = [];
  const says = (name: string) => (c: CanvasRenderingContext2D) => { calls.push([name, c]); };
  const none = null;
  const ctx: RenderContext = {
    chartRenderer: { render: says('series') } as unknown as RenderContext['chartRenderer'],
    gridRenderer: { isVisible: () => true, render: says('grid') } as unknown as RenderContext['gridRenderer'],
    priceAxis: none,
    timeAxis: none,
    crosshairHandler: { render: says('crosshair'), renderAxisLabels: () => {}, getPosition: () => null } as unknown as RenderContext['crosshairHandler'],
    indicatorEngine: none,
    drawingRenderer: none,
    tradingRenderer: none,
    currentPriceLine: none,
    chartLegend: none,
    volumeRenderer: { render: says('volume'), isVisible: () => true } as unknown as RenderContext['volumeRenderer'],
    volumeProfile: none,
    marketProfile: none,
    depthHeatmap: none,
    periodLevels: none,
    pivotMarkers: none,
    watermark: none,
    barCountdown: none,
    sessionBreaks: none,
    sessionShading: none,
    compareRenderer: none,
    alertManager: none,
    signalMarkerManager: none,
    measureOverlay: none,
    tradeZoneManager: none,
    panels: [],
    viewport: { chartRect: { x: 0, y: 0, width, height }, priceRange: { min: 0, max: 100 } } as unknown as ViewportState,
    theme: { font: { family: 'sans-serif', sizeSmall: 10 } } as unknown as Theme,
    data: [],
  };
  return { ctx, calls };
}

describe('a frame drawn on a context of the caller’s', () => {
  it('needs no page: there is none here', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const { ctx, calls } = frameOf();
    expect(() => new FrameRenderer().drawFrame(anyContext(), ctx)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it('draws the scene, then what follows the pointer, all on that context', () => {
    const { ctx, calls } = frameOf();
    const target = anyContext();
    new FrameRenderer().drawFrame(target, ctx);
    expect(calls.map(([name]) => name)).toEqual(['grid', 'volume', 'series', 'crosshair']);
    expect(calls.every(([, c]) => c === target)).toBe(true);
  });

  it('leaves the ground to the caller: it neither clears nor fills the context', () => {
    const { ctx } = frameOf();
    const cleared = vi.fn();
    const target = Object.assign(anyContext(), { clearRect: cleared });
    new FrameRenderer().drawFrame(target, ctx);
    expect(cleared).not.toHaveBeenCalled();
  });

  it('draws nothing for a plot of no size', () => {
    for (const [width, height] of [[0, 200], [300, 0], [-1, 10]]) {
      const { ctx, calls } = frameOf(width, height);
      new FrameRenderer().drawFrame(anyContext(), ctx);
      expect(calls).toEqual([]);
    }
  });
});

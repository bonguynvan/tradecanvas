// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import type { GpuFrame } from '../../engine/gpu.js';
import { gridLines } from '../../axis/gridLines.js';
import { WebGLSeriesRenderer } from '../WebGLSeriesRenderer.js';

/** A WebGL 2 context stand-in: records every call, answers what the renderer asks. */
function fakeGL(options: { compiles?: boolean } = {}) {
  const calls: { name: string; args: unknown[] }[] = [];
  let lost = false;
  const loseContext = vi.fn(() => { lost = true; });
  const constants = new Map<string, number>();
  const gl = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'isContextLost') return () => lost;
      if (prop === 'getExtension') return (name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null);
      if (prop === 'getParameter') return () => 'Fake GPU';
      if (prop === 'getShaderParameter') return () => options.compiles ?? true;
      if (prop === 'getProgramParameter') return () => true;
      if (prop === 'getShaderInfoLog' || prop === 'getProgramInfoLog') return () => 'bad shader';
      if (prop === 'getAttribLocation') return () => 0;
      if (prop === 'getUniformLocation') return (_p: unknown, name: string) => ({ name });
      if (prop.startsWith('create')) return () => ({});
      // GL enums: a number of their own each.
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) {
        if (!constants.has(prop)) constants.set(prop, constants.size + 1);
        return constants.get(prop);
      }
      return (...args: unknown[]) => { calls.push({ name: prop, args }); };
    },
  });
  const enumOf = (name: string) => constants.get(name);
  return { gl, calls, loseContext, lose: () => { lost = true; }, enumOf };
}

const bar = (i: number, close = 100 + (i % 7)): OHLCBar => ({ time: 1_700_000_000_000 + i * 60_000, open: close - 1, high: close + 2, low: close - 3, close, volume: 10 + i });
const series = (n: number) => Array.from({ length: n }, (_, i) => bar(i));

const viewport: ViewportState = {
  chartRect: { x: 0, y: 10, width: 90, height: 40 },
  priceRange: { min: 90, max: 130 },
  barWidth: 3,
  barSpacing: 1,
  offset: 0,
  visibleRange: { from: 0, to: 19 },
};

function frame(over: Partial<GpuFrame> = {}): GpuFrame {
  return {
    data: series(20),
    viewport,
    theme: DARK_THEME,
    dpr: 2,
    candles: true,
    volume: { heightRatio: 0.15 },
    background: { grid: true, rects: [{ x: 40, y: 10, width: 1, height: 40, color: '#808080', alpha: 0.5, dash: [6, 4] }] },
    ...over,
  };
}

let fake: ReturnType<typeof fakeGL>;

function makeRenderer(options?: { compiles?: boolean }) {
  fake = fakeGL(options);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string) {
    return (type === 'webgl2' ? fake.gl : null) as never;
  } as never);
  const r = WebGLSeriesRenderer.create();
  if (r) {
    r.canvas.width = 180;
    r.canvas.height = 120;
    document.body.appendChild(r.canvas);
  }
  return r;
}

const named = (name: string) => fake.calls.filter((c) => c.name === name);

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('WebGLSeriesRenderer', () => {
  it('reports what it drew', () => {
    const r = makeRenderer()!;
    expect(r.label).toBe('Fake GPU');
    expect(r.render(frame())).toEqual({ series: true, volume: true, background: true });
    expect(r.render(frame({ candles: false, volume: null, background: null }))).toEqual({ series: false, volume: false, background: false });
  });

  it('draws the grid, the other rectangles, the volume, then the candles: a call each', () => {
    const r = makeRenderer()!;
    r.render(frame());
    const lines = gridLines(viewport);
    const draws = named('drawArraysInstanced').map((c) => [c.args[2], c.args[3]]);
    // Vertices per instance, instances: 6 per rectangle or volume bar, 12 per candle (wick, body).
    expect(draws).toEqual([[6, lines.horizontal.length + lines.vertical.length], [6, 1], [6, 20], [12, 20]]);
  });

  it('clears with the scissor off, then clips the bars to the plot in device pixels counted from the bottom', () => {
    const r = makeRenderer()!;
    r.render(frame());
    const order = fake.calls.map((c) => c.name);
    const scissorOff = fake.calls.findIndex((c) => c.name === 'disable' && c.args[0] === fake.enumOf('SCISSOR_TEST'));
    expect(scissorOff).toBeGreaterThanOrEqual(0);
    expect(scissorOff).toBeLessThan(order.indexOf('clear'));
    // The plot: y 10..50 at 2x is rows 20..100 of 120, so 20 up from the bottom.
    expect(named('scissor')[0].args).toEqual([0, 20, 180, 80]);
  });

  it('uploads only the bar that ticked', () => {
    const r = makeRenderer()!;
    const data = series(20);
    r.render(frame({ data }));
    expect(named('bufferSubData')).toHaveLength(0);
    data[19] = { ...data[19], close: 105, high: 110 };
    r.render(frame({ data }));
    const sub = named('bufferSubData');
    expect(sub).toHaveLength(1);
    // Byte offset of bar 19 (six floats a bar).
    expect(sub[0].args[1]).toBe(19 * 6 * 4);
  });

  it('dashes a rectangle on its own attribute, after the colour', () => {
    const r = makeRenderer()!;
    r.render(frame({ background: { grid: false, rects: [{ x: 1, y: 2, width: 3, height: 4, color: '#ff0000', alpha: 0.5, dash: [6, 4] }] }, candles: false, volume: null }));
    const upload = named('bufferData').find((c) => c.args[2] === fake.enumOf('STREAM_DRAW'));
    // Left, top, right, bottom, red at half strength (premultiplied), dash 6 on 4 off.
    expect([...(upload!.args[1] as Float32Array)]).toEqual([1, 2, 4, 6, 0.5, 0, 0, 0.5, 6, 4]);
  });

  it('draws nothing once the context is lost', () => {
    const r = makeRenderer()!;
    fake.lose();
    fake.calls.length = 0;
    expect(r.render(frame())).toEqual({ series: false, volume: false, background: false });
    expect(named('drawArraysInstanced')).toHaveLength(0);
  });

  it('says once when the context is lost, and soon when it was lost before anyone asked', async () => {
    const r = makeRenderer()!;
    const lost = vi.fn();
    r.onLost(lost);
    const event = new Event('webglcontextlost', { cancelable: true });
    r.canvas.dispatchEvent(event);
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(lost).toHaveBeenCalledTimes(1);
    // Cancelled, so the browser may hand the context back.
    expect(event.defaultPrevented).toBe(true);

    const early = makeRenderer()!;
    fake.lose();
    const late = vi.fn();
    early.onLost(late);
    expect(late).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('hands the context back on destroy and leaves the page', () => {
    const r = makeRenderer()!;
    const lost = vi.fn();
    r.onLost(lost);
    r.destroy();
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
    expect(r.canvas.isConnected).toBe(false);
    // Its own loss, asked for, is no news.
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(lost).not.toHaveBeenCalled();
  });

  it('gives no renderer, a warning and the context back when a shader will not compile', () => {
    const r = makeRenderer({ compiles: false });
    expect(r).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WebGL'), expect.any(Error));
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
  });

  it('gives no renderer, quietly, where there is no WebGL 2', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(WebGLSeriesRenderer.create()).toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
  });
});

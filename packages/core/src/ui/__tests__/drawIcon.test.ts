import { describe, it, expect, vi, afterEach } from 'vitest';
import { UI_ICONS } from '@tradecanvas/commons';
import { drawIcon } from '../drawIcon.js';

class FakePath { constructor(public d?: string) {} }

afterEach(() => vi.unstubAllGlobals());

function recorder() {
  const calls: string[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get: (t, p) => {
      if (p === 'stroke') return (path?: FakePath) => calls.push(`stroke ${path?.d ?? ''} w${t.lineWidth} ${t.lineCap}/${t.lineJoin} ${t.strokeStyle}`);
      if (p === 'fill') return (path?: FakePath) => calls.push(`fill ${path?.d ?? 'arc'} ${t.fillStyle}`);
      if (p === 'scale') return (sx: number) => calls.push(`scale ${sx}`);
      if (p === 'translate') return (x: number, y: number) => calls.push(`translate ${x},${y}`);
      if (p === 'setLineDash') return (d: number[]) => calls.push(`dash ${d.join(',')}`);
      if (p === 'arc') return (x: number, y: number, r: number) => calls.push(`arc ${x},${y},${r}`);
      return p in t ? t[p as string] : () => {};
    },
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('drawIcon', () => {
  it('strokes the icon on its 24 px grid at the size asked, as the SVG does', () => {
    vi.stubGlobal('Path2D', FakePath);
    const { ctx, calls } = recorder();
    drawIcon(ctx, UI_ICONS.bell, 10, 20, 24, '#4c8dff');
    expect(calls).toContain('translate 10,20');
    expect(calls).toContain('scale 1');
    expect(calls).toContain(`stroke ${UI_ICONS.bell.d} w1.75 round/round #4c8dff`);
  });

  it('sits on whole pixels with strokes no thinner than one, at label sizes', () => {
    vi.stubGlobal('Path2D', FakePath);
    const { ctx, calls } = recorder();
    drawIcon(ctx, UI_ICONS.bell, 10.4, 19.6, 12, 'red');
    expect(calls).toContain('translate 10,20');
    expect(calls).toContain('scale 0.5');
    // 2 on the 24 px grid, at half scale: one pixel.
    expect(calls).toContain(`stroke ${UI_ICONS.bell.d} w2 round/round red`);
  });

  it('draws fills, dashes and dots too', () => {
    vi.stubGlobal('Path2D', FakePath);
    const { ctx, calls } = recorder();
    drawIcon(ctx, UI_ICONS.info, 0, 0, 24, 'red');
    expect(calls.some((c) => c.startsWith('arc 12,7.75,1.25'))).toBe(true);
    expect(calls).toContain('fill arc red');
  });

  it('draws nothing where there is no Path2D', () => {
    vi.stubGlobal('Path2D', undefined);
    const { ctx, calls } = recorder();
    drawIcon(ctx, UI_ICONS.bell, 0, 0, 12, 'red');
    expect(calls).toEqual([]);
  });
});

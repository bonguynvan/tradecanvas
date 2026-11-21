import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IconDef } from '@tradecanvas/commons';
import { drawIcon } from '../drawIcon.js';

/** A context that keeps the paths it is asked to stroke or fill. */
function context() {
  const drawn: unknown[] = [];
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get: (_target, prop) => (prop === 'stroke' || prop === 'fill' ? (path: unknown) => void drawn.push(path) : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

const icon: IconDef = { d: 'M2 2L20 20', fills: ['M4 4h4v4h-4z'] };

describe('an icon’s paths, where the Path2D there is changes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('are built by the Path2D of the time: a chart drawn with no page is given its canvas library’s', () => {
    class First {
      constructor(readonly d: string) {}
    }
    class Second {
      constructor(readonly d: string) {}
    }
    vi.stubGlobal('Path2D', First);
    const one = context();
    drawIcon(one.ctx, icon, 0, 0, 16, '#fff');
    drawIcon(one.ctx, icon, 0, 0, 16, '#fff');
    expect(one.drawn.length).toBeGreaterThan(0);
    expect(one.drawn.every((path) => path instanceof First)).toBe(true);
    // Built once for a Path2D, not once a draw.
    expect(new Set(one.drawn).size).toBe(one.drawn.length / 2);

    vi.stubGlobal('Path2D', Second);
    const other = context();
    drawIcon(other.ctx, icon, 0, 0, 16, '#fff');
    expect(other.drawn.length).toBeGreaterThan(0);
    expect(other.drawn.every((path) => path instanceof Second)).toBe(true);
  });
});

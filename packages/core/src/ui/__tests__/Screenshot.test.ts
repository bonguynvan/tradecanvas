// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screenshot } from '../Screenshot.js';

/** A container holding one layer canvas of `w`×`h` pixels per z-index in `zs`. */
function layers(zs: number[], w = 300, h = 150): HTMLDivElement {
  const host = document.createElement('div');
  for (const z of zs) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.zIndex = String(z);
    canvas.dataset.z = String(z);
    host.appendChild(canvas);
  }
  return host;
}

/** jsdom has no 2D context: one per canvas that records what is drawn on it. */
function recordDrawing(): { drawn: string[]; filled: string[] } {
  const drawn: string[] = [];
  const filled: string[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    const ctx = {
      fillStyle: '',
      fillRect: () => { filled.push(String(ctx.fillStyle)); },
      drawImage: (src: HTMLCanvasElement) => { drawn.push(src.dataset.z ?? '?'); },
    };
    return ctx as never;
  });
  return { drawn, filled };
}

/** As Chrome does under `connect-src 'self'`: a fetch of a data: URL fails. */
function refuseFetch(): ReturnType<typeof vi.fn> {
  const fetchSpy = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Screenshot.toBlob', () => {
  it('encodes the PNG on the canvas, without fetching a data: URL a CSP connect-src would refuse', async () => {
    recordDrawing();
    const fetchSpy = refuseFetch();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => { cb(png); });

    const blob = await Screenshot.toBlob(layers([0, 1]), '#101010');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(blob).toBe(png);
    expect(toBlob.mock.calls[0][1]).toBe('image/png');
  });

  it('draws the layers, lowest first, over the background before it returns', () => {
    const { drawn, filled } = recordDrawing();
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    void Screenshot.toBlob(layers([1, 0, 0]), '#101010');

    // Already drawn, not awaited: the GPU canvas is cleared once its frame is shown.
    expect(filled).toEqual(['#101010']);
    expect(drawn).toEqual(['0', '0', '1']);
  });

  it('gives null when the canvas has nothing to encode', async () => {
    recordDrawing();
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => { cb(null); });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:,');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob([]))));

    expect(await Screenshot.toBlob(layers([0], 0, 0))).toBeNull();
    expect(await Screenshot.toBlob(document.createElement('div'))).toBeNull();
  });

  it('reports a canvas it cannot read as a rejection, not a synchronous throw', async () => {
    const fetchSpy = refuseFetch();
    // No 2D context for the composite: jsdom without canvas, or a browser out of canvas memory.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    let pending: Promise<Blob | null> | undefined;
    expect(() => { pending = Screenshot.toBlob(layers([0], 10, 10), '#000'); }).not.toThrow();

    await expect(pending).rejects.toBeInstanceOf(TypeError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

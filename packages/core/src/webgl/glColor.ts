/** A colour as WebGL takes it: red, green, blue, alpha, each 0 to 1. */
export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();
let probe: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;

function channel(v: string, max: number): number {
  return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / max;
}

function fromText(text: string): RGBA | null {
  const c = text.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
  }
  const fn = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(c);
  if (fn) {
    return [channel(fn[1], 255), channel(fn[2], 255), channel(fn[3], 255), fn[4] === undefined ? 1 : channel(fn[4], 1)];
  }
  return null;
}

/** A 2D context to let the browser read any CSS colour (names, hsl()…). */
function browserProbe(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  if (probe !== undefined) return probe;
  try {
    if (typeof OffscreenCanvas !== 'undefined') probe = new OffscreenCanvas(1, 1).getContext('2d');
    else if (typeof document !== 'undefined') probe = document.createElement('canvas').getContext('2d');
    else probe = null;
  } catch {
    probe = null;
  }
  return probe;
}

/**
 * Any CSS colour the chart's themes use, for WebGL. Hex and rgb() are read
 * directly; anything else goes through the browser's own parser. Unreadable
 * colours come back transparent.
 */
export function parseColor(color: string): RGBA {
  const hit = cache.get(color);
  if (hit) return hit;
  let rgba = fromText(color);
  if (!rgba) {
    const ctx = browserProbe();
    if (ctx) {
      ctx.fillStyle = '#00000000';
      ctx.fillStyle = color;
      rgba = fromText(String(ctx.fillStyle));
    }
  }
  const out: RGBA = rgba ?? [0, 0, 0, 0];
  if (cache.size > 256) cache.clear();
  cache.set(color, out);
  return out;
}

/** The colour multiplied by its alpha, the form the canvas blends in. */
export function premultiplied([r, g, b, a]: RGBA): RGBA {
  return [r * a, g * a, b * a, a];
}

export function hexToRgba(hex: string, alpha = 1): string {
  // #rgb and #rgba are short for #rrggbb and #rrggbbaa; a hex alpha gives way to `alpha`.
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * `color` at `alpha`: hex (#rgb, #rgba, #rrggbb, #rrggbbaa) and rgb()/rgba()
 * with commas or spaces. Any other colour (a name, hsl()) comes back as it is.
 */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c)) {
    return hexToRgba(c, alpha);
  }
  const rgb = c.match(/^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }
  return color;
}

/** A colour's channels (0-255) and alpha (0-1). */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Decimals an alpha is written with: finer than a screen's 8 bits. */
const ALPHA_DECIMALS = 3;

/** Hex (#rgb, #rgba, #rrggbb, #rrggbbaa) or rgb()/rgba() with commas or spaces; null for any other colour. */
function parseColor(color: string): Rgba | null {
  const c = color.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((d) => d + d).join('');
    const at = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: at(0), g: at(2), b: at(4), a: h.length === 8 ? at(6) / 255 : 1 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/i.exec(c);
  if (!rgb) return null;
  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1);
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: Math.min(1, Math.max(0, alpha)) };
}

/**
 * The colour `t` of the way from `colorA` to `colorB` (0 to 1), each hex or
 * rgb()/rgba(): `rgb(r,g,b)`, or `rgba(…)` when either is see-through. The
 * alpha is mixed as `color-mix` mixes it, weighting each colour by its own,
 * so a fade toward a see-through colour (a panel's faint surface) keeps the
 * hue of the other instead of washing toward the surface's. A colour it can't
 * read (a name, hsl()) comes back as it is, from the end `t` is nearer.
 */
export function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  if (!a || !b) return t < 0.5 ? colorA : colorB;
  const alpha = a.a + (b.a - a.a) * t;
  // Each channel weighted by its colour's alpha, then the mix's taken out again.
  const channel = (x: number, y: number) => (alpha === 0 ? 0 : Math.round((x * a.a + (y * b.a - x * a.a) * t) / alpha));
  const rgb = `${channel(a.r, b.r)},${channel(a.g, b.g)},${channel(a.b, b.b)}`;
  return alpha >= 1 ? `rgb(${rgb})` : `rgba(${rgb},${Number(alpha.toFixed(ALPHA_DECIMALS))})`;
}

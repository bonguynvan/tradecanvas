/** The longest address taken, and the longest image written in a `data:` one. */
const MAX_ADDRESS = 2048;
const MAX_DATA = 65_536;
/** The images a `data:` address may be; a page written in `data:` is none of them. */
const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,]/i;
const PROTOCOLS = new Set(['https:', 'http:', 'blob:']);

const pageBase = (): string | undefined => (typeof document === 'undefined' ? undefined : document.baseURI);

/**
 * The address to load a picture from (a symbol's logo, a heatmap cell's), or
 * null for one that must not be loaded. It is only ever an image's source, so
 * markup in it is a path that finds nothing; the scheme still has to be one
 * for images, which keeps out `javascript:` and pages written in `data:`. A
 * path is read against `base` (the page's own address).
 */
export function imageAddress(raw: unknown, base: string | undefined = pageBase()): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  // One longer than any taken is refused before it is parsed: it may be asked of on every keystroke, or every frame.
  if (!text || text.length > MAX_DATA) return null;
  let url: URL;
  try {
    url = new URL(text, base);
  } catch {
    return null;
  }
  if (url.protocol === 'data:') return DATA_IMAGE.test(url.href) && url.href.length <= MAX_DATA ? url.href : null;
  return PROTOCOLS.has(url.protocol) && url.href.length <= MAX_ADDRESS ? url.href : null;
}

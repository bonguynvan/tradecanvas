import { imageAddress } from '../ui/imageAddress.js';

/** A picture ready to be drawn, and its own size. */
export interface CellImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

/** How many pictures are kept or on their way at once: more than a large market map has cells. */
const IMAGES_KEPT = 600;
/** How many addresses, and how many failures, are remembered before the store starts again. */
const ADDRESSES_KEPT = 2000;
/** Each side of a picture that says no size of its own (an SVG may not): it is taken as a square. */
const UNKNOWN_SIDE = 1;
/** An address a picture is fetched from, on this site or another. */
const FETCHED = /^https?:/i;

/**
 * Pictures loaded by their address, each once: a chart asks for one while it
 * draws, gets none until it has come, and is told when it has, to draw again.
 * One that fails is remembered and not asked for again.
 *
 * A picture is asked for as one the page may read (`crossOrigin`), so a chart
 * that has drawn it can still be saved as a picture itself: a canvas that
 * holds a picture the page may not read can never be read again. One from
 * another site that does not allow this is not loaded. Its host is told
 * nothing of the page it is shown on (no referrer).
 */
export class ImageStore {
  /** An address as it was given, and what it comes to (null: one that must not be loaded): read once. */
  private readonly addresses = new Map<string, string | null>();
  private readonly loading = new Map<string, HTMLImageElement>();
  private readonly ready = new Map<string, CellImage>();
  private readonly failed = new Set<string>();
  private destroyed = false;

  constructor(private readonly onLoad: () => void, private readonly limit = IMAGES_KEPT) {}

  /** The picture at `address` once it has come; null until then, and for one that failed or must not be loaded. Asking starts it loading. */
  get(address: string | undefined): CellImage | null {
    if (this.destroyed || !address) return null;
    let src = this.addresses.get(address);
    if (src === undefined) {
      if (this.addresses.size >= ADDRESSES_KEPT) this.addresses.clear();
      src = imageAddress(address);
      this.addresses.set(address, src);
    }
    if (src === null || this.failed.has(src)) return null;
    const have = this.ready.get(src);
    if (have) return have;
    if (!this.loading.has(src)) this.load(src);
    return null;
  }

  /** Lets go of every picture: one still on its way says nothing when it comes. */
  destroy(): void {
    this.destroyed = true;
    for (const image of this.loading.values()) {
      image.onload = null;
      image.onerror = null;
    }
    this.loading.clear();
    this.ready.clear();
    this.failed.clear();
    this.addresses.clear();
  }

  private load(src: string): void {
    // Where there is no page there are no pictures to load.
    if (typeof Image === 'undefined') return;
    if (this.loading.size + this.ready.size >= this.limit) return;
    const image = new Image();
    // One written into the address itself, or made by the page (`data:`, `blob:`), is the page's own to read.
    if (FETCHED.test(src)) image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    image.onload = () => {
      this.loading.delete(src);
      if (this.destroyed) return;
      const sized = image.naturalWidth > 0 && image.naturalHeight > 0;
      this.ready.set(src, {
        source: image,
        width: sized ? image.naturalWidth : UNKNOWN_SIDE,
        height: sized ? image.naturalHeight : UNKNOWN_SIDE,
      });
      this.onLoad();
    };
    image.onerror = () => {
      this.loading.delete(src);
      if (this.failed.size >= ADDRESSES_KEPT) this.failed.clear();
      this.failed.add(src);
    };
    this.loading.set(src, image);
    image.src = src;
  }
}

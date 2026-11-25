import { canvasReadable } from '../ui/chartImage.js';
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
/** How long a picture that failed is left alone before it is asked for again: its site may have been away for a moment. */
const RETRY_AFTER_MS = 60_000;
/** Each side of a picture that says no size of its own (an SVG may not): it is taken as a square. */
const UNKNOWN_SIDE = 1;
/** An address a picture is fetched from, on this site or another. */
const FETCHED = /^https?:/i;

/**
 * Pictures loaded by their address, each once: a chart asks for one while it
 * draws, gets none until it has come, and is told when it has, to draw again.
 * One that fails is left alone for a minute, then asked for again when it is
 * next wanted. A chart whose data changes says which pictures it still has
 * (`keep`), and the others are let go.
 *
 * A picture is asked for as one the page may read (`crossOrigin`), so a chart
 * that has drawn it can still be saved as a picture itself: a canvas that
 * holds a picture the page may not read can never be read again. One from
 * another site that does not allow this is not loaded, and one that would
 * spoil a canvas all the same (it is tried on a canvas of its own first) is
 * not given. Its host is told nothing of the page it is shown on (no
 * referrer).
 */
export class ImageStore {
  /** An address as it was given, and what it comes to (null: one that must not be loaded): read once. */
  private readonly addresses = new Map<string, string | null>();
  private readonly loading = new Map<string, HTMLImageElement>();
  private readonly ready = new Map<string, CellImage>();
  /** The pictures that failed, and when. */
  private readonly failed = new Map<string, number>();
  private destroyed = false;

  constructor(private readonly onLoad: () => void, private readonly limit = IMAGES_KEPT) {}

  /** The picture at `address` once it has come; null until then, and for one that failed or must not be loaded. Asking starts it loading. */
  get(address: string | undefined): CellImage | null {
    if (this.destroyed || !address) return null;
    const src = this.resolve(address);
    if (src === null) return null;
    const have = this.ready.get(src);
    if (have) return have;
    const failedAt = this.failed.get(src);
    if (failedAt !== undefined) {
      if (Date.now() - failedAt < RETRY_AFTER_MS) return null;
      this.failed.delete(src);
    }
    if (!this.loading.has(src)) this.load(src);
    return null;
  }

  /**
   * Keep only the pictures at `addresses` (those of a chart's data as it now
   * is): the others are let go, come or on their way, and what failed among
   * them is forgotten. The room they took is free for the new data's.
   */
  keep(addresses: Iterable<string | undefined>): void {
    const wanted = new Set<string>();
    for (const address of addresses) {
      const src = address ? this.resolve(address) : null;
      if (src !== null) wanted.add(src);
    }
    for (const src of [...this.ready.keys()]) if (!wanted.has(src)) this.ready.delete(src);
    for (const src of [...this.failed.keys()]) if (!wanted.has(src)) this.failed.delete(src);
    for (const [src, image] of [...this.loading]) {
      if (wanted.has(src)) continue;
      image.onload = null;
      image.onerror = null;
      this.loading.delete(src);
    }
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

  /** The address a picture is loaded from, read once for each address given; null for one that must not be loaded. */
  private resolve(address: string): string | null {
    let src = this.addresses.get(address);
    if (src === undefined) {
      if (this.addresses.size >= ADDRESSES_KEPT) this.addresses.clear();
      src = imageAddress(address);
      this.addresses.set(address, src);
    }
    return src;
  }

  private fail(src: string): void {
    if (this.failed.size >= ADDRESSES_KEPT) this.failed.clear();
    this.failed.set(src, Date.now());
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
      // Tried on a canvas of its own: one the page may not read after it is not drawn on a chart.
      if (!canvasReadable(image)) {
        this.fail(src);
        return;
      }
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
      this.fail(src);
    };
    this.loading.set(src, image);
    image.src = src;
  }
}

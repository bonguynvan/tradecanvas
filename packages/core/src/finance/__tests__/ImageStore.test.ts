// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageStore } from '../ImageStore.js';
import { imageAddress } from '../../ui/imageAddress.js';

/** A stand-in for the browser's Image: it keeps what it was asked, and comes or fails when told to. */
class FakeImage {
  static made: FakeImage[] = [];
  src = '';
  crossOrigin: string | null = null;
  referrerPolicy = '';
  decoding = '';
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeImage.made.push(this);
  }
  come(width = 48, height = 48): void {
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.onload?.();
  }
  fail(): void {
    this.onerror?.();
  }
}

/** Whether the page may read a canvas a picture was drawn on: false for one that spoils it. */
let readable = true;

beforeEach(() => {
  FakeImage.made = [];
  readable = true;
  vi.stubGlobal('Image', FakeImage);
  // The one-pixel canvas a picture is tried on.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    drawImage: () => {},
    getImageData: () => {
      if (!readable) throw new Error('The canvas has been tainted');
      return {};
    },
  }) as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('pictures loaded by their address', () => {
  it('asks for a picture once, gives none until it has come, then gives it with its size and says so', () => {
    const told = vi.fn();
    const store = new ImageStore(told);
    expect(store.get('https://cdn.example/a.png')).toBeNull();
    expect(store.get('https://cdn.example/a.png')).toBeNull();
    expect(FakeImage.made).toHaveLength(1);
    expect(FakeImage.made[0].src).toBe('https://cdn.example/a.png');
    FakeImage.made[0].come(96, 48);
    expect(told).toHaveBeenCalledTimes(1);
    expect(store.get('https://cdn.example/a.png')).toEqual({ source: FakeImage.made[0], width: 96, height: 48 });
    expect(FakeImage.made).toHaveLength(1);
  });

  it('asks so that the chart’s own picture can still be saved, and tells the picture’s host nothing of the page', () => {
    new ImageStore(() => {}).get('https://cdn.example/a.png');
    expect(FakeImage.made[0].crossOrigin).toBe('anonymous');
    expect(FakeImage.made[0].referrerPolicy).toBe('no-referrer');
  });

  it('asks for a picture written into its address, or made by the page, as it is: it is the page’s own to read', () => {
    const store = new ImageStore(() => {});
    store.get('data:image/png;base64,AAAA');
    store.get('blob:https://app.example/1');
    expect(FakeImage.made.map((image) => image.crossOrigin)).toEqual([null, null]);
  });

  it('remembers a picture that failed, and does not ask for it again', () => {
    const told = vi.fn();
    const store = new ImageStore(told);
    store.get('https://cdn.example/gone.png');
    FakeImage.made[0].fail();
    expect(store.get('https://cdn.example/gone.png')).toBeNull();
    expect(FakeImage.made).toHaveLength(1);
    expect(told).not.toHaveBeenCalled();
  });

  it('asks again for a picture that failed once a minute has gone by', () => {
    vi.useFakeTimers();
    const store = new ImageStore(() => {});
    store.get('https://cdn.example/a.png');
    FakeImage.made[0].fail();
    vi.advanceTimersByTime(59_000);
    store.get('https://cdn.example/a.png');
    expect(FakeImage.made).toHaveLength(1);
    vi.advanceTimersByTime(2_000);
    expect(store.get('https://cdn.example/a.png')).toBeNull();
    expect(FakeImage.made).toHaveLength(2);
    FakeImage.made[1].come();
    expect(store.get('https://cdn.example/a.png')).not.toBeNull();
  });

  it('gives no picture that would spoil the canvas it is drawn on: the chart could not be saved after it', () => {
    const told = vi.fn();
    const store = new ImageStore(told);
    store.get('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E');
    readable = false;
    FakeImage.made[0].come();
    expect(told).not.toHaveBeenCalled();
    expect(store.get('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E')).toBeNull();
    expect(FakeImage.made).toHaveLength(1);
  });

  it('keeps only the pictures of the data it is told of: the others are let go, on their way or come', () => {
    const told = vi.fn();
    const store = new ImageStore(told);
    for (const name of ['a', 'b', 'c', 'd']) store.get(`https://cdn.example/${name}.png`);
    const [a, b, c, d] = FakeImage.made;
    a.come();
    b.come();
    d.fail();
    expect(told).toHaveBeenCalledTimes(2);
    store.keep(['https://cdn.example/a.png', undefined, 'not an address:']);
    // The one kept is still here; the one that had come is asked for again; the one on its way says nothing now.
    expect(store.get('https://cdn.example/a.png')).not.toBeNull();
    expect(store.get('https://cdn.example/b.png')).toBeNull();
    expect(FakeImage.made).toHaveLength(5);
    c.come();
    expect(told).toHaveBeenCalledTimes(2);
    // A failure of data that is gone is forgotten with it.
    store.get('https://cdn.example/d.png');
    expect(FakeImage.made).toHaveLength(6);
  });

  it('has room again for new pictures once it is told the old data is gone', () => {
    const store = new ImageStore(() => {}, 2);
    store.get('https://cdn.example/a.png');
    store.get('https://cdn.example/b.png');
    FakeImage.made[0].come();
    FakeImage.made[1].come();
    store.get('https://cdn.example/c.png');
    expect(FakeImage.made).toHaveLength(2);
    store.keep(['https://cdn.example/c.png']);
    store.get('https://cdn.example/c.png');
    expect(FakeImage.made).toHaveLength(3);
  });

  it('takes a picture that says no size as a square', () => {
    const store = new ImageStore(() => {});
    store.get('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E');
    FakeImage.made[0].come(0, 0);
    const got = store.get('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E')!;
    expect(got.width).toBe(got.height);
    expect(got.width).toBeGreaterThan(0);
  });

  it('asks for nothing at an address that is no image’s, or none at all', () => {
    const store = new ImageStore(() => {});
    expect(store.get('javascript:alert(1)')).toBeNull();
    expect(store.get('data:text/html,<script>1</script>')).toBeNull();
    expect(store.get('')).toBeNull();
    expect(store.get(undefined)).toBeNull();
    expect(FakeImage.made).toEqual([]);
  });

  it('says nothing of a picture that comes after it was destroyed, and asks for no more', () => {
    const told = vi.fn();
    const store = new ImageStore(told);
    store.get('https://cdn.example/a.png');
    const asked = FakeImage.made[0];
    store.destroy();
    asked.come();
    expect(told).not.toHaveBeenCalled();
    expect(store.get('https://cdn.example/b.png')).toBeNull();
    expect(FakeImage.made).toHaveLength(1);
  });

  it('gives none where there is no page to load pictures on', () => {
    vi.stubGlobal('Image', undefined);
    const store = new ImageStore(() => {});
    expect(store.get('https://cdn.example/a.png')).toBeNull();
  });

  it('keeps no more pictures than a large map has cells: past that it asks for no new one', () => {
    const store = new ImageStore(() => {}, 3);
    for (const name of ['a', 'b', 'c', 'd', 'e']) store.get(`https://cdn.example/${name}.png`);
    expect(FakeImage.made).toHaveLength(3);
    // One that failed gives its place up.
    FakeImage.made[0].fail();
    store.get('https://cdn.example/d.png');
    expect(FakeImage.made).toHaveLength(4);
  });
});

describe('the address a picture may be loaded from', () => {
  const base = 'https://app.example/charts/';

  it('is an http(s) address, a path on the page’s own site, a blob, or an image written in data', () => {
    expect(imageAddress('https://cdn.example/a.png', base)).toBe('https://cdn.example/a.png');
    expect(imageAddress(' /logos/a.svg ', base)).toBe('https://app.example/logos/a.svg');
    expect(imageAddress('blob:https://app.example/1', base)).toBe('blob:https://app.example/1');
    expect(imageAddress('data:image/png;base64,AAAA', base)).toBe('data:image/png;base64,AAAA');
  });

  it('is none for a script, a page written in data, or what is no text', () => {
    expect(imageAddress('javascript:alert(1)', base)).toBeNull();
    expect(imageAddress('data:text/html,<b>x</b>', base)).toBeNull();
    expect(imageAddress(42, base)).toBeNull();
    expect(imageAddress('', base)).toBeNull();
  });
});

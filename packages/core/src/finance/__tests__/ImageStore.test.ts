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

beforeEach(() => {
  FakeImage.made = [];
  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
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

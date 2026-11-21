// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, canvasBlob, canvasDataURL, canvasPdfImage, canvasesToPdf, copyImage, downloadImage, imageFileName, imageRatio, printCanvas } from '../chartImage.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** A canvas of a size, whose encoders are stand-ins that say what they were asked. */
function canvasOf(width: number, height: number): HTMLCanvasElement & { asked: unknown[][] } {
  const canvas = Object.assign(document.createElement('canvas'), { asked: [] as unknown[][] });
  canvas.width = width;
  canvas.height = height;
  canvas.toDataURL = (...args: unknown[]) => {
    canvas.asked.push(args);
    return `data:${String(args[0] ?? 'image/png')};base64,AAAA`;
  };
  canvas.toBlob = (done: BlobCallback, ...args: unknown[]) => {
    canvas.asked.push(args);
    done(new Blob(['x'], { type: String(args[0] ?? 'image/png') }));
  };
  return canvas;
}

describe('how many pixels a picture has to one of the chart’s', () => {
  it('is what is asked for, the fallback with nothing asked, and never under a pixel', () => {
    expect(imageRatio(800, 400, 3, 1)).toBe(3);
    expect(imageRatio(800, 400, undefined, 2)).toBe(2);
    expect(imageRatio(800, 400, Number.NaN, 1.5)).toBe(1.5);
    expect(imageRatio(800, 400, -2, 1.5)).toBe(1.5);
    expect(imageRatio(800, 400, 0, 1.5)).toBe(1.5);
    expect(imageRatio(800, 400, 0.25, 1)).toBe(0.25);
  });

  it('is held to what a browser can draw: no side too long, no more pixels than it has room for', () => {
    const long = imageRatio(10_000, 100, 4, 1);
    expect(10_000 * long).toBeLessThanOrEqual(MAX_IMAGE_SIDE);
    expect(long).toBeCloseTo(MAX_IMAGE_SIDE / 10_000, 9);
    const large = imageRatio(2560, 1440, 3, 1);
    expect(2560 * large * 1440 * large).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
    expect(large).toBeGreaterThan(2);
    expect(large).toBeLessThan(3);
    // A chart with no size gives no ratio to divide by.
    expect(imageRatio(0, 0, 2, 1)).toBe(2);
  });
});

describe('a canvas as a picture', () => {
  it('is a PNG when nothing says, a JPEG or a WebP with how much they keep', () => {
    const canvas = canvasOf(8, 4);
    expect(canvasDataURL(canvas)).toBe('data:image/png;base64,AAAA');
    expect(canvasDataURL(canvas, { type: 'jpeg', quality: 0.8 })).toBe('data:image/jpeg;base64,AAAA');
    canvasDataURL(canvas, { type: 'webp' });
    canvasDataURL(canvas, { type: 'jpeg', quality: 7 });
    canvasDataURL(canvas, { type: 'jpeg', quality: Number.NaN });
    expect(canvas.asked).toEqual([['image/png', undefined], ['image/jpeg', 0.8], ['image/webp', 0.92], ['image/jpeg', 1], ['image/jpeg', 0.92]]);
  });

  it('is a file’s bytes, in the format asked for', async () => {
    const canvas = canvasOf(8, 4);
    expect((await canvasBlob(canvas))?.type).toBe('image/png');
    expect((await canvasBlob(canvas, { type: 'webp', quality: 0.5 }))?.type).toBe('image/webp');
    expect(canvas.asked).toEqual([['image/png', undefined], ['image/webp', 0.5]]);
  });

  it('has a file name that ends as its format does', () => {
    expect(imageFileName(undefined, 'png')).toBe('chart.png');
    expect(imageFileName(undefined, 'jpeg')).toBe('chart.jpg');
    expect(imageFileName('equity', 'webp')).toBe('equity.webp');
    expect(imageFileName('equity.png', 'png')).toBe('equity.png');
    // A name that already says a format keeps it: the caller chose it.
    expect(imageFileName('report.final.jpeg', 'png')).toBe('report.final.jpeg');
    expect(imageFileName('', 'png')).toBe('chart.png');
    expect(imageFileName('equity', 'pdf')).toBe('equity.pdf');
  });

  it('is saved by a link the page never shows', () => {
    const clicked: { href: string; download: string; inPage: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, inPage: document.body.contains(this) });
    });
    downloadImage('data:image/png;base64,AAAA', 'equity.png');
    expect(clicked).toEqual([{ href: 'data:image/png;base64,AAAA', download: 'equity.png', inPage: true }]);
    expect(document.querySelector('a')).toBeNull();
    downloadImage('', 'nothing.png');
    expect(clicked).toHaveLength(1);
  });
});

describe('a picture on the clipboard', () => {
  it('is written while the click that asked for it is still being handled', async () => {
    const written: unknown[] = [];
    class Item {
      constructor(public parts: Record<string, unknown>) {}
    }
    vi.stubGlobal('ClipboardItem', Item);
    vi.stubGlobal('navigator', { clipboard: { write: async (items: unknown[]) => { written.push(...items); } } });
    const blob = new Blob(['x'], { type: 'image/png' });
    expect(await copyImage(Promise.resolve(blob))).toBe(true);
    expect(written).toHaveLength(1);
    // The item holds the picture still being made, not one waited for.
    expect((written[0] as Item).parts['image/png']).toBeInstanceOf(Promise);
  });

  it('is not, without a clipboard, without a picture, or where the browser says no', async () => {
    const blob = Promise.resolve(new Blob(['x']));
    vi.stubGlobal('navigator', {});
    expect(await copyImage(blob)).toBe(false);
    vi.stubGlobal('ClipboardItem', class { constructor(public parts: unknown) {} });
    vi.stubGlobal('navigator', { clipboard: { write: async () => { throw new Error('denied'); } } });
    expect(await copyImage(blob)).toBe(false);
    vi.stubGlobal('navigator', { clipboard: { write: async (items: { parts: Record<string, Promise<Blob>> }[]) => { await items[0].parts['image/png']; } } });
    expect(await copyImage(Promise.resolve(null))).toBe(false);
  });

  it('waits for the picture where the browser takes only a finished one', async () => {
    const written: unknown[] = [];
    class Old {
      constructor(public parts: Record<string, unknown>) {
        if (parts['image/png'] instanceof Promise) throw new TypeError('a Blob, please');
      }
    }
    vi.stubGlobal('ClipboardItem', Old);
    vi.stubGlobal('navigator', { clipboard: { write: async (items: unknown[]) => { written.push(...items); } } });
    const blob = new Blob(['x'], { type: 'image/png' });
    expect(await copyImage(Promise.resolve(blob))).toBe(true);
    expect((written[0] as Old).parts['image/png']).toBe(blob);
  });
});

describe('a picture sent to the printer', () => {
  it('is printed from a frame of its own, with the page’s title and the paper turned its way, and the frame is taken away after', () => {
    vi.useFakeTimers();
    const canvas = canvasOf(800, 400);
    printCanvas(canvas, { title: 'Equity <2026>' });
    const frame = document.querySelector('iframe')!;
    expect(frame).not.toBeNull();
    // Out of sight, and still laid out: a frame that is not is printed blank by some browsers.
    expect(frame.style.display).not.toBe('none');
    expect(frame.getAttribute('aria-hidden')).toBe('true');
    const page = frame.contentDocument!;
    expect(page.title).toBe('Equity <2026>');
    const image = page.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(page.querySelector('style')!.textContent).toContain('size: landscape');
    const print = vi.fn();
    const focus = vi.fn();
    Object.assign(frame.contentWindow!, { print, focus });
    expect(print).not.toHaveBeenCalled();
    image.dispatchEvent(new Event('load'));
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.querySelector('iframe')).not.toBeNull();
    frame.contentWindow!.dispatchEvent(new Event('afterprint'));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('turns the paper upright for a picture taller than it is wide, and takes the frame away when nothing says the printing is over', () => {
    vi.useFakeTimers();
    printCanvas(canvasOf(300, 900));
    const frame = document.querySelector('iframe')!;
    expect(frame.contentDocument!.querySelector('style')!.textContent).toContain('size: portrait');
    Object.assign(frame.contentWindow!, { print: vi.fn(), focus: vi.fn() });
    frame.contentDocument!.querySelector('img')!.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(10 * 60_000);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('takes the frame away when the picture cannot be read', () => {
    printCanvas(canvasOf(300, 200));
    document.querySelector('iframe')!.contentDocument!.querySelector('img')!.dispatchEvent(new Event('error'));
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('canvases as a PDF', () => {
  /** A canvas whose pixels are known: red, green, blue and see-through black, over and over. */
  function painted(width: number, height: number): HTMLCanvasElement {
    const canvas = canvasOf(width, height);
    const data = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => [255, 128, 0, 255][i % 4]);
    canvas.getContext = (() => ({ getImageData: () => ({ data, width, height }) })) as never;
    return canvas;
  }

  it('reads a canvas’s pixels without their alpha', () => {
    const image = canvasPdfImage(painted(2, 2));
    expect(image).toMatchObject({ width: 2, height: 2 });
    expect([...image.rgb!]).toEqual([255, 128, 0, 255, 128, 0, 255, 128, 0, 255, 128, 0]);
  });

  it('is a file with a page for each', async () => {
    const pdf = await canvasesToPdf([painted(4, 2), painted(2, 2)], { title: 'Two charts' });
    expect(pdf.type).toBe('application/pdf');
    // jsdom's Blob has no arrayBuffer(): read as a page from before it would.
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(pdf);
    });
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 2');
    expect(text).toContain('/Title (Two charts)');
  });
});

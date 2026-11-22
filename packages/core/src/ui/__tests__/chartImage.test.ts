// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, canvasBlob, canvasDataURL, canvasPdfImage, canvasesToPdf, canCopyImage, copyImage, downloadBlob, downloadImage, fileNamePart, imageFileName, imageRatio, printCanvas } from '../chartImage.js';

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
    expect(imageFileName('Equity.PNG', 'png')).toBe('Equity.PNG');
  });

  it('takes a dot in a name for part of the name, unless what follows is a picture’s ending', () => {
    // A symbol with a dot, a date: neither is a file's ending.
    expect(imageFileName('BTC.USD', 'png')).toBe('BTC.USD.png');
    expect(imageFileName('AAPL 2024.11', 'jpeg')).toBe('AAPL 2024.11.jpg');
    expect(imageFileName('EUR.USD', 'pdf')).toBe('EUR.USD.pdf');
    expect(imageFileName('v1.2', 'webp')).toBe('v1.2.webp');
  });

  it('is saved from a file’s bytes by an address that is let go of later, not at once', () => {
    vi.useFakeTimers();
    const made: Blob[] = [];
    const freed: string[] = [];
    Object.assign(URL, { createObjectURL: (blob: Blob) => { made.push(blob); return 'blob:picture'; }, revokeObjectURL: (url: string) => { freed.push(url); } });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(`${this.download} <- ${this.href}`);
    });
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    downloadBlob(blob, 'report.pdf');
    expect(made).toEqual([blob]);
    expect(clicked).toEqual(['report.pdf <- blob:picture']);
    // Let go of in the click's own task, some browsers save nothing, or a part.
    expect(freed).toEqual([]);
    vi.advanceTimersByTime(60_000);
    expect(freed).toEqual(['blob:picture']);
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
    expect(printCanvas(canvasOf(300, 200))).toBe(true);
    document.querySelector('iframe')!.contentDocument!.querySelector('img')!.dispatchEvent(new Event('error'));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('makes no frame for a canvas the page may not read, and says so', () => {
    const canvas = canvasOf(300, 200);
    canvas.toDataURL = () => { throw new DOMException('Tainted canvases may not be exported.', 'SecurityError'); };
    expect(printCanvas(canvas)).toBe(false);
    expect(printCanvas(canvas)).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('takes the frame away where the browser will not print', () => {
    vi.useFakeTimers();
    printCanvas(canvasOf(300, 200));
    const frame = document.querySelector('iframe')!;
    Object.assign(frame.contentWindow!, { focus: vi.fn(), print: () => { throw new Error('printing is not allowed here'); } });
    expect(() => frame.contentDocument!.querySelector('img')!.dispatchEvent(new Event('load'))).not.toThrow();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('writes the frame’s page itself, so that a browser still loading the empty one does not put it back', () => {
    printCanvas(canvasOf(300, 200));
    const page = document.querySelector('iframe')!.contentDocument!;
    // A page written by the script is a page of its own: standards mode, a head and a body.
    expect(page.doctype?.name).toBe('html');
    expect(page.compatMode).toBe('CSS1Compat');
    expect(page.querySelectorAll('img')).toHaveLength(1);
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

describe('the pixels a picture has', () => {
  it('are the size times the ratio, each side a whole number, and never past what a canvas can be', async () => {
    const { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, imageRatio, picturePixels, pictureSize } = await import('../chartImage.js');
    expect(picturePixels({ width: 800, height: 400 }, 2)).toEqual({ width: 1600, height: 800 });
    expect(picturePixels({ width: 801, height: 601 }, 1.5)).toEqual({ width: 1202, height: 902 });
    expect(picturePixels({ width: 0.2, height: 0.2 }, 1)).toEqual({ width: 1, height: 1 });
    // Held to the most pixels a canvas has: rounding each side up could go past it by a few.
    for (const size of [{ width: 12_000, height: 9000 }, { width: 9999, height: 7777 }, { width: 5000, height: 4999 }, { width: 16_384, height: 16_384 }]) {
      const pixels = picturePixels(size, imageRatio(size.width, size.height, 4, 1));
      expect(pixels.width * pixels.height, JSON.stringify(size)).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
      expect(Math.max(pixels.width, pixels.height)).toBeLessThanOrEqual(MAX_IMAGE_SIDE);
      // And no smaller than it has to be.
      expect(pixels.width * pixels.height).toBeGreaterThan(MAX_IMAGE_PIXELS * 0.99);
    }
    expect(pictureSize({ width: 800, height: 400 }, {})).toEqual({ width: 800, height: 400 });
    expect(pictureSize({ width: 800, height: 400 }, { width: 1600 })).toEqual({ width: 1600, height: 400 });
    expect(pictureSize({ width: 800, height: 400 }, { width: Number.NaN, height: -1 })).toEqual({ width: 800, height: 400 });
    // A side that is no whole number stays as asked: a grid's cell is laid out to the pixel it has.
    expect(pictureSize({ width: 800, height: 400 }, { width: 1e9, height: 200.4 })).toEqual({ width: MAX_IMAGE_SIDE, height: 200.4 });
  });
});

describe('what of a name a file can carry', () => {
  it('keeps the letters and digits of any writing, and a dot, a dash and an underscore', () => {
    expect(fileNamePart('BTCUSDT')).toBe('BTCUSDT');
    expect(fileNamePart('BRK.B')).toBe('BRK.B');
    expect(fileNamePart('ES-2026_Z')).toBe('ES-2026_Z');
    expect(fileNamePart('삼성전자')).toBe('삼성전자');
    expect(fileNamePart('上证指数')).toBe('上证指数');
    expect(fileNamePart('Сбербанк')).toBe('Сбербанк');
  });

  it('writes an underscore for a run of anything else', () => {
    expect(fileNamePart('BTC/USDT')).toBe('BTC_USDT');
    expect(fileNamePart('EUR USD: spot')).toBe('EUR_USD_spot');
    expect(fileNamePart('^GSPC')).toBe('_GSPC');
  });

  it('is nothing for a name with no letter or digit in it', () => {
    expect(fileNamePart('')).toBe('');
    expect(fileNamePart('   ')).toBe('');
    expect(fileNamePart('/:*?')).toBe('');
  });
});

describe('whether a picture can be copied', () => {
  it('is not where there is no clipboard for pictures', () => {
    expect(canCopyImage()).toBe(false);
    vi.stubGlobal('ClipboardItem', class {});
    expect(canCopyImage()).toBe(false);
  });

  it('is where the browser has a clipboard to write and an item to put a picture in', () => {
    vi.stubGlobal('ClipboardItem', class {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: () => Promise.resolve() } });
    try {
      expect(canCopyImage()).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    }
  });
});

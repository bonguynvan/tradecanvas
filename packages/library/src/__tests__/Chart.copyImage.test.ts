// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const bars = Array.from({ length: 30 }, (_, i) => ({ time: 60_000 * i, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));

type ClipboardData = Record<string, Blob | Promise<Blob>>;

/** What ClipboardItem was given. */
class FakeClipboardItem {
  static made: FakeClipboardItem[] = [];
  constructor(readonly data: ClipboardData) {
    FakeClipboardItem.made.push(this);
  }
  get types(): string[] {
    return Object.keys(this.data);
  }
  getType(type: string): Promise<Blob> {
    return Promise.resolve(this.data[type]);
  }
}

/** As older browsers do: a ClipboardItem takes a Blob, and a promise of one is a TypeError. */
class BlobOnlyClipboardItem extends FakeClipboardItem {
  constructor(data: ClipboardData) {
    if (Object.values(data).some((value) => value instanceof Promise)) {
      throw new TypeError("Failed to construct 'ClipboardItem'");
    }
    super(data);
  }
}

/** How long to wait for the canvas's image, and for Node to report a rejection nobody handled. */
const SETTLE_MS = 20;

/** The rejections nobody handled while `run` went on, and until the image had been encoded. */
async function unhandledRejections(run: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const onRejection = (reason: unknown): void => { seen.push(reason); };
  process.on('unhandledRejection', onRejection);
  try {
    await run();
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  } finally {
    process.off('unhandledRejection', onRejection);
  }
  return seen;
}

let host: HTMLDivElement;
let chart: Chart;
let write: ReturnType<typeof vi.fn>;
let png: Blob | null;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
  chart.setData(bars);
  png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => { setTimeout(() => cb(png), 0); });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
  // As Chrome does under `connect-src 'self'`: a fetch of data: fails.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
  FakeClipboardItem.made = [];
  vi.stubGlobal('ClipboardItem', FakeClipboardItem);
  // As the browser does: the write settles once every item's data has.
  write = vi.fn(async (items: FakeClipboardItem[]) => {
    for (const item of items) for (const type of item.types) await item.getType(type);
  });
  Object.defineProperty(navigator, 'clipboard', { value: { write }, configurable: true });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  delete (navigator as { clipboard?: unknown }).clipboard;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('copying the chart image', () => {
  it('copies it where the page’s CSP refuses a fetch of data: URLs', async () => {
    expect(await chart.copyScreenshot()).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(await FakeClipboardItem.made[0].getType('image/png')).toBe(png);
  });

  it('writes to the clipboard before awaiting anything, while the click still allows it', async () => {
    const copied = chart.copyScreenshot();
    // Safari refuses a write made after the click's handler has returned.
    expect(write).toHaveBeenCalledTimes(1);
    expect(await copied).toBe(true);
  });

  it('waits for the image where ClipboardItem takes only a Blob', async () => {
    vi.stubGlobal('ClipboardItem', BlobOnlyClipboardItem);

    expect(await chart.copyScreenshot()).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(FakeClipboardItem.made).toHaveLength(1);
    expect(FakeClipboardItem.made[0].data['image/png']).toBe(png);
  });

  it('says false when the canvas gives no image', async () => {
    png = null;
    expect(await chart.copyScreenshot()).toBe(false);
  });

  it('says false, not an error, where there is no navigator at all', async () => {
    vi.stubGlobal('navigator', undefined);
    // The navigator is read before the first await, so it can come back right after the call.
    const copied = chart.copyScreenshot();
    vi.unstubAllGlobals();
    await expect(copied).resolves.toBe(false);
  });

  it('leaves no rejection unhandled when ClipboardItem refuses the item for a reason of its own', async () => {
    png = null;
    vi.stubGlobal('ClipboardItem', class { constructor() { throw new DOMException('Not allowed', 'NotAllowedError'); } });

    const unhandled = await unhandledRejections(async () => {
      expect(await chart.copyScreenshot()).toBe(false);
    });
    expect(unhandled).toEqual([]);
  });

  it('leaves no rejection unhandled when the write fails without reading the image', async () => {
    png = null;
    write.mockImplementation(() => Promise.reject(new DOMException('Document is not focused.', 'NotAllowedError')));

    const unhandled = await unhandledRejections(async () => {
      expect(await chart.copyScreenshot()).toBe(false);
    });
    expect(unhandled).toEqual([]);
  });

  it('says false without an image clipboard, and with screenshots switched off', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    expect(await chart.copyScreenshot()).toBe(false);
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    chart.setFeatures({ screenshot: false });
    expect(await chart.copyScreenshot()).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});

describe('the chart image as a Blob', () => {
  it('is the canvas’s PNG, with no fetch', async () => {
    expect(await chart.screenshotBlob()).toBe(png);
    expect(fetch).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DARK_THEME, type ChartOptions, type Theme } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: what the widget reads as it starts, the rest a no-op. */
class FakeChart {
  constructor(_host: HTMLElement, public options: ChartOptions) {
    return new Proxy(this, {
      get: (target, key, receiver) => {
        if (key in target) return Reflect.get(target, key, receiver);
        return () => {};
      },
    });
  }
  on(): void {}
  getTheme(): Theme { return { ...DARK_THEME, name: 'dark' }; }
  getOverrides(): Record<string, unknown> { return {}; }
  getStyleValue(key: string): unknown { return `theme:${key}`; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getData(): unknown[] { return []; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getRequiredSymbols(): string[] { return []; }
  getSymbolInfo(): null { return null; }
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

type Widget = { destroy(): void; setFeatures(f: Record<string, boolean>): void };

let host: HTMLDivElement;
let widget: Widget | null = null;
let preload: () => Promise<void>;

/**
 * A widget on a page that has loaded none of the widget's parts yet: the modules are loaded
 * afresh, so the parts' code is not in until something asks for it.
 */
async function coldWidget(options: Record<string, unknown> = {}): Promise<Widget> {
  vi.resetModules();
  const dialogs = await import('../widgetDialogs.js');
  preload = dialogs.preloadDialogs;
  const { ChartWidget } = await import('../ChartWidget.js');
  widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA', 'APPL', 'APX'], watchlist: false, ...options }) as unknown as Widget;
  return widget;
}

/** Lets the parts' code load, and what waited for it open, as a page does. */
async function loaded(): Promise<void> {
  await preload();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const root = () => host.querySelector<HTMLElement>('.tcw-root')!;
const press = () => root().dispatchEvent(new Event('pointerdown'));
const key = (init: KeyboardEventInit) => document.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  widget = null;
  document.querySelectorAll('.tcw-portal').forEach((p) => p.remove());
  host.remove();
});

describe('ChartWidget pickers loaded when first opened', () => {
  it('opens the indicators dialog once its code is in', async () => {
    await coldWidget();
    host.querySelector<HTMLElement>('[data-role="indicators"]')!.click();
    expect(document.querySelector('.tcw-ip')).toBeNull();
    await loaded();
    expect(document.querySelectorAll('.tcw-ip')).toHaveLength(1);
  });

  it('takes Ctrl+K as a toggle while the palette loads: pressed twice it stays shut, three times it opens once', async () => {
    await coldWidget();
    press();
    key({ key: 'k', ctrlKey: true });
    key({ key: 'k', ctrlKey: true });
    expect(document.querySelector('.tcw-cp')).toBeNull();
    key({ key: 'k', ctrlKey: true });
    await loaded();
    expect(document.querySelectorAll('.tcw-cp')).toHaveLength(1);
  });

  it('opens no indicators dialog when its button was pressed again while the code loaded', async () => {
    await coldWidget();
    const button = host.querySelector<HTMLElement>('[data-role="indicators"]')!;
    button.click();
    button.click();
    await loaded();
    expect(document.querySelector('.tcw-ip')).toBeNull();
    button.click();
    expect(document.querySelectorAll('.tcw-ip')).toHaveLength(1);
  });

  it('keeps every letter typed on the chart while the symbol search loads', async () => {
    await coldWidget();
    press();
    key({ key: 'a' });
    key({ key: 'p' });
    expect(document.querySelector('.tcw-ss')).toBeNull();
    await loaded();
    expect(document.querySelectorAll('.tcw-ss-input')).toHaveLength(1);
    expect(document.querySelector<HTMLInputElement>('.tcw-ss-input')!.value).toBe('ap');
  });

  it('starts from what the last ask said: a search from the button after letters typed is empty', async () => {
    await coldWidget();
    press();
    key({ key: 'a' });
    key({ key: 'p', ctrlKey: true });
    await loaded();
    expect(document.querySelector<HTMLInputElement>('.tcw-ss-input')!.value).toBe('');
  });

  it('opens no symbol search when its switch went off while its code loaded', async () => {
    const w = await coldWidget();
    press();
    key({ key: 'a' });
    w.setFeatures({ symbolSearch: false });
    await loaded();
    expect(document.querySelector('.tcw-ss')).toBeNull();
  });
});

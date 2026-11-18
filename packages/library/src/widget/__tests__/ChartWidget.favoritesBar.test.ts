// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: anything not written here is a no-op; it records the tools picked. */
class FakeChart {
  static last: FakeChart;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  tools: (string | null)[] = [];
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }
  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown = {}): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  setDrawingTool(tool: string | null): void {
    this.tools.push(tool);
  }
  getDrawings(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getData(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 800, height: 400 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  isEraserMode(): boolean { return false; }
  isZoomAreaMode(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
});

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, drawingFavorites: ['trendLine', 'rectangle'], ...options });
  return widget;
};
const toggle = () => host.querySelector<HTMLButtonElement>('[data-role="favoritesBar"]');
const bar = () => host.querySelector<HTMLElement>('.tcw-favorites-bar');
const barTools = () => [...(bar()?.querySelectorAll<HTMLButtonElement>('[data-tool-value]') ?? [])].map((b) => b.dataset.toolValue);
const shown = (el: HTMLElement | null) => !!el && !el.hidden;
const strip = () => host.querySelector<HTMLElement>('.tcw-sidebar-favorites');

describe('ChartWidget favorites bar', () => {
  it('starts off, the sidebar keeping its strip; its button on the sidebar shows it', () => {
    make();
    expect(shown(bar())).toBe(false);
    expect(toggle()!.getAttribute('aria-pressed')).toBe('false');
    expect(strip()!.style.display).toBe('');
    toggle()!.click();
    expect(shown(bar())).toBe(true);
    expect(toggle()!.getAttribute('aria-pressed')).toBe('true');
    expect(barTools()).toEqual(['trendLine', 'rectangle']);
    // One place for them: the strip steps aside while the bar shows.
    expect(strip()!.style.display).toBe('none');
  });

  it('picks a tool from the bar, and marks the one in use', () => {
    make();
    toggle()!.click();
    bar()!.querySelector<HTMLButtonElement>('[data-tool-value="rectangle"]')!.click();
    expect(FakeChart.last.tools.at(-1)).toBe('rectangle');
    FakeChart.last.emit('drawingToolChange', { tool: 'rectangle' });
    expect(bar()!.querySelector('[data-tool-value="rectangle"]')!.classList.contains('tcw-active')).toBe(true);
  });

  it('is moved by its grip, and comes back shown where it was left', () => {
    make();
    toggle()!.click();
    const grip = bar()!.querySelector<HTMLElement>('.tcw-favorites-grip')!;
    const before = { left: parseFloat(bar()!.style.left || '0'), top: parseFloat(bar()!.style.top || '0') };
    grip.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 160, clientY: 130 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 160, clientY: 130 }));
    const after = { left: parseFloat(bar()!.style.left), top: parseFloat(bar()!.style.top) };
    expect(after).toEqual({ left: before.left + 60, top: before.top + 30 });
    widget.destroy();
    host.replaceChildren();
    make();
    expect(shown(bar())).toBe(true);
    expect({ left: parseFloat(bar()!.style.left), top: parseFloat(bar()!.style.top) }).toEqual(after);
  });

  it('follows the pins: one pinned or unpinned shows or goes', () => {
    make();
    toggle()!.click();
    // Right-click a tool on the bar unpins it, as on the sidebar's strip.
    bar()!.querySelector<HTMLButtonElement>('[data-tool-value="trendLine"]')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(barTools()).toEqual(['rectangle']);
  });

  it('keeps the pins on the sidebar with the switch off, though the bar was left shown', () => {
    localStorage.setItem('tcw:favoritesBar', JSON.stringify({ shown: true, left: 8, top: 8 }));
    make({ features: { favoritesBar: false } });
    expect(shown(bar())).toBe(false);
    expect(strip()!.style.display).toBe('');
  });

  it('says how to fill it when shown with nothing pinned', () => {
    make({ drawingFavorites: [] });
    toggle()!.click();
    expect(host.querySelector('.tcw-toast')?.textContent).toContain('star');
  });

  it('names a tool on the bar by the tool alone', () => {
    make();
    toggle()!.click();
    expect(bar()!.querySelector('[data-tool-value="rectangle"]')!.getAttribute('aria-label')).toBe('Rectangle');
  });

  it('has neither bar nor button with its switch off', () => {
    make({ features: { favoritesBar: false } });
    const button = toggle();
    expect(button === null || getComputedStyle(button).display === 'none' || button.closest('[data-tcw-off]') !== null).toBe(true);
    expect(shown(bar())).toBe(false);
  });
});

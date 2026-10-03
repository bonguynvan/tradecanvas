// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: emits the menus' events on demand. */
class FakeChart {
  static last: FakeChart;
  alerts: number[] = [];
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown = {}): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  addAlert(price: number): void { this.alerts.push(price); }
  tools: (string | null)[] = [];
  setDrawingTool(tool: string | null): void { this.tools.push(tool); }
  setups: unknown[][] = [];
  applyIndicatorSetup(list: unknown[]): void { this.setups.push(list); }
  getIndicatorSetup(): unknown[] { return [{ id: 'rsi', instanceId: 'tc_rsi_1', params: { period: 14 } }]; }
  getActiveIndicators(): unknown[] { return this.indicatorsShown; }
  indicatorsShown: unknown[] = [];
  roundPrice(p: number): number { return Math.round(p); }
  timeframes: string[] = [];
  getData(): { close: number }[] { return [{ close: 100 }]; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getIndicatorOutput(): null { return null; }
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
  widget.destroy();
  host.remove();
});

const menuItems = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu [role^=menuitem]')];

describe('ChartWidget toolbar buttons of the host', () => {
  it('adds a button that calls back, switches and goes away', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const clicks: HTMLButtonElement[] = [];
    const handle = widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick: (b) => clicks.push(b) })!;
    const btn = host.querySelector<HTMLButtonElement>('[data-host-button="news"]')!;
    expect(btn).toBe(handle.element);
    expect(btn.getAttribute('aria-label')).toBe('News');
    expect(btn.querySelector('svg')).not.toBeNull();
    btn.click();
    expect(clicks).toEqual([btn]);
    handle.setActive(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    handle.setText('3');
    expect(btn.textContent).toBe('3');
    expect(btn.getAttribute('aria-label')).toBe('News: 3');
    handle.remove();
    expect(host.querySelector('[data-host-button="news"]')).toBeNull();
  });

  it('puts a text button on the left with the chart controls', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    widget.addToolbarButton({ id: 'scan', label: 'Scanner', side: 'left', onClick: () => {} });
    const btn = host.querySelector<HTMLButtonElement>('[data-host-button="scan"]')!;
    expect(btn.textContent).toBe('Scanner');
    expect(btn.hasAttribute('aria-label')).toBe(false); // its text names it
    // Before the spacer that pushes the panel buttons right.
    const spacer = host.querySelector('.tcw-toolbar-spacer')!;
    expect(btn.compareDocumentPosition(spacer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has nowhere to put a button without a toolbar', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, toolbar: false });
    expect(widget.addToolbarButton({ id: 'x', label: 'X', onClick: () => {} })).toBeNull();
  });
});

describe('ChartWidget menu entries of the host', () => {
  it('adds the host’s entries after the widget’s, with where the menu opened', () => {
    const seen: unknown[] = [];
    const picked: string[] = [];
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      watchlist: false,
      chartMenuItems: (context) => {
        seen.push(context);
        return [{ label: 'Copy price', icon: 'check', onSelect: () => picked.push('copy') }];
      },
    });
    FakeChart.last.emit('chartContextMenu', { area: 'plot', x: 10, y: 10, price: 95, time: 1000 });
    expect(seen).toEqual([{ area: 'plot', price: 95, time: 1000 }]);
    const labels = menuItems().map((b) => b.textContent);
    expect(labels[labels.length - 1]).toBe('Copy price');
    expect(labels.length).toBeGreaterThan(1);
    menuItems()[labels.length - 1].click();
    expect(picked).toEqual(['copy']);

    // The widget's own entries still work.
    FakeChart.last.emit('priceAxisAdd', { price: 90, x: 0, y: 0 });
    expect(seen[1]).toEqual({ area: 'priceAxisAdd', price: 90 });
    menuItems().find((b) => b.textContent?.startsWith('Add alert'))!.click();
    expect(FakeChart.last.alerts).toEqual([90]);
  });

  it('opens a menu of only the host’s entries where the widget has none', () => {
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      watchlist: false,
      alerts: false,
      trading: false,
      drawingTools: false,
      chartMenuItems: () => [{ label: 'Mine', onSelect: () => {} }],
    });
    FakeChart.last.emit('priceAxisAdd', { price: 90, x: 0, y: 0 });
    expect(menuItems().map((b) => b.textContent)).toEqual(['Mine']);
  });
});

describe('ChartWidget keys for tools and intervals', () => {
  const press = () => host.querySelector('.tcw-root')!.dispatchEvent(new Event('pointerdown'));

  it('picks a drawing tool with Alt and a letter', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    press();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', altKey: true, cancelable: true }));
    expect(FakeChart.last.tools).toEqual(['trendLine']);
  });

  it('leaves the keys to a dialog that has focus', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    press();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    host.querySelector('.tcw-root')!.appendChild(dialog);
    button.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', altKey: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '5', cancelable: true }));
    expect(FakeChart.last.tools).toEqual([]);
    expect(host.querySelector<HTMLElement>('.tcw-interval-input')!.hidden).toBe(true);
  });

  it('opens the interval field on a digit once the chart was used, and switches on Enter', () => {
    const changes: string[] = [];
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, onTimeframeChange: (tf) => changes.push(tf) });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', cancelable: true }));
    expect(host.querySelector<HTMLElement>('.tcw-interval-input')!.hidden).toBe(true); // not used yet
    press();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', cancelable: true }));
    const field = host.querySelector<HTMLInputElement>('.tcw-interval-field')!;
    expect(field.value).toBe('4');
    field.value = '4h';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(changes).toEqual(['4h']);
  });
});

describe('ChartWidget indicator templates', () => {
  beforeEach(() => localStorage.clear());

  it('saves the chart’s indicators under a name and applies them', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.indicatorsShown = [{ id: 'rsi', instanceId: 'tc_rsi_1', params: {}, visible: true, descriptor: { defaultConfig: {} } }];
    host.querySelector<HTMLButtonElement>('[data-tpl-save]')!.click();
    // The open prompt (the layouts have one of their own).
    const prompt = [...host.querySelectorAll<HTMLFormElement>('.tcw-name-prompt')].find((f) => !f.closest('.tcw-modal-backdrop')!.hasAttribute('hidden'))!;
    const input = prompt.querySelector('input')!;
    input.value = 'Momentum';
    input.dispatchEvent(new Event('input'));
    prompt.dispatchEvent(new Event('submit', { cancelable: true }));
    return Promise.resolve().then(() => {
      const apply = host.querySelector<HTMLButtonElement>('[data-tpl-apply="Momentum"]')!;
      expect(apply).not.toBeNull();
      apply.click();
      expect(FakeChart.last.setups).toEqual([[{ id: 'rsi', instanceId: 'tc_rsi_1', params: { period: 14 } }]]);
    });
  });

  it('says there is nothing to save without indicators', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    host.querySelector<HTMLButtonElement>('[data-tpl-save]')!.click();
    const open = [...host.querySelectorAll('.tcw-name-prompt')].filter((f) => !f.closest('.tcw-modal-backdrop')!.hasAttribute('hidden'));
    expect(open).toEqual([]);
  });
});

describe('ChartWidget prices on the market grid', () => {
  it('rounds the price a menu offers', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.emit('priceAxisAdd', { price: 90.4, x: 0, y: 0 });
    menuItems().find((b) => b.textContent?.startsWith('Add alert'))!.click();
    expect(FakeChart.last.alerts).toEqual([90]);
  });
});

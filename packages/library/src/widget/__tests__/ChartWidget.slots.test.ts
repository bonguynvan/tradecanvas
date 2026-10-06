// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: emits the menus' events on demand. */
class FakeChart {
  static last: FakeChart;
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
  getDrawings(): unknown[] { return [{ id: 'd1', type: 'fibRetracement', locked: false, visible: true, group: null }]; }
  getSelectedDrawingIds(): string[] { return ['d1']; }
  canAddDrawingAlert(): boolean { return false; }
  getActiveIndicators(): unknown[] { return [{ instanceId: 'tc_rsi_1', id: 'rsi', params: {}, visible: true, descriptor: {} }]; }
  getIndicatorPanes(): unknown[] { return []; }
  getData(): { close: number; time: number }[] { return [{ close: 100, time: 0 }]; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getAlerts(): unknown[] { return []; }
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

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, ...options });
  return widget;
};
const shownMenu = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^=menuitem]')];

describe('ChartWidget toolbar menus of the host', () => {
  it('adds a button that opens the host’s entries, asked for each time', () => {
    make();
    const picked: string[] = [];
    let count = 0;
    const handle = widget.addToolbarDropdown({
      id: 'scans',
      label: 'Scans',
      icon: 'layers',
      items: () => {
        count++;
        return [{ label: 'Breakouts', onSelect: () => picked.push('breakouts') }, { label: `Run ${count}`, onSelect: () => {} }];
      },
    })!;
    const btn = host.querySelector<HTMLButtonElement>('.tcw-toolbar [data-host-button="scans"]')!;
    expect(btn).toBe(handle.element);
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    btn.click();
    expect(shownMenu().map((b) => b.textContent)).toEqual(['Breakouts', 'Run 1']);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    shownMenu()[0].click();
    expect(picked).toEqual(['breakouts']);
    btn.click();
    expect(shownMenu().map((b) => b.textContent)).toEqual(['Breakouts', 'Run 2']);
    btn.click();
    expect(shownMenu()).toEqual([]);
    handle.setText('2 new');
    expect(btn.textContent).toBe('2 new');
    handle.remove();
    expect(host.querySelector('[data-host-button="scans"]')).toBeNull();
  });
});

describe('ChartWidget toolbar menus of the host, when empty', () => {
  it('opens no menu without entries', () => {
    make();
    const handle = widget.addToolbarDropdown({ id: 'none', label: 'None', items: () => [] })!;
    handle.element.click();
    expect(shownMenu()).toEqual([]);
  });
});

describe('ChartWidget sidebar buttons of the host', () => {
  it('adds a button under the drawing switches that calls back and switches', () => {
    make();
    const clicks: HTMLButtonElement[] = [];
    const handle = widget.addSidebarButton({ id: 'measure', label: 'Measure', icon: 'ruler', toggle: true, onClick: (b) => clicks.push(b) })!;
    const btn = host.querySelector<HTMLButtonElement>('.tcw-sidebar [data-host-button="measure"]')!;
    expect(btn).toBe(handle.element);
    expect(btn.getAttribute('aria-label')).toBe('Measure');
    btn.click();
    expect(clicks).toEqual([btn]);
    handle.setActive(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.classList.contains('tcw-active')).toBe(true);
    handle.remove();
    expect(host.querySelector('[data-host-button="measure"]')).toBeNull();
  });
});

describe('ChartWidget status bar items of the host', () => {
  it('shows text on the right, and a button on the left when it has a click', () => {
    make();
    const text = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })!;
    expect(text.element.tagName).toBe('SPAN');
    expect(text.element.closest('.tcw-status-right')).not.toBeNull();
    expect(text.element.getAttribute('aria-label')).toBe('Latency: 12 ms');
    text.setText('15 ms');
    expect(text.element.textContent).toBe('15 ms');
    expect(text.element.getAttribute('aria-label')).toBe('Latency: 15 ms');

    const clicks: string[] = [];
    const button = widget.addStatusBarItem({ id: 'session', text: 'RTH', side: 'left', onClick: () => clicks.push('rth') })!;
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.closest('.tcw-status-right')).toBeNull();
    (button.element as HTMLButtonElement).click();
    expect(clicks).toEqual(['rth']);
    button.remove();
    text.remove();
    expect(host.querySelector('[data-host-item]')).toBeNull();
  });
});

describe('ChartWidget slots', () => {
  it('gives a place of its own in each bar and over the chart', () => {
    make();
    expect(widget.getSlot('toolbar.left')!.closest('.tcw-toolbar')).not.toBeNull();
    expect(widget.getSlot('toolbar.right')!.closest('.tcw-toolbar')).not.toBeNull();
    expect(widget.getSlot('sidebar')!.closest('.tcw-sidebar')).not.toBeNull();
    expect(widget.getSlot('statusBar.left')!.closest('.tcw-statusbar')).not.toBeNull();
    expect(widget.getSlot('statusBar.right')!.closest('.tcw-status-right')).not.toBeNull();
    const layer = widget.getSlot('chart')!;
    expect(layer.closest('.tcw-chart-container')).not.toBeNull();
    expect(layer.classList.contains('tcw-host-layer')).toBe(true);
    expect(widget.getSlot('chart')).toBe(layer);
    expect(widget.getSlot('nowhere' as never)).toBeNull();
  });
});

describe('ChartWidget host entries in the drawing and indicator menus', () => {
  it('adds the host’s entries after a drawing’s, with the drawing', () => {
    const seen: unknown[] = [];
    const picked: string[] = [];
    make({
      drawingMenuItems: (context) => {
        seen.push(context);
        return [{ label: 'Share drawing', onSelect: () => picked.push('share') }];
      },
    });
    FakeChart.last.emit('drawingContextMenu', { id: 'd1', x: 10, y: 10 });
    expect(seen).toEqual([{ id: 'd1', type: 'fibRetracement', selected: ['d1'] }]);
    const labels = shownMenu().map((b) => b.textContent);
    expect(labels.at(-1)).toBe('Share drawing');
    expect(labels.length).toBeGreaterThan(1);
    shownMenu().at(-1)!.click();
    expect(picked).toEqual(['share']);
  });

  it('adds the host’s entries to an indicator’s "more" menu', () => {
    const seen: unknown[] = [];
    make({ indicatorMenuItems: (context) => { seen.push(context); return [{ label: 'Explain', onSelect: () => {} }]; } });
    const anchor = document.createElement('button');
    host.appendChild(anchor);
    (widget as unknown as { openLegendMenu(id: string, anchor: HTMLElement): void }).openLegendMenu('tc_rsi_1', anchor);
    expect(seen).toEqual([{ instanceId: 'tc_rsi_1', indicatorId: 'rsi' }]);
    expect(shownMenu().map((b) => b.textContent).at(-1)).toBe('Explain');
  });
});

describe('ChartWidget shortcuts of the host', () => {
  const press = () => host.querySelector('.tcw-root')!.dispatchEvent(new Event('pointerdown'));
  const key = (init: KeyboardEventInit) => {
    const e = new KeyboardEvent('keydown', { cancelable: true, ...init });
    document.dispatchEvent(e);
    return e;
  };

  it('runs a shortcut of the host while the widget is in use, until it is removed', () => {
    make();
    const pressed: string[] = [];
    const handle = widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => pressed.push('note') })!;
    press();
    const e = key({ altKey: true, code: 'KeyN', key: 'n' });
    expect(pressed).toEqual(['note']);
    expect(e.defaultPrevented).toBe(true);
    widget.setFeatures({ hotkeys: false });
    key({ altKey: true, code: 'KeyN', key: 'n' });
    expect(pressed).toEqual(['note']);
    widget.setFeatures({ hotkeys: true });
    handle.remove();
    key({ altKey: true, code: 'KeyN', key: 'n' });
    expect(pressed).toEqual(['note']);
  });

  it('leaves a plain key to a field elsewhere on the page, and to text being composed', () => {
    make();
    const pressed: string[] = [];
    widget.addHotkey({ keys: 'N', label: 'Next', onPress: () => pressed.push('n') });
    widget.addHotkey({ keys: 'Alt+N', label: 'Note', onPress: () => pressed.push('alt') });
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    // Focus in the page's own field: its keys.
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', code: 'KeyN', bubbles: true, cancelable: true }));
    expect(pressed).toEqual([]);
    field.blur();
    field.remove();
    press();
    key({ key: 'n', code: 'KeyN', isComposing: true });
    key({ key: 'Process', code: 'KeyN', keyCode: 229 } as KeyboardEventInit);
    expect(pressed).toEqual([]);
    key({ key: 'n', code: 'KeyN' });
    key({ altKey: true, key: 'n', code: 'KeyN' });
    expect(pressed).toEqual(['n', 'alt']);
  });

  it('warns of keys the chart answers itself', () => {
    make();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(widget.addHotkey({ keys: 'Ctrl+Z', label: 'Mine', onPress: () => {} })).not.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('lists in the sheet only the keys that work, a host’s replacing a built-in one', () => {
    make({ features: { commandPalette: false } });
    widget.addHotkey({ keys: 'Alt+G', label: 'Mine on G', onPress: () => {} });
    press();
    key({ key: '?' });
    const labels = [...document.querySelectorAll('.tcw-hotkey-sheet .tcw-hotkey-label')].map((l) => l.textContent);
    expect(labels).toContain('Mine on G');
    expect(labels).not.toContain('Command palette');
    expect(labels).not.toContain('Go to date');
  });

  it('reads no shortcut it cannot use', () => {
    make();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(widget.addHotkey({ keys: 'Hyper+N', label: 'X', onPress: () => {} })).toBeNull();
    warn.mockRestore();
  });

  it('lists the host’s shortcuts in the sheet, and leaves out the keys switched off', () => {
    make({ features: { 'hotkeys.tools': false } });
    widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => {} });
    press();
    key({ key: '?' });
    const sheet = document.querySelector('.tcw-hotkey-sheet')!;
    const labels = [...sheet.querySelectorAll('.tcw-hotkey-label')].map((l) => l.textContent);
    expect(labels).toContain('New note');
    expect(sheet.textContent).toContain('More');
    expect(labels).not.toContain('Trend Line');
    expect(labels).not.toContain('Fib Retracement');
  });

  it('lists the drawing tools’ keys while they are on', () => {
    make();
    press();
    key({ key: '?' });
    const labels = [...document.querySelectorAll('.tcw-hotkey-sheet .tcw-hotkey-label')].map((l) => l.textContent);
    expect(labels).toContain('Trend Line');
    expect(document.querySelector('.tcw-hotkey-sheet')!.textContent).not.toContain('More');
  });
});

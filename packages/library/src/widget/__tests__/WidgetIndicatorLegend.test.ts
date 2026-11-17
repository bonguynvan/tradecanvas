// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetIndicatorLegend, type IndicatorLegendRow } from '../WidgetIndicatorLegend.js';

/** Stand-in for the browser's ResizeObserver: the test says when a box was laid out, and how wide. */
class FakeResizeObserver {
  static last: FakeResizeObserver;
  static all: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  disconnected = false;
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.last = this;
    FakeResizeObserver.all.push(this);
  }
  observe(el: Element): void { this.observed.add(el); }
  unobserve(el: Element): void { this.observed.delete(el); }
  disconnect(): void { this.disconnected = true; this.observed.clear(); }
  /** `el` laid out `width` px wide. */
  resize(el: Element, width: number): void {
    const entry = { target: el, contentRect: { width, height: 19 } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

const LABELS = { show: 'Show', hide: 'Hide', settings: 'Settings', remove: 'Remove', collapse: 'Collapse', expand: 'Expand' };
const row = (instanceId: string, values: string[]): IndicatorLegendRow => ({
  instanceId, label: instanceId, visible: true, pane: null, values: values.map((text) => ({ text, color: null })),
});

let host: HTMLDivElement;
let legend: WidgetIndicatorLegend;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  host = document.createElement('div');
  document.body.appendChild(host);
  legend = new WidgetIndicatorLegend(host, { onToggleVisible: () => {}, onSettings: () => {}, onRemove: () => {} }, LABELS);
});

afterEach(() => {
  legend.destroy();
  host.remove();
  vi.unstubAllGlobals();
});

const valuesOf = (id: string) => host.querySelector<HTMLElement>(`[data-instance="${id}"] .tcw-ind-legend-values`)!;
const noRoom = (el: HTMLElement) => el.classList.contains('tcw-ind-legend-values--no-room');

describe('an indicator legend’s values in a narrow chart', () => {
  // At 320 Bollinger's values box was 6 px: too narrow for even an ellipsis, it showed a sliver.
  it('hide when their box is narrower than a digit and an ellipsis, the name left to read alone', () => {
    legend.update([row('BB 20 2', ['97,527.61', '98,159.48', '96,895.74'])], { left: 0, top: 0 });
    const values = valuesOf('BB 20 2');
    values.style.fontSize = '11px';
    expect(FakeResizeObserver.last.observed.has(values)).toBe(true);
    FakeResizeObserver.last.resize(values, 6);
    expect(noRoom(values)).toBe(true);
    FakeResizeObserver.last.resize(values, 46);
    expect(noRoom(values)).toBe(false);
  });

  it('measure the room against the size of their figures', () => {
    legend.update([row('EMA 21', ['98,159.48'])], { left: 0, top: 0 });
    const values = valuesOf('EMA 21');
    values.style.fontSize = '22px';
    FakeResizeObserver.last.resize(values, 24);
    expect(noRoom(values)).toBe(true);
    values.style.fontSize = '11px';
    FakeResizeObserver.last.resize(values, 24);
    expect(noRoom(values)).toBe(false);
  });

  it('stop being watched when their row goes, and all at once when the legend does', () => {
    legend.update([row('EMA 21', ['1']), row('SMA 50', ['2'])], { left: 0, top: 0 });
    const ema = valuesOf('EMA 21');
    legend.update([row('SMA 50', ['2'])], { left: 0, top: 0 });
    expect(FakeResizeObserver.last.observed.has(ema)).toBe(false);
    expect(FakeResizeObserver.last.observed.size).toBe(1);
    legend.destroy();
    expect(FakeResizeObserver.last.disconnected).toBe(true);
  });
});

describe('a legend row its chart doesn’t draw', () => {
  it('says why to the keyboard and to a screen reader, not only in a tooltip', () => {
    legend.destroy();
    legend = new WidgetIndicatorLegend(host, { onToggleVisible: () => {}, onSettings: () => {}, onRemove: () => {} }, {
      ...LABELS, offChartType: 'Not drawn on this chart type',
    });
    const compare: IndicatorLegendRow = { instanceId: 'cmp_ETH', kind: 'compare', label: 'ETHUSDT', visible: true, pane: null, values: [], offChartType: true };
    legend.update([compare], { left: 0, top: 0 });
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-instance="cmp_ETH"] button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Not drawn on this chart type');
    }
    legend.update([{ ...compare, offChartType: false, values: [{ text: '+1.20%', color: null }] }], { left: 0, top: 0 });
    for (const button of buttons) expect(button.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('a compare’s legend row', () => {
  it('marks the row in its line’s colour, before its name', () => {
    legend.update([{ instanceId: 'cmp_ETH', kind: 'compare', label: 'ETHUSDT', swatch: '#b552c9', visible: true, pane: null, values: [] }], { left: 0, top: 0 });
    const row = host.querySelector<HTMLElement>('[data-instance="cmp_ETH"]')!;
    const swatch = row.querySelector<HTMLElement>('.tcw-ind-legend-swatch')!;
    expect(swatch.style.backgroundColor).toBe('rgb(181, 82, 201)');
    expect(swatch.nextElementSibling?.classList.contains('tcw-ind-legend-name')).toBe(true);
    expect(swatch.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no mark on an indicator’s row, whose values are in its lines’ colours', () => {
    legend.update([row('EMA 21', ['1'])], { left: 0, top: 0 });
    expect(host.querySelector('[data-instance="EMA 21"] .tcw-ind-legend-swatch')).toBeNull();
  });
});

describe('the stack’s size, for the chart to keep drawing labels clear of', () => {
  it('is told as the stack is laid out, and as nothing once it is empty', () => {
    const sizes: ({ width: number; height: number } | null)[] = [];
    const told = new WidgetIndicatorLegend(host, { onToggleVisible: () => {}, onSettings: () => {}, onRemove: () => {}, onStackResize: (size) => sizes.push(size) }, LABELS);
    const stack = host.querySelectorAll<HTMLElement>('.tcw-ind-legend')[1];
    const observer = FakeResizeObserver.all.find((o) => o.observed.has(stack))!;
    expect(observer).toBeDefined();
    told.update([row('EMA 21', ['98,159.48'])], { left: 8, top: 41 });
    // Laid out: its border box, the rows and the toggle in it.
    Object.defineProperty(stack, 'offsetWidth', { configurable: true, value: 214 });
    Object.defineProperty(stack, 'offsetHeight', { configurable: true, value: 58 });
    observer.resize(stack, 214);
    Object.defineProperty(stack, 'offsetHeight', { configurable: true, value: 0 });
    observer.resize(stack, 0);
    expect(sizes).toEqual([{ width: 214, height: 58 }, null]);
    told.destroy();
    expect(observer.disconnected).toBe(true);
  });
});

/** A tap, a click or a press by `pointerType` on `el`: jsdom has no PointerEvent, so a MouseEvent named for it. */
function press(el: Element, pointerType: 'touch' | 'mouse' | 'pen'): void {
  // Composed, as a browser's are: they reach the document from inside a shadow root.
  const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(down, 'pointerType', { value: pointerType });
  el.dispatchEvent(down);
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
}

// On a phone each row showed its four buttons at all times: two EMAs covered 170×50 px of candles.
describe('a legend row under a finger', () => {
  let settings: string[];
  beforeEach(() => {
    legend.destroy();
    settings = [];
    legend = new WidgetIndicatorLegend(host, { onToggleVisible: () => {}, onSettings: (id) => settings.push(id), onRemove: () => {} }, LABELS);
    legend.update([row('EMA 20', ['1']), row('EMA 50', ['2'])], { left: 0, top: 0 });
  });
  const rowOf = (id: string) => host.querySelector<HTMLElement>(`[data-instance="${id}"]`)!;
  const nameOf = (id: string) => rowOf(id).querySelector<HTMLElement>('.tcw-ind-legend-name')!;
  const isOpen = (id: string) => rowOf(id).classList.contains('tcw-ind-legend-row--open');

  it('opens on a tap to show its buttons, rather than opening the settings', () => {
    expect(isOpen('EMA 20')).toBe(false);
    press(nameOf('EMA 20'), 'touch');
    expect(isOpen('EMA 20')).toBe(true);
    expect(settings).toEqual([]);
  });

  it('opens the settings on a tap of the name once open', () => {
    press(nameOf('EMA 20'), 'touch');
    press(nameOf('EMA 20'), 'touch');
    expect(settings).toEqual(['EMA 20']);
  });

  it('closes on a tap of the row again, of another row, or outside the legend', () => {
    press(rowOf('EMA 20'), 'touch');
    press(rowOf('EMA 20'), 'touch');
    expect(isOpen('EMA 20')).toBe(false);
    press(rowOf('EMA 20'), 'touch');
    press(nameOf('EMA 50'), 'touch');
    expect(isOpen('EMA 20')).toBe(false);
    expect(isOpen('EMA 50')).toBe(true);
    press(document.body, 'touch');
    expect(isOpen('EMA 50')).toBe(false);
  });

  it('stays open while one of its buttons is used', () => {
    press(nameOf('EMA 20'), 'touch');
    press(rowOf('EMA 20').querySelector('[data-act="visible"]')!, 'touch');
    expect(isOpen('EMA 20')).toBe(true);
  });

  it('opens the settings at once on a click of the mouse, as before', () => {
    press(nameOf('EMA 20'), 'mouse');
    expect(settings).toEqual(['EMA 20']);
    expect(isOpen('EMA 20')).toBe(false);
  });

  it('opens the settings from the keyboard, with no pointer before the click', () => {
    press(nameOf('EMA 20'), 'touch');
    press(document.body, 'touch');
    nameOf('EMA 50').click();
    expect(settings).toEqual(['EMA 50']);
  });

  it('opens the settings at once when every button is switched off, with nothing to show', () => {
    rowOf('EMA 20').querySelector<HTMLElement>('.tcw-ind-legend-actions')!.style.display = 'none';
    press(nameOf('EMA 20'), 'touch');
    expect(settings).toEqual(['EMA 20']);
    expect(isOpen('EMA 20')).toBe(false);
  });

  // A touch that scrolled ends in pointercancel, with no click: the next Enter on a name is the keyboard's.
  it('opens the settings from the keyboard after a touch that ended with no tap', () => {
    const down = new MouseEvent('pointerdown', { bubbles: true });
    Object.defineProperty(down, 'pointerType', { value: 'touch' });
    nameOf('EMA 20').dispatchEvent(down);
    nameOf('EMA 20').dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }));
    nameOf('EMA 20').click();
    expect(settings).toEqual(['EMA 20']);
  });

  it('opens the settings from the keyboard on another row than the one a finger pressed', () => {
    const down = new MouseEvent('pointerdown', { bubbles: true });
    Object.defineProperty(down, 'pointerType', { value: 'touch' });
    nameOf('EMA 20').dispatchEvent(down);
    nameOf('EMA 50').click();
    expect(settings).toEqual(['EMA 50']);
  });

  it('goes by the click’s own pointer where the browser names it', () => {
    const tap = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(tap, 'pointerType', { value: 'touch' });
    nameOf('EMA 20').dispatchEvent(tap);
    expect(isOpen('EMA 20')).toBe(true);
    // Enter on a focused name: a click with no pointer.
    const key = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(key, 'pointerType', { value: '' });
    nameOf('EMA 50').dispatchEvent(key);
    expect(settings).toEqual(['EMA 50']);
  });

  it('closes when the legend is collapsed', () => {
    press(nameOf('EMA 20'), 'touch');
    host.querySelector<HTMLButtonElement>('.tcw-ind-legend-toggle')!.click();
    expect(isOpen('EMA 20')).toBe(false);
  });

  it('opens on no tap with each of its buttons switched off, though their holder shows', () => {
    for (const b of rowOf('EMA 20').querySelectorAll<HTMLElement>('.tcw-ind-legend-act')) b.style.display = 'none';
    press(nameOf('EMA 20'), 'touch');
    expect(isOpen('EMA 20')).toBe(false);
    expect(settings).toEqual(['EMA 20']);
  });

  it('stays open under a press inside it from a shadow root, where the target is the shadow’s host', () => {
    const outer = document.createElement('div');
    document.body.appendChild(outer);
    const shadow = outer.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);
    legend.destroy();
    legend = new WidgetIndicatorLegend(inner, { onToggleVisible: () => {}, onSettings: (id) => settings.push(id), onRemove: () => {} }, LABELS);
    legend.update([row('EMA 20', ['1'])], { left: 0, top: 0 });
    const name = inner.querySelector<HTMLElement>('.tcw-ind-legend-name')!;
    press(name, 'touch');
    press(name, 'touch');
    expect(settings).toEqual(['EMA 20']);
    outer.remove();
  });

  it('stops listening outside once the legend is gone', () => {
    press(nameOf('EMA 20'), 'touch');
    const open = rowOf('EMA 20');
    legend.destroy();
    press(document.body, 'touch');
    expect(open.classList.contains('tcw-ind-legend-row--open')).toBe(true);
  });
});

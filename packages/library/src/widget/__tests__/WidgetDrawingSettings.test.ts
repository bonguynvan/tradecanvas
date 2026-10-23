// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DrawingOptionDefs } from '@tradecanvas/commons';
import { WidgetDrawingSettings, type DrawingSettingsTarget, type DrawingTemplateLook } from '../WidgetDrawingSettings.js';
import { DrawingTemplateStore, type KeyValueStorage } from '../DrawingTemplateStore.js';

const FIB_DEFS: DrawingOptionDefs = {
  levels: { kind: 'levels', label: 'Levels', default: [{ value: 0, visible: true }, { value: 0.5, visible: true }] },
  extendLeft: { kind: 'boolean', label: 'Extend left', default: false },
  labelPosition: { kind: 'choice', label: 'Labels', default: 'left', choices: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
};

const END = [{ value: 'normal', label: 'Normal' }, { value: 'arrow', label: 'Arrow' }];
const LINE_DEFS: DrawingOptionDefs = {
  extendLeft: { kind: 'boolean', label: 'Extend left', default: false },
  leftEnd: { kind: 'choice', label: 'Left end', default: 'normal', choices: END },
  rightEnd: { kind: 'choice', label: 'Right end', default: 'normal', choices: END },
  showAngle: { kind: 'boolean', label: 'Show angle', default: false },
};

const fib = (): DrawingSettingsTarget => ({
  id: 'd1',
  type: 'fibRetracement',
  name: 'Fibonacci Retracement',
  style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid', fillColor: 'rgba(76, 141, 255, 0.1)' },
  options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: true }], extendLeft: false, labelPosition: 'left' },
  defs: FIB_DEFS,
  anchors: [{ time: 1000, price: 10 }, { time: 2000, price: 20 }],
  fill: true,
  text: false,
});

const trendLine = (): DrawingSettingsTarget => ({
  id: 'd2',
  type: 'trendLine',
  name: 'Trend Line',
  style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' },
  options: { extendLeft: false, leftEnd: 'normal', rightEnd: 'normal', showAngle: false },
  defs: LINE_DEFS,
  anchors: [{ time: 1000, price: 10 }, { time: 2000, price: 20 }],
  fill: false,
  text: false,
  intervals: { minutes: false },
});

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

let host: HTMLDivElement;
let dialog: WidgetDrawingSettings;
let store: DrawingTemplateStore;
let calls: { begin: string[]; change: unknown[]; end: [string, boolean][]; defaults: unknown[]; saved: DrawingTemplateLook[] };

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = { begin: [], change: [], end: [], defaults: [], saved: [] };
  store = new DrawingTemplateStore('t', new MemoryStorage());
  dialog = new WidgetDrawingSettings(host, {
    onBegin: (id) => calls.begin.push(id),
    onChange: (_id, patch) => calls.change.push(patch),
    onEnd: (id, cancel) => calls.end.push([id, cancel]),
    toWallTime: (time) => ({ date: '2026-01-02', time: `00:0${time / 1000}` }),
    fromWallTime: (date, time) => (date === '2026-01-03' ? 3000 : time === '00:05' ? 5000 : null),
    onSaveDefault: (type, options) => calls.defaults.push([type, options]),
    templates: {
      list: (type) => store.list(type),
      save: (look) => calls.saved.push(look),
      remove: (name, type) => store.remove(name, type),
    },
  });
});

afterEach(() => {
  dialog.destroy();
  host.remove();
  document.body.replaceChildren();
});

const tabNames = () => [...host.querySelectorAll('[role=tab]')].map((t) => t.textContent);
const tab = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => b.textContent === name)!;
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-settings-row')];
const row = (label: string) => rows().find((r) => r.querySelector('.tcw-settings-label')?.textContent === label)!;
const labelled = <T extends HTMLElement>(label: string) => host.querySelector<T>(`[aria-label="${label}"]`)!;
const footer = (act: string) => host.querySelector<HTMLButtonElement>(`.tcw-modal-footer [data-act="${act}"]`)!;
const menuItems = () => [...host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
const change = (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string, type = 'change') => {
  el.value = value;
  el.dispatchEvent(new Event(type));
};

describe('WidgetDrawingSettings: tabs', () => {
  it('opens on the drawing with Style, Coordinates and Visibility tabs', () => {
    dialog.open(fib());
    expect(calls.begin).toEqual(['d1']);
    expect(tabNames()).toEqual(['Style', 'Coordinates', 'Visibility']);
    expect(host.querySelector('h3')?.textContent).toBe('Fibonacci Retracement');
  });

  it('adds a Text tab for a tool that writes, and leaves Coordinates out of a long stroke', () => {
    dialog.open({ ...fib(), text: true });
    expect(tabNames()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
    dialog.close(false);
    const stroke = Array.from({ length: 40 }, (_, i) => ({ time: i, price: i }));
    dialog.open({ ...fib(), anchors: stroke });
    expect(tabNames()).toEqual(['Style', 'Visibility']);
  });

  it('moves between tabs with the arrow keys', () => {
    dialog.open(fib());
    tab('Style').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(tab('Coordinates'));
    expect(tab('Coordinates').getAttribute('aria-selected')).toBe('true');
  });

  it('moves the other way right to left', () => {
    host.setAttribute('dir', 'rtl');
    dialog.open(fib());
    tab('Style').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(tab('Coordinates'));
  });
});

describe('WidgetDrawingSettings: the Style tab', () => {
  it('sets the line’s colour, width and dash in one row, at once', () => {
    dialog.open(fib());
    const line = row('Line');
    change(line.querySelector<HTMLInputElement>('input[type=color]')!, '#ff0000', 'input');
    change(labelled<HTMLSelectElement>('Line width'), '3');
    change(labelled<HTMLSelectElement>('Line style'), 'dashed');
    expect(line.contains(labelled('Line width'))).toBe(true);
    expect(calls.change).toEqual([
      { style: { color: '#ff0000' } },
      { style: { lineWidth: 3 } },
      { style: { lineStyle: 'dashed' } },
    ]);
  });

  it('sets the fill and its opacity', () => {
    dialog.open(fib());
    change(row('Fill').querySelector<HTMLInputElement>('input[type=color]')!, '#00ff00', 'input');
    change(labelled<HTMLInputElement>('Opacity (%)'), '50');
    expect(calls.change).toEqual([
      { style: { fillColor: 'rgba(0, 255, 0, 0.1)', fillOpacity: 0.1 } },
      { style: { fillColor: 'rgba(0, 255, 0, 0.5)', fillOpacity: 0.5 } },
    ]);
  });

  it('ticks the tool’s switches and picks its choices under the line', () => {
    dialog.open(fib());
    const extend = row('Extend left').querySelector<HTMLInputElement>('input[type=checkbox]')!;
    expect(extend.checked).toBe(false);
    extend.click();
    change(row('Labels').querySelector('select')!, 'right');
    expect(calls.change).toEqual([
      { options: { extendLeft: true } },
      { options: { labelPosition: 'right' } },
    ]);
  });

  it('edits the levels under the rest', () => {
    dialog.open(fib());
    const [, second] = [...host.querySelectorAll<HTMLElement>('.tcw-level-row')];
    second.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    expect(calls.change).toEqual([{ options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: false }] } }]);
    host.querySelector<HTMLButtonElement>('.tcw-level-add')!.click();
    expect(calls.change.at(-1)).toEqual({ options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: false }, { value: 1, visible: true }] } });
    expect(host.querySelectorAll('.tcw-level-row')).toHaveLength(3);
  });

  it('keeps the levels and an unset fill on the line’s colour as it changes', () => {
    const levels = [{ value: 0, visible: true }, { value: 0.5, visible: true, color: '#00ff00' }];
    dialog.open({ ...fib(), style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' }, options: { ...fib().options, levels } });
    change(labelled<HTMLInputElement>('Color'), '#ff0000', 'input');
    expect(labelled<HTMLInputElement>('Level color 1').value).toBe('#ff0000');
    expect(labelled<HTMLInputElement>('Level color 2').value).toBe('#00ff00');
    expect(row('Fill').querySelector<HTMLInputElement>('input[type=color]')!.value).toBe('#ff0000');
    change(labelled<HTMLInputElement>('Opacity (%)'), '30');
    expect(calls.change.at(-1)).toEqual({ style: { fillColor: 'rgba(255, 0, 0, 0.3)', fillOpacity: 0.3 } });
  });

  it('keeps the keyboard in the levels after adding or removing one', () => {
    dialog.open(fib());
    host.querySelector<HTMLButtonElement>('.tcw-level-add')!.click();
    expect(document.activeElement).toBe(labelled('Level 3'));
    labelled<HTMLButtonElement>('Remove level 1').click();
    expect(document.activeElement).toBe(labelled('Remove level 1'));
  });

  it('lists an option named like a line end with the rest when it is not a choice of ends', () => {
    dialog.open({ ...fib(), defs: { leftEnd: { kind: 'boolean', label: 'Left end', default: false } }, options: { leftEnd: false } });
    expect(row('Line ends')).toBeUndefined();
    expect(row('Left end').querySelector('input[type=checkbox]')).not.toBeNull();
  });

  it('offers a line’s ends beside each other, not as rows of their own', () => {
    dialog.open(trendLine());
    const ends = row('Line ends');
    expect(ends.contains(labelled('Left end'))).toBe(true);
    expect([...labelled<HTMLSelectElement>('Right end').options].map((o) => o.textContent)).toEqual(['Normal', 'Arrow']);
    change(labelled<HTMLSelectElement>('Right end'), 'arrow');
    expect(calls.change).toEqual([{ options: { rightEnd: 'arrow' } }]);
    expect(rows().map((r) => r.querySelector('.tcw-settings-label')?.textContent)).toEqual(['Line', 'Line ends', 'Extend left', 'Show angle']);
  });
});

describe('WidgetDrawingSettings: Text, Coordinates and Visibility', () => {
  it('writes the text and sizes it on the Text tab', () => {
    dialog.open({ ...fib(), text: true, style: { ...fib().style, text: 'Hi', fontSize: 12 } });
    tab('Text').click();
    const text = row('Text').querySelector('textarea')!;
    expect(text.value).toBe('Hi');
    change(text, 'Hello', 'input');
    change(row('Font size').querySelector('select')!, '16');
    expect(calls.change).toEqual([{ style: { text: 'Hello' } }, { style: { fontSize: 16 } }]);
  });

  it('shows anchor prices on the market’s grid, and puts an edited one on it', () => {
    const changes: unknown[] = [];
    const grid = new WidgetDrawingSettings(host, {
      onBegin: () => {},
      onChange: (_id, patch) => changes.push(patch),
      onEnd: () => {},
      toWallTime: () => ({ date: '2026-01-02', time: '00:00' }),
      fromWallTime: () => null,
      roundPrice: (price) => Number((Math.round(price / 0.25) * 0.25).toFixed(2)),
      priceStep: () => 0.25,
    });
    grid.open({ ...fib(), anchors: [{ time: 1000, price: 534.86074226 }, { time: 2000, price: 20 }] });
    tab('Coordinates').click();
    const prices = [...host.querySelectorAll<HTMLInputElement>('input[type=number]')];
    expect(prices.map((p) => p.value)).toEqual(['534.75', '20']);
    expect(prices[0].step).toBe('0.25');

    change(prices[1], '20.1');
    expect(prices[1].value).toBe('20');
    // Only the edited point moves: the other keeps its exact price.
    expect(changes).toEqual([{ anchors: [{ time: 1000, price: 534.86074226 }, { time: 2000, price: 20 }] }]);
    change(prices[0], '534.9');
    expect(changes.at(-1)).toEqual({ anchors: [{ time: 1000, price: 535 }, { time: 2000, price: 20 }] });
    grid.destroy();
  });

  it('moves each point by its price, date and time, on a row of its own', () => {
    dialog.open(fib());
    tab('Coordinates').click();
    expect(rows().map((r) => r.querySelector('.tcw-settings-label')?.textContent)).toEqual(['Point 1', 'Point 2']);
    const second = row('Point 2');
    change(second.querySelector<HTMLInputElement>('input[type=date]')!, '2026-01-03');
    change(row('Point 1').querySelector<HTMLInputElement>('input[type=number]')!, '12.5');
    expect(second.querySelector('input[type=number]')!.getAttribute('aria-label')).toBe('Point 2: Price');
    expect(calls.change).toEqual([
      { anchors: [{ time: 1000, price: 10 }, { time: 3000, price: 20 }] },
      { anchors: [{ time: 1000, price: 12.5 }, { time: 3000, price: 20 }] },
    ]);
  });

  it('keeps the drawing to the intervals ticked on the Visibility tab', () => {
    dialog.open(trendLine());
    tab('Visibility').click();
    const unit = (name: string) => host.querySelector<HTMLInputElement>(`[data-unit="${name}"] input[type=checkbox]`)!;
    expect(unit('minutes').checked).toBe(false);
    expect(unit('hours').checked).toBe(true);
    unit('hours').click();
    unit('minutes').click();
    expect(calls.change).toEqual([
      { intervals: { minutes: false, hours: false } },
      { intervals: { hours: false } },
    ]);
  });
});

describe('WidgetDrawingSettings: Template, Cancel and OK', () => {
  it('keeps the edits on OK and puts the drawing back on Cancel or Escape', () => {
    dialog.open(fib());
    footer('ok').click();
    dialog.open(fib());
    footer('cancel').click();
    dialog.open(fib());
    host.querySelector('[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(calls.end).toEqual([['d1', false], ['d1', true], ['d1', true]]);
    expect(dialog.isOpen()).toBe(false);
  });

  it('saves the drawing’s look as a template from the Template menu', () => {
    dialog.open(fib());
    footer('template').click();
    expect(menuItems().map((b) => b.textContent)).toEqual(['Save as template…', 'Save as default', 'Reset to defaults']);
    menuItems()[0].click();
    expect(calls.saved).toEqual([{ type: 'fibRetracement', style: fib().style, options: fib().options }]);
  });

  it('applies a saved template, the tool’s options with it, and deletes one', () => {
    store.save('Gold', { color: '#d4a017', lineWidth: 2 }, { type: 'fibRetracement', options: { extendLeft: true, bogus: 1 } });
    store.save('Thin', { lineWidth: 1 });
    store.save('Other tool', { lineWidth: 4 }, { type: 'trendLine', options: {} });
    dialog.open(fib());
    footer('template').click();
    expect(menuItems().slice(0, 2).map((b) => b.textContent)).toEqual(['Gold', 'Thin']);
    menuItems()[0].click();
    expect(calls.change).toEqual([
      { style: { color: '#d4a017', lineWidth: 2 } },
      { options: { extendLeft: true } },
    ]);
    expect(row('Extend left').querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true);
    footer('template').click();
    host.querySelector<HTMLButtonElement>('.tcw-context-remove')!.click();
    expect(store.list('fibRetracement').map((t) => t.name)).toEqual(['Thin']);
  });

  it('resets the options, or keeps them as the tool’s default', () => {
    dialog.open(fib());
    row('Extend left').querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    footer('template').click();
    menuItems().find((b) => b.textContent === 'Save as default')!.click();
    expect(calls.defaults).toEqual([['fibRetracement', { ...fib().options, extendLeft: true }]]);
    footer('template').click();
    menuItems().find((b) => b.textContent === 'Reset to defaults')!.click();
    expect(calls.change.at(-1)).toEqual({ options: fib().options });
    expect(row('Extend left').querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(false);
  });
});

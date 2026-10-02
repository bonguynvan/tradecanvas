// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DrawingOptionDefs } from '@tradecanvas/commons';
import { WidgetDrawingSettings, type DrawingSettingsTarget } from '../WidgetDrawingSettings.js';
import { DrawingTemplateStore, type KeyValueStorage } from '../DrawingTemplateStore.js';

const DEFS: DrawingOptionDefs = {
  levels: { kind: 'levels', label: 'Levels', default: [{ value: 0, visible: true }, { value: 0.5, visible: true }] },
  extendLeft: { kind: 'boolean', label: 'Extend left', default: false },
  labelPosition: { kind: 'choice', label: 'Labels', default: 'left', choices: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
};

const target = (): DrawingSettingsTarget => ({
  id: 'd1',
  type: 'fibRetracement',
  name: 'Fibonacci Retracement',
  style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid', fillColor: 'rgba(76, 141, 255, 0.1)' },
  options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: true }], extendLeft: false, labelPosition: 'left' },
  defs: DEFS,
  anchors: [{ time: 1000, price: 10 }, { time: 2000, price: 20 }],
  fill: true,
  text: false,
});

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

let host: HTMLDivElement;
let dialog: WidgetDrawingSettings;
let calls: { begin: string[]; change: unknown[]; end: [string, boolean][]; defaults: unknown[] };

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = { begin: [], change: [], end: [], defaults: [] };
  dialog = new WidgetDrawingSettings(host, {
    onBegin: (id) => calls.begin.push(id),
    onChange: (_id, patch) => calls.change.push(patch),
    onEnd: (id, cancel) => calls.end.push([id, cancel]),
    toWallTime: (time) => ({ date: '2026-01-02', time: `00:0${time / 1000}` }),
    fromWallTime: (date, time) => (date === '2026-01-03' ? 3000 : time === '00:05' ? 5000 : null),
    onSaveDefault: (type, options) => calls.defaults.push([type, options]),
    templates: new DrawingTemplateStore('t', new MemoryStorage()),
  });
});

afterEach(() => {
  dialog.destroy();
  host.remove();
});

const tab = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => b.textContent === name)!;
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-settings-row')];
const row = (label: string) => rows().find((r) => r.querySelector('.tcw-settings-label')?.textContent === label)!;
const change = (el: HTMLInputElement | HTMLSelectElement, value: string, type = 'change') => {
  el.value = value;
  el.dispatchEvent(new Event(type));
};

describe('WidgetDrawingSettings', () => {
  it('opens on the drawing with style, properties and coordinates tabs', () => {
    dialog.open(target());
    expect(calls.begin).toEqual(['d1']);
    expect([...host.querySelectorAll('[role=tab]')].map((t) => t.textContent)).toEqual(['Style', 'Properties', 'Coordinates']);
    expect(host.querySelector('h3')?.textContent).toBe('Fibonacci Retracement');
  });

  it('applies style edits at once', () => {
    dialog.open(target());
    change(row('Line width').querySelector('select')!, '3');
    change(row('Color').querySelector('input')!, '#ff0000', 'input');
    change(row('Opacity (%)').querySelector('input')!, '50');
    expect(calls.change).toEqual([
      { style: { lineWidth: 3 } },
      { style: { color: '#ff0000' } },
      { style: { fillColor: 'rgba(76, 141, 255, 0.5)', fillOpacity: 0.5 } },
    ]);
  });

  it('edits the tool’s options and levels', () => {
    dialog.open(target());
    tab('Properties').click();
    (row('Extend left').querySelector('[role=switch]') as HTMLButtonElement).click();
    change(row('Labels').querySelector('select')!, 'right');
    const [, second] = [...host.querySelectorAll<HTMLElement>('.tcw-level-row')];
    (second.querySelector('input[type=checkbox]') as HTMLInputElement).click();
    expect(calls.change).toEqual([
      { options: { extendLeft: true } },
      { options: { labelPosition: 'right' } },
      { options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: false }] } },
    ]);
    host.querySelector<HTMLButtonElement>('.tcw-level-add')!.click();
    expect(calls.change.at(-1)).toEqual({ options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: false }, { value: 1, visible: true }] } });
    expect(host.querySelectorAll('.tcw-level-row')).toHaveLength(3);
  });

  it('resets the options and saves them as the tool’s default', () => {
    dialog.open(target());
    tab('Properties').click();
    (row('Extend left').querySelector('[role=switch]') as HTMLButtonElement).click();
    [...host.querySelectorAll<HTMLButtonElement>('.tcw-drawing-settings-tools button')].find((b) => b.textContent === 'Save as default')!.click();
    expect(calls.defaults).toEqual([['fibRetracement', { levels: [{ value: 0, visible: true }, { value: 0.5, visible: true }], extendLeft: true, labelPosition: 'left' }]]);
    [...host.querySelectorAll<HTMLButtonElement>('.tcw-drawing-settings-tools button')].find((b) => b.textContent === 'Reset to defaults')!.click();
    expect(calls.change.at(-1)).toEqual({ options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: true }], extendLeft: false, labelPosition: 'left' } });
  });

  it('moves anchors by date, time and price', () => {
    dialog.open(target());
    tab('Coordinates').click();
    const dates = host.querySelectorAll<HTMLInputElement>('input[type=date]');
    const prices = [...host.querySelectorAll<HTMLInputElement>('input[type=number]')];
    change(dates[1], '2026-01-03');
    change(prices[0], '12.5');
    expect(calls.change).toEqual([
      { anchors: [{ time: 1000, price: 10 }, { time: 3000, price: 20 }] },
      { anchors: [{ time: 1000, price: 12.5 }, { time: 3000, price: 20 }] },
    ]);
  });

  it('keeps the edits on OK and puts the drawing back on Escape', () => {
    dialog.open(target());
    [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'OK')!.click();
    dialog.open(target());
    host.querySelector('[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(calls.end).toEqual([['d1', false], ['d1', true]]);
    expect(dialog.isOpen()).toBe(false);
  });

  it('saves and applies a template with the tool’s options', () => {
    dialog.open(target());
    const name = host.querySelector<HTMLInputElement>('.tcw-style-name')!;
    name.value = 'Mine';
    host.querySelector<HTMLButtonElement>('.tcw-style-savebtn')!.click();
    calls.change = [];
    host.querySelector<HTMLButtonElement>('.tcw-style-tmpl-apply')!.click();
    expect(calls.change).toEqual([
      { style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid', fillColor: 'rgba(76, 141, 255, 0.1)' } },
      { options: target().options },
    ]);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EN_TRANSLATOR } from '../i18n.js';
import { WidgetCommandPalette, type CommandItem } from '../WidgetCommandPalette.js';

let host: HTMLDivElement;
let opener: HTMLButtonElement;
let palette: WidgetCommandPalette;
let calls: string[];
let recent: string[];

const items: CommandItem[] = [
  { id: 'cmo', label: 'Chande Momentum', category: 'indicator' },
  { id: 'connorsrsi', label: 'Connors RSI', category: 'indicator' },
  { id: 'rsi', label: 'Relative Strength Index', category: 'indicator', active: true },
  { id: 'stochrsi', label: 'Stochastic RSI', category: 'indicator' },
  { id: 'candlestick', label: 'Candles', category: 'chartType', active: true },
  { id: 'trendLine', label: 'Trend Line', category: 'drawing', shortcut: 'Alt+T' },
  { id: '1h', label: '1H', category: 'timeframe' },
  { id: 'goToDate', label: 'Go to date', category: 'action', shortcut: 'Alt+G' },
];

const input = () => host.querySelector<HTMLInputElement>('.tcw-cp-input')!;
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-cp-row')];
const labels = () => rows().map((r) => r.querySelector('.tcw-cp-label')?.textContent);
const headings = () => [...host.querySelectorAll<HTMLElement>('.tcw-cp-heading')].map((h) => h.textContent);
const key = (k: string, init: KeyboardEventInit = {}) =>
  input().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const type = (text: string) => {
  input().value = text;
  input().dispatchEvent(new Event('input'));
};

beforeEach(() => {
  host = document.createElement('div');
  opener = document.createElement('button');
  document.body.append(host, opener);
  opener.focus();
  calls = [];
  recent = [];
  palette = new WidgetCommandPalette({
    onIndicator: (id) => calls.push(`indicator:${id}`),
    onChartType: (id) => calls.push(`chartType:${id}`),
    onDrawingTool: (id) => calls.push(`drawing:${id}`),
    onTimeframe: (id) => calls.push(`timeframe:${id}`),
    onAction: (id) => calls.push(`action:${id}`),
    onClose: () => {},
  }, () => host, EN_TRANSLATOR, {
    list: () => [...recent],
    add: (k) => { recent = [k, ...recent.filter((r) => r !== k)]; },
  });
});

afterEach(() => {
  palette.destroy();
  document.body.innerHTML = '';
});

describe('WidgetCommandPalette', () => {
  it('opens as a dialog: its search in focus, the commands in groups of a listbox', () => {
    palette.open(items);
    const modal = host.querySelector<HTMLElement>('.tcw-modal.tcw-cp')!;
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-label')).toBe('Command palette');
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute('role')).toBe('combobox');
    const listbox = host.querySelector('[role="listbox"]')!;
    expect([...listbox.children].every((el) => el.getAttribute('role') === 'group')).toBe(true);
    // The widget's own commands first, the indicators (a dialog of their own) last.
    expect(headings()).toEqual(['Actions', 'Drawing tools', 'Chart types', 'Timeframes', 'Indicators']);
    expect(rows()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('marks what is on, and writes a command’s shortcut at its end', () => {
    palette.open(items);
    const rsi = rows().find((r) => r.dataset.id === 'rsi')!;
    expect(rsi.classList.contains('tcw-on')).toBe(true);
    expect(rsi.querySelector('.tcw-cp-check')).not.toBeNull();
    const trend = rows().find((r) => r.dataset.id === 'trendLine')!;
    expect(trend.querySelector('kbd')?.textContent).toBe('Alt+T');
  });

  it('finds commands as typed, the best match first in each group', () => {
    palette.open(items);
    type('rsi');
    expect(labels()).toEqual(['Relative Strength Index', 'Connors RSI', 'Stochastic RSI']);
    expect(headings()).toEqual(['Indicators']);
    type('alt+g');
    expect(labels()).toEqual(['Go to date']);
    type('zzz');
    expect(rows()).toHaveLength(0);
    expect(host.querySelector('.tcw-cp-empty')?.textContent).toBe('No results found');
  });

  it('puts the group with the best match first while searching', () => {
    palette.open([...items, { id: 'pgo', label: 'Pretty Good Oscillator', category: 'indicator' }]);
    type('go');
    expect(headings()).toEqual(['Actions', 'Indicators']);
    expect(labels()).toEqual(['Go to date', 'Pretty Good Oscillator']);
  });

  it('runs the command picked with the keys or a click, and shuts, focus back', () => {
    palette.open(items);
    type('rsi');
    key('ArrowDown');
    key('Enter');
    expect(calls).toEqual(['indicator:connorsrsi']);
    expect(palette.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    palette.open(items);
    rows().find((r) => r.dataset.id === 'goToDate')!.click();
    expect(calls).toEqual(['indicator:connorsrsi', 'action:goToDate']);
  });

  it('keeps the commands used last at the top, until something is typed', () => {
    palette.open(items);
    rows().find((r) => r.dataset.id === 'trendLine')!.click();
    palette.open(items);
    expect(headings()[0]).toBe('Recent');
    expect(labels()[0]).toBe('Trend Line');
    type('trend');
    expect(headings()).toEqual(['Drawing tools']);
  });

  it('leaves Enter and Escape to an input method while it composes, and keeps its keys from the chart', () => {
    const chartKeys = vi.fn();
    document.addEventListener('keydown', chartKeys);
    palette.open(items);
    key('Enter', { isComposing: true });
    key('Escape', { isComposing: true });
    expect(palette.isOpen()).toBe(true);
    expect(calls).toEqual([]);
    key('Escape');
    document.removeEventListener('keydown', chartKeys);
    expect(palette.isOpen()).toBe(false);
    expect(chartKeys).not.toHaveBeenCalled();
  });
});

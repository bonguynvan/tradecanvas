// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CHART_STYLE_KEYS, type ChartStyleKey, type ChartType } from '@tradecanvas/commons';
import { WidgetSettings } from '../WidgetSettings.js';
import { SETTINGS_LOOK_KEYS, seriesRows } from '../widgetSettingsLook.js';
import { CHART_TYPES } from '../widgetConfig.js';
import { toHex } from '../settingsControls.js';
import { DEFAULT_SETTINGS } from '../widgetConfig.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { ChartSettingsState } from '../types.js';

let changes: Partial<ChartSettingsState>[];
let calls: string[];
let templates: string[];
let styleChanges: Record<string, unknown>[];
/** The chart's look as it draws it: what a key reads back (null: not set, the part's own). */
let look: Record<string, unknown>;
let settings: WidgetSettings | undefined;

function make(available: ConstructorParameters<typeof WidgetSettings>[2] = {}): WidgetSettings {
  settings?.destroy();
  settings = new WidgetSettings({
    onChange: (p) => changes.push(p),
    onReset: () => calls.push('reset'),
    onClose: () => calls.push('ok'),
    onCancel: () => calls.push('cancel'),
    templates: {
      list: () => templates,
      apply: (name) => calls.push(`apply ${name}`),
      remove: (name) => {
        calls.push(`remove ${name}`);
        templates = templates.filter((t) => t !== name);
      },
      save: () => calls.push('save'),
    },
    styleValue: (key) => (key in look ? look[key] : null) as string | number | boolean | null,
    onStyleChange: (patch) => {
      styleChanges.push(patch);
      for (const [k, v] of Object.entries(patch)) look[k] = v;
    },
  }, EN_TRANSLATOR, available);
  return settings;
}

beforeEach(() => {
  changes = [];
  calls = [];
  templates = ['Night', 'Paper'];
  styleChanges = [];
  look = {
    'series.candlestick.upColor': '#1fa874',
    'series.heikinAshi.upColor': '#1fa874',
    'series.line.color': '#4c8dff',
    'series.line.lineWidth': 2,
    'grid.horizontal.width': 1,
    'grid.horizontal.visible': true,
  };
  make();
});

afterEach(() => {
  settings?.destroy();
  settings = undefined;
  document.body.innerHTML = '';
});

const field = (label: string) => document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('change'));
};
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`[role="tab"][data-tab="${name}"]`)!.click();

describe('settings of the chart’s type', () => {
  it('offers Renko’s box and ATR length, Auto when empty', () => {
    settings!.open({ ...DEFAULT_SETTINGS, chartTypeOptions: { renko: { atrPeriod: 20 } } }, 'renko');
    expect(document.querySelector('.tcw-settings-section-title')?.textContent).toBe('Renko');
    const box = field('Box size')!;
    expect(box.placeholder).toBe('Auto');
    type(box, '2.5');
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { renko: { atrPeriod: 20, boxSize: 2.5 } } });
    type(box, '');
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { renko: { atrPeriod: 20, boxSize: 'atr' } } });
    type(field('ATR length')!, '');
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { renko: { boxSize: 'atr' } } });
  });

  it('takes no box of 0 or below, and no fraction of a line', () => {
    settings!.open(DEFAULT_SETTINGS, 'renko');
    type(field('Box size')!, '-1');
    expect(changes).toEqual([]);
    expect(field('Box size')!.getAttribute('aria-invalid')).not.toBeNull();
    settings!.close();
    settings!.open(DEFAULT_SETTINGS, 'lineBreak');
    type(field('Lines to break')!, '2.5');
    expect(changes).toEqual([]);
    type(field('Lines to break')!, '2');
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { lineBreak: { lines: 2 } } });
  });

  it('sets Kagi’s reversal in percent or price', () => {
    settings!.open(DEFAULT_SETTINGS, 'kagi');
    const select = document.querySelector<HTMLSelectElement>('.tcw-settings-section select')!;
    select.value = 'price';
    select.dispatchEvent(new Event('change'));
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { kagi: { reversalType: 'price' } } });
  });

  it('has only colours for a chart type without settings', () => {
    settings!.open(DEFAULT_SETTINGS, 'candlestick');
    expect(field('Box size')).toBeNull();
    expect(document.querySelector('.tcw-settings-section-title')?.textContent).toBe('Candlestick');
    expect(field('Up body')!.value).toBe('#1fa874');
  });
});

const section = (title: string) => document.querySelector<HTMLElement>(`.tcw-settings-section[aria-label="${title}"]`);
const pick = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input'));
};
const choose = (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event('change'));
};
const colourLabels = (el: HTMLElement) => [...el.querySelectorAll('input[type="color"]')].map((i) => i.getAttribute('aria-label'));

describe('the look by key', () => {
  it('sets the colours of the chart type on view, under its name', () => {
    settings!.open(DEFAULT_SETTINGS, 'heikinAshi');
    const own = section('Heikin-Ashi')!;
    expect(colourLabels(own)).toEqual(['Up body', 'Down body', 'Up wick', 'Down wick']);
    pick(own.querySelector<HTMLInputElement>('input[aria-label="Up body"]')!, '#00ff00');
    expect(styleChanges.at(-1)).toEqual({ 'series.heikinAshi.upColor': '#00ff00' });
    expect(changes).toEqual([]);
  });

  it('keeps a chart type’s own settings with its colours', () => {
    settings!.open(DEFAULT_SETTINGS, 'renko');
    const own = section('Renko')!;
    expect(own.querySelector('input[aria-label="Box size"]')).not.toBeNull();
    expect(colourLabels(own)).toEqual(['Up', 'Down']);
  });

  it('gives a line its colour and its width', () => {
    settings!.open(DEFAULT_SETTINGS, 'line');
    const own = section('Line')!;
    expect(own.querySelector<HTMLInputElement>('input[aria-label="Color"]')!.value).toBe('#4c8dff');
    const width = own.querySelector<HTMLSelectElement>('select[aria-label="Line width"]')!;
    expect(width.value).toBe('2');
    choose(width, '3');
    expect(styleChanges.at(-1)).toEqual({ 'series.line.lineWidth': 3 });
  });

  it('sets one row’s keys together, each of its kind', () => {
    settings!.open(DEFAULT_SETTINGS, 'candlestick');
    expect(section('Volume')).not.toBeNull();
    tab('appearance');
    const grid = section('Grid lines')!;
    choose(grid.querySelector<HTMLSelectElement>('select[aria-label="Line width"]')!, '2');
    expect(styleChanges.at(-1)).toEqual({ 'grid.horizontal.width': 2, 'grid.vertical.width': 2 });
    grid.querySelector<HTMLButtonElement>('button[aria-label="Horizontal"]')!.click();
    expect(styleChanges.at(-1)).toEqual({ 'grid.horizontal.visible': false });
    expect(section('Crosshair')!.querySelector('input[aria-label="Label background"]')).not.toBeNull();
  });

  it('shows a colour left to the part itself as Auto, and takes it back there', () => {
    settings!.open(DEFAULT_SETTINGS);
    tab('trading');
    const orders = section('Orders and positions')!;
    const buy = orders.querySelector<HTMLInputElement>('input[aria-label="Buy"]')!;
    const row = buy.closest('.tcw-settings-row')!;
    expect(row.querySelector('.tcw-color-hex')!.textContent).toBe('Auto');
    // The picker starts from the colour the part draws without one.
    expect(buy.value).toBe('#1fa874');
    expect(row.querySelector('button.tcw-color-auto-btn')).toBeNull();
    pick(buy, '#00ff00');
    expect(styleChanges.at(-1)).toEqual({ 'trading.buyColor': '#00ff00' });
    expect(row.querySelector('.tcw-color-hex')!.textContent).toBe('#00ff00');
    row.querySelector<HTMLButtonElement>('button.tcw-color-auto-btn')!.click();
    expect(styleChanges.at(-1)).toEqual({ 'trading.buyColor': null });
    expect(row.querySelector('.tcw-color-hex')!.textContent).toBe('Auto');
    expect(row.querySelector('button.tcw-color-auto-btn')).toBeNull();
    expect(section('Signal markers')!.querySelector('input[aria-label="Neutral"]')).not.toBeNull();
    expect(section('Trade zones')!.querySelector('input[aria-label="Open"]')).not.toBeNull();
  });

  it('offers no order colours on a chart without trading', () => {
    make({ trading: false }).open(DEFAULT_SETTINGS);
    tab('trading');
    expect(section('Orders and positions')).toBeNull();
    expect(section('Signal markers')).not.toBeNull();
  });

  it('gives a dash left to the part an Auto choice', () => {
    settings!.open(DEFAULT_SETTINGS);
    tab('appearance');
    const breaks = section('Session breaks')!.querySelector<HTMLSelectElement>('select[aria-label="Line style"]')!;
    expect(breaks.value).toBe('');
    choose(breaks, 'dotted');
    expect(styleChanges.at(-1)).toEqual({ 'sessionBreaks.style': 'dotted' });
    choose(breaks, '');
    expect(styleChanges.at(-1)).toEqual({ 'sessionBreaks.style': null });
  });

  it('shows the rows a change moves too, as the chart draws them', () => {
    settings!.open(DEFAULT_SETTINGS, 'heikinAshi');
    const own = section('Heikin-Ashi')!;
    const wick = own.querySelector<HTMLInputElement>('input[aria-label="Up wick"]')!;
    // The chart: a wick without its own colour takes its body's.
    look['series.heikinAshi.wickUpColor'] = '#1fa874';
    const onStyle = styleChanges.push.bind(styleChanges);
    styleChanges.push = (patch: Record<string, unknown>) => {
      if ('series.heikinAshi.upColor' in patch) look['series.heikinAshi.wickUpColor'] = patch['series.heikinAshi.upColor'];
      return onStyle(patch);
    };
    pick(own.querySelector<HTMLInputElement>('input[aria-label="Up body"]')!, '#00ff00');
    expect(wick.value).toBe('#00ff00');
  });

  it('shows the colour the chart still draws when Auto leaves one the host set', () => {
    // The host's colour under the user's: taken off the user's layer, it shows through.
    let user: unknown = null;
    Object.defineProperty(look, 'trading.sellColor', {
      get: () => user ?? '#aa0000',
      set: (v: unknown) => { user = v; },
      enumerable: true,
      configurable: true,
    });
    settings!.open(DEFAULT_SETTINGS);
    tab('trading');
    const sell = section('Orders and positions')!.querySelector<HTMLInputElement>('input[aria-label="Sell"]')!;
    const row = sell.closest('.tcw-settings-row')!;
    pick(sell, '#00ff00');
    row.querySelector<HTMLButtonElement>('button.tcw-color-auto-btn')!.click();
    expect(row.querySelector('.tcw-color-hex')!.textContent).toBe('#aa0000');
    expect(document.activeElement).toBe(sell);
  });

  it('shows no dash where the two ways differ, so a pick sets both', () => {
    look['grid.horizontal.style'] = 'dotted';
    look['grid.vertical.style'] = 'solid';
    settings!.open(DEFAULT_SETTINGS);
    tab('appearance');
    const select = section('Grid lines')!.querySelector<HTMLSelectElement>('select[aria-label="Line style"]')!;
    expect(select.value).toBe('');
    choose(select, 'dotted');
    expect(styleChanges.at(-1)).toEqual({ 'grid.horizontal.style': 'dotted', 'grid.vertical.style': 'dotted' });
  });

  it('follows the chart type when it changes with the settings open', () => {
    settings!.open(DEFAULT_SETTINGS, 'line');
    settings!.refresh(DEFAULT_SETTINGS, 'kagi');
    expect(section('Line')).toBeNull();
    expect(section('Kagi')).not.toBeNull();
  });

  it('marks the tabs as tabs down the side, the open one selected', () => {
    settings!.open(DEFAULT_SETTINGS);
    tab('trading');
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(document.querySelector('[role="tablist"]')!.getAttribute('aria-orientation')).toBe('vertical');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'false', 'false', 'true']);
    expect(document.querySelector('[role="tabpanel"]')!.getAttribute('aria-labelledby')).toBe(tabs[5].id);
  });

  it('shows what the chart draws again after an undo', () => {
    settings!.open(DEFAULT_SETTINGS, 'line');
    look['series.line.color'] = '#123456';
    settings!.refresh(DEFAULT_SETTINGS);
    expect(section('Line')!.querySelector<HTMLInputElement>('input[aria-label="Color"]')!.value).toBe('#123456');
  });
});

describe('the symbol tab', () => {
  it('hides the main series and marks the high and low', () => {
    settings!.open(DEFAULT_SETTINGS);
    const rows = [...document.querySelectorAll('.tcw-settings-row')];
    const toggle = (label: string) => rows.find((r) => r.textContent === label)!.querySelector('button')!;
    toggle('Main series').click();
    // A section's own switch is "Show": its title names what it shows.
    section('High and low lines')!.querySelector<HTMLButtonElement>('button[aria-label="Show"]')!.click();
    toggle('Extended hours').click();
    expect(changes).toEqual([{ mainSeriesVisible: false }, { highLowLines: true }, { extendedHours: false }]);
  });
});

describe('the settings’ tabs', () => {
  const labels = () => [...document.querySelectorAll('.tcw-modal-body .tcw-settings-label')].map((l) => l.textContent);

  it('are the ones a trader looks for, each with its icon, the symbol first', () => {
    settings!.open(DEFAULT_SETTINGS, 'candlestick');
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map((t) => t.dataset.tab)).toEqual(['symbol', 'statusLine', 'scales', 'appearance', 'layers', 'trading']);
    expect(tabs.map((t) => t.textContent)).toEqual(['Symbol', 'Status line', 'Scales', 'Appearance', 'Layers', 'Trading']);
    expect(tabs.every((t) => t.querySelector('svg'))).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('keep each setting where it is looked for', () => {
    settings!.open(DEFAULT_SETTINGS, 'candlestick');
    expect(labels()).toEqual(expect.arrayContaining(['Main series', 'Extended hours']));
    expect(section('High and low lines')).not.toBeNull();
    tab('statusLine');
    expect(labels()).toEqual(expect.arrayContaining(['OHLC legend', 'Legend text']));
    tab('scales');
    expect(labels()).toEqual(expect.arrayContaining(['Price scale', 'Auto scale', 'Timezone', 'Number format', 'Text', 'Lines']));
    expect(section('Axes')).not.toBeNull();
    tab('appearance');
    expect(labels()).toEqual(expect.arrayContaining(['Background', 'Crosshair']));
    tab('layers');
    expect(labels()).toEqual(expect.arrayContaining(['Volume profile', 'Market profile (TPO)', 'Session shading']));
  });

  it('move with the arrow keys, up and down', () => {
    settings!.open(DEFAULT_SETTINGS);
    const tabs = () => [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    tabs()[0].focus();
    tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(tabs()[5]);
  });
});

describe('the settings’ Cancel, OK and Template', () => {
  const footer = (act: string) => document.querySelector<HTMLButtonElement>(`.tcw-modal-footer [data-act="${act}"]`)!;
  const menuItems = () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

  it('is a dialog named by its title, which gives focus back', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    settings!.open(DEFAULT_SETTINGS);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Chart Settings');
    footer('ok').click();
    expect(document.activeElement).toBe(opener);
  });

  it('cancels on Cancel, Escape, the close button or a click outside; keeps on OK', () => {
    settings!.open(DEFAULT_SETTINGS);
    footer('cancel').click();
    settings!.open(DEFAULT_SETTINGS);
    document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    settings!.open(DEFAULT_SETTINGS);
    document.querySelector<HTMLButtonElement>('.tcw-modal-close')!.click();
    settings!.open(DEFAULT_SETTINGS);
    const backdrop = document.querySelector<HTMLElement>('.tcw-modal-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    settings!.open(DEFAULT_SETTINGS);
    footer('ok').click();
    expect(calls).toEqual(['cancel', 'cancel', 'cancel', 'cancel', 'ok']);
    expect(settings!.isOpen()).toBe(false);
  });

  it('stays open when a drag that began inside ends on the backdrop', () => {
    settings!.open(DEFAULT_SETTINGS);
    document.querySelector('.tcw-set')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.querySelector<HTMLElement>('.tcw-modal-backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(settings!.isOpen()).toBe(true);
    expect(calls).toEqual([]);
  });

  it('applies, deletes and saves templates, and resets, from the Template menu', () => {
    settings!.open(DEFAULT_SETTINGS);
    footer('template').click();
    expect(menuItems().map((b) => b.textContent)).toEqual(['Night', 'Paper', 'Save as template…', 'Reset to defaults']);
    document.querySelector<HTMLButtonElement>('.tcw-context-remove')!.click();
    expect(calls).toEqual(['remove Night']);
    menuItems()[0].click();
    expect(calls).toEqual(['remove Night', 'apply Paper']);
    expect(settings!.isOpen()).toBe(true);
    footer('template').click();
    menuItems().find((b) => b.textContent === 'Save as template…')!.click();
    footer('template').click();
    menuItems().find((b) => b.textContent === 'Reset to defaults')!.click();
    expect(calls).toEqual(['remove Night', 'apply Paper', 'save', 'reset']);
  });
});

describe('the look’s table', () => {
  it('sets every style key there is', () => {
    const missing = (Object.keys(CHART_STYLE_KEYS) as ChartStyleKey[]).filter((key) => !SETTINGS_LOOK_KEYS.includes(key));
    expect(missing).toEqual([]);
  });

  it('gives every chart type colours of its own', () => {
    for (const { value } of CHART_TYPES) expect(seriesRows(value as ChartType).length, value).toBeGreaterThan(0);
  });

  it('reads a colour with transparency or in short form for the swatch', () => {
    expect(toHex('#1fa874cc')).toBe('#1fa874');
    expect(toHex('#abcd')).toBe('#aabbcc');
    expect(toHex('rgba(31, 168, 116, 0.5)')).toBe('#1fa874');
  });
});

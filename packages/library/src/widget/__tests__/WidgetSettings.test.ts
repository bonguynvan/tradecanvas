// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WidgetSettings } from '../WidgetSettings.js';
import { DEFAULT_SETTINGS } from '../widgetConfig.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { ChartSettingsState } from '../types.js';

let changes: Partial<ChartSettingsState>[];
let settings: WidgetSettings;

beforeEach(() => {
  changes = [];
  settings = new WidgetSettings({ onChange: (p) => changes.push(p), onReset: () => {}, onClose: () => {} }, EN_TRANSLATOR);
});

afterEach(() => {
  settings.destroy();
  document.body.innerHTML = '';
});

const field = (label: string) => document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('change'));
};
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`.tcw-modal-tab[data-tab="${name}"]`)!.click();

describe('settings of the chart’s type', () => {
  it('offers Renko’s box and ATR length, Auto when empty', () => {
    settings.open({ ...DEFAULT_SETTINGS, chartTypeOptions: { renko: { atrPeriod: 20 } } }, 'renko');
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
    settings.open(DEFAULT_SETTINGS, 'renko');
    type(field('Box size')!, '-1');
    expect(changes).toEqual([]);
    expect(field('Box size')!.getAttribute('aria-invalid')).not.toBeNull();
    settings.close();
    settings.open(DEFAULT_SETTINGS, 'lineBreak');
    type(field('Lines to break')!, '2.5');
    expect(changes).toEqual([]);
    type(field('Lines to break')!, '2');
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { lineBreak: { lines: 2 } } });
  });

  it('sets Kagi’s reversal in percent or price', () => {
    settings.open(DEFAULT_SETTINGS, 'kagi');
    const select = document.querySelector<HTMLSelectElement>('.tcw-settings-section select')!;
    select.value = 'price';
    select.dispatchEvent(new Event('change'));
    expect(changes.at(-1)).toEqual({ chartTypeOptions: { kagi: { reversalType: 'price' } } });
  });

  it('has nothing to set for a chart type without settings', () => {
    settings.open(DEFAULT_SETTINGS, 'candlestick');
    expect(field('Box size')).toBeNull();
    expect(document.querySelector('.tcw-settings-section-title')?.textContent).toBe('Candle Colors');
  });
});

describe('the display tab', () => {
  it('hides the main series and marks the high and low', () => {
    settings.open(DEFAULT_SETTINGS);
    tab('display');
    const rows = [...document.querySelectorAll('.tcw-settings-row')];
    const toggle = (label: string) => rows.find((r) => r.textContent === label)!.querySelector('button')!;
    toggle('Main series').click();
    toggle('High and low lines').click();
    expect(changes).toEqual([{ mainSeriesVisible: false }, { highLowLines: true }]);
  });
});

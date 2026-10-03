// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetAlertsPanel, describeAlert, type AlertSpec } from '../WidgetAlertsPanel.js';
import { EN_TRANSLATOR } from '../i18n.js';

let host: HTMLDivElement;
let panel: WidgetAlertsPanel;
let added: AlertSpec[];

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  added = [];
  panel = new WidgetAlertsPanel(host, {
    onAdd: (spec) => { added.push(spec); return true; },
    onRemove: vi.fn(),
    onClear: vi.fn(),
    getChannelValue: () => 100,
    formatPrice: (p) => p.toFixed(2),
    formatTime: () => '2026-10-10 12:00',
    now: () => 1_000,
  });
  panel.setSources([
    { channel: 'price', label: 'Price' },
    { channel: 'ema:value', label: 'EMA 20' },
    { channel: 'rsi:value', label: 'RSI 14' },
  ]);
  panel.openPanel();
});

afterEach(() => {
  panel.destroy();
  host.remove();
});

const $ = <T extends Element>(sel: string) => host.querySelector<T>(sel)!;
const choose = (sel: string, value: string) => {
  const select = $<HTMLSelectElement>(sel);
  select.value = value;
  select.dispatchEvent(new Event('change'));
};
const submit = () => $('form').dispatchEvent(new Event('submit', { cancelable: true }));

describe('alerts panel form', () => {
  it('adds a level alert with the value typed', () => {
    $<HTMLInputElement>('.tcw-alerts-price').value = '105';
    submit();
    expect(added).toEqual([{ price: 105, condition: 'crossing', message: undefined, channel: 'price', label: 'Price', options: {} }]);
  });

  it('compares with another line instead of a value', () => {
    choose('.tcw-alerts-target', 'ema:value');
    expect($<HTMLInputElement>('.tcw-alerts-price').hidden).toBe(true);
    choose('.tcw-alerts-condition', 'crossingUp');
    submit();
    expect(added[0]).toMatchObject({ condition: 'crossingUp', channel: 'price', options: { target: 'ema:value' } });
    expect(Number.isNaN(added[0].price)).toBe(true);
  });

  it('offers every line but the one watched to compare with', () => {
    choose('.tcw-alerts-source', 'rsi:value');
    const options = [...$<HTMLSelectElement>('.tcw-alerts-target').options].map((o) => o.textContent);
    expect(options).toEqual(['A value', 'Price', 'EMA 20']);
  });

  it('asks a move for percent and bars, and checks them', () => {
    choose('.tcw-alerts-condition', 'movesDown');
    expect($<HTMLElement>('.tcw-alerts-percent').closest('div')!.hidden).toBe(false);
    $<HTMLInputElement>('.tcw-alerts-percent').value = '0';
    submit();
    expect(added).toEqual([]);
    expect($('.tcw-alerts-percent').getAttribute('aria-invalid')).toBe('true');
    $<HTMLInputElement>('.tcw-alerts-percent').value = '3';
    // A move is between two bars at least.
    $<HTMLInputElement>('.tcw-alerts-bars').value = '1';
    submit();
    expect(added).toEqual([]);
    expect($('.tcw-alerts-bars').getAttribute('aria-invalid')).toBe('true');
    expect($<HTMLInputElement>('.tcw-alerts-bars').min).toBe('2');
    $<HTMLInputElement>('.tcw-alerts-bars').value = '12';
    submit();
    expect(added[0]).toMatchObject({ condition: 'movesDown', options: { percent: 3, bars: 12 } });
  });

  it('adds bar close and an expiry', () => {
    $<HTMLInputElement>('.tcw-alerts-price').value = '105';
    $<HTMLInputElement>('.tcw-alerts-options input[type=checkbox]').checked = true;
    choose('.tcw-alerts-expiry', 'day');
    submit();
    expect(added[0].options).toEqual({ onBarClose: true, expiresAt: 1_000 + 86_400_000 });
  });

  it('keeps the form when the chart turns the alert down', () => {
    panel.destroy();
    panel = new WidgetAlertsPanel(host, {
      onAdd: () => false, onRemove: vi.fn(), onClear: vi.fn(), getChannelValue: () => 100, formatPrice: String,
    });
    panel.openPanel();
    $<HTMLInputElement>('.tcw-alerts-price').value = '105';
    $<HTMLInputElement>('.tcw-alerts-message').value = 'keep me';
    submit();
    expect($<HTMLInputElement>('.tcw-alerts-message').value).toBe('keep me');
  });
});

describe('alerts panel list', () => {
  it('says what each alert watches, when it looks, until when', () => {
    panel.setAlerts([
      { id: 'a', price: Number.NaN, condition: 'crossingUp', triggered: false, channel: 'price', label: 'Price', target: 'ema:value', targetLabel: 'EMA 20', onBarClose: true },
      { id: 'b', price: Number.NaN, condition: 'movesUp', triggered: false, channel: 'price', label: 'Price', percent: 5, bars: 10, expiresAt: 9e12 },
      { id: 'c', price: 105, condition: 'greaterThan', triggered: false, channel: 'price', expired: true },
    ]);
    const rows = [...host.querySelectorAll('.tcw-alerts-row')];
    const text = (row: Element) => row.querySelector('.tcw-alerts-row-main')!.firstChild!.textContent;
    // Newest first.
    expect(text(rows[2])).toBe('Price Crossing up EMA 20');
    expect(rows[2].querySelector('.tcw-alerts-row-meta')!.textContent).toBe('on bar close');
    expect(text(rows[1])).toBe('Price Moves up 5% within 10 bars');
    expect(rows[1].querySelector('.tcw-alerts-row-meta')!.textContent).toBe('until 2026-10-10 12:00');
    expect(rows[0].querySelector('.tcw-alerts-badge')!.textContent).toBe('Expired');
  });
});

describe('describeAlert', () => {
  const say = (alert: Parameters<typeof describeAlert>[0]) => describeAlert(alert, EN_TRANSLATOR, (p) => p.toFixed(2));

  it('names the line compared with, and a move, instead of a price', () => {
    expect(say({ id: 'a', price: 101.3, condition: 'crossingUp', triggered: true, channel: 'price', label: 'Price', target: 'ema:value', targetLabel: 'EMA 20' }))
      .toBe('Price Crossing up EMA 20');
    expect(say({ id: 'b', price: Number.NaN, condition: 'movesUp', triggered: true, channel: 'price', percent: 5, bars: 10 }))
      .toBe('Price Moves up 5% within 10 bars');
    expect(say({ id: 'c', price: 105, condition: 'crossing', triggered: true, channel: 'price' })).toBe('Crossing 105.00');
    // Read away from the list (a toast): the price is named.
    expect(describeAlert({ id: 'c', price: 105, condition: 'crossing', triggered: true, channel: 'price' }, EN_TRANSLATOR, (p) => p.toFixed(2), true))
      .toBe('Price Crossing 105.00');
  });
});


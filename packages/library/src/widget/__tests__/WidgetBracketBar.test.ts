// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetBracketBar } from '../WidgetBracketBar.js';

let host: HTMLDivElement;
let bar: WidgetBracketBar;
const onConfirm = vi.fn();
const onCancel = vi.fn();
const onQuantity = vi.fn();

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  bar = new WidgetBracketBar(host, { onConfirm, onCancel, onQuantity });
});

afterEach(() => {
  bar.destroy();
  host.remove();
  vi.clearAllMocks();
});

const el = () => host.querySelector<HTMLElement>('.tcw-bracket-bar')!;
const quantity = () => el().querySelector<HTMLInputElement>('.tcw-bracket-quantity input')!;
const place = () => el().querySelector<HTMLButtonElement>('.tcw-bracket-confirm')!;
const type = (text: string) => {
  quantity().value = text;
  quantity().dispatchEvent(new Event('input'));
};

describe('WidgetBracketBar', () => {
  it('is a group named for the bracket in hand, hidden until one is', () => {
    expect(el().hidden).toBe(true);
    expect(el().getAttribute('role')).toBe('group');
    bar.show('buy');
    expect(el().hidden).toBe(false);
    expect(el().getAttribute('aria-label')).toBe('Long bracket');
    bar.show('sell');
    expect(el().getAttribute('aria-label')).toBe('Short bracket');
  });

  it('marks its side, so Place takes the side’s colour', () => {
    bar.show('sell');
    expect(el().dataset.side).toBe('sell');
    expect(el().querySelector('.tcw-bracket-confirm')?.textContent).toBe('Place');
  });

  it('places or cancels', () => {
    bar.show('buy');
    el().querySelector<HTMLButtonElement>('.tcw-bracket-confirm')!.click();
    el().querySelector<HTMLButtonElement>('.tcw-bracket-cancel')!.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('WidgetBracketBar: the quantity', () => {
  it('has a field named Quantity, with the quantity the bracket starts with', () => {
    bar.show('buy', { quantity: 5 });
    expect(quantity().getAttribute('aria-label')).toBe('Quantity');
    expect(quantity().value).toBe('5');
    expect(place().disabled).toBe(false);
  });

  it('tells the quantity typed', () => {
    bar.show('buy', { quantity: 1 });
    type('2.5');
    expect(onQuantity).toHaveBeenLastCalledWith(2.5);
    expect(bar.quantity()).toBe(2.5);
  });

  it('steps by the lot it is given, with − and +', () => {
    bar.show('buy', { quantity: 100, step: () => 100 });
    el().querySelector<HTMLButtonElement>('.tcw-bracket-quantity .tcw-stepper-btn:last-of-type')!.click();
    expect(quantity().value).toBe('200');
    expect(onQuantity).toHaveBeenLastCalledWith(200);
  });

  it('steps an empty field to one step, not two', () => {
    bar.show('buy', { quantity: 100, step: () => 100 });
    type('');
    el().querySelector<HTMLButtonElement>('.tcw-bracket-quantity .tcw-stepper-btn:last-of-type')!.click();
    expect(quantity().value).toBe('100');
  });

  it('places nothing with no quantity: the field is marked, Place is off and the bracket is told it has none', () => {
    bar.show('sell', { quantity: 1 });
    for (const text of ['', '0', '-3', 'abc']) {
      type(text);
      expect(quantity().getAttribute('aria-invalid')).toBe('true');
      expect(place().disabled).toBe(true);
      expect(bar.quantity()).toBeNull();
      expect(onQuantity).toHaveBeenLastCalledWith(null);
    }
    type('4');
    expect(quantity().hasAttribute('aria-invalid')).toBe(false);
    expect(place().disabled).toBe(false);
  });

  it('places on Enter in the field and cancels on Escape, and keeps both keys from the chart', () => {
    bar.show('buy', { quantity: 2 });
    const reached: string[] = [];
    host.addEventListener('keydown', (e) => reached.push(e.key));
    quantity().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    quantity().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(reached).toEqual([]);
  });

  it('does not place on Enter with no quantity', () => {
    bar.show('buy', { quantity: 2 });
    type('');
    quantity().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('tells the styles when it has the field, for a phone’s bar to make room, and keeps Cancel’s name there', () => {
    bar.show('buy', { quantity: 1 });
    expect(el().hasAttribute('data-quantity')).toBe(true);
    expect(el().querySelector('.tcw-bracket-cancel')?.getAttribute('aria-label')).toBe('Cancel');
    bar.show('buy');
    expect(el().hasAttribute('data-quantity')).toBe(false);
  });

  it('shows no field for a bracket sized by its app: one with no quantity to type', () => {
    bar.show('buy');
    expect(el().querySelector<HTMLElement>('.tcw-bracket-quantity')!.hidden).toBe(true);
    expect(place().disabled).toBe(false);
    expect(bar.quantity()).toBeNull();
  });
});

describe('WidgetBracketBar in a right-to-left widget', () => {
  it('reads in the widget’s direction, though the chart it sits on is left to right', () => {
    const root = document.createElement('div');
    root.className = 'tcw-root';
    root.dir = 'rtl';
    const chart = document.createElement('div');
    chart.dir = 'ltr';
    root.appendChild(chart);
    document.body.appendChild(root);
    const rtl = new WidgetBracketBar(chart, { onConfirm, onCancel, onQuantity });
    rtl.show('buy');
    expect(chart.querySelector<HTMLElement>('.tcw-bracket-bar')!.dir).toBe('rtl');
    rtl.destroy();
    root.remove();
  });
});

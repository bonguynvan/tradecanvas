// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetIndicatorPicker, type IndicatorPickerItem } from '../WidgetIndicatorPicker.js';
import { EN_TRANSLATOR } from '../i18n.js';

const items: IndicatorPickerItem[] = [
  { id: 'sma', name: 'Simple Moving Average', shortName: 'SMA', placement: 'overlay', category: 'movingAverages' },
  { id: 'ema', name: 'Exponential Moving Average', shortName: 'EMA', placement: 'overlay', category: 'movingAverages' },
  { id: 'rsi', name: 'Relative Strength Index', shortName: 'RSI', placement: 'panel', category: 'oscillators' },
  { id: 'crsi', name: 'Connors RSI', shortName: 'CRSI', placement: 'panel', category: 'oscillators' },
  { id: 'atr', name: 'Average True Range', shortName: 'ATR', placement: 'panel', category: 'volatility' },
];

let layer: HTMLDivElement;
let opener: HTMLButtonElement;
let picker: WidgetIndicatorPicker;
const calls = {
  add: vi.fn(),
  favorite: vi.fn(),
  apply: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
};

beforeEach(() => {
  Object.values(calls).forEach((fn) => fn.mockReset());
  layer = document.createElement('div');
  opener = document.createElement('button');
  document.body.append(layer, opener);
  opener.focus();
  picker = new WidgetIndicatorPicker(() => layer, {
    onAdd: calls.add,
    onFavorite: calls.favorite,
    templates: { onApply: calls.apply, onDelete: calls.remove, onSave: calls.save },
  }, EN_TRANSLATOR);
});

afterEach(() => {
  picker.destroy();
  layer.remove();
  opener.remove();
});

const dialog = () => layer.querySelector<HTMLElement>('[role="dialog"]');
const search = () => layer.querySelector<HTMLInputElement>('.tcw-ip-search input')!;
const tab = (view: string) => layer.querySelector<HTMLButtonElement>(`[data-view="${view}"]`)!;
const rows = () => [...layer.querySelectorAll<HTMLButtonElement>('.tcw-ip-add')];
const listed = () => rows().map((b) => b.dataset.ind);
const star = (id: string) => layer.querySelector<HTMLButtonElement>(`.tcw-ip-row[data-ind="${id}"] .tcw-ip-star`)!;
const type = (text: string) => {
  search().value = text;
  search().dispatchEvent(new Event('input', { bubbles: true }));
};
const key = (target: Element, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('the indicators dialog', () => {
  it('opens on every indicator by group, with the search ready to type in', () => {
    picker.open({ items, favorites: [], templates: [] });
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(search());
    expect(tab('all').getAttribute('aria-selected')).toBe('true');
    expect(layer.querySelector('.tcw-ip-list')!.getAttribute('aria-labelledby')).toBe(tab('all').id);
    expect([...layer.querySelectorAll('.tcw-ip-heading')].map((h) => h.textContent))
      .toEqual(['Moving averages', 'Oscillators', 'Volatility']);
    expect(listed()).toEqual(['ema', 'sma', 'crsi', 'rsi', 'atr']);
  });

  it('opens on the favourites when there are some, and says how to add them when there are none', () => {
    picker.open({ items, favorites: ['rsi'], templates: [] });
    expect(tab('favorites').getAttribute('aria-selected')).toBe('true');
    expect(listed()).toEqual(['rsi']);
    star('rsi').click();
    expect(calls.favorite).toHaveBeenCalledWith('rsi', false);
    expect(listed()).toEqual([]);
    expect(layer.querySelector('.tcw-ip-empty')?.textContent).toMatch(/star/i);
  });

  it('lists one group from the side, and only the groups that have indicators', () => {
    picker.open({ items, favorites: [], templates: [] });
    expect(tab('trend')).toBeNull();
    tab('oscillators').click();
    expect(listed()).toEqual(['crsi', 'rsi']);
    expect(layer.querySelector('.tcw-ip-heading')).toBeNull();
  });

  it('searches every group as you type, best match first, and says when nothing matches', () => {
    picker.open({ items, favorites: [], templates: [] });
    tab('volatility').click();
    type('rsi');
    expect(listed()).toEqual(['rsi', 'crsi']);
    // The groups step back: the results come from all of them.
    expect(layer.querySelector('.tcw-ip-nav')!.classList.contains('tcw-ip-nav--searching')).toBe(true);
    type('zzz');
    expect(layer.querySelector('.tcw-ip-empty')?.textContent).toContain('zzz');
    type('');
    expect(listed()).toEqual(['atr']);
    expect(layer.querySelector('.tcw-ip-nav')!.classList.contains('tcw-ip-nav--searching')).toBe(false);
  });

  it('adds an indicator and stays open, counting what is on the chart', () => {
    picker.open({ items, favorites: [], templates: [] });
    rows()[0].click();
    expect(calls.add).toHaveBeenCalledWith('ema');
    expect(dialog()).not.toBeNull();
    expect(layer.querySelector('[aria-live]')?.textContent).toBe('Exponential Moving Average added');
    picker.setCounts(new Map([['ema', 2]]));
    expect(layer.querySelector('.tcw-ip-row[data-ind="ema"] .tcw-ip-count')?.textContent).toBe('2');
  });

  it('stars an indicator from any list', () => {
    picker.open({ items, favorites: [], templates: [] });
    star('atr').click();
    expect(calls.favorite).toHaveBeenCalledWith('atr', true);
    expect(star('atr').getAttribute('aria-pressed')).toBe('true');
    tab('favorites').click();
    expect(listed()).toEqual(['atr']);
  });

  it('moves through the rows with the arrow keys, and to a row’s star and back', () => {
    picker.open({ items, favorites: [], templates: [] });
    key(search(), 'ArrowDown');
    expect(document.activeElement).toBe(rows()[0]);
    key(rows()[0], 'ArrowDown');
    expect(document.activeElement).toBe(rows()[1]);
    key(rows()[1], 'ArrowRight');
    expect(document.activeElement).toBe(star('sma'));
    key(star('sma'), 'ArrowLeft');
    expect(document.activeElement).toBe(rows()[1]);
    key(rows()[1], 'ArrowUp');
    key(rows()[0], 'ArrowUp');
    expect(document.activeElement).toBe(search());
  });

  it('closes on Escape, the close button or the backdrop, and gives focus back', () => {
    picker.open({ items, favorites: [], templates: [] });
    key(search(), 'Escape');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
    picker.open({ items, favorites: [], templates: [] });
    layer.querySelector<HTMLButtonElement>('.tcw-modal-close')!.click();
    expect(picker.isOpen()).toBe(false);
    picker.open({ items, favorites: [], templates: [] });
    layer.querySelector<HTMLElement>('.tcw-modal-backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picker.isOpen()).toBe(false);
  });
});

describe('the indicators dialog’s templates', () => {
  it('applies one and closes, deletes one and stays, and saves the chart’s', () => {
    picker.open({ items, favorites: [], templates: ['Swing', 'Scalp'] });
    tab('templates').click();
    expect(tab('templates').dataset.tcwPart).toBe('indicatorTemplates');
    const names = [...layer.querySelectorAll<HTMLButtonElement>('[data-tpl-apply]')].map((b) => b.dataset.tplApply);
    expect(names).toEqual(['Swing', 'Scalp']);
    const remove = layer.querySelector<HTMLButtonElement>('[data-tpl-delete="Scalp"]')!;
    remove.focus();
    remove.click();
    expect(calls.remove).toHaveBeenCalledWith('Scalp');
    picker.setTemplates(['Swing']);
    expect(picker.isOpen()).toBe(true);
    expect(document.activeElement?.hasAttribute('data-tpl-save')).toBe(true);
    layer.querySelector<HTMLButtonElement>('[data-tpl-apply="Swing"]')!.click();
    expect(calls.apply).toHaveBeenCalledWith('Swing');
    expect(picker.isOpen()).toBe(false);
    picker.open({ items, favorites: [], templates: [] });
    tab('templates').click();
    layer.querySelector<HTMLButtonElement>('[data-tpl-save]')!.click();
    expect(calls.save).toHaveBeenCalled();
    expect(picker.isOpen()).toBe(false);
  });

  it('has no templates tab where the host keeps none', () => {
    picker.destroy();
    picker = new WidgetIndicatorPicker(() => layer, { onAdd: calls.add, onFavorite: calls.favorite }, EN_TRANSLATOR);
    picker.open({ items, favorites: [], templates: [] });
    expect(tab('templates')).toBeNull();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SymbolInfo } from '@tradecanvas/commons';
import { WidgetSymbolSearch, SYMBOL_SEARCH_DEBOUNCE_MS, type CompareEntry } from '../WidgetSymbolSearch.js';

let host: HTMLDivElement;
let opener: HTMLButtonElement;
let picked: string[];
let search: WidgetSymbolSearch;

const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-ss-row')];
const rowText = () => rows().map((r) => r.querySelector('.tcw-ss-symbol')?.textContent);
const input = () => host.querySelector<HTMLInputElement>('.tcw-ss-input')!;
const type = (text: string) => {
  input().value = text;
  input().dispatchEvent(new Event('input'));
};
const key = (k: string) => input().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const empty = () => host.querySelector('.tcw-ss-empty')?.textContent;
const chips = () => [...host.querySelectorAll<HTMLButtonElement>('.tcw-ss-type')];

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  opener = document.createElement('button');
  document.body.append(host, opener);
  opener.focus();
  picked = [];
  search = new WidgetSymbolSearch({ onPick: (s) => picked.push(s), onClose: () => {} }, () => host);
});

afterEach(() => {
  search.destroy();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

const results: SymbolInfo[] = [
  { symbol: 'BTCUSDT', description: 'BTC / USDT', exchange: 'Binance', type: 'crypto' },
  { symbol: 'BTCEUR', description: 'BTC / EUR', exchange: 'Kraken', type: 'crypto' },
];

describe('WidgetSymbolSearch as a dialog', () => {
  it('has a title, a search field in focus, and the symbols in a list', () => {
    search.open({ symbols: ['ETHUSDT', 'SOLUSDT'], current: 'SOLUSDT' });
    const modal = host.querySelector('.tcw-modal.tcw-ss')!;
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.querySelector('h3')?.textContent).toBe('Symbol search');
    expect(document.activeElement).toBe(input());
    expect(host.querySelector('.tcw-ss-list')?.getAttribute('role')).toBe('listbox');
    expect(rowText()).toEqual(['ETHUSDT', 'SOLUSDT']);
    expect(rows()[1].classList.contains('tcw-current')).toBe(true);
    // The keys start on the symbol shown now.
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
    expect(input().getAttribute('aria-activedescendant')).toBe(rows()[1].id);
  });

  it('heads its columns', () => {
    search.open({ symbols: ['ETHUSDT'], current: '' });
    expect(host.querySelector('.tcw-ss-columns')?.textContent).toMatch(/Symbol.*Description/);
  });

  it('closes on Escape and on the backdrop, giving focus back', () => {
    search.open({ symbols: ['ETHUSDT'], current: '' });
    key('Escape');
    expect(search.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    search.open({ symbols: ['ETHUSDT'], current: '' });
    const backdrop = host.querySelector<HTMLElement>('.tcw-modal-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    backdrop.click();
    expect(search.isOpen()).toBe(false);
    expect(host.querySelector('.tcw-ss')).toBeNull();
  });

  it('keeps its keys from the chart', () => {
    const chartKeys = vi.fn();
    document.addEventListener('keydown', chartKeys);
    search.open({ symbols: ['ETHUSDT'], current: '' });
    key('ArrowDown');
    document.removeEventListener('keydown', chartKeys);
    expect(chartKeys).not.toHaveBeenCalled();
  });

  it('starts from the letter typed on the chart', async () => {
    const fn = vi.fn(async () => results);
    search.open({ symbols: ['ETHUSDT'], current: '', search: fn, query: 'b' });
    expect(input().value).toBe('b');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(fn).toHaveBeenCalledWith('b', expect.anything());
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
  });

  it('leaves Enter, Escape and the arrows to an input method while it composes', () => {
    search.open({ symbols: ['ETHUSDT', 'SOLUSDT'], current: '' });
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true, cancelable: true }));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 229, bubbles: true, cancelable: true } as KeyboardEventInit));
    expect(picked).toEqual([]);
    expect(search.isOpen()).toBe(true);
    expect(rows()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('gives focus back to what opened it after a pick', () => {
    search.open({ symbols: ['ETHUSDT'], current: '' });
    key('Enter');
    expect(picked).toEqual(['ETHUSDT']);
    expect(document.activeElement).toBe(opener);
  });

  it('starts afresh when opened again while open', () => {
    search.open({ symbols: ['ETHUSDT'], current: '' });
    search.openCompare({ symbols: ['SOLUSDT'], current: '', ways: [{ id: 'percent', label: 'Percent' }], way: 'percent', compared: [], onAdd: () => {}, onRemove: () => {} });
    expect(host.querySelectorAll('.tcw-ss')).toHaveLength(1);
    expect(host.querySelector('.tcw-ss h3')?.textContent).toBe('Compare symbol');
    expect(rowText()).toEqual(['SOLUSDT']);
  });

  it('marks the chart’s symbol as the current one for a screen reader too', () => {
    search.open({ symbols: ['ETHUSDT', 'SOLUSDT'], current: 'SOLUSDT' });
    expect(rows()[1].getAttribute('aria-current')).toBe('true');
    expect(rows()[0].hasAttribute('aria-current')).toBe(false);
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
  });

  it('marks the letters of the symbol that match, the run where there is one, nothing for a match on the name', async () => {
    search.open({ symbols: ['WETHUSDT', 'AAPL'], current: '' });
    type('eth');
    expect([...rows()[0].querySelectorAll('mark')].map((m) => m.textContent).join('')).toBe('ETH');
    expect(rows()[0].querySelector('.tcw-ss-symbol')?.innerHTML).toContain('W<mark>');
    search.close();
    search.open({ symbols: [], current: '', search: async () => [{ symbol: 'AAPL', description: 'Apple Inc.' }] });
    type('apple');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['AAPL']);
    expect(rows()[0].querySelectorAll('mark')).toHaveLength(0);
  });

  it('shows a hint at its foot when given one', () => {
    search.open({ symbols: [], current: '', hint: 'Type on the chart to search' });
    expect(host.querySelector('.tcw-ss-foot')?.textContent).toBe('Type on the chart to search');
    search.close();
    search.open({ symbols: [], current: '' });
    expect(host.querySelector('.tcw-ss-foot')).toBeNull();
  });
});

describe('WidgetSymbolSearch with a search function', () => {
  it('lists the given symbols until something is typed', () => {
    const fn = vi.fn(async () => results);
    search.open({ symbols: ['ETHUSDT', 'SOLUSDT'], current: 'ETHUSDT', search: fn });
    expect(rowText()).toEqual(['ETHUSDT', 'SOLUSDT']);
    expect(fn).not.toHaveBeenCalled();
  });

  it('asks once typing pauses, and shows names, kinds and exchanges in their columns', async () => {
    const fn = vi.fn(async () => results);
    search.open({ symbols: [], current: '', search: fn });
    type('b');
    type('bt');
    type('btc');
    expect(fn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe('btc');
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('BTC / USDT');
    // The feed's words and the ticker keep their own direction in a right-to-left widget.
    expect(rows()[0].querySelector<HTMLElement>('.tcw-ss-desc')?.dir).toBe('auto');
    expect(rows()[0].querySelector<HTMLElement>('.tcw-ss-symbol')?.dir).toBe('ltr');
    expect(rows()[1].querySelector('.tcw-ss-exchange')?.textContent).toBe('Kraken');
    expect(rows()[1].querySelector('.tcw-ss-kind')?.textContent).toBe('crypto');
  });

  it('remembers the names it was told, for the list it opens with', async () => {
    search.open({ symbols: [], current: '', search: async () => results });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    search.close();
    search.open({ symbols: ['BTCEUR', 'ETHUSDT'], current: '', search: async () => results });
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('BTC / EUR');
    expect(rows()[1].querySelector('.tcw-ss-desc')).toBeNull();
  });

  it('lets a result that lands after it closed change nothing, though the feed ignored the signal', async () => {
    let answer!: (r: SymbolInfo[]) => void;
    search.open({ symbols: [], current: '', search: () => new Promise<SymbolInfo[]>((r) => { answer = r; }) });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    search.close();
    search.open({ symbols: ['ETHUSDT'], current: '' });
    answer(results);
    await vi.advanceTimersByTimeAsync(0);
    expect(rowText()).toEqual(['ETHUSDT']);
  });

  it('keeps the rows on screen while the next search runs', async () => {
    let calls = 0;
    search.open({ symbols: [], current: '', search: () => (++calls === 1 ? Promise.resolve(results) : new Promise<SymbolInfo[]>(() => {})) });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    type('btce');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
    expect(empty()).toBeUndefined();
  });

  it('skips rows of the feed that have no symbol', async () => {
    search.open({ symbols: [], current: '', search: async () => [{} as SymbolInfo, ...results, { symbol: '' }] });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
  });

  it('cancels a query that a newer one replaced', async () => {
    const signals: AbortSignal[] = [];
    const fn = vi.fn((_q: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<SymbolInfo[]>(() => {});
    });
    search.open({ symbols: [], current: '', search: fn });
    type('bt');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('says it is searching, and says so when the search fails, in a live region outside the list', async () => {
    let fail!: (e: Error) => void;
    search.open({ symbols: [], current: '', search: () => new Promise<SymbolInfo[]>((_r, reject) => { fail = reject; }) });
    const live = host.querySelector<HTMLElement>('.tcw-ss-live')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.closest('[role="listbox"]')).toBeNull();
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(empty()).toMatch(/Searching/);
    expect(live.textContent).toMatch(/Searching/);
    fail(new Error('offline'));
    await vi.advanceTimersByTimeAsync(0);
    expect(empty()).toMatch(/failed/i);
    expect(live.textContent).toMatch(/failed/i);
    expect(host.querySelector('.tcw-ss-empty')?.closest('[role="listbox"]')).toBeNull();
  });

  it('picks a result with Enter, and with a click', async () => {
    search.open({ symbols: [], current: '', search: async () => results });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    key('ArrowDown');
    key('Enter');
    expect(picked).toEqual(['BTCEUR']);
    expect(search.isOpen()).toBe(false);
    search.open({ symbols: ['ETHUSDT'], current: '' });
    rows()[0].click();
    expect(picked).toEqual(['BTCEUR', 'ETHUSDT']);
  });

  it('takes the top result for what was typed when Enter beats the search', async () => {
    const fn = vi.fn(async (query: string) => (query === 'sol' ? [{ symbol: 'SOLUSDT' }] : results));
    search.open({ symbols: ['ETHUSDT'], current: 'ETHUSDT', search: fn });
    type('sol');
    key('Enter'); // before the pause ends
    expect(picked).toEqual([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledWith('sol', expect.anything());
    expect(picked).toEqual(['SOLUSDT']);
  });

  it('forgets an early Enter once typing goes on', async () => {
    search.open({ symbols: ['ETHUSDT'], current: 'ETHUSDT', search: async () => results });
    type('b');
    key('Enter');
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(picked).toEqual([]);
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
  });
});

describe('WidgetSymbolSearch kinds of symbol', () => {
  const mixed: SymbolInfo[] = [
    { symbol: 'AAPL', description: 'Apple', exchange: 'NASDAQ', type: 'stock' },
    { symbol: 'AAPL.MX', description: 'Apple', exchange: 'BMV', type: 'stock' },
    { symbol: 'AAVEUSDT', description: 'Aave / Tether', exchange: 'Binance', type: 'crypto' },
  ];

  it('offers the kinds the results come in, and keeps to the one picked', async () => {
    search.open({ symbols: [], current: '', search: async () => mixed });
    type('aa');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'stock', 'crypto']);
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
    chips()[2].click();
    expect(rowText()).toEqual(['AAVEUSDT']);
    expect(chips()[2].getAttribute('aria-pressed')).toBe('true');
    chips()[0].click();
    expect(rowText()).toHaveLength(3);
  });

  it('has no kinds to pick from when the results are all of one', async () => {
    search.open({ symbols: [], current: '', search: async () => results });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips()).toHaveLength(0);
  });
});

describe('WidgetSymbolSearch without one', () => {
  it('filters the given symbols as before, the matched letters marked', () => {
    search.open({ symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], current: 'BTCUSDT' });
    type('eth');
    expect(rowText()).toEqual(['ETHUSDT']);
    expect(rows()[0].querySelectorAll('mark')).toHaveLength(3);
  });

  it('says when nothing matches', () => {
    search.open({ symbols: ['BTCUSDT'], current: '' });
    type('zzz');
    expect(empty()).toBe('No symbols match');
  });
});

describe('WidgetSymbolSearch comparing', () => {
  const ways = [
    { id: 'percent', label: 'Percent change, on this scale' },
    { id: 'pane', label: 'Price, in a pane of its own' },
    { id: 'ratio', label: 'Ratio' },
  ];
  let added: [string, string][];
  let removed: string[];
  const compare = (compared: CompareEntry[] = []) => search.openCompare({
    symbols: ['ETHUSDT', 'SOLUSDT'],
    current: 'BTCUSDT',
    ways,
    way: 'percent',
    compared,
    onAdd: (symbol, way) => added.push([symbol, way]),
    onRemove: (id) => removed.push(id),
  });

  beforeEach(() => {
    added = [];
    removed = [];
  });

  it('is titled for it and asks how to add', () => {
    compare();
    expect(host.querySelector('.tcw-ss h3')?.textContent).toBe('Compare symbol');
    const way = host.querySelector<HTMLSelectElement>('.tcw-ss-way select')!;
    expect([...way.options].map((o) => o.value)).toEqual(['percent', 'pane', 'ratio']);
    expect(way.value).toBe('percent');
    expect(host.querySelector('.tcw-ss-way')?.textContent).toContain('Add as');
  });

  it('adds once for a held Enter', () => {
    compare();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    expect(added).toEqual([['ETHUSDT', 'percent']]);
  });

  it('keeps what is compared out of the list of symbols, each list under its own heading', () => {
    compare([{ id: 'a', symbol: 'ETHUSDT', way: 'Ratio' }]);
    const listbox = host.querySelector('[role="listbox"]')!;
    expect([...listbox.children].every((el) => el.getAttribute('role') === 'option')).toBe(true);
    const group = host.querySelector<HTMLElement>('.tcw-ss-added')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent).toBe('On the chart');
    expect(document.getElementById(listbox.getAttribute('aria-labelledby')!)?.textContent).toBe('Symbols');
    // A symbol on the chart says so in words, not only with its check.
    expect(rows().find((r) => r.dataset.symbol === 'ETHUSDT')?.textContent).toContain('On the chart');
  });

  it('adds a symbol the way chosen and stays open for the next', () => {
    compare();
    const way = host.querySelector<HTMLSelectElement>('.tcw-ss-way select')!;
    way.value = 'ratio';
    way.dispatchEvent(new Event('change'));
    key('Enter');
    rows()[1].click();
    expect(added).toEqual([['ETHUSDT', 'ratio'], ['SOLUSDT', 'ratio']]);
    expect(search.isOpen()).toBe(true);
    expect(picked).toEqual([]);
  });

  it('lists what is on the chart, each with a way to remove it', () => {
    compare([{ id: 'cmp_ETHUSDT', symbol: 'ETHUSDT', way: 'Percent change, on this scale', color: '#ff9800' }]);
    const added = host.querySelectorAll('.tcw-ss-added-row');
    expect(added).toHaveLength(1);
    expect(added[0].textContent).toContain('ETHUSDT');
    expect(added[0].textContent).toContain('Percent change, on this scale');
    expect(rows().find((r) => r.dataset.symbol === 'ETHUSDT')?.classList.contains('tcw-on-chart')).toBe(true);
    const remove = added[0].querySelector<HTMLButtonElement>('.tcw-ss-remove')!;
    expect(remove.getAttribute('aria-label')).toBe('Remove ETHUSDT');
    remove.click();
    expect(removed).toEqual(['cmp_ETHUSDT']);
  });

  it('shows the list again as it changes, the keyboard kept in the search', () => {
    compare();
    search.setCompared([{ id: 'x', symbol: 'SOLUSDT', way: 'Ratio' }]);
    expect(host.querySelectorAll('.tcw-ss-added-row')).toHaveLength(1);
    expect(document.activeElement).toBe(input());
    search.setCompared([]);
    expect(host.querySelectorAll('.tcw-ss-added-row')).toHaveLength(0);
  });

  it('says there is nothing compared yet when it has no symbols to offer', () => {
    search.openCompare({ symbols: [], current: 'BTCUSDT', ways, way: 'percent', compared: [], onAdd: () => {}, onRemove: () => {} });
    expect(empty()).toMatch(/Nothing compared yet/);
  });

  it('the search finds other symbols to add, the list of what is on the chart set aside meanwhile', async () => {
    search.openCompare({
      symbols: [], current: 'BTCUSDT', ways, way: 'percent', search: async () => results,
      compared: [{ id: 'a', symbol: 'ETHUSDT', way: 'Ratio' }], onAdd: (s, w) => added.push([s, w]), onRemove: () => {},
    });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(host.querySelectorAll('.tcw-ss-added-row')).toHaveLength(0);
    // Not the chart's own symbol.
    expect(rowText()).toEqual(['BTCEUR']);
    key('Enter');
    expect(added).toEqual([['BTCEUR', 'percent']]);
  });
});

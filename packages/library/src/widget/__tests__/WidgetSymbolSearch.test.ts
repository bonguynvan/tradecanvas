// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SymbolInfo } from '@tradecanvas/commons';
import { WidgetSymbolSearch, SYMBOL_SEARCH_DEBOUNCE_MS, type CompareEntry } from '../WidgetSymbolSearch.js';
import { FOCUSABLE } from '../focusTrap.js';

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

  it('heads its columns inside what scrolls, out of the list a screen reader hears', () => {
    search.open({ symbols: ['ETHUSDT'], current: '' });
    const columns = host.querySelector<HTMLElement>('.tcw-ss-columns')!;
    expect(columns.textContent).toMatch(/Symbol.*Description.*Type.*Exchange/);
    expect([...columns.children].map((c) => c.textContent)).toEqual(['', 'Symbol', 'Description', 'Type', 'Exchange']);
    expect(columns.parentElement?.classList.contains('tcw-ss-results')).toBe(true);
    expect(columns.closest('[role="listbox"]')).toBeNull();
    expect(columns.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes Tab from the search to the kind tabs and the exchange list, and keeps it in the dialog', () => {
    // jsdom lays nothing out: what isn't hidden gets a box, as it would on screen.
    const boxes = vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
      return (this.closest('[hidden]') ? [] : [{}]) as unknown as DOMRectList;
    });
    const stops = (root: ParentNode) =>
      [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
    /** Tab as a browser takes it: the dialog's keys first, then on to the next stop on the page unless they kept it. */
    const tab = (shiftKey = false) => {
      const from = document.activeElement as HTMLElement;
      const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
      from.dispatchEvent(e);
      if (e.defaultPrevented) return document.activeElement;
      const page = stops(document);
      page[page.indexOf(from) + (shiftKey ? -1 : 1)]?.focus();
      return document.activeElement;
    };
    try {
      search.open({
        symbols: [
          { symbol: 'VNM', type: 'Stock', exchange: 'HOSE' },
          { symbol: 'VN30F2611', type: 'Futures', exchange: 'HNX' },
        ],
        current: '',
      });
      const modal = host.querySelector<HTMLElement>('.tcw-modal')!;
      const select = host.querySelector('select.tcw-ss-exchange-filter');
      const close = host.querySelector('.tcw-modal-close');
      expect(document.activeElement).toBe(input());
      expect([tab(), tab(), tab()]).toEqual(chips());
      expect(chips().map((c) => c.textContent)).toEqual(['All', 'Stock', 'Futures']);
      expect(tab()).toBe(select);
      // Past the last stop it wraps to the first, never out to the page.
      expect(tab()).toBe(close);
      expect(tab()).toBe(input());
      expect(tab(true)).toBe(close);
      expect(tab(true)).toBe(select);
      expect(modal.contains(document.activeElement)).toBe(true);
    } finally {
      boxes.mockRestore();
    }
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
    const before = rows();
    type('btce');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
    expect(empty()).toBeUndefined();
    // Left as they were: the search's start is nothing to draw them again for.
    expect(rows()).toEqual(before);
    expect(rows().every((row, i) => row === before[i])).toBe(true);
  });

  it('leaves a long list of the symbols given as it is while the first search runs', async () => {
    const symbols = Array.from({ length: 50 }, (_, i) => `S${i}`);
    search.open({ symbols, current: '', search: () => new Promise<SymbolInfo[]>(() => {}) });
    const first = rows()[0];
    type('s');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rows()[0]).toBe(first);
    expect(rows()).toHaveLength(50);
  });

  it('skips rows of the feed that have no symbol', async () => {
    search.open({ symbols: [], current: '', search: async () => [{} as SymbolInfo, ...results, { symbol: '' }] });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
  });

  it('takes words of the feed that are not text as none, and still shows its results', async () => {
    const found = [{ symbol: 'VNM', description: 'Vinamilk', exchange: 10, type: 4 }, { symbol: 'FPT', description: null }];
    search.open({ symbols: ['VNM'], current: '', search: async () => found as unknown as SymbolInfo[] });
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['VNM', 'FPT']);
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Vinamilk');
    expect(rows()[0].querySelector('.tcw-ss-exchange')?.textContent).toBe('');
    expect(rows()[0].querySelector('.tcw-ss-kind')?.textContent).toBe('');
    expect(rows()[1].querySelector('.tcw-ss-desc')).toBeNull();
    expect(empty()).toBeUndefined();
  });

  it('still lists a feed’s answer that carries a "__proto__" key, and lists again when opened again', async () => {
    const answer = () => JSON.parse('[{"symbol":"AAPL","__proto__":{"type":5,"exchange":{"toString":0}}}]') as SymbolInfo[];
    const open = () => search.open({ symbols: [{ symbol: 'AAPL', description: 'Apple' }], current: 'MSFT', search: async () => answer() });
    open();
    type('a');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['AAPL']);
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Apple');
    expect(rows()[0].querySelector('.tcw-ss-kind')?.textContent).toBe('');
    search.close();
    open();
    expect(rowText()).toEqual(['AAPL']);
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

  it('keeps the kinds bar for results of one kind', async () => {
    search.open({ symbols: [], current: '', search: async () => results });
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'crypto']);
  });

  it('has no kinds to pick from when no result carries one', async () => {
    search.open({ symbols: [], current: '', search: async () => [{ symbol: 'AAA' }, { symbol: 'BBB' }] });
    type('a');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips()).toHaveLength(0);
    expect(host.querySelector<HTMLElement>('.tcw-ss-filters')?.hidden).toBe(true);
  });

  it('keeps a kind picked, and its tab, as typing narrows the results', async () => {
    const fn = vi.fn(async () => [{ symbol: 'VCB', description: 'Vietcombank', type: 'Stock', exchange: 'HOSE' }]);
    search.open({
      symbols: [{ symbol: 'VCB', type: 'Stock' }, { symbol: 'VN30F2511', type: 'Futures' }],
      current: '', search: fn,
    });
    chips().find((c) => c.textContent === 'Futures')!.click();
    expect(rowText()).toEqual(['VN30F2511']);
    type('vcb');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'Stock', 'Futures']);
    expect(chips()[2].getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(0);
    expect(empty()).toBe('No symbols match');
  });

  it('reads a feed’s kind in its own direction on its tab, and the tab for all in the widget’s', async () => {
    search.open({ symbols: [], current: '', search: async () => mixed });
    type('aa');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    // A Latin "Stock." in a right-to-left widget keeps its full stop at its end.
    expect(chips().map((c) => c.dir)).toEqual(['', 'auto', 'auto']);
  });

  it('takes kinds that differ only in case as one', async () => {
    search.open({ symbols: [], current: '', search: async () => [{ symbol: 'AAA', type: 'Stock' }, { symbol: 'AAB', type: 'stock' }, { symbol: 'AAC', type: 'crypto' }] });
    type('aa');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'Stock', 'crypto']);
    chips()[1].click();
    expect(rowText()).toEqual(['AAA', 'AAB']);
  });
});

describe('WidgetSymbolSearch kinds that scroll', () => {
  const kinds = () => host.querySelector<HTMLElement>('.tcw-ss-kinds')!;
  /** Tabs `content` wide in a row `room` wide, scrolled `at` from its start. */
  const lay = (content: number, room: number, at: number) => {
    Object.defineProperty(kinds(), 'scrollWidth', { configurable: true, value: content });
    Object.defineProperty(kinds(), 'clientWidth', { configurable: true, value: room });
    kinds().scrollLeft = at;
    kinds().dispatchEvent(new Event('scroll'));
  };

  beforeEach(() => {
    search.open({ symbols: [{ symbol: 'A', type: 'Cổ phiếu' }, { symbol: 'B', type: 'Phái sinh' }, { symbol: 'C', type: 'Perpetual' }], current: '' });
  });

  it('says which ends have tabs past them, for the fade there', () => {
    lay(300, 100, 0);
    expect(kinds().dataset.more).toBe('end');
    lay(300, 100, 100);
    expect(kinds().dataset.more).toBe('start end');
    lay(300, 100, 200);
    expect(kinds().dataset.more).toBe('start');
  });

  it('says nothing when the tabs fit, and counts right to left from the start', () => {
    lay(100, 100, 0);
    expect(kinds().hasAttribute('data-more')).toBe(false);
    // Right to left, a row scrolled toward its end has a negative scrollLeft.
    lay(300, 100, -200);
    expect(kinds().dataset.more).toBe('start');
  });
});

describe('WidgetSymbolSearch exchanges', () => {
  const vn: SymbolInfo[] = [
    { symbol: 'VNM', description: 'Vinamilk', exchange: 'HOSE', type: 'stock' },
    { symbol: 'SHB', description: 'SHB Bank', exchange: 'HNX', type: 'stock' },
    { symbol: 'ACV', description: 'Airports Corporation', exchange: 'UPCOM', type: 'stock' },
    { symbol: 'VN30F2511', description: 'VN30 futures', exchange: 'HNX', type: 'futures' },
  ];
  const select = () => host.querySelector<HTMLSelectElement>('select.tcw-ss-exchange-filter')!;
  const pickExchange = (value: string) => {
    select().value = value;
    select().dispatchEvent(new Event('change'));
  };

  it('offers the exchanges the results come from, when two or more, and keeps to the one picked', async () => {
    search.open({ symbols: [], current: '', search: async () => vn.slice(0, 3) });
    type('a');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(select().hidden).toBe(false);
    expect(select().getAttribute('aria-label')).toBe('Exchange');
    expect([...select().options].map((o) => o.textContent)).toEqual(['All exchanges', 'HOSE', 'HNX', 'UPCOM']);
    pickExchange('HNX');
    expect(rowText()).toEqual(['SHB']);
    pickExchange('');
    expect(rowText()).toHaveLength(3);
  });

  it('keeps the keyboard on the exchange list as its arrows step through it', async () => {
    search.open({ symbols: [], current: '', search: async () => vn.slice(0, 3) });
    type('a');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    select().focus();
    // An arrow on a closed list changes it at once, a change for each press.
    pickExchange('HOSE');
    expect(document.activeElement).toBe(select());
    pickExchange('HNX');
    expect(document.activeElement).toBe(select());
    expect(rowText()).toEqual(['SHB']);
  });

  it('gives the keyboard back to the search when a kind tab is pressed', async () => {
    search.open({ symbols: [], current: '', search: async () => vn });
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    const futures = chips().find((c) => c.textContent === 'futures')!;
    futures.focus();
    futures.click();
    expect(document.activeElement).toBe(input());
  });

  it('reads a feed’s exchange in its own direction in the list, and the option for all in the widget’s', async () => {
    search.open({ symbols: [], current: '', search: async () => vn.slice(0, 3) });
    type('a');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect([...select().options].map((o) => o.dir)).toEqual(['', 'auto', 'auto', 'auto']);
  });

  it('has no exchange filter for results from one exchange', async () => {
    search.open({ symbols: [], current: '', search: async () => [vn[0], { symbol: 'VIC', exchange: 'hose' }] });
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(select().hidden).toBe(true);
  });

  it('narrows by kind and exchange together', async () => {
    search.open({ symbols: [], current: '', search: async () => vn });
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    pickExchange('HNX');
    expect(rowText()).toEqual(['SHB', 'VN30F2511']);
    chips().find((c) => c.textContent === 'futures')!.click();
    expect(rowText()).toEqual(['VN30F2511']);
    // The exchange picked stays picked.
    expect(select().value).toBe('HNX');
  });

  it('works on the list before anything is typed', () => {
    search.open({ symbols: vn, current: '' });
    expect(select().hidden).toBe(false);
    pickExchange('HNX');
    expect(rowText()).toEqual(['SHB', 'VN30F2511']);
  });

  it('keeps the symbols it was given that say nothing of their kind or exchange, on the list before typing', async () => {
    const fn = vi.fn(async () => [
      { symbol: 'VPB', exchange: 'HOSE', type: 'stock' },
      { symbol: 'VN30F2511', exchange: 'HNX', type: 'futures' },
    ]);
    search.open({ symbols: ['MBB', 'SSI', 'VPB', 'VN30F2511'], current: '', search: fn });
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    type('');
    expect(rowText()).toEqual(['MBB', 'SSI', 'VPB', 'VN30F2511']);
    chips().find((c) => c.textContent === 'stock')!.click();
    expect(rowText()).toEqual(['MBB', 'SSI', 'VPB']);
    pickExchange('HOSE');
    expect(rowText()).toEqual(['MBB', 'SSI', 'VPB']);
    // The feed's results keep to what was picked.
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rowText()).toEqual(['VPB']);
  });
});

describe('WidgetSymbolSearch symbols given with their info', () => {
  it('lists the names, kinds and exchanges it was given before anything is typed', () => {
    const fn = vi.fn(async () => results);
    search.open({ symbols: [{ symbol: 'VNM', description: 'Vinamilk', exchange: 'HOSE', type: 'stock' }, 'FPT'], current: 'VNM', search: fn });
    expect(rowText()).toEqual(['VNM', 'FPT']);
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Vinamilk');
    expect(rows()[0].querySelector('.tcw-ss-exchange')?.textContent).toBe('HOSE');
    expect(rows()[0].querySelector('.tcw-ss-kind')?.textContent).toBe('stock');
    expect(rows()[1].querySelector('.tcw-ss-desc')).toBeNull();
    expect(rows()[1].querySelector('.tcw-ss-kind')?.textContent).toBe('');
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'stock']);
    expect(fn).not.toHaveBeenCalled();
  });

  it('takes the feed’s words over the ones it was given, which fill the rest and keep the logo', async () => {
    search.open({
      symbols: [{ symbol: 'VNM', description: 'Vinamilk', type: 'Cổ phiếu', logo: 'https://cdn.x/vnm.png' }],
      current: '',
      search: async () => [{ symbol: 'VNM', description: 'VINAMILK JSC', exchange: 'HOSE' }],
    });
    type('vn');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    const row = rows()[0];
    expect(row.querySelector('.tcw-ss-desc')?.textContent).toBe('VINAMILK JSC');
    expect(row.querySelector('.tcw-ss-exchange')?.textContent).toBe('HOSE');
    expect(row.querySelector('.tcw-ss-kind')?.textContent).toBe('Cổ phiếu');
    expect(row.querySelector('img.tcw-ss-badge')?.getAttribute('src')).toBe('https://cdn.x/vnm.png');
  });

  it('lets a feed’s null erase none of the words it was given, nor the logo', async () => {
    search.open({
      symbols: [{ symbol: 'VNM', description: 'Vinamilk', logo: 'https://cdn.x/vnm.png' }],
      current: '',
      search: async () => [{ symbol: 'VNM', description: null, logo: null, exchange: 'HOSE' } as unknown as SymbolInfo],
    });
    type('vn');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Vinamilk');
    expect(rows()[0].querySelector('.tcw-ss-exchange')?.textContent).toBe('HOSE');
    expect(rows()[0].querySelector('img.tcw-ss-badge')?.getAttribute('src')).toBe('https://cdn.x/vnm.png');
  });

  it('names a symbol in the feed’s words wherever it is listed, once a search told of them', async () => {
    const start = () => search.open({
      symbols: [{ symbol: 'VNM', description: 'Vinamilk', type: 'Cổ phiếu' }],
      current: '',
      search: async () => [{ symbol: 'VNM', description: 'VINAMILK JSC' }],
    });
    const name = () => rows()[0].querySelector('.tcw-ss-desc')?.textContent;
    start();
    expect(name()).toBe('Vinamilk');
    type('vn');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(name()).toBe('VINAMILK JSC');
    search.close();
    // Opened again with the same words: the list it opens with and the results agree.
    start();
    expect(name()).toBe('VINAMILK JSC');
    expect(rows()[0].querySelector('.tcw-ss-kind')?.textContent).toBe('Cổ phiếu');
    type('vn');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(name()).toBe('VINAMILK JSC');
    type('');
    expect(name()).toBe('VINAMILK JSC');
  });

  it('takes words given that are not text as none, from plain JavaScript', () => {
    const given = [{ symbol: 'A', type: 5, exchange: 7, description: 12 }, { symbol: 'AB', description: 'Alpha Beta' }, 'B'];
    const currentInfo = { symbol: 'A', exchange: 3 } as unknown as SymbolInfo;
    expect(() => search.open({ symbols: given as unknown as SymbolInfo[], current: 'A', currentInfo })).not.toThrow();
    expect(rowText()).toEqual(['A', 'AB', 'B']);
    expect([...rows()[0].querySelectorAll('.tcw-ss-kind, .tcw-ss-exchange')].map((c) => c.textContent)).toEqual(['', '']);
    expect(rows()[0].querySelector('.tcw-ss-desc')).toBeNull();
    expect(() => type('a')).not.toThrow();
    expect(rowText()).toEqual(['A', 'AB']);
    expect(() => type('beta')).not.toThrow();
    expect(rowText()).toEqual(['AB']);
  });

  it('shows a venue before the ticker apart, so the ticker is what a narrow column keeps', () => {
    search.open({ symbols: ['BINANCE:BTCUSDT', 'HYPERLIQUID:xyz:GOLD', 'VNM'], current: '' });
    const parts = (row: HTMLElement) => [...row.querySelector('.tcw-ss-symbol')!.children].map((c) => [c.className, c.textContent]);
    expect(parts(rows()[0])).toEqual([['tcw-ss-venue', 'BINANCE:'], ['tcw-ss-ticker', 'BTCUSDT']]);
    expect(parts(rows()[1])).toEqual([['tcw-ss-venue', 'HYPERLIQUID:xyz:'], ['tcw-ss-ticker', 'GOLD']]);
    expect(parts(rows()[2])).toEqual([['tcw-ss-ticker', 'VNM']]);
    expect(rowText()).toEqual(['BINANCE:BTCUSDT', 'HYPERLIQUID:xyz:GOLD', 'VNM']);
    // The letters typed are marked in either part, and across the colon.
    type('e:b');
    const marked = (part: string) => [...rows()[0].querySelectorAll(`.${part} mark`)].map((m) => m.textContent).join('');
    expect(marked('tcw-ss-venue')).toBe('E:');
    expect(marked('tcw-ss-ticker')).toBe('B');
  });

  it('without a search, finds a given symbol by its name too, the tickers first', () => {
    search.open({
      symbols: [{ symbol: 'VNM', description: 'Vinamilk' }, { symbol: 'VIC', description: 'Vingroup' }, 'VNMX', { symbol: 'VCB', description: 'Ngân hàng Ngoại thương' }],
      current: '',
    });
    type('milk');
    expect(rowText()).toEqual(['VNM']);
    type('vn');
    expect(rowText()).toEqual(['VNM', 'VNMX']);
    // Typed without the marks a Vietnamese name is written with.
    type('ngan hang');
    expect(rowText()).toEqual(['VCB']);
  });

  it('names the chart’s symbol from what the chart knows, where nothing else does', () => {
    search.open({ symbols: ['VCB', 'FPT'], current: 'VCB', currentInfo: { symbol: 'VCB', description: 'Vietcombank', type: 'stock' } });
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Vietcombank');
    expect(rows()[1].querySelector('.tcw-ss-desc')).toBeNull();
  });

  it('lets what the chart knows only fill gaps in the words it was given', () => {
    search.open({
      symbols: [{ symbol: 'VCB', type: 'Cổ phiếu', exchange: 'HOSE' }, { symbol: 'FPT', type: 'Cổ phiếu', exchange: 'HOSE' }],
      current: 'VCB',
      currentInfo: { symbol: 'VCB', description: 'VCB (KBS)', type: 'stock', exchange: 'KBS' },
    });
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'Cổ phiếu']);
    expect(host.querySelector<HTMLSelectElement>('.tcw-ss-exchange-filter')?.hidden).toBe(true);
    expect(rows()[0].querySelector('.tcw-ss-kind')?.textContent).toBe('Cổ phiếu');
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('VCB (KBS)');
  });

  it('takes only a name and a logo from what the chart knows, so its own words for a kind or an exchange add no tab or option', async () => {
    const fn = vi.fn(async () => [
      { symbol: 'VCB', description: 'Vietcombank', type: 'Cổ phiếu', exchange: 'HOSE' },
      { symbol: 'VND', description: 'VNDirect', type: 'Cổ phiếu', exchange: 'HNX' },
    ]);
    search.open({
      symbols: ['VCB', 'FPT'],
      current: 'VCB',
      currentInfo: { symbol: 'VCB', description: 'VCB (KBS)', type: 'stock', exchange: 'KBS', logo: 'https://cdn.x/vcb.png' },
      search: fn,
    });
    const [vcb] = rows();
    expect(vcb.querySelector('.tcw-ss-desc')?.textContent).toBe('VCB (KBS)');
    expect(vcb.querySelector('img.tcw-ss-badge')?.getAttribute('src')).toBe('https://cdn.x/vcb.png');
    expect(vcb.querySelector('.tcw-ss-kind')?.textContent).toBe('');
    expect(vcb.querySelector('.tcw-ss-exchange')?.textContent).toBe('');
    expect(host.querySelector<HTMLElement>('.tcw-ss-filters')?.hidden).toBe(true);
    const exchanges = () => [...host.querySelector<HTMLSelectElement>('.tcw-ss-exchange-filter')!.options].map((o) => o.textContent);
    type('v');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'Cổ phiếu']);
    expect(exchanges()).toEqual(['All exchanges', 'HOSE', 'HNX']);
    type('');
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'Cổ phiếu']);
    expect(exchanges()).toEqual(['All exchanges', 'HOSE', 'HNX']);
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Vietcombank');
  });

  it('lays every row out in the same cells, empty where nothing was said', () => {
    search.open({ symbols: [{ symbol: 'VNM', description: 'Vinamilk', exchange: 'HOSE', type: 'stock' }, 'FPT'], current: '' });
    for (const row of rows()) {
      expect([...row.children].map((c) => c.className)).toEqual(['tcw-ss-badge', 'tcw-ss-symbol', 'tcw-ss-desc-cell', 'tcw-ss-kind', 'tcw-ss-exchange']);
      expect(row.querySelector('.tcw-ss-badge')?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('marks each row with the first letter of its ticker in its kind’s colour', () => {
    search.open({
      symbols: [
        { symbol: 'VN30F2511', type: 'Futures' }, { symbol: '^GSPC', type: 'index' }, { symbol: '600519', type: 'Stock' },
        { symbol: 'KBS:VCB', type: 'stock' }, 'ETHUSDT',
      ],
      current: '',
    });
    const badges = rows().map((r) => r.querySelector<HTMLElement>('.tcw-ss-badge')!);
    expect(badges.map((b) => b.textContent)).toEqual(['V', 'G', '6', 'V', 'E']);
    expect(badges[2].dataset.kind).toBe(badges[3].dataset.kind);
    expect(badges[0].dataset.kind).not.toBe(badges[2].dataset.kind);
    expect(badges[4].dataset.kind).toBe('0');
  });

  it('shows a logo only as an image, from the addresses it takes', () => {
    search.open({
      symbols: [
        { symbol: 'A', logo: 'https://cdn.x/a.png' }, { symbol: 'B', logo: 'javascript:alert(1)' },
        { symbol: 'C', logo: '<img src=x onerror=alert(1)>' }, { symbol: 'D' },
      ],
      current: '',
    });
    const [a, b, c, d] = rows();
    const img = a.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://cdn.x/a.png');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(b.querySelector('img')).toBeNull();
    expect(b.querySelector('span.tcw-ss-badge')?.textContent).toBe('B');
    expect(d.querySelector('img')).toBeNull();
    expect(c.querySelector('img')?.getAttribute('src') ?? '').not.toContain('<');
    expect(host.querySelector('[onerror]')).toBeNull();
    for (const row of rows()) expect(row.querySelectorAll('img').length).toBeLessThanOrEqual(1);
  });

  it('shows the letter when a logo fails to load', () => {
    search.open({ symbols: [{ symbol: 'AAPL', type: 'stock', logo: 'https://cdn.x/aapl.png' }], current: '' });
    rows()[0].querySelector('img')!.dispatchEvent(new Event('error'));
    const badge = rows()[0].querySelector<HTMLElement>('.tcw-ss-badge')!;
    expect(badge.tagName).toBe('SPAN');
    expect(badge.textContent).toBe('A');
    expect(rows()[0].firstElementChild).toBe(badge);
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

  it('shows the venue of a symbol compared apart from its ticker, as the rows below do', () => {
    compare([{ id: 'a', symbol: 'KBS:VCB', way: 'Ratio' }]);
    const symbol = host.querySelector('.tcw-ss-added-row .tcw-ss-symbol')!;
    expect([...symbol.children].map((c) => c.textContent)).toEqual(['KBS:', 'VCB']);
  });

  it('lists the names it was given, and what is compared, in the same columns', () => {
    search.openCompare({
      symbols: [{ symbol: 'ETHUSDT', description: 'Ether / Tether', type: 'crypto', exchange: 'Binance' }, 'SOLUSDT'],
      current: 'BTCUSDT', ways, way: 'percent',
      compared: [{ id: 'a', symbol: 'XRPUSDT', way: 'Ratio', color: '#ff9800' }], onAdd: () => {}, onRemove: () => {},
    });
    expect(rows()[0].querySelector('.tcw-ss-desc')?.textContent).toBe('Ether / Tether');
    expect(rows()[0].querySelector('.tcw-ss-badge')?.textContent).toBe('E');
    const added = host.querySelector('.tcw-ss-added-row')!;
    expect([...added.children].map((c) => c.className)).toEqual(['tcw-ss-swatch', 'tcw-ss-symbol', 'tcw-ss-way-cell', 'tcw-ss-remove']);
  });

  it('offers no kind or exchange that only the chart’s own symbol, which it never lists, is of', () => {
    search.openCompare({
      symbols: [
        { symbol: 'VNINDEX', type: 'index', exchange: 'HOSE' },
        { symbol: 'VCB', type: 'stock', exchange: 'HOSE' },
        { symbol: 'FPT', type: 'stock', exchange: 'HNX' },
      ],
      current: 'VNINDEX', ways, way: 'percent', compared: [], onAdd: () => {}, onRemove: () => {},
    });
    expect(rowText()).toEqual(['VCB', 'FPT']);
    expect(chips().map((c) => c.textContent)).toEqual(['All', 'stock']);
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

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SymbolInfo } from '@tradecanvas/commons';
import { WidgetSymbolSearch, SYMBOL_SEARCH_DEBOUNCE_MS } from '../WidgetSymbolSearch.js';

let host: HTMLDivElement;
let picked: string[];
let search: WidgetSymbolSearch;

const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-cmd-item')];
const rowText = () => rows().map((r) => r.querySelector('.tcw-cmd-item-label')?.textContent);
const input = () => host.querySelector<HTMLInputElement>('.tcw-cmd-input')!;
const type = (text: string) => {
  input().value = text;
  input().dispatchEvent(new Event('input'));
};

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  picked = [];
  search = new WidgetSymbolSearch({ onPick: (s) => picked.push(s), onClose: () => {} }, () => host);
});

afterEach(() => {
  search.destroy();
  host.remove();
  vi.useRealTimers();
});

describe('WidgetSymbolSearch with a search function', () => {
  const results: SymbolInfo[] = [
    { symbol: 'BTCUSDT', description: 'BTC / USDT', exchange: 'Binance', type: 'crypto' },
    { symbol: 'BTCEUR', description: 'BTC / EUR', exchange: 'Binance', type: 'crypto' },
  ];

  it('lists the given symbols until something is typed', () => {
    const fn = vi.fn(async () => results);
    search.open(['ETHUSDT', 'SOLUSDT'], 'ETHUSDT', undefined, fn);
    expect(rowText()).toEqual(['ETHUSDT', 'SOLUSDT']);
    expect(fn).not.toHaveBeenCalled();
  });

  it('asks once typing pauses, and shows names and exchanges', async () => {
    const fn = vi.fn(async () => results);
    search.open([], '', undefined, fn);
    type('b');
    type('bt');
    type('btc');
    expect(fn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe('btc');
    expect(rowText()).toEqual(['BTCUSDT', 'BTCEUR']);
    expect(rows()[0].textContent).toContain('BTC / USDT');
    expect(rows()[0].textContent).toContain('Binance');
  });

  it('cancels a query that a newer one replaced', async () => {
    const signals: AbortSignal[] = [];
    const fn = vi.fn((_q: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<SymbolInfo[]>(() => {});
    });
    search.open([], '', undefined, fn);
    type('bt');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('says it is searching, and says so when the search fails', async () => {
    let fail!: (e: Error) => void;
    search.open([], '', undefined, () => new Promise<SymbolInfo[]>((_r, reject) => { fail = reject; }));
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    expect(host.querySelector('.tcw-cmd-empty')?.textContent).toMatch(/Searching/);
    fail(new Error('offline'));
    await vi.advanceTimersByTimeAsync(0);
    expect(host.querySelector('.tcw-cmd-empty')?.textContent).toMatch(/failed/i);
  });

  it('picks a result with Enter', async () => {
    search.open([], '', undefined, async () => results);
    type('btc');
    await vi.advanceTimersByTimeAsync(SYMBOL_SEARCH_DEBOUNCE_MS);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(picked).toEqual(['BTCEUR']);
  });
});

describe('WidgetSymbolSearch without one', () => {
  it('filters the given symbols as before', () => {
    search.open(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], 'BTCUSDT');
    type('eth');
    expect(rowText()).toEqual(['ETHUSDT']);
  });
});

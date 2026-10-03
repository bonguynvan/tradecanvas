// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetWatchlist, type WatchlistCallbacks } from '../WidgetWatchlist.js';
import type { WatchlistList } from '../WatchlistStore.js';

const LABELS = {
  title: 'Watchlist',
  lists: 'Lists',
  newList: 'New list…',
  rename: 'Rename…',
  deleteList: 'Delete list',
  confirmDelete: 'Delete {name}? Click again',
  add: 'Add symbol',
  remove: 'Remove {symbol}',
  empty: 'No symbols yet',
  listName: 'List name',
};

let host: HTMLDivElement;
let calls: WatchlistCallbacks;
let wl: WidgetWatchlist;

const lists: WatchlistList[] = [
  { id: 'a', name: 'Crypto', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
  { id: 'b', name: '<b>Stocks</b>', symbols: [] },
];

const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-watchlist-row')];
const symbols = () => rows().map((r) => r.dataset.symbol);
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = {
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onPickList: vi.fn(),
    onCreateList: vi.fn(),
    onRenameList: vi.fn(),
    onDeleteList: vi.fn(),
  };
  wl = new WidgetWatchlist(host, calls, LABELS);
  wl.setLists(lists, 'a');
});

afterEach(() => {
  wl.destroy();
  host.remove();
});

describe('WidgetWatchlist', () => {
  it('shows the active list’s symbols and name', () => {
    expect(symbols()).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    expect(host.querySelector('.tcw-watchlist-name')!.textContent).toBe('Crypto');
    rows()[1].click();
    expect(calls.onSelect).toHaveBeenCalledWith('ETHUSDT');
  });

  it('lists the lists in a menu, as text', () => {
    host.querySelector<HTMLButtonElement>('.tcw-watchlist-name')!.click();
    const items = [...host.querySelectorAll<HTMLButtonElement>('.tcw-watchlist-menu [data-list]')];
    expect(items.map((i) => i.textContent)).toEqual(['Crypto3', '<b>Stocks</b>0']);
    expect(host.querySelector('.tcw-watchlist-menu b')).toBeNull();
    items[1].click();
    expect(calls.onPickList).toHaveBeenCalledWith('b');
  });

  it('shows an empty list as such', () => {
    wl.setLists(lists, 'b');
    expect(rows()).toHaveLength(0);
    expect(host.querySelector('.tcw-watchlist-empty')!.textContent).toBe('No symbols yet');
  });

  it('names a new list or renames one in place', () => {
    host.querySelector<HTMLButtonElement>('.tcw-watchlist-name')!.click();
    host.querySelector<HTMLButtonElement>('[data-action="new"]')!.click();
    const input = host.querySelector<HTMLInputElement>('.tcw-watchlist-input')!;
    expect(input.placeholder).toBe('List name');
    input.value = 'Forex';
    key(input, 'Enter');
    expect(calls.onCreateList).toHaveBeenCalledWith('Forex');
    expect(host.querySelector('.tcw-watchlist-input')).toBeNull();

    host.querySelector<HTMLButtonElement>('.tcw-watchlist-name')!.click();
    host.querySelector<HTMLButtonElement>('[data-action="rename"]')!.click();
    const rename = host.querySelector<HTMLInputElement>('.tcw-watchlist-input')!;
    expect(rename.value).toBe('Crypto');
    key(rename, 'Escape');
    expect(calls.onRenameList).not.toHaveBeenCalled();
  });

  it('asks again before deleting a list', () => {
    host.querySelector<HTMLButtonElement>('.tcw-watchlist-name')!.click();
    const del = host.querySelector<HTMLButtonElement>('[data-action="delete"]')!;
    del.click();
    expect(calls.onDeleteList).not.toHaveBeenCalled();
    expect(del.textContent).toBe('Delete Crypto? Click again');
    del.click();
    expect(calls.onDeleteList).toHaveBeenCalledWith('a');
  });

  it('offers no delete when only one list is left', () => {
    wl.setLists([lists[0]], 'a');
    host.querySelector<HTMLButtonElement>('.tcw-watchlist-name')!.click();
    expect(host.querySelector('[data-action="delete"]')).toBeNull();
  });

  it('adds and removes symbols', () => {
    host.querySelector<HTMLButtonElement>('.tcw-watchlist-add')!.click();
    expect(calls.onAdd).toHaveBeenCalled();
    const remove = rows()[0].querySelector<HTMLButtonElement>('.tcw-watchlist-remove')!;
    expect(remove.getAttribute('aria-label')).toBe('Remove BTCUSDT');
    remove.click();
    expect(calls.onRemove).toHaveBeenCalledWith('BTCUSDT');
    expect(calls.onSelect).not.toHaveBeenCalled();
    key(rows()[2], 'Delete');
    expect(calls.onRemove).toHaveBeenCalledWith('SOLUSDT');
  });

  it('moves a row with Alt+arrows and by dragging', () => {
    key(rows()[0], 'ArrowDown', { altKey: true });
    expect(calls.onMove).toHaveBeenCalledWith('BTCUSDT', 1);
    key(rows()[0], 'ArrowUp', { altKey: true });
    expect(calls.onMove).toHaveBeenCalledTimes(1); // already first

    const drag = new Event('dragstart', { bubbles: true }) as DragEvent;
    Object.defineProperty(drag, 'dataTransfer', { value: { setData: vi.fn(), effectAllowed: '' } });
    rows()[2].dispatchEvent(drag);
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    rows()[0].dispatchEvent(drop);
    expect(calls.onMove).toHaveBeenLastCalledWith('SOLUSDT', 0);
  });

  it('moves focus between rows with the arrow keys', () => {
    rows()[0].focus();
    key(rows()[0], 'ArrowDown');
    expect(document.activeElement).toBe(rows()[1]);
  });

  it('shows prices and moves it is given, and keeps them across list switches', () => {
    wl.setEntry('ETHUSDT', { lastPrice: 2000, refPrice: 1900 });
    const eth = () => rows()[1];
    expect(eth().querySelector('.tcw-watchlist-price')!.textContent).toBe('2,000.00');
    expect(eth().querySelector('.tcw-watchlist-change')!.textContent).toBe('+5.26%');
    wl.setLists(lists, 'b');
    wl.setLists(lists, 'a');
    expect(eth().querySelector('.tcw-watchlist-price')!.textContent).toBe('2,000.00');
  });

  it('marks the chart’s symbol', () => {
    wl.setActive('SOLUSDT');
    expect(rows()[2].classList.contains('tcw-watchlist-active')).toBe(true);
    expect(rows()[2].getAttribute('aria-current')).toBe('true');
  });
});

describe('WidgetWatchlist keys, after review', () => {
  it('keeps the keys it handles to itself', () => {
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    key(rows()[0], 'Delete');
    key(rows()[0], 'ArrowDown', { altKey: true });
    document.removeEventListener('keydown', outside);
    expect(outside).not.toHaveBeenCalled();
  });
});

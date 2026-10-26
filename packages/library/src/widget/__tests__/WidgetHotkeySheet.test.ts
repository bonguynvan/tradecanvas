// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EN_TRANSLATOR } from '../i18n.js';
import { WidgetHotkeySheet } from '../WidgetHotkeySheet.js';

let host: HTMLDivElement;
let opener: HTMLButtonElement;
let sheet: WidgetHotkeySheet;

const dialog = () => host.querySelector<HTMLElement>('.tcw-hotkey-sheet');
const search = () => host.querySelector<HTMLInputElement>('.tcw-hotkey-search input')!;
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-hotkey-row')];
const labels = () => rows().map((r) => r.querySelector('.tcw-hotkey-label')?.textContent);
const headings = () => [...host.querySelectorAll<HTMLElement>('.tcw-hotkey-heading')].map((h) => h.textContent);
const type = (text: string) => {
  search().value = text;
  search().dispatchEvent(new Event('input'));
};
const row = (label: string) => rows().find((r) => r.querySelector('.tcw-hotkey-label')?.textContent === label)!;

beforeEach(() => {
  host = document.createElement('div');
  opener = document.createElement('button');
  document.body.append(host, opener);
  opener.focus();
  sheet = new WidgetHotkeySheet({ onClose: () => {} }, EN_TRANSLATOR, () => host);
});

afterEach(() => {
  sheet.destroy();
  document.body.innerHTML = '';
});

describe('WidgetHotkeySheet', () => {
  it('opens as a dialog, the keyboard in its search, its groups under their headings', () => {
    sheet.open();
    expect(dialog()?.getAttribute('role')).toBe('dialog');
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog()!.getAttribute('aria-labelledby')!)?.textContent).toBe('Keyboard shortcuts');
    expect(document.activeElement).toBe(search());
    expect(headings()).toEqual(['Search & navigation', 'Chart manipulation', 'Touch (mobile / tablet)', 'Keyboard', 'Drawing']);
  });

  it('writes each shortcut: what it does, then its keys; a gesture as words, not a key', () => {
    sheet.open();
    const go = row('Go to date');
    expect([...go.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['Alt', 'G']);
    const pan = row('Pan — past the last bar into empty future space');
    expect(pan.querySelector('kbd')).toBeNull();
    expect(pan.querySelector('.tcw-hotkey-gesture')?.textContent).toBe('Drag');
    // The words come first in the row, the keys after them, read left to right in any widget ("Ctrl + K").
    expect(go.firstElementChild?.classList.contains('tcw-hotkey-label')).toBe(true);
    expect(go.querySelector<HTMLElement>('.tcw-hotkey-keys')?.dir).toBe('ltr');
  });

  it('finds a shortcut by what it does or by its keys', () => {
    sheet.open();
    type('fib');
    expect(labels()).toEqual(['Fib Retracement']);
    expect(headings()).toEqual(['Drawing']);
    type('alt+g');
    expect(labels()).toEqual(['Go to date']);
    type('zzz');
    expect(rows()).toHaveLength(0);
    expect(host.querySelector('.tcw-hotkey-empty')?.textContent).toBe('No shortcuts match');
  });

  it('leaves out the keys switched off, and adds the host’s, in place of a built-in on the same keys', () => {
    sheet.open({
      isOn: (feature) => feature !== 'hotkeys.goToDate',
      extra: [{ keys: ['Alt', 'I'], text: 'Mine instead' }, { keys: ['Alt', 'N'], text: 'New note' }],
    });
    expect(labels()).not.toContain('Go to date');
    expect(labels()).not.toContain('Invert price scale');
    expect(headings().at(-1)).toBe('More');
    expect(labels().slice(-2)).toEqual(['Mine instead', 'New note']);
  });

  it('shuts on Escape, the close button and the backdrop, giving focus back', () => {
    const chartKeys = vi.fn();
    document.addEventListener('keydown', chartKeys);
    sheet.open();
    search().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    document.removeEventListener('keydown', chartKeys);
    expect(sheet.isOpen()).toBe(false);
    expect(chartKeys).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
    sheet.open();
    host.querySelector<HTMLButtonElement>('.tcw-hotkey-sheet .tcw-modal-close')!.click();
    expect(sheet.isOpen()).toBe(false);
    sheet.open();
    const backdrop = host.querySelector<HTMLElement>('.tcw-modal-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    backdrop.click();
    expect(sheet.isOpen()).toBe(false);
  });

  it('has no "Got it" button: its foot says how to open it, while that key is on', () => {
    sheet.open();
    expect(host.querySelector('.tcw-done-btn')).toBeNull();
    expect(host.querySelector('.tcw-hotkey-foot')?.textContent).toBe('Press ? anytime to show this sheet');
    sheet.close();
    sheet.open({ isOn: (feature) => feature !== 'hotkeys.help' });
    expect(host.querySelector('.tcw-hotkey-foot')).toBeNull();
  });

  it('finds keys typed with a space, and a dash for the range of digits', () => {
    sheet.open();
    type('alt g');
    expect(labels()).toEqual(['Go to date']);
    type('0-9');
    expect(labels()).toEqual(['Type a number to change the interval']);
  });

  it('says when nothing matches in a live region that stays', () => {
    sheet.open();
    const live = host.querySelector<HTMLElement>('.tcw-hotkey-live')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    type('zzz');
    expect(live.textContent).toBe('No shortcuts match');
    type('');
    expect(live.textContent).toBe('');
  });

  // Columns on a box of a fixed height lay what doesn't fit in further columns to the side, out of
  // sight and out of reach of the scroll: the columns are on a block as tall as its groups, inside it.
  it('lays its groups in columns inside the box that scrolls, not on it', () => {
    sheet.open();
    const body = host.querySelector<HTMLElement>('.tcw-hotkey-body')!;
    const columns = body.querySelector<HTMLElement>(':scope > .tcw-hotkey-columns');
    expect(columns).not.toBeNull();
    expect([...body.children]).toEqual([columns]);
    expect([...columns!.children].every((group) => group.classList.contains('tcw-hotkey-group'))).toBe(true);
    expect(columns!.children).toHaveLength(headings().length);
    type('zzz');
    expect(body.querySelector('.tcw-hotkey-empty')).not.toBeNull();
    type('');
    expect(body.querySelectorAll('.tcw-hotkey-columns > .tcw-hotkey-group')).toHaveLength(headings().length);
  });

  it('leaves Escape to an input method while it composes', () => {
    sheet.open();
    search().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true, cancelable: true } as KeyboardEventInit));
    expect(sheet.isOpen()).toBe(true);
  });
});

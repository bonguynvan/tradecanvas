// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetContextMenu, type ContextMenuEntry } from '../WidgetContextMenu.js';
import { drawingMenuEntries, type DrawingMenuTarget } from '../drawingMenu.js';
import { EN_TRANSLATOR } from '../i18n.js';

const ENTRIES: ContextMenuEntry[] = [
  { id: 'settings', label: 'Settings…', icon: 'settings' },
  'separator',
  { id: 'hide', label: 'Hide' },
  { id: 'delete', label: 'Delete', danger: true },
];

let host: HTMLDivElement;
let menu: WidgetContextMenu;

const items = () => [...host.querySelectorAll<HTMLButtonElement>('[role=menuitem]')];
const key = (k: string) =>
  (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  menu = new WidgetContextMenu(host, 'Drawing');
});

afterEach(() => {
  menu.destroy();
  host.remove();
});

describe('WidgetContextMenu', () => {
  it('lists the entries and focuses the first', () => {
    menu.open(ENTRIES, 10, 20, () => {});
    expect(menu.isOpen()).toBe(true);
    expect(items().map((b) => b.textContent)).toEqual(['Settings…', 'Hide', 'Delete']);
    expect(host.querySelectorAll('[role=separator]')).toHaveLength(1);
    expect(document.activeElement).toBe(items()[0]);
    expect(host.querySelector('[role=menu]')!.getAttribute('aria-label')).toBe('Drawing');
  });

  it('moves with the arrow keys, Home and End, and wraps', () => {
    menu.open(ENTRIES, 0, 0, () => {});
    key('ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key('End');
    expect(document.activeElement).toBe(items()[2]);
    key('ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key('ArrowUp');
    expect(document.activeElement).toBe(items()[2]);
    key('Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('picks an entry, closes, and gives focus back', () => {
    const before = document.createElement('button');
    document.body.appendChild(before);
    before.focus();
    const pick = vi.fn();
    menu.open(ENTRIES, 0, 0, pick);
    items()[1].click();
    expect(pick).toHaveBeenCalledWith('hide');
    expect(menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(before);
    before.remove();
  });

  it('closes on Escape or a press outside, without picking', () => {
    const pick = vi.fn();
    menu.open(ENTRIES, 0, 0, pick);
    key('Escape');
    expect(menu.isOpen()).toBe(false);
    menu.open(ENTRIES, 0, 0, pick);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu.isOpen()).toBe(false);
    expect(pick).not.toHaveBeenCalled();
  });
});

const one = (over: Partial<DrawingMenuTarget['selected'][number]> = {}): DrawingMenuTarget['selected'][number] =>
  ({ id: 'a', locked: false, groupId: null, ...over });
const ids = (target: DrawingMenuTarget) =>
  drawingMenuEntries(target, EN_TRANSLATOR).flatMap((e) => (e === 'separator' ? [] : [e.id]));

describe('drawingMenuEntries', () => {
  it('offers everything for one drawing', () => {
    expect(ids({ selected: [one()], canConfigure: true, canAlert: true })).toEqual([
      'settings', 'alert', 'front', 'forward', 'backward', 'back', 'lock', 'hide', 'duplicate', 'delete',
    ]);
  });

  it('leaves out the alert for a drawing without lines, and settings without a dialog', () => {
    expect(ids({ selected: [one()], canConfigure: false, canAlert: false })[0]).toBe('front');
  });

  it('groups a selection, and works on all of it', () => {
    const selected = [one(), one({ id: 'b' })];
    expect(ids({ selected, canConfigure: true, canAlert: true })).toEqual(['group', 'lock', 'hide', 'delete']);
  });

  it('ungroups a group, and does not offer to group it again', () => {
    const selected = [one({ groupId: 'g' }), one({ id: 'b', groupId: 'g' })];
    expect(ids({ selected, canConfigure: true, canAlert: false })).toEqual(['ungroup', 'lock', 'hide', 'delete']);
  });

  it('unlocks locked drawings and does not delete them', () => {
    const entries = ids({ selected: [one({ locked: true })], canConfigure: true, canAlert: false });
    expect(entries).toContain('unlock');
    expect(entries).not.toContain('lock');
    expect(entries).not.toContain('delete');
  });
});

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

  describe('without room to the right of its point', () => {
    const left = () => parseFloat(host.querySelector<HTMLElement>('.tcw-context-menu')!.style.left);
    beforeEach(() => {
      Object.defineProperty(host, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(host, 'clientHeight', { value: 300, configurable: true });
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
    });
    afterEach(() => { vi.restoreAllMocks(); });

    it('ends at the point', () => {
      menu.open(ENTRIES, 300, 0, () => {});
      expect(left()).toBe(150);
    });

    it('ends where it is told to instead: a menu under a button, at the button’s far edge', () => {
      menu.open(ENTRIES, 300, 0, () => {}, undefined, undefined, 380);
      expect(left()).toBe(230);
    });
  });
});

describe('WidgetContextMenu shortcuts, choices and submenus', () => {
  const SCALE: ContextMenuEntry[] = [
    { id: 'invert', label: 'Invert scale', checked: false, shortcut: 'Alt+I' },
    'separator',
    { id: 'regular', label: 'Regular', radio: true, checked: true },
    { id: 'log', label: 'Logarithmic', radio: true, checked: false },
    'separator',
    { id: 'labels', label: 'Labels', submenu: [
      { id: 'values', label: 'Indicator values', checked: true },
      { id: 'countdown', label: 'Countdown', checked: false },
    ] },
    { id: 'settings', label: 'Settings…' },
  ];
  const sub = () => [...document.querySelectorAll<HTMLElement>('.tcw-context-menu')].find((m) => m !== host.querySelector('.tcw-context-menu') && !m.hidden);
  const all = (role: string) => [...host.querySelectorAll<HTMLElement>(`[role=${role}]`)];

  it('writes a shortcut at the row’s end, and names it', () => {
    menu.open(SCALE, 0, 0, () => {});
    const invert = all('menuitemcheckbox')[0];
    expect(invert.querySelector('.tcw-context-key')?.textContent).toBe('Alt+I');
    expect(invert.getAttribute('aria-keyshortcuts')).toBe('Alt+I');
  });

  it('marks a choice among several as a radio item', () => {
    menu.open(SCALE, 0, 0, () => {});
    expect(all('menuitemradio').map((b) => b.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('opens a submenu with the right arrow, closes it with the left, and picks from it', () => {
    const pick = vi.fn();
    menu.open(SCALE, 0, 0, pick);
    const labels = host.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
    expect(labels.textContent).toContain('Labels');
    labels.focus();
    key('ArrowRight');
    expect(labels.getAttribute('aria-expanded')).toBe('true');
    expect(sub()).toBeDefined();
    expect(document.activeElement?.textContent).toBe('Indicator values');
    key('ArrowLeft');
    expect(sub()).toBeUndefined();
    expect(document.activeElement).toBe(labels);
    labels.click();
    [...sub()!.querySelectorAll<HTMLButtonElement>('[role=menuitemcheckbox]')][1].click();
    expect(pick).toHaveBeenCalledWith('countdown');
    expect(menu.isOpen()).toBe(false);
    expect(sub()).toBeUndefined();
  });

  it('closes only the submenu on Escape, and keeps the menu open on a press inside the submenu', () => {
    menu.open(SCALE, 0, 0, () => {});
    const labels = host.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
    labels.click();
    sub()!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu.isOpen()).toBe(true);
    key('Escape');
    expect(sub()).toBeUndefined();
    expect(menu.isOpen()).toBe(true);
  });

  it('starts a submenu with the way back on a phone, where it opens over the menu', () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('max-width'), media: query })) as typeof window.matchMedia;
    menu.destroy();
    menu = new WidgetContextMenu(host, 'Price scale', 'Back');
    try {
      const pick = vi.fn();
      menu.open(SCALE, 0, 0, pick);
      const labels = host.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
      labels.click();
      const back = sub()!.querySelector<HTMLElement>('[role=menuitem]')!;
      expect(back.textContent).toBe('Labels');
      expect(back.getAttribute('aria-label')).toBe('Back: Labels');
      back.click();
      expect(sub()).toBeUndefined();
      expect(menu.isOpen()).toBe(true);
      expect(document.activeElement).toBe(labels);
      expect(pick).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('opens a submenu with the left arrow, and closes it with the right, where the widget reads right to left', () => {
    host.setAttribute('dir', 'rtl');
    menu.open(SCALE, 0, 0, () => {});
    const labels = host.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
    labels.focus();
    key('ArrowRight');
    expect(sub()).toBeUndefined();
    key('ArrowLeft');
    expect(sub()).toBeDefined();
    key('ArrowLeft');
    expect(sub()).toBeDefined();
    key('ArrowRight');
    expect(sub()).toBeUndefined();
    expect(document.activeElement).toBe(labels);
  });

  describe('beside its entry', () => {
    const at = (left: number, right: number) => {
      const labels = host.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
      labels.getBoundingClientRect = () => ({ left, right, top: 40, bottom: 70, width: right - left, height: 30 }) as DOMRect;
      labels.click();
      return parseFloat(sub()!.style.left);
    };
    beforeEach(() => {
      Object.defineProperty(host, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(host, 'clientHeight', { value: 300, configurable: true });
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
    });
    afterEach(() => { vi.restoreAllMocks(); });

    it('opens to the right of it, or to its left without room', () => {
      menu.open(SCALE, 0, 0, () => {});
      expect(at(0, 200)).toBe(200);
      key('Escape');
      expect(at(200, 300)).toBe(50);
    });

    it('opens to its left first where the widget reads right to left', () => {
      host.setAttribute('dir', 'rtl');
      menu.open(SCALE, 0, 0, () => {});
      expect(at(160, 200)).toBe(10);
      key('Escape');
      expect(at(100, 200)).toBe(200);
    });
  });

  it('opens a long list of choices at the one made, the keyboard on it', () => {
    const zones: ContextMenuEntry[] = Array.from({ length: 20 }, (_, i) => ({ id: `z${i}`, label: `Zone ${i}`, radio: true, checked: i === 15 }));
    const ROW = 30;
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      return Number(this.dataset.id?.slice(1) ?? 0) * ROW;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(ROW);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(10 * ROW);
    try {
      menu.open(zones, 0, 0, () => {});
      expect((document.activeElement as HTMLElement).dataset.id).toBe('z15');
      expect(host.querySelector<HTMLElement>('.tcw-context-menu')!.scrollTop).toBeGreaterThan(0);
      menu.close();
      // A short list, the choice in sight: the keyboard starts at the top as usual.
      menu.open(zones.slice(0, 5).map((z, i) => ({ ...(z as object), checked: i === 3 }) as ContextMenuEntry), 0, 0, () => {});
      expect((document.activeElement as HTMLElement).dataset.id).toBe('z0');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('closes every menu on Tab in a submenu', () => {
    menu.open(SCALE, 0, 0, () => {});
    host.querySelector<HTMLElement>('[aria-haspopup="menu"]')!.click();
    key('Tab');
    expect(sub()).toBeUndefined();
    expect(menu.isOpen()).toBe(false);
  });

  describe('under a resting pointer', () => {
    const rest = (el: Element) => {
      el.dispatchEvent(new MouseEvent('pointerenter'));
      vi.advanceTimersByTime(200);
    };
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('opens a submenu without taking the keyboard, and closes it on another entry', () => {
      menu.open(SCALE, 0, 0, () => {});
      const first = document.activeElement;
      rest(host.querySelector('[aria-haspopup="menu"]')!);
      expect(sub()).toBeDefined();
      expect(document.activeElement).toBe(first);
      rest(all('menuitem').find((b) => b.textContent === 'Settings…')!);
      expect(sub()).toBeUndefined();
      expect(menu.isOpen()).toBe(true);
      expect(document.activeElement).toBe(first);
    });

    it('closes a submenu the pointer opened when the keyboard moves on in the menu', () => {
      menu.open(SCALE, 0, 0, () => {});
      rest(host.querySelector('[aria-haspopup="menu"]')!);
      expect(sub()).toBeDefined();
      key('ArrowDown');
      expect(sub()).toBeUndefined();
      expect(menu.isOpen()).toBe(true);
    });

    it('opens nothing under a finger: a tap is a click', () => {
      menu.open(SCALE, 0, 0, () => {});
      const touch = new Event('pointerenter');
      Object.defineProperty(touch, 'pointerType', { value: 'touch' });
      host.querySelector('[aria-haspopup="menu"]')!.dispatchEvent(touch);
      vi.advanceTimersByTime(200);
      expect(sub()).toBeUndefined();
    });

    it('keeps the submenu when the pointer crosses another entry on its way in', () => {
      menu.open(SCALE, 0, 0, () => {});
      rest(host.querySelector('[aria-haspopup="menu"]')!);
      all('menuitem').find((b) => b.textContent === 'Settings…')!.dispatchEvent(new MouseEvent('pointerenter'));
      rest(sub()!);
      expect(sub()).toBeDefined();
    });
  });
});

describe('WidgetContextMenu and the wheel', () => {
  it('stays open while its own list scrolls, and closes on a wheel elsewhere', () => {
    menu.open(ENTRIES, 0, 0, () => {});
    items()[0].dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    expect(menu.isOpen()).toBe(true);
    document.body.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    expect(menu.isOpen()).toBe(false);
  });
});

describe('WidgetContextMenu entries that can be removed', () => {
  it('removes one by its button or the Delete key, and stays open on the next', () => {
    const remove = vi.fn();
    const pick = vi.fn();
    menu.open([
      { id: 'swing', label: 'Swing', remove: 'Delete Swing' },
      { id: 'scalp', label: 'Scalp', remove: 'Delete Scalp' },
      'separator',
      { id: 'save', label: 'Save…' },
    ], 0, 0, pick, undefined, remove);
    host.querySelector<HTMLButtonElement>('.tcw-context-remove')!.click();
    expect(remove).toHaveBeenCalledWith('swing');
    expect(pick).not.toHaveBeenCalled();
    expect(items().map((b) => b.textContent)).toEqual(['Scalp', 'Save…']);
    expect(menu.isOpen()).toBe(true);
    expect(document.activeElement).toBe(items()[0]);
    expect(items()[0].getAttribute('aria-keyshortcuts')).toBe('Delete');
    key('Delete');
    expect(remove).toHaveBeenLastCalledWith('scalp');
    expect(items().map((b) => b.textContent)).toEqual(['Save…']);
    key('Delete');
    expect(remove).toHaveBeenCalledTimes(2);
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

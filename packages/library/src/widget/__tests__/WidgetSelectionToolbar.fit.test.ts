// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WidgetSelectionToolbar, type SelectionToolbarTarget } from '../WidgetSelectionToolbar.js';
import { EN_TRANSLATOR } from '../i18n.js';

let host: HTMLDivElement;
let bar: WidgetSelectionToolbar;

/** A line with words, an alert and its settings on a phone's plot: every button the toolbar has but the order's and the fill's. */
const target = (over: Partial<SelectionToolbarTarget> = {}): SelectionToolbarTarget => ({
  rect: { x: 100, y: 100, width: 100, height: 40 },
  bounds: { x: 0, y: 0, width: 320, height: 600 },
  style: { color: '#2348c4', lineWidth: 1, lineStyle: 'solid' },
  locked: false,
  canDelete: true,
  canSettings: true,
  canAlert: true,
  canText: true,
  canType: true,
  menuHolds: ['alert', 'lock', 'text', 'settings'],
  ...over,
});

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  bar = new WidgetSelectionToolbar(host, {
    onStyle: () => {}, onSettings: () => {}, onText: () => {}, onAlert: () => {}, onOrder: () => {}, onLock: () => {}, onMore: () => {}, onDelete: () => {},
  }, EN_TRANSLATOR);
});

afterEach(() => {
  bar.destroy();
  host.remove();
});

const el = () => host.querySelector<HTMLElement>('.tcw-sel-toolbar')!;
const shown = () => [...el().querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.hidden).map((b) => b.dataset.action);
const tight = () => el().classList.contains('tcw-sel-toolbar--tight');

/** A grip and its margins, a button and the gap after it, the figure beside the width's line (px): as a finger's toolbar is. */
const GRIP = 28;
const BUTTON = 34;
const FIGURE = 26;

/** What the toolbar's buttons ask for side by side (px). */
const natural = () => GRIP + shown().length * BUTTON + (tight() ? 0 : FIGURE);

/**
 * jsdom lays nothing out: the chart is as wide as told, and the toolbar as a browser has it. On a
 * phone the stylesheet keeps it to the chart's width less 8 px, its buttons on a second line
 * where one is too narrow: its width never says it is too wide, unless it is measured on one
 * line (`tcw-sel-toolbar--fitting`).
 */
function laidOut(width: number, phone = width <= 640): void {
  Object.defineProperty(host, 'clientWidth', { value: width, configurable: true });
  const onOneLine = () => !phone || el().classList.contains('tcw-sel-toolbar--fitting');
  Object.defineProperty(el(), 'offsetWidth', { configurable: true, get: () => (onOneLine() ? natural() : Math.min(natural(), width - 8)) });
  Object.defineProperty(el(), 'offsetHeight', { configurable: true, get: () => (onOneLine() || natural() <= width - 8 ? 40 : 76) });
}

const ALL = ['color', 'width', 'lineStyle', 'textColor', 'text', 'settings', 'alert', 'lock', 'more', 'delete'];

describe('a toolbar wider than its chart', () => {
  it('keeps every button where there is room for them', () => {
    laidOut(1000);
    bar.show(target());
    expect(shown()).toEqual(ALL);
    expect(tight()).toBe(false);
  });

  // Ten buttons are 394 px; at 32 px each they wrapped on a 390 px phone, the bin alone on a second line.
  it('gives up first what the "more" menu holds too, one at a time: the alert, the lock, the words, the settings', () => {
    laidOut(390);
    bar.show(target());
    expect(shown()).toEqual(ALL.filter((a) => a !== 'alert'));
    laidOut(360);
    bar.show(target());
    expect(shown()).toEqual(ALL.filter((a) => !['alert', 'lock'].includes(a)));
    laidOut(300);
    bar.show(target());
    expect(shown()).toEqual(['color', 'width', 'lineStyle', 'textColor', 'settings', 'more', 'delete']);
    laidOut(270);
    bar.show(target());
    expect(shown()).toEqual(['color', 'width', 'lineStyle', 'textColor', 'more', 'delete']);
    expect(tight()).toBe(false);
  });

  it('then the width’s figure, which its picker shows, then the colours its settings hold', () => {
    laidOut(240);
    bar.show(target());
    expect(shown()).toEqual(['color', 'width', 'lineStyle', 'textColor', 'more', 'delete']);
    expect(tight()).toBe(true);
    laidOut(210);
    bar.show(target({ canFill: true }));
    // Seven buttons with the fill's: the text's colour goes, then the fill's.
    expect(shown()).toEqual(['color', 'width', 'lineStyle', 'more', 'delete']);
  });

  it('keeps the bin and the menu to the last', () => {
    laidOut(120);
    bar.show(target({ canFill: true, canOrder: true }));
    expect(shown()).toEqual(['color', 'width', 'lineStyle', 'order', 'more', 'delete']);
  });

  it('shows them again once the chart is wider', () => {
    laidOut(360);
    bar.show(target());
    expect(shown()).not.toContain('lock');
    laidOut(1000);
    bar.show(target());
    expect(shown()).toEqual(ALL);
  });

  it('gives up nothing the menu would hold when the menu is switched off', () => {
    laidOut(360);
    bar.show(target({ menuHolds: [] }));
    // The figure goes; the alert, the lock, the words and the settings have nowhere else to be.
    expect(shown()).toEqual(ALL.filter((a) => a !== 'textColor'));
    expect(tight()).toBe(true);
  });

  it('gives up only the buttons whose entry the host left in the menu', () => {
    laidOut(360);
    // No alert entry, no settings entry (`menu.drawing.alert`, `menu.drawing.settings` off).
    bar.show(target({ menuHolds: ['lock', 'text'] }));
    expect(shown()).toEqual(ALL.filter((a) => !['lock', 'text'].includes(a)));
  });

  it('keeps one tab stop, on a button that is still there', () => {
    laidOut(1000);
    bar.show(target());
    const alert = el().querySelector<HTMLButtonElement>('[data-action="alert"]')!;
    alert.focus();
    alert.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    laidOut(300);
    // The lock button's state changed: the buttons are built again, and fitted.
    bar.show(target({ locked: true }));
    const stops = [...el().querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0].hidden).toBe(false);
  });

  it('measures nothing where nothing is laid out', () => {
    bar.show(target());
    expect(shown()).toEqual(ALL);
  });

  it('is measured on one line, and left as the stylesheet lays it out', () => {
    laidOut(390);
    bar.show(target());
    // Folded to one line, so no second one; and not left in the state it was measured in.
    expect(el().offsetHeight).toBe(40);
    expect(el().classList.contains('tcw-sel-toolbar--fitting')).toBe(false);
  });

  it('shuts a choice left open on a button it gives up', () => {
    laidOut(1000);
    bar.show(target());
    const textColor = el().querySelector<HTMLButtonElement>('[data-action="textColor"]')!;
    textColor.click();
    const pop = host.querySelector<HTMLElement>('.tcw-sel-pop')!;
    expect(pop.hidden).toBe(false);
    // The phone is turned: no room for the words' colour.
    laidOut(210);
    bar.show(target());
    expect(textColor.hidden).toBe(true);
    expect(pop.hidden).toBe(true);
    expect(textColor.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the focus on the toolbar when the button that had it is given up', () => {
    laidOut(1000);
    bar.show(target());
    const lock = el().querySelector<HTMLButtonElement>('[data-action="lock"]')!;
    lock.focus();
    laidOut(360);
    bar.show(target());
    expect(lock.hidden).toBe(true);
    expect(el().contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLElement).hidden).toBe(false);
  });
});

describe('at the foot of a phone’s plot', () => {
  const at = () => ({ left: parseFloat(el().style.left), top: parseFloat(el().style.top) });

  /** A 44 px button 10 px in from the plot's left edge and 10 px above its foot, and the 6 px kept beside it. */
  const button = { reach: 60, middle: 32, height: 44 };
  const pointer = (to: EventTarget, type: string, x: number, y: number) => {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    to.dispatchEvent(e);
  };
  /** Drag the toolbar by its grip, by so much. */
  const drag = (dx: number, dy: number) => {
    const grip = host.querySelector<HTMLElement>('.tcw-sel-grip')!;
    pointer(grip, 'pointerdown', 100, 100);
    pointer(document, 'pointermove', 100 + dx, 100 + dy);
    pointer(document, 'pointerup', 100 + dx, 100 + dy);
  };

  it('starts after the drawing tools’ button, level with it, and gives up what has no room beside it', () => {
    laidOut(390);
    bar.show(target({ footButton: button }));
    // 390 less the button's 60 and the edges: 322 px. Ten buttons are 394: the alert, the lock and the words go (292).
    expect(shown()).toEqual(['color', 'width', 'lineStyle', 'textColor', 'settings', 'more', 'delete']);
    // Its middle on the button's, 32 px above the foot: 8 px higher than it waits there by itself.
    expect(at()).toEqual({ left: 64, top: 600 - 32 - 20 });
  });

  it('stays clear of the button where it is dragged to: the button is drawn over it', () => {
    laidOut(390);
    bar.show(target({ footButton: button }));
    // Dragged left, onto the button's place: no further than beside it.
    drag(-60, 0);
    expect(at().left).toBe(64);
    // Dragged up out of the button's line, it may go to the plot's edge.
    drag(-60, -200);
    expect(at()).toEqual({ left: 4, top: 600 - 32 - 20 - 200 });
  });

  it('waits at the foot as before where no button is', () => {
    laidOut(390);
    bar.show(target());
    expect(at()).toEqual({ left: 4, top: 600 - 40 - 4 });
  });

  it('keeps the plot’s whole width where it waits under its top', () => {
    laidOut(1280);
    bar.show(target({ footButton: button, bounds: { x: 0, y: 0, width: 1200, height: 600 } }));
    expect(shown()).toEqual(ALL);
    expect(at()).toEqual({ left: (1200 - 394) / 2, top: 32 });
  });
});

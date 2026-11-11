// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GridLayoutPicker, gridLayoutLabel, shapeIcon } from '../GridLayoutPicker.js';
import { GRID_LAYOUTS, GRID_LAYOUT_SHAPES, type GridLayout } from '../../grid/gridShapes.js';
import { createTranslator, resolveMessages } from '../i18n.js';

const t = createTranslator(resolveMessages());
let host: HTMLDivElement;
let picker: GridLayoutPicker | undefined;
let current: GridLayout;
let picked: GridLayout[];

const make = (choices: readonly GridLayout[] = GRID_LAYOUTS) => {
  picker = new GridLayoutPicker({
    host,
    t,
    choices,
    current: () => current,
    onPick: (layout) => {
      picked.push(layout);
      current = layout;
    },
  });
  host.appendChild(picker.button);
  return picker;
};
const panel = () => host.querySelector<HTMLElement>('.tcw-grid-picker');
const items = () => [...host.querySelectorAll<HTMLButtonElement>('.tcw-grid-picker [role="menuitemradio"]')];
const item = (layout: GridLayout) => host.querySelector<HTMLButtonElement>(`.tcw-grid-picker [data-layout="${layout}"]`)!;
const key = (k: string) => (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  current = '1x2';
  picked = [];
});

afterEach(() => {
  picker?.destroy();
  picker = undefined;
  host.remove();
});

describe('shapeIcon', () => {
  const rects = (layout: GridLayout) => (shapeIcon(GRID_LAYOUT_SHAPES[layout]).match(/<rect /g) ?? []).length;

  it('draws a box for each chart', () => {
    expect(rects('1x1')).toBe(1);
    expect(rects('1+2')).toBe(3);
    expect(rects('1/3')).toBe(4);
    expect(rects('3x3')).toBe(9);
    expect(rects('2x4')).toBe(8);
  });

  it('draws a large chart as one box over its cells', () => {
    const svg = shapeIcon(GRID_LAYOUT_SHAPES['1+2']);
    // Two columns 9 wide with a gap of 2, the left box as tall as the icon.
    expect(svg).toContain('<rect x="2" y="2" width="9" height="20" rx="1"/>');
    expect(svg).toContain('<rect x="13" y="2" width="9" height="9" rx="1"/>');
    expect(svg).toContain('stroke="currentColor"');
  });
});

describe('gridLayoutLabel', () => {
  it('names plain grids by columns and rows, and the others by their large chart', () => {
    expect(gridLayoutLabel('1x1', t)).toBe('One chart');
    expect(gridLayoutLabel('2x4', t)).toBe('8 charts, 4 across and 2 down');
    expect(gridLayoutLabel('1+2', t)).toBe('3 charts, one large on the left');
    expect(gridLayoutLabel('2+1', t)).toBe('3 charts, one large on the right');
    expect(gridLayoutLabel('1/3', t)).toBe('4 charts, one large on top');
    expect(gridLayoutLabel('2/1', t)).toBe('3 charts, one large at the bottom');
  });
});

describe('GridLayoutPicker', () => {
  it('is one button showing the arrangement in use, closed at first', () => {
    make();
    const button = btn();
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Chart layout: 2 charts, 2 across and 1 down');
    expect(button.querySelectorAll('svg rect')).toHaveLength(2);
    expect(panel()).toBeNull();
  });

  it('lists the arrangements grouped by chart count, the one in use checked', () => {
    make();
    btn().click();
    expect(btn().getAttribute('aria-expanded')).toBe('true');
    expect(panel()!.getAttribute('role')).toBe('menu');
    const groups = [...panel()!.querySelectorAll<HTMLElement>('[role="group"]')];
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['One chart', '2 charts', '3 charts', '4 charts', '6 charts', '8 charts', '9 charts']);
    expect(groups.map((g) => g.querySelector('.tcw-grid-picker-count')!.textContent)).toEqual(['1', '2', '3', '4', '6', '8', '9']);
    expect([...groups[2].querySelectorAll('[data-layout]')].map((b) => b.getAttribute('data-layout'))).toEqual(['1x3', '3x1', '1+2', '2+1', '1/2', '2/1']);
    expect(items()).toHaveLength(GRID_LAYOUTS.length);
    expect(items().filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.dataset.layout)).toEqual(['1x2']);
    expect(item('1+3').getAttribute('aria-label')).toBe('4 charts, one large on the left');
    expect(item('1+3').title).toBe('4 charts, one large on the left');
    // The keyboard starts on the one in use.
    expect(document.activeElement).toBe(item('1x2'));
  });

  it('offers only the choices given, in count order', () => {
    make(['3x3', '1+2', '1x1']);
    btn().click();
    expect(items().map((b) => b.dataset.layout)).toEqual(['1x1', '1+2', '3x3']);
  });

  it('picks with a click, closes and shows the new arrangement on its button', () => {
    make();
    btn().click();
    item('1/3').click();
    expect(picked).toEqual(['1/3']);
    expect(panel()?.hidden ?? true).toBe(true);
    picker!.render();
    expect(btn().getAttribute('aria-label')).toBe('Chart layout: 4 charts, one large on top');
    expect(btn().querySelectorAll('svg rect')).toHaveLength(4);
  });

  it('moves with the arrows: along with left and right, between counts with up and down', () => {
    make();
    btn().click();
    key('ArrowRight');
    expect(document.activeElement).toBe(item('2x1'));
    key('ArrowRight');
    expect(document.activeElement).toBe(item('1x3'));
    key('ArrowLeft');
    expect(document.activeElement).toBe(item('2x1'));
    key('ArrowDown');
    expect(document.activeElement).toBe(item('3x1'));
    key('ArrowDown');
    expect(document.activeElement).toBe(item('1x4'));
    key('ArrowUp');
    key('ArrowUp');
    key('ArrowUp');
    expect(document.activeElement).toBe(item('1x1'));
    key('ArrowUp');
    expect(document.activeElement).toBe(item('3x3'));
    key('Home');
    expect(document.activeElement).toBe(item('1x1'));
    key('End');
    expect(document.activeElement).toBe(item('3x3'));
  });

  it('picks with Enter', () => {
    make();
    btn().click();
    key('ArrowDown');
    key('Enter');
    expect(picked).toEqual(['1x3']);
    expect(picker!.isOpen()).toBe(false);
    expect(document.activeElement).toBe(btn());
  });

  it('closes with Escape and gives the keyboard back to its button', () => {
    make();
    btn().click();
    key('Escape');
    expect(picker!.isOpen()).toBe(false);
    expect(btn().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(btn());
    expect(picked).toEqual([]);
  });

  it('closes on a press outside, and on a second press of its button', () => {
    make();
    btn().click();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(picker!.isOpen()).toBe(false);
    btn().click();
    expect(picker!.isOpen()).toBe(true);
    btn().dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(picker!.isOpen()).toBe(true);
    btn().click();
    expect(picker!.isOpen()).toBe(false);
  });

  it('checks the arrangement in use each time it opens', () => {
    make();
    btn().click();
    key('Escape');
    current = '3x3';
    btn().click();
    expect(item('3x3').getAttribute('aria-checked')).toBe('true');
    expect(item('1x2').getAttribute('aria-checked')).toBe('false');
  });
});

function btn(): HTMLButtonElement {
  return picker!.button;
}

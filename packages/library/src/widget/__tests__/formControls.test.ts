// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFormControls } from '../formControls.js';
import { monthGrid, weekStart } from '../calendarPopup.js';

const labels = { prevMonth: 'Previous month', nextMonth: 'Next month', today: 'Today' };

let root: HTMLElement;
let layer: HTMLElement;
let uninstall: () => void;

function setUp(native = false): void {
  root = document.createElement('div');
  root.className = 'tcw-root';
  layer = document.createElement('div');
  layer.className = 'tcw-root tcw-portal';
  document.body.append(root, layer);
  uninstall = installFormControls([root, layer], {
    layer: () => layer,
    labels: () => labels,
    locale: () => 'en-GB',
    native: () => native,
  });
}

function select(values: string[], value = values[0]): HTMLSelectElement {
  const s = document.createElement('select');
  for (const v of values) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v.toUpperCase();
    s.appendChild(o);
  }
  s.value = value;
  root.appendChild(s);
  return s;
}

const press = (el: Element, key: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
const mousedown = (el: Element) => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
const menu = () => layer.querySelector<HTMLElement>('.tcw-select-menu');
const options = () => [...layer.querySelectorAll<HTMLElement>('.tcw-select-menu [role="option"]')];

afterEach(() => {
  uninstall();
  document.body.innerHTML = '';
});

describe('select menus', () => {
  beforeEach(() => setUp());

  it('opens its own list in the layer instead of the browser one, the chosen option marked', () => {
    const s = select(['a', 'b', 'c'], 'b');
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
    s.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(menu()?.getAttribute('role')).toBe('listbox');
    expect(options().map((o) => o.textContent)).toEqual(['A', 'B', 'C']);
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    expect(s.getAttribute('aria-expanded')).toBe('true');
  });

  it('reads an option in the direction it is given, as the option itself does', () => {
    const s = select(['all', 'nyse arca.']);
    s.options[1].dir = 'auto';
    mousedown(s);
    const text = (i: number) => options()[i].querySelector<HTMLElement>('.tcw-select-option-text')!;
    expect(text(1).dir).toBe('auto');
    // One given no direction follows the widget's.
    expect(text(0).hasAttribute('dir')).toBe(false);
  });

  it('picks with a click: the select changes and says so, the list closes', () => {
    const s = select(['a', 'b', 'c']);
    const changed = vi.fn();
    const typed = vi.fn();
    s.addEventListener('change', changed);
    s.addEventListener('input', typed);
    mousedown(s);
    options()[2].click();
    expect(s.value).toBe('c');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(typed).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(s);
  });

  it('picking the option already chosen changes nothing', () => {
    const s = select(['a', 'b'], 'a');
    const changed = vi.fn();
    s.addEventListener('change', changed);
    mousedown(s);
    options()[0].click();
    expect(changed).not.toHaveBeenCalled();
  });

  it('opens from the keyboard and moves, picks and leaves with keys', () => {
    const s = select(['a', 'b', 'c'], 'a');
    s.focus();
    press(s, 'Enter');
    expect(menu()).not.toBeNull();
    press(s, 'ArrowDown');
    press(s, 'ArrowDown');
    expect(options()[2].classList.contains('tcw-active')).toBe(true);
    press(s, 'Enter');
    expect(s.value).toBe('c');
    expect(menu()).toBeNull();
    press(s, ' ');
    expect(menu()).not.toBeNull();
    press(s, 'Escape');
    expect(menu()).toBeNull();
    expect(s.value).toBe('c');
  });

  it('jumps to an option by its first letter', () => {
    const s = select(['apple', 'banana', 'cherry']);
    s.focus();
    press(s, 'Enter');
    press(s, 'c');
    expect(options()[2].classList.contains('tcw-active')).toBe(true);
  });

  it('shows groups as headings and skips disabled options', () => {
    const s = document.createElement('select');
    const group = document.createElement('optgroup');
    group.label = 'Prices';
    const a = new Option('Open', 'open');
    const b = new Option('Close', 'close');
    b.disabled = true;
    const c = new Option('High', 'high');
    group.append(a, b, c);
    s.appendChild(group);
    root.appendChild(s);
    mousedown(s);
    expect(layer.querySelector('.tcw-select-group')?.textContent).toBe('Prices');
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
    options()[1].click();
    expect(s.value).toBe('open');
    s.focus();
    press(s, 'ArrowDown');
    press(s, 'Enter');
    expect(s.value).toBe('high');
  });

  it('closes on a press outside, and a second press on the select toggles it', () => {
    const s = select(['a', 'b']);
    mousedown(s);
    mousedown(s);
    expect(menu()).toBeNull();
    mousedown(s);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(menu()).toBeNull();
  });

  it('leaves disabled and multi-line selects to the browser', () => {
    const s = select(['a', 'b']);
    s.disabled = true;
    mousedown(s);
    const list = select(['a', 'b']);
    list.size = 4;
    mousedown(list);
    expect(menu()).toBeNull();
  });

  it('opens once in fullscreen, where the dialogs’ layer sits inside the widget', () => {
    root.appendChild(layer);
    const s = document.createElement('select');
    s.append(new Option('A', 'a'), new Option('B', 'b'));
    layer.appendChild(s);
    mousedown(s);
    expect(menu()).not.toBeNull();
  });

  it('leaves a select alone inside a disabled fieldset', () => {
    const set = document.createElement('fieldset');
    set.disabled = true;
    const s = select(['a', 'b']);
    set.appendChild(s);
    root.appendChild(set);
    mousedown(s);
    expect(menu()).toBeNull();
  });

  it('closes when its select leaves the page', async () => {
    const s = select(['a', 'b']);
    mousedown(s);
    s.remove();
    await new Promise((r) => setTimeout(r, 0));
    expect(menu()).toBeNull();
  });

  it('takes a space into a search being typed', () => {
    const s = select(['new york', 'new delhi', 'paris'], 'paris');
    s.focus();
    press(s, 'Enter');
    for (const k of ['n', 'e', 'w', ' ', 'y']) press(s, k);
    expect(menu()).not.toBeNull();
    expect(options()[0].classList.contains('tcw-active')).toBe(true);
  });

  it('a row under the pointer becomes the row the keys are on', () => {
    const s = select(['a', 'b', 'c'], 'a');
    mousedown(s);
    options()[2].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(options()[2].classList.contains('tcw-active')).toBe(true);
    expect(options()[0].classList.contains('tcw-active')).toBe(false);
  });

  it('stops working once uninstalled', () => {
    const s = select(['a', 'b']);
    uninstall();
    mousedown(s);
    expect(menu()).toBeNull();
    uninstall = () => {};
  });
});

describe('on a phone the platform pickers stay', () => {
  beforeEach(() => setUp(true));

  it('does not take over a select', () => {
    const s = select(['a', 'b']);
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
    s.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });
});

describe('calendar', () => {
  beforeEach(() => setUp());

  function dateInput(value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = value;
    root.appendChild(input);
    return input;
  }
  const calendar = () => layer.querySelector<HTMLElement>('.tcw-calendar');
  const days = () => [...layer.querySelectorAll<HTMLButtonElement>('.tcw-calendar-day')];
  const title = () => layer.querySelector('.tcw-calendar-title')?.textContent;

  it('opens on the month of the field, the chosen day marked, weeks from Monday in en-GB', () => {
    const input = dateInput('2026-03-18');
    input.click();
    expect(calendar()?.getAttribute('role')).toBe('dialog');
    expect(title()).toBe('March 2026');
    expect(days()).toHaveLength(42);
    const chosen = days().find((d) => d.getAttribute('aria-selected') === 'true');
    expect(chosen?.dataset.date).toBe('2026-03-18');
    expect(days()[0].dataset.date).toBe('2026-02-23');
    expect(layer.querySelectorAll('.tcw-calendar-weekday')[0].textContent).toMatch(/^M/);
  });

  it('picks a day: the field takes it and says so', () => {
    const input = dateInput('2026-03-18');
    const changed = vi.fn();
    input.addEventListener('change', changed);
    input.click();
    days().find((d) => d.dataset.date === '2026-03-05')!.click();
    expect(input.value).toBe('2026-03-05');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(calendar()).toBeNull();
  });

  it('turns months with its arrows and keeps the field until a day is picked', () => {
    const input = dateInput('2026-01-10');
    input.click();
    layer.querySelector<HTMLButtonElement>(`[aria-label="${labels.prevMonth}"]`)!.click();
    expect(title()).toBe('December 2025');
    layer.querySelector<HTMLButtonElement>(`[aria-label="${labels.nextMonth}"]`)!.click();
    layer.querySelector<HTMLButtonElement>(`[aria-label="${labels.nextMonth}"]`)!.click();
    expect(title()).toBe('February 2026');
    expect(input.value).toBe('2026-01-10');
  });

  it('moves by day and week with the arrow keys and picks with Enter', () => {
    const input = dateInput('2026-03-18');
    input.click();
    const grid = layer.querySelector<HTMLElement>('.tcw-calendar-grid')!;
    press(grid, 'ArrowRight');
    press(grid, 'ArrowDown');
    press(grid, 'Enter');
    expect(input.value).toBe('2026-03-26');
  });

  it('greys out days outside min and max, which cannot be picked', () => {
    const input = dateInput('2026-03-18');
    input.min = '2026-03-10';
    input.max = '2026-03-20';
    input.click();
    const early = days().find((d) => d.dataset.date === '2026-03-02')!;
    expect(early.disabled).toBe(true);
    early.click();
    expect(input.value).toBe('2026-03-18');
  });

  it('opens on today when the field is empty, and Today picks it', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 22, 12) });
    try {
      const input = dateInput('');
      input.click();
      expect(title()).toBe('October 2026');
      expect(days().find((d) => d.classList.contains('tcw-today'))?.dataset.date).toBe('2026-10-22');
      layer.querySelector<HTMLButtonElement>('.tcw-calendar-today')!.click();
      expect(input.value).toBe('2026-10-22');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the keys inside min and max, so focus never falls on a greyed day', () => {
    const input = dateInput('2026-03-19');
    input.min = '2026-03-10';
    input.max = '2026-03-20';
    input.click();
    const grid = layer.querySelector<HTMLElement>('.tcw-calendar-grid')!;
    press(grid, 'ArrowDown');
    expect((document.activeElement as HTMLElement).dataset.date).toBe('2026-03-20');
    press(grid, 'PageUp');
    expect((document.activeElement as HTMLElement).dataset.date).toBe('2026-03-10');
  });

  it('lays its days out in rows of a week', () => {
    dateInput('2026-03-18').click();
    const rows = layer.querySelectorAll('.tcw-calendar-grid [role="row"]');
    expect(rows).toHaveLength(6);
    expect(rows[0].querySelectorAll('[role="gridcell"]')).toHaveLength(7);
  });

  it('closes when focus moves on to another field, or the field leaves the page', async () => {
    const input = dateInput('2026-03-18');
    const next = document.createElement('input');
    root.appendChild(next);
    input.focus();
    input.click();
    next.focus();
    expect(calendar()).toBeNull();
    input.click();
    input.remove();
    await new Promise((r) => setTimeout(r, 0));
    expect(calendar()).toBeNull();
  });

  it('Escape closes it and focus goes back to the field', () => {
    const input = dateInput('2026-03-18');
    input.click();
    press(layer.querySelector('.tcw-calendar-grid')!, 'Escape');
    expect(calendar()).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('leaves a field whose calendar is shown beside it alone', () => {
    const input = dateInput('2026-03-18');
    input.dataset.tcwCalendar = 'inline';
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    input.dispatchEvent(click);
    press(input, 'ArrowDown', { altKey: true });
    expect(calendar()).toBeNull();
    expect(click.defaultPrevented).toBe(false);
  });
});

describe('monthGrid / weekStart', () => {
  it('lays a month out in six whole weeks', () => {
    const grid = monthGrid(2026, 1, 1);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ year: 2026, month: 0, day: 26 });
    expect(grid.filter((d) => d.month === 1)).toHaveLength(28);
  });

  it('starts weeks on Sunday where the locale does', () => {
    expect(weekStart('en-US')).toBe(0);
    expect(weekStart('en-GB')).toBe(1);
    expect(weekStart('vi')).toBe(1);
    expect(monthGrid(2026, 1, 0)[0]).toEqual({ year: 2026, month: 1, day: 1 });
  });
});

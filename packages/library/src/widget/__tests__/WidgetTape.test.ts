// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Trade } from '@tradecanvas/commons';
import { WidgetTape } from '../WidgetTape.js';

let host: HTMLDivElement;
let tape: WidgetTape;
const onToggle = vi.fn();
const onClose = vi.fn();

const trade = (time: number, price: number, volume: number, side?: Trade['side']): Trade => ({ time, price, volume, ...(side ? { side } : {}) });
/** The frame the tape draws in. */
const frame = () => vi.advanceTimersByTime(20);
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-tape-row')];
const cells = (row: HTMLElement) => [...row.children].map((el) => el.textContent);

function make(options: { rows?: number; minSize?: number } = {}): WidgetTape {
  tape = new WidgetTape(host, {
    formatTime: (time) => `t${time}`,
    formatPrice: (price) => price.toFixed(2),
    formatSize: (size, decimals) => size.toFixed(decimals),
    onToggle,
    onClose,
  }, options);
  return tape;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  tape.destroy();
  host.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WidgetTape', () => {
  it('is a panel the dock holds, hidden until opened, named and with its three columns', () => {
    make();
    expect(host.contains(tape.element)).toBe(true);
    expect(tape.element.hidden).toBe(true);
    tape.openPanel();
    expect(tape.element.hidden).toBe(false);
    expect(tape.element.getAttribute('aria-label')).toBe('Time & sales');
    expect(host.querySelector('.tcw-tape-title')!.textContent).toBe('Time & sales');
    expect([...host.querySelectorAll('.tcw-tape-cols span')].map((el) => el.textContent)).toEqual(['Time', 'Price', 'Size']);
    expect(onToggle).toHaveBeenLastCalledWith(true);
  });

  it('says there are no trades until there are', () => {
    make().openPanel();
    expect(host.querySelector('.tcw-tape-empty')!.textContent).toBe('No trades yet');
    tape.push([trade(1, 100, 2, 'buy')]);
    frame();
    expect(host.querySelector('.tcw-tape-empty')).toBeNull();
    expect(rows()).toHaveLength(1);
  });

  it('lists the trades newest first: when, at what price and how much, in the colour of who took them', () => {
    make().openPanel();
    tape.push([trade(1, 100, 2, 'buy'), trade(2, 99.5, 3, 'sell')]);
    frame();
    tape.push([trade(3, 99.5, 1)]);
    frame();
    expect(rows().map(cells)).toEqual([
      ['t3', '99.50', '1'],
      ['t2', '99.50', '3'],
      ['t1', '100.00', '2'],
    ]);
    expect(rows().map((row) => row.dataset.side)).toEqual(['sell', 'sell', 'buy']);
  });

  it('draws a burst of trades once, in the next frame', () => {
    make().openPanel();
    for (let i = 0; i < 50; i++) tape.push([trade(i, 100, 1, 'buy')]);
    expect(rows()).toHaveLength(0);
    frame();
    expect(rows()).toHaveLength(50);
  });

  it('shows no more rows than it may, dropping the oldest', () => {
    make({ rows: 3 }).openPanel();
    tape.push([1, 2, 3, 4].map((t) => trade(t, 100, 1, 'buy')));
    frame();
    tape.push([trade(5, 100, 1, 'buy')]);
    frame();
    expect(rows().map((row) => row.children[0].textContent)).toEqual(['t5', 't4', 't3']);
  });

  it('keeps counting while shut, and shows what it has when opened', () => {
    make();
    tape.push([trade(1, 100, 2, 'buy')]);
    frame();
    expect(rows()).toHaveLength(0);
    tape.openPanel();
    expect(rows()).toHaveLength(1);
    tape.close();
    expect(tape.element.hidden).toBe(true);
    expect(onToggle).toHaveBeenLastCalledWith(false);
    tape.push([trade(2, 100, 2, 'buy')]);
    tape.openPanel();
    expect(rows()).toHaveLength(2);
  });

  it('hides the trades under the least size typed, and shows them again when it is cleared', () => {
    make().openPanel();
    tape.push([trade(1, 100, 0.5, 'buy'), trade(2, 100, 5, 'sell'), trade(3, 100, 2, 'buy')]);
    frame();
    const least = host.querySelector<HTMLInputElement>('.tcw-tape-min')!;
    expect(least.getAttribute('aria-label')).toBe('Min size');
    // A number field, as the widget's others: the browser reads what is typed in the reader's own digits and marks.
    expect(least.type).toBe('number');
    expect(least.min).toBe('0');
    least.value = '2';
    least.dispatchEvent(new Event('input'));
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['2.0', '5.0']);
    least.value = '';
    least.dispatchEvent(new Event('input'));
    expect(rows()).toHaveLength(3);
    // A size under nothing is no least size, and says so.
    least.value = '-3';
    least.dispatchEvent(new Event('input'));
    expect(rows()).toHaveLength(3);
    expect(least.getAttribute('aria-invalid')).toBe('true');
    least.value = '5';
    least.dispatchEvent(new Event('input'));
    expect(least.hasAttribute('aria-invalid')).toBe(false);
    expect(rows()).toHaveLength(1);
  });

  it('starts with the least size it was made with', () => {
    make({ minSize: 3 }).openPanel();
    expect(host.querySelector<HTMLInputElement>('.tcw-tape-min')!.value).toBe('3');
    tape.push([trade(1, 100, 1, 'buy'), trade(2, 100, 4, 'buy')]);
    frame();
    expect(rows()).toHaveLength(1);
  });

  it('shows how much of the rows the buyers took, and how much the sellers', () => {
    make().openPanel();
    tape.push([trade(1, 100, 3, 'buy'), trade(2, 100, 1, 'sell')]);
    frame();
    const split = host.querySelector<HTMLElement>('.tcw-tape-split')!;
    expect(split.hidden).toBe(false);
    expect(split.style.getPropertyValue('--tcw-tape-bought')).toBe('75%');
    expect(split.getAttribute('aria-label')).toBe('Bought 3, sold 1');
    // Nothing to split: no bar.
    tape.clear();
    expect(split.hidden).toBe(true);
  });

  it('writes every size again when a finer one comes, so the column lines up', () => {
    make().openPanel();
    tape.push([trade(1, 100, 3, 'buy')]);
    frame();
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['3']);
    tape.push([trade(2, 100, 0.25, 'sell')]);
    frame();
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['0.25', '3.00']);
  });

  it('puts a trade that comes late in its place among the rows', () => {
    make().openPanel();
    tape.push([trade(1, 100, 1, 'buy'), trade(5, 100, 1, 'buy')]);
    frame();
    tape.push([trade(3, 100, 1, 'sell')]);
    frame();
    expect(rows().map((row) => row.children[0].textContent)).toEqual(['t5', 't3', 't1']);
  });

  it('is a list to a screen reader, each trade an item, and none of it read out as it changes', () => {
    make().openPanel();
    tape.push([trade(1, 100, 1, 'buy')]);
    frame();
    const body = host.querySelector('.tcw-tape-body')!;
    expect(body.getAttribute('role')).toBe('list');
    expect(rows()[0].getAttribute('role')).toBe('listitem');
    expect(host.querySelector('[aria-live]')).toBeNull();
  });

  it('marks a trade several times the usual size', () => {
    make().openPanel();
    tape.push(Array.from({ length: 20 }, (_, i) => trade(i, 100, 1, 'buy')));
    tape.push([trade(21, 100, 12, 'sell')]);
    frame();
    expect(rows()[0].hasAttribute('data-large')).toBe(true);
    expect(rows()[1].hasAttribute('data-large')).toBe(false);
  });

  it('forgets its trades when cleared, and its own × asks the dock to shut it', () => {
    make().openPanel();
    tape.push([trade(1, 100, 2, 'buy')]);
    frame();
    tape.clear();
    expect(rows()).toHaveLength(0);
    expect(host.querySelector('.tcw-tape-empty')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('.tcw-tape-close')!.click();
    expect(onClose).toHaveBeenCalledTimes(1);
    // The dock shuts it: it does not shut itself under the dock.
    expect(tape.isOpen()).toBe(true);
  });

  it('keeps the rows a reader scrolled to in place when newer ones come on top', () => {
    make().openPanel();
    tape.push(Array.from({ length: 30 }, (_, i) => trade(i, 100, 1, 'buy')));
    frame();
    // The page itself scrolls, as every page of the dock does.
    const page = tape.element;
    // jsdom lays nothing out: rows 20 px tall, and a reader 100 px down the list.
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 20 });
    page.scrollTop = 100;
    tape.push([trade(40, 100, 1, 'buy'), trade(41, 100, 1, 'buy')]);
    frame();
    expect(page.scrollTop).toBe(140);
    // At the top, the newest stay on view.
    page.scrollTop = 0;
    tape.push([trade(42, 100, 1, 'buy')]);
    frame();
    expect(page.scrollTop).toBe(0);
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  });
});

describe('the tape’s own choices', () => {
  const onChange = vi.fn();
  const choices = () => host.querySelector<HTMLButtonElement>('.tcw-tape-more')!;
  const entries = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^="menuitem"]')];
  const labels = () => entries().map((entry) => entry.querySelector('.tcw-context-label')?.textContent);
  const pick = (label: string) => {
    choices().click();
    entries().find((entry) => entry.querySelector('.tcw-context-label')?.textContent === label)!.click();
  };
  const sweep = [trade(10, 100, 1, 'buy'), trade(10, 100, 2, 'buy'), trade(10, 99, 4, 'sell'), trade(11, 100, 1, 'buy')];
  const made = (options: ConstructorParameters<typeof WidgetTape>[2] = {}) => {
    tape = new WidgetTape(host, {
      formatTime: (time) => `t${time}`,
      formatPrice: (price) => price.toFixed(2),
      formatSize: (size, decimals) => size.toFixed(decimals),
      onToggle,
      onClose,
      onChange,
    }, options);
    tape.openPanel();
    return tape;
  };

  it('has a button that opens a menu: which side’s trades it lists, and whether trades made together are one row', () => {
    made();
    const button = choices();
    expect(button.getAttribute('aria-label')).toBe('More');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    button.click();
    expect(labels()).toEqual(['All trades', 'Bought', 'Sold', 'Group trades made together']);
    expect(entries().map((entry) => [entry.getAttribute('role'), entry.getAttribute('aria-checked')])).toEqual([
      ['menuitemradio', 'true'],
      ['menuitemradio', 'false'],
      ['menuitemradio', 'false'],
      ['menuitemcheckbox', 'false'],
    ]);
  });

  it('lists one side’s trades when it is picked, and marks its button while not all are listed', () => {
    made();
    tape.push(sweep);
    frame();
    pick('Sold');
    expect(rows().map((row) => row.dataset.side)).toEqual(['sell']);
    expect(choices().classList.contains('tcw-active')).toBe(true);
    choices().click();
    expect(entries().map((entry) => entry.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false']);
    choices().click();
    pick('All trades');
    expect(rows()).toHaveLength(4);
    expect(choices().classList.contains('tcw-active')).toBe(false);
  });

  it('puts only a side’s new trades on top while that side is listed', () => {
    made();
    pick('Bought');
    tape.push(sweep);
    frame();
    expect(rows().map((row) => row.dataset.side)).toEqual(['buy', 'buy', 'buy']);
  });

  it('makes one row of trades made together when told to, and every trade a row again when told not to', () => {
    made();
    tape.push(sweep);
    frame();
    pick('Group trades made together');
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['1', '4', '3']);
    // A trade that joins the row on top: the row grows, no row is added.
    tape.push([trade(11, 100, 2, 'buy')]);
    frame();
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['3', '4', '3']);
    pick('Group trades made together');
    expect(rows()).toHaveLength(5);
  });

  it('starts as it is told to: a side, grouped', () => {
    made({ side: 'buy', group: true });
    tape.push(sweep);
    frame();
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['1', '3']);
    choices().click();
    expect(entries().map((entry) => entry.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false', 'true']);
  });

  it('says what was chosen each time a choice is made, the least size among them', () => {
    made();
    pick('Sold');
    expect(onChange).toHaveBeenLastCalledWith({ minSize: 0, side: 'sell', group: false }, 'side');
    pick('Group trades made together');
    expect(onChange).toHaveBeenLastCalledWith({ minSize: 0, side: 'sell', group: true }, 'group');
    const least = host.querySelector<HTMLInputElement>('.tcw-tape-min')!;
    least.value = '2.5';
    least.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenLastCalledWith({ minSize: 2.5, side: 'sell', group: true }, 'minSize');
    // What is no size changes nothing, and says nothing.
    onChange.mockClear();
    least.value = '-1';
    least.dispatchEvent(new Event('input'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('goes on saying how the two sides share the trades while one side is listed: the other side’s trades move the bar', () => {
    made();
    pick('Bought');
    tape.push([trade(1, 100, 3, 'buy')]);
    frame();
    const split = host.querySelector<HTMLElement>('.tcw-tape-split')!;
    expect(split.style.getPropertyValue('--tcw-tape-bought')).toBe('100%');
    // Sales add no row to a list of what was bought, and still take their share.
    tape.push([trade(2, 100, 1, 'sell')]);
    frame();
    expect(rows()).toHaveLength(1);
    expect(split.style.getPropertyValue('--tcw-tape-bought')).toBe('75%');
    expect(split.getAttribute('aria-label')).toBe('Bought 3, sold 1');
  });

  it('shuts its menu when the panel is shut under it', () => {
    made();
    choices().click();
    expect(entries()).toHaveLength(4);
    tape.close();
    expect(entries()).toEqual([]);
    expect(choices().getAttribute('aria-expanded')).toBe('false');
  });

  it('takes a least size from outside, its field and its rows with it, and says nothing of it', () => {
    made();
    tape.push(sweep);
    frame();
    tape.setMinSize(2);
    expect(host.querySelector<HTMLInputElement>('.tcw-tape-min')!.value).toBe('2');
    expect(rows().map((row) => row.children[2].textContent)).toEqual(['4', '2']);
    tape.setMinSize(0);
    expect(host.querySelector<HTMLInputElement>('.tcw-tape-min')!.value).toBe('');
    expect(rows()).toHaveLength(4);
    expect(onChange).not.toHaveBeenCalled();
  });
});

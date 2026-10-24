// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonthView } from '../monthView.js';

const labels = { prevMonth: 'Previous month', nextMonth: 'Next month', today: 'Today' };

let picked: string[];
let view: MonthView;

const days = () => [...view.element.querySelectorAll<HTMLButtonElement>('.tcw-calendar-day')];
const day = (date: string) => days().find((d) => d.dataset.date === date)!;
const title = () => view.element.querySelector('.tcw-calendar-title')?.textContent;
const press = (el: Element, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

beforeEach(() => {
  picked = [];
  view = new MonthView(labels, 'en-GB', (value) => picked.push(value));
  document.body.appendChild(view.element);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MonthView', () => {
  it('shows the month of a date, that day marked, in rows of a week', () => {
    view.show('2026-03-18');
    expect(view.element.classList.contains('tcw-calendar')).toBe(true);
    expect(title()).toBe('March 2026');
    expect(days()).toHaveLength(42);
    expect(view.element.querySelectorAll('.tcw-calendar-week')).toHaveLength(6);
    expect(days().filter((d) => d.getAttribute('aria-selected') === 'true').map((d) => d.dataset.date)).toEqual(['2026-03-18']);
  });

  it('tells which day was picked and stays as it is', () => {
    view.show('2026-03-18');
    day('2026-03-05').click();
    expect(picked).toEqual(['2026-03-05']);
    expect(view.element.isConnected).toBe(true);
  });

  it('greys out days outside min and max, which cannot be picked', () => {
    view.show('2026-03-18', { min: '2026-03-10', max: '2026-03-20' });
    expect(day('2026-03-21').disabled).toBe(true);
    expect(day('2026-03-20').disabled).toBe(false);
    day('2026-03-02').click();
    expect(picked).toEqual([]);
  });

  it('turns months with its arrows', () => {
    view.show('2026-01-10');
    view.element.querySelector<HTMLButtonElement>(`[aria-label="${labels.prevMonth}"]`)!.click();
    expect(title()).toBe('December 2025');
    expect(picked).toEqual([]);
  });

  it('moves with the arrow keys and picks with Enter', () => {
    view.show('2026-03-18');
    const grid = view.element.querySelector<HTMLElement>('.tcw-calendar-grid')!;
    press(grid, 'ArrowRight');
    press(grid, 'ArrowDown');
    press(grid, 'Enter');
    expect(picked).toEqual(['2026-03-26']);
  });

  it('follows a new date', () => {
    view.show('2026-03-18');
    view.show('2025-11-02');
    expect(title()).toBe('November 2025');
    expect(day('2025-11-02').getAttribute('aria-selected')).toBe('true');
  });

  it('opens on today when there is no date, and Today picks it', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 22, 12) });
    try {
      view.show('');
      expect(title()).toBe('October 2026');
      view.element.querySelector<HTMLButtonElement>('.tcw-calendar-today')!.click();
      expect(picked).toEqual(['2026-10-22']);
    } finally {
      vi.useRealTimers();
    }
  });
});

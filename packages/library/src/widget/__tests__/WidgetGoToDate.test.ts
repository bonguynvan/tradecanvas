// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetGoToDate, utcToWallTime, wallTimeToUtc, type GoToTarget } from '../WidgetGoToDate.js';

const labels = {
  title: 'Go to', date: 'Date', range: 'Custom range', from: 'From', to: 'To', time: 'Time', submit: 'Go to', cancel: 'Cancel', close: 'Close',
  calendar: { prevMonth: 'Previous month', nextMonth: 'Next month', today: 'Today' },
};

describe('wallTimeToUtc / utcToWallTime', () => {
  it('reads the date and time in a fixed display timezone', () => {
    expect(wallTimeToUtc('2026-03-01', '14:30', 0)).toBe(Date.UTC(2026, 2, 1, 14, 30));
    expect(wallTimeToUtc('2026-03-01', '14:30', 420)).toBe(Date.UTC(2026, 2, 1, 7, 30));
    expect(wallTimeToUtc('2026-03-01', '', -300)).toBe(Date.UTC(2026, 2, 1, 5));
  });

  it('reads it in the browser timezone when none is set', () => {
    expect(wallTimeToUtc('2026-03-01', '09:15', null)).toBe(new Date(2026, 2, 1, 9, 15).getTime());
  });

  it('rejects dates and times that do not exist', () => {
    expect(wallTimeToUtc('2026-02-31', '', 0)).toBeNull();
    expect(wallTimeToUtc('2026-02-31', '', null)).toBeNull();
    expect(wallTimeToUtc('2026-13-01', '', 0)).toBeNull();
    expect(wallTimeToUtc('2026-03-01', '24:00', 0)).toBeNull();
    expect(wallTimeToUtc('yesterday', '', 0)).toBeNull();
  });

  it('round-trips through the field values', () => {
    const ts = Date.UTC(2026, 0, 31, 23, 45);
    expect(utcToWallTime(ts, 420)).toEqual({ date: '2026-02-01', time: '06:45' });
    expect(wallTimeToUtc('2026-02-01', '06:45', 420)).toBe(ts);
    const local = utcToWallTime(ts, null);
    expect(wallTimeToUtc(local.date, local.time, null)).toBe(ts);
  });
});

describe('WidgetGoToDate', () => {
  let layer: HTMLDivElement;
  let opener: HTMLButtonElement;
  let submitted: GoToTarget[];
  let dialog: WidgetGoToDate;

  const field = (name: string) => layer.querySelector<HTMLInputElement>(`[data-field="${name}"]`);
  const tab = (name: string) => layer.querySelector<HTMLButtonElement>(`.tcw-goto [role="tab"][data-tab="${name}"]`)!;
  const day = (date: string) => layer.querySelector<HTMLButtonElement>(`.tcw-goto-calendar [data-date="${date}"]`)!;
  const title = () => layer.querySelector('.tcw-goto-calendar .tcw-calendar-title')?.textContent;
  const form = () => layer.querySelector<HTMLFormElement>('form.tcw-goto-form')!;
  const start = {
    date: { date: '2026-03-18', time: '10:00' },
    range: { from: { date: '2026-03-02', time: '09:00' }, to: { date: '2026-03-18', time: '10:00' } },
    withTime: true,
    max: '2026-03-20',
  };

  beforeEach(() => {
    layer = document.createElement('div');
    opener = document.createElement('button');
    document.body.append(layer, opener);
    opener.focus();
    submitted = [];
    dialog = new WidgetGoToDate(() => layer, () => labels, () => 'en-GB', (v) => submitted.push(v));
  });

  afterEach(() => {
    dialog.destroy();
    document.body.innerHTML = '';
  });

  it('opens as a dialog on the Date tab, focused on the date, the month beside it', () => {
    dialog.open(start);
    const modal = layer.querySelector('.tcw-modal.tcw-goto')!;
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.querySelector('h3')?.textContent).toBe('Go to');
    expect(tab('date').getAttribute('aria-selected')).toBe('true');
    expect(tab('range').getAttribute('aria-selected')).toBe('false');
    expect([field('date')?.value, field('time')?.value]).toEqual(['2026-03-18', '10:00']);
    expect(document.activeElement).toBe(field('date'));
    expect(title()).toBe('March 2026');
    expect(day('2026-03-18').getAttribute('aria-selected')).toBe('true');
  });

  it('a day picked in the month goes into the date field, and the dialog stays', () => {
    dialog.open(start);
    day('2026-03-05').click();
    expect(field('date')?.value).toBe('2026-03-05');
    expect(dialog.isOpen()).toBe(true);
    expect(day('2026-03-05').getAttribute('aria-selected')).toBe('true');
  });

  it('the month follows a date typed in the field, and days after the last are greyed', () => {
    dialog.open(start);
    field('date')!.value = '2026-01-07';
    field('date')!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(title()).toBe('January 2026');
    dialog.close();
    dialog.open(start);
    expect(day('2026-03-21').disabled).toBe(true);
  });

  it('Go to sends the date and time, closes and gives focus back', () => {
    dialog.open(start);
    field('date')!.value = '2025-12-24';
    field('time')!.value = '';
    form().requestSubmit();
    expect(submitted).toEqual([{ kind: 'date', date: '2025-12-24', time: '' }]);
    expect(dialog.isOpen()).toBe(false);
    expect(layer.querySelector('.tcw-goto')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('has no time fields on a daily chart', () => {
    dialog.open({ ...start, withTime: false });
    expect(field('time')).toBeNull();
    form().requestSubmit();
    expect(submitted).toEqual([{ kind: 'date', date: '2026-03-18', time: '' }]);
  });

  it('Custom range: from and to, the month filling the field in hand, then the next', () => {
    dialog.open(start);
    tab('range').click();
    expect(tab('range').getAttribute('aria-selected')).toBe('true');
    expect(field('date')).toBeNull();
    expect([field('fromDate')?.value, field('fromTime')?.value, field('toDate')?.value, field('toTime')?.value])
      .toEqual(['2026-03-02', '09:00', '2026-03-18', '10:00']);
    expect(document.activeElement).toBe(field('fromDate'));
    day('2026-03-04').click();
    expect(field('fromDate')?.value).toBe('2026-03-04');
    expect(document.activeElement).toBe(field('toDate'));
    day('2026-03-11').click();
    expect(field('toDate')?.value).toBe('2026-03-11');
    form().requestSubmit();
    expect(submitted).toEqual([{ kind: 'range', from: { date: '2026-03-04', time: '09:00' }, to: { date: '2026-03-11', time: '10:00' } }]);
  });

  it('opens again on the tab used last', () => {
    dialog.open(start);
    tab('range').click();
    dialog.close();
    dialog.open(start);
    expect(tab('range').getAttribute('aria-selected')).toBe('true');
  });

  it('the arrow keys move along the tabs', () => {
    dialog.open(start);
    tab('date').focus();
    tab('date').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tab('range').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('range'));
  });

  it('closes on Escape without sending, and keeps keys away from the chart', () => {
    const chartKeys = vi.fn();
    document.addEventListener('keydown', chartKeys);
    dialog.open(start);
    field('date')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.removeEventListener('keydown', chartKeys);
    expect(dialog.isOpen()).toBe(false);
    expect(submitted).toEqual([]);
    expect(chartKeys).not.toHaveBeenCalled();
  });

  it('closes with Cancel and on a click on the backdrop', () => {
    dialog.open(start);
    layer.querySelector<HTMLButtonElement>('.tcw-goto [data-act="cancel"]')!.click();
    expect(dialog.isOpen()).toBe(false);
    dialog.open(start);
    const backdrop = layer.querySelector<HTMLElement>('.tcw-modal-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    backdrop.click();
    expect(dialog.isOpen()).toBe(false);
    expect(submitted).toEqual([]);
  });
});

describe('wallTimeToUtc / utcToWallTime in an IANA zone', () => {
  it('reads and writes the wall clock in the zone, daylight saving included', () => {
    expect(wallTimeToUtc('2026-01-15', '09:30', 'America/New_York')).toBe(Date.UTC(2026, 0, 15, 14, 30));
    expect(wallTimeToUtc('2026-07-15', '09:30', 'America/New_York')).toBe(Date.UTC(2026, 6, 15, 13, 30));
    expect(utcToWallTime(Date.UTC(2026, 6, 15, 13, 30), 'America/New_York')).toEqual({ date: '2026-07-15', time: '09:30' });
  });

  it('still rejects a date that does not exist', () => {
    expect(wallTimeToUtc('2026-02-31', '10:00', 'America/New_York')).toBeNull();
  });
});


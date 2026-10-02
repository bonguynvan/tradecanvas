// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetGoToDate, utcToWallTime, wallTimeToUtc } from '../WidgetGoToDate.js';

const labels = { title: 'Go to date', date: 'Date', time: 'Time', submit: 'Go to', cancel: 'Cancel' };

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
  let host: HTMLDivElement;
  let opener: HTMLButtonElement;
  let submitted: { date: string; time: string }[];
  let popover: WidgetGoToDate;

  const inputs = () => [...host.querySelectorAll<HTMLInputElement>('.tcw-goto-input')];

  beforeEach(() => {
    host = document.createElement('div');
    opener = document.createElement('button');
    document.body.append(host, opener);
    opener.focus();
    submitted = [];
    popover = new WidgetGoToDate(host, labels, (v) => submitted.push(v));
  });

  afterEach(() => {
    popover.destroy();
    host.remove();
    opener.remove();
  });

  it('opens with the given values, focused on the date', () => {
    popover.open({ date: '2026-03-01', time: '10:00' });
    expect(inputs().map((i) => i.value)).toEqual(['2026-03-01', '10:00']);
    expect(document.activeElement).toBe(inputs()[0]);
  });

  it('submits the fields and closes, giving focus back', () => {
    popover.open({ date: '2026-03-01', time: '10:00' });
    inputs()[0].value = '2025-12-24';
    inputs()[1].value = '';
    host.querySelector('form')!.requestSubmit();
    expect(submitted).toEqual([{ date: '2025-12-24', time: '' }]);
    expect(popover.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes on Escape without submitting, and keeps keys away from the chart', () => {
    const chartKeys = vi.fn();
    document.addEventListener('keydown', chartKeys);
    popover.open({ date: '2026-03-01', time: '' });
    inputs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.removeEventListener('keydown', chartKeys);
    expect(popover.isOpen()).toBe(false);
    expect(submitted).toEqual([]);
    expect(chartKeys).not.toHaveBeenCalled();
  });

  it('closes on a click outside', () => {
    popover.open({ date: '2026-03-01', time: '' });
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(popover.isOpen()).toBe(false);
  });
});

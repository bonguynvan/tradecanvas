// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetHistoryPill, HISTORY_ERROR_MS } from '../WidgetHistoryPill.js';

let parent: HTMLDivElement;
let pill: WidgetHistoryPill;
const el = () => parent.querySelector('.tcw-history-pill') as HTMLElement;
const shown = () => !el().classList.contains('tcw-history-pill--hidden');

beforeEach(() => {
  vi.useFakeTimers();
  parent = document.createElement('div');
  pill = new WidgetHistoryPill(parent, { loading: 'Loading history…', failed: 'Could not load older bars' });
});

afterEach(() => {
  pill.destroy();
  vi.useRealTimers();
});

describe('WidgetHistoryPill', () => {
  it('starts hidden and announces itself politely', () => {
    expect(shown()).toBe(false);
    expect(el().getAttribute('role')).toBe('status');
    expect(el().getAttribute('aria-live')).toBe('polite');
  });

  it('shows while older bars load and hides once they are in', () => {
    pill.update({ state: 'loading', count: 0 });
    expect(shown()).toBe(true);
    expect(el().textContent).toContain('Loading history…');
    pill.update({ state: 'loaded', count: 300 });
    expect(shown()).toBe(false);
  });

  it('hides at the start of the history', () => {
    pill.update({ state: 'loading', count: 0 });
    pill.update({ state: 'end', count: 0 });
    expect(shown()).toBe(false);
  });

  it('shows a failure for a while', () => {
    pill.update({ state: 'loading', count: 0 });
    pill.update({ state: 'error', count: 0, error: '429' });
    expect(shown()).toBe(true);
    expect(el().textContent).toContain('Could not load older bars');
    expect(el().classList.contains('tcw-history-pill--error')).toBe(true);
    vi.advanceTimersByTime(HISTORY_ERROR_MS);
    expect(shown()).toBe(false);
  });

  it('a new load replaces a failure without the old timer hiding it', () => {
    pill.update({ state: 'error', count: 0 });
    vi.advanceTimersByTime(HISTORY_ERROR_MS - 10);
    pill.update({ state: 'loading', count: 0 });
    vi.advanceTimersByTime(20);
    expect(shown()).toBe(true);
    expect(el().classList.contains('tcw-history-pill--error')).toBe(false);
  });

  it('removes itself on destroy', () => {
    pill.destroy();
    expect(parent.querySelector('.tcw-history-pill')).toBeNull();
  });
});

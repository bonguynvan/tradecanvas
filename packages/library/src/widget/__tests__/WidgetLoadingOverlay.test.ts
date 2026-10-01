// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetLoadingOverlay, LOADING_SHOW_DELAY_MS } from '../WidgetLoadingOverlay.js';

let parent: HTMLDivElement;
let overlay: WidgetLoadingOverlay;

const el = (): HTMLElement => parent.querySelector('.tcw-loading-overlay') as HTMLElement;
const label = (): string => parent.querySelector('.tcw-loading-label')?.textContent ?? '';
const visible = (): boolean => !el().classList.contains('tcw-loading-overlay--hidden');

beforeEach(() => {
  vi.useFakeTimers();
  parent = document.createElement('div');
  overlay = new WidgetLoadingOverlay(parent, 'Loading chart...');
});

afterEach(() => {
  overlay.destroy();
  vi.useRealTimers();
});

describe('WidgetLoadingOverlay', () => {
  it('starts visible and loading — the widget mounts before its first bars', () => {
    expect(visible()).toBe(true);
    expect(overlay.isActive()).toBe(true);
    expect(el().classList.contains('tcw-loading-overlay--veil')).toBe(false);
    expect(label()).toBe('Loading chart...');
  });

  it('a switch that finishes within the delay never shows', () => {
    overlay.end();
    overlay.begin(true);
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS - 1);
    expect(visible()).toBe(false);
    overlay.end();
    vi.advanceTimersByTime(1000);
    expect(visible()).toBe(false);
    expect(overlay.isActive()).toBe(false);
  });

  it('a slow switch veils the previous chart after the delay', () => {
    overlay.end();
    overlay.begin(true);
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    expect(visible()).toBe(true);
    expect(el().classList.contains('tcw-loading-overlay--veil')).toBe(true);
    overlay.end();
    expect(visible()).toBe(false);
  });

  it('shows at once with nothing on screen, or when told the load is slow', () => {
    overlay.end();
    overlay.begin(false);
    expect(visible()).toBe(true);
    overlay.end();
    overlay.begin(true, true);
    expect(visible()).toBe(true);
  });

  it('stays up when a new switch starts while it is showing', () => {
    overlay.end();
    overlay.begin(true);
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    overlay.begin(true);
    expect(visible()).toBe(true);
  });

  it('shows a failure until the next load or a successful retry ends it', () => {
    overlay.end();
    overlay.begin(true);
    overlay.fail('Connection failed');
    expect(visible()).toBe(true);
    expect(label()).toBe('Connection failed');
    expect(overlay.hasFailed()).toBe(true);
    expect(overlay.isActive()).toBe(true);

    overlay.begin(true);
    expect(label()).toBe('Loading chart...');
    expect(overlay.hasFailed()).toBe(false);
    expect(el().classList.contains('tcw-loading-overlay--error')).toBe(false);

    overlay.end();
    expect(visible()).toBe(false);
  });

  it('ignores a failure reported after the load already ended', () => {
    overlay.end();
    overlay.fail('Connection failed');
    expect(visible()).toBe(false);
    expect(overlay.hasFailed()).toBe(false);
  });

  it('destroy cancels a pending show', () => {
    overlay.end();
    overlay.begin(true);
    overlay.destroy();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS * 2);
    expect(parent.querySelector('.tcw-loading-overlay')).toBeNull();
  });
});

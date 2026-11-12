// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shownConnection } from '../connectionStatus.js';
import { WidgetStatusBar } from '../WidgetStatusBar.js';
import { EN_TRANSLATOR } from '../i18n.js';

describe('what the status bar says of the feed', () => {
  it('says how far behind a delayed symbol runs, in place of Live', () => {
    expect(shownConnection('connected', 'Live', { symbol: 'VNM', delayMinutes: 15 }, EN_TRANSLATOR)).toEqual({ message: 'Delayed 15 min', delayed: true });
  });

  it('leaves a symbol with no delay, or nothing known of it, as it was', () => {
    expect(shownConnection('connected', 'Live', { symbol: 'BTCUSDT' }, EN_TRANSLATOR)).toEqual({ message: 'Live', delayed: false });
    expect(shownConnection('connected', 'Live', null, EN_TRANSLATOR)).toEqual({ message: 'Live', delayed: false });
    expect(shownConnection('connected', 'Live', { symbol: 'X', delayMinutes: 0 }, EN_TRANSLATOR).delayed).toBe(false);
  });

  it('reads a delay that is no count of minutes as none', () => {
    for (const delayMinutes of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(shownConnection('connected', 'Live', { symbol: 'X', delayMinutes }, EN_TRANSLATOR).delayed).toBe(false);
    }
    // Half a minute still reads as delayed, to the whole minute above.
    expect(shownConnection('connected', 'Live', { symbol: 'X', delayMinutes: 0.5 }, EN_TRANSLATOR).message).toBe('Delayed 1 min');
  });

  it('says so only while the feed is connected: an error or a connect in progress keeps its own words', () => {
    const info = { symbol: 'VNM', delayMinutes: 15 };
    expect(shownConnection('error', 'Connection failed', info, EN_TRANSLATOR)).toEqual({ message: 'Connection failed', delayed: false });
    expect(shownConnection('connecting', 'Connecting...', info, EN_TRANSLATOR)).toEqual({ message: 'Connecting...', delayed: false });
  });
});

describe('the status bar’s dot', () => {
  let root: HTMLDivElement;
  let bar: WidgetStatusBar;
  beforeEach(() => {
    root = document.createElement('div');
    root.className = 'tcw-root';
    document.body.appendChild(root);
    bar = new WidgetStatusBar(root);
  });
  afterEach(() => root.remove());
  const dot = () => root.querySelector('.tcw-status-dot')!;
  const state = { connectionState: 'connected', symbol: 'VNM', timeframe: '1d' };

  it('is not the live dot for a delayed feed', () => {
    bar.update({ ...state, message: 'Delayed 15 min', delayed: true });
    expect(dot().classList.contains('tcw-delayed')).toBe(true);
    expect(dot().classList.contains('tcw-connected')).toBe(false);
    expect(root.querySelector('.tcw-status-indicator')!.textContent).toBe('Delayed 15 min');
    bar.update({ ...state, message: 'Live' });
    expect(dot().classList.contains('tcw-connected')).toBe(true);
    expect(dot().classList.contains('tcw-delayed')).toBe(false);
  });
});

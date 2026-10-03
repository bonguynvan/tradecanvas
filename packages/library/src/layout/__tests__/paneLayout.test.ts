import { describe, it, expect, beforeEach } from 'vitest';
import { TIME_AXIS_HEIGHT } from '@tradecanvas/commons';
import { LayoutManager, COLLAPSED_PANE_HEIGHT, MIN_MAIN_HEIGHT_WITH_MAXIMIZED } from '../LayoutManager.js';

let layout: LayoutManager;
const heights = () => Object.fromEntries(layout.resolve().panels.map((p) => [p.config.id, p.rect.height]));
const order = () => layout.resolve().panels.map((p) => p.config.id);

beforeEach(() => {
  layout = new LayoutManager();
  layout.resize(800, 600);
  layout.addPanel('rsi', 'bottom', 100);
  layout.addPanel('macd', 'bottom', 120);
  layout.addPanel('atr', 'bottom', 80);
});

describe('pane layout', () => {
  it('folds a pane to its header and opens it at the size it had', () => {
    expect(layout.setPanelCollapsed('macd', true)).toBe(true);
    expect(heights().macd).toBe(COLLAPSED_PANE_HEIGHT);
    // The price pane gets the room back.
    expect(layout.resolve().mainChartRect.height).toBe(600 - TIME_AXIS_HEIGHT - 100 - COLLAPSED_PANE_HEIGHT - 80);
    expect(layout.setPanelCollapsed('macd', true)).toBe(false);
    layout.setPanelCollapsed('macd', false);
    expect(heights().macd).toBe(120);
  });

  it('maximises one pane: the others fold, the price pane keeps a strip', () => {
    expect(layout.setMaximizedPanel('rsi')).toBe(true);
    const h = heights();
    expect(h.macd).toBe(COLLAPSED_PANE_HEIGHT);
    expect(h.atr).toBe(COLLAPSED_PANE_HEIGHT);
    expect(layout.resolve().mainChartRect.height).toBe(MIN_MAIN_HEIGHT_WITH_MAXIMIZED);
    expect(h.rsi).toBe(600 - TIME_AXIS_HEIGHT - MIN_MAIN_HEIGHT_WITH_MAXIMIZED - 2 * COLLAPSED_PANE_HEIGHT);
    layout.setMaximizedPanel(null);
    expect(heights()).toEqual({ rsi: 100, macd: 120, atr: 80 });
  });

  it('goes back to normal when a pane is resized, and forgets a pane that goes', () => {
    layout.setPanelCollapsed('atr', true);
    layout.setMaximizedPanel('rsi');
    layout.setPanelSize('macd', 150);
    expect(layout.getMaximizedPanel()).toBeNull();
    expect(heights().macd).toBe(150);
    layout.setMaximizedPanel('macd');
    layout.removePanel('macd');
    expect(layout.getMaximizedPanel()).toBeNull();
    layout.setMaximizedPanel('rsi');
    layout.renamePanel('rsi', 'rsi2');
    expect(layout.getMaximizedPanel()).toBe('rsi2');
  });

  it('moves a pane up and down among its neighbours', () => {
    expect(layout.movePanel('atr', -1)).toBe(true);
    expect(order()).toEqual(['rsi', 'atr', 'macd']);
    expect(layout.movePanel('rsi', -1)).toBe(false);
    expect(layout.movePanel('macd', 1)).toBe(false);
    layout.orderPanels(['macd', 'rsi']);
    expect(order()).toEqual(['macd', 'rsi', 'atr']);
  });

  it('leaves side panes alone', () => {
    layout.addPanel('side', 'right');
    expect(layout.setPanelCollapsed('side', true)).toBe(false);
    expect(layout.setMaximizedPanel('side')).toBe(false);
    expect(layout.setMaximizedPanel('nope')).toBe(false);
  });
});

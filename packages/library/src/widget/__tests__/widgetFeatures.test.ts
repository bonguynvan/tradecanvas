// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  WIDGET_FEATURES,
  CHART_MENU_FEATURES,
  DRAWING_MENU_FEATURES,
  filterMenuEntries,
  commandFeature,
  partAttr,
  markPart,
  tidyDividers,
  offFeatures,
  readWidgetFeatures,
  resolveWidgetFeatures,
  widgetFeatureCss,
} from '../widgetFeatures.js';
import type { ContextMenuEntry } from '../WidgetContextMenu.js';

describe('the widget feature names', () => {
  it('are over a hundred, each once, in lower camel case with dots between places', () => {
    expect(WIDGET_FEATURES.length).toBeGreaterThan(100);
    expect(new Set(WIDGET_FEATURES).size).toBe(WIDGET_FEATURES.length);
    for (const name of WIDGET_FEATURES) expect(name).toMatch(/^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)*$/);
  });

  it('name a switch for every menu entry the widget offers', () => {
    for (const names of [...Object.values(CHART_MENU_FEATURES), ...Object.values(DRAWING_MENU_FEATURES)]) {
      for (const name of names) expect(WIDGET_FEATURES).toContain(name);
    }
  });
});

describe('resolveWidgetFeatures', () => {
  it('turns every switch on by default', () => {
    const state = resolveWidgetFeatures({});
    expect(Object.keys(state)).toHaveLength(WIDGET_FEATURES.length);
    expect(Object.values(state).every(Boolean)).toBe(true);
  });

  it('reads the old options as the switches they stand for', () => {
    const state = resolveWidgetFeatures({ drawingTools: false, rangeBar: false, toolbar: true });
    expect(state.sidebar).toBe(false);
    expect(state['hotkeys.tools']).toBe(false);
    expect(state['menu.chart.horizontalLine']).toBe(false);
    expect(state['statusBar.range']).toBe(false);
    expect(state.goToDate).toBe(false);
    expect(state.toolbar).toBe(true);
    expect(state.statusBar).toBe(true);
  });

  it('lets the switches have the last word over the old options', () => {
    const state = resolveWidgetFeatures({ toolbar: false, features: { toolbar: true, 'sidebar.magnet': false } });
    expect(state.toolbar).toBe(true);
    expect(state['sidebar.magnet']).toBe(false);
  });
});

describe('readWidgetFeatures', () => {
  it('keeps known names set to true or false, and drops the rest with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readWidgetFeatures({ toolbar: false, 'menu.chart': true, nope: false, alerts: 'no', ['__proto__']: false })).toEqual({
      toolbar: false,
      'menu.chart': true,
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reads anything else as no switches', () => {
    expect(readWidgetFeatures(null)).toEqual({});
    expect(readWidgetFeatures(['toolbar'])).toEqual({});
  });
});

describe('offFeatures and the stylesheet', () => {
  it('lists the switches that are off, space apart', () => {
    const state = { ...resolveWidgetFeatures({}), toolbar: false, 'sidebar.magnet': false };
    expect(offFeatures(state)).toBe('toolbar sidebar.magnet');
  });

  it('hides the parts of every switch that is off', () => {
    const css = widgetFeatureCss();
    for (const name of WIDGET_FEATURES) {
      expect(css).toContain(`.tcw-root[data-tcw-off~="${name}"] [data-tcw-part~="${name}"]`);
    }
  });
});

describe('filterMenuEntries', () => {
  const entries: ContextMenuEntry[] = [
    { id: 'alert', label: 'Alert' },
    { id: 'buyLimit', label: 'Buy' },
    'separator',
    { id: 'resetView', label: 'Reset' },
    'separator',
    { id: 'settings', label: 'Settings' },
  ];

  it('leaves out the entries whose switches are off, and the separators left over', () => {
    const state = { ...resolveWidgetFeatures({}), 'menu.chart.order': false, alerts: false, 'menu.chart.resetView': false };
    const kept = filterMenuEntries(entries, CHART_MENU_FEATURES, state);
    expect(kept).toEqual([{ id: 'settings', label: 'Settings' }]);
  });

  it('keeps one separator between groups that are left', () => {
    const state = { ...resolveWidgetFeatures({}), 'menu.chart.resetView': false };
    const kept = filterMenuEntries(entries, CHART_MENU_FEATURES, state);
    expect(kept).toEqual([{ id: 'alert', label: 'Alert' }, { id: 'buyLimit', label: 'Buy' }, 'separator', { id: 'settings', label: 'Settings' }]);
  });
});

describe('tidyDividers', () => {
  it('hides the dividers with nothing shown on one side, a spacer counting as an edge', () => {
    const bar = document.createElement('div');
    const sep = () => Object.assign(document.createElement('span'), { className: 'sep' });
    const item = (hidden = false) => Object.assign(document.createElement('button'), { hidden });
    const spacer = Object.assign(document.createElement('span'), { className: 'spacer' });
    const seps = [sep(), sep(), sep(), sep(), sep(), sep()];
    bar.append(seps[0], item(true), seps[1], item(), seps[2], seps[3], item(), spacer, seps[4], item(), seps[5]);
    document.body.appendChild(bar);
    tidyDividers(bar, 'sep', 'spacer');
    expect(seps.map((s) => s.classList.contains('tcw-divider-off'))).toEqual([true, true, false, true, true, true]);
    bar.remove();
  });

  it('counts a part switched off as nothing shown', () => {
    const style = document.createElement('style');
    style.textContent = widgetFeatureCss();
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.className = 'tcw-root';
    root.dataset.tcwOff = 'toolbar.symbol';
    const symbol = document.createElement('button');
    markPart(symbol, 'toolbar.symbol');
    const sep = Object.assign(document.createElement('span'), { className: 'sep' });
    root.append(symbol, sep, document.createElement('button'));
    document.body.appendChild(root);
    tidyDividers(root, 'sep');
    expect(sep.classList.contains('tcw-divider-off')).toBe(true);
    root.dataset.tcwOff = '';
    tidyDividers(root, 'sep');
    expect(sep.classList.contains('tcw-divider-off')).toBe(false);
    root.remove();
    style.remove();
  });
});

describe('commandFeature and partAttr', () => {
  it('reads a command’s switch as an own key only', () => {
    expect(commandFeature('settings')).toBe('settings');
    expect(commandFeature('toString')).toBeUndefined();
    expect(commandFeature('clearDrawings')).toBeUndefined();
  });

  it('writes the part mark as an attribute', () => {
    expect(partAttr('alerts', 'toolbar.alerts')).toBe('data-tcw-part="alerts toolbar.alerts"');
  });
});

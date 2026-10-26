// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IndicatorDescriptor } from '@tradecanvas/commons';
import { TC_SERIES_COLORS } from '@tradecanvas/commons';
import { IndicatorEngine, registerBuiltInIndicators } from '@tradecanvas/core';
import { WidgetIndicatorSettings, type IndicatorSettingsTarget } from '../WidgetIndicatorSettings.js';
import { lineSourcesFor } from '../ChartWidget.js';
import { createTranslator, resolveMessages, type MessageKey } from '../i18n.js';
import { JA_MESSAGES } from '../locales/ja.js';

const engine = new IndicatorEngine();
registerBuiltInIndicators(engine);
const descriptor = (id: string): IndicatorDescriptor => engine.getAvailableIndicators().find((d) => d.id === id)!;

let host: HTMLDivElement;
let dialog: WidgetIndicatorSettings;
const onApply = vi.fn();
const onStyle = vi.fn();
const onLevels = vi.fn();
const onIntervals = vi.fn();
const onSaveDefault = vi.fn();
const onClose = vi.fn();

const macdTarget = (): IndicatorSettingsTarget => {
  const d = descriptor('macd');
  return {
    instanceId: 'm1', indicatorId: 'macd', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig },
    inputs: d.inputs, plots: d.plots, colors: ['#4c8dff', '#ff9f43', '#2ecc71', '#e74c3c'], lineWidth: 1.5,
    levels: [0], defaultLevels: [],
    lineSources: [{ value: 'ind:r1:value', label: 'RSI 14: RSI' }],
  };
};
const rsiTarget = (): IndicatorSettingsTarget => {
  const d = descriptor('rsi');
  return {
    instanceId: 'r1', indicatorId: 'rsi', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig },
    inputs: d.inputs, plots: d.plots, colors: ['#7e57c2'], lineWidth: 1.5, levels: [30, 70], defaultLevels: [30, 70],
  };
};
const tabs = () => [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const tab = (name: string) => tabs().find((b) => b.dataset.tab === name)!.click();
const labels = () => [...host.querySelectorAll('.tcw-modal-body .tcw-settings-label')].map((l) => l.textContent);
const footer = (name: string) => host.querySelector<HTMLButtonElement>(`.tcw-modal-footer [data-act="${name}"]`)!;
const change = (el: HTMLInputElement | HTMLSelectElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event(el instanceof HTMLInputElement && el.type === 'color' ? 'input' : 'change'));
};
const menuItem = (text: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((b) => b.textContent?.includes(text))!;

beforeEach(() => {
  host = document.createElement('div');
  host.className = 'tcw-root';
  document.body.appendChild(host);
  for (const fn of [onApply, onStyle, onLevels, onIntervals, onSaveDefault, onClose]) fn.mockReset();
  dialog = new WidgetIndicatorSettings(host, { onApply, onStyle, onLevels, onIntervals, onSaveDefault, onClose });
});

afterEach(() => {
  dialog.destroy();
  host.remove();
});

describe('WidgetIndicatorSettings', () => {
  it('has the inputs, the style and the intervals it shows on', () => {
    dialog.open(macdTarget());
    expect(tabs().map((b) => b.textContent)).toEqual(['Inputs', 'Style', 'Visibility']);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(labels()).toEqual(['Fast', 'Slow', 'Signal', 'Source']);
  });

  it('picks a source among prices and other indicators’ lines', () => {
    dialog.open(macdTarget());
    const select = host.querySelector<HTMLSelectElement>('select')!;
    expect([...select.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['Price', 'Indicators']);
    expect([...select.options].map((o) => o.value)).toContain('hlc3');
    change(select, 'ind:r1:value');
    expect(onApply).toHaveBeenLastCalledWith('m1', { source: 'ind:r1:value' });
  });

  it('keeps a number within its declared bounds', () => {
    const d = descriptor('rsi');
    dialog.open({ instanceId: 'r1', indicatorId: 'rsi', name: d.name, defaults: { period: 14 }, params: { period: 14 }, inputs: { period: { min: 2, max: 50 } } });
    const input = host.querySelector<HTMLInputElement>('input[type="number"]')!;
    change(input, '500');
    expect(onApply).toHaveBeenLastCalledWith('r1', { period: 50 });
  });

  it('picks where VWAP starts again', () => {
    const d = descriptor('vwap');
    dialog.open({ instanceId: 'v1', indicatorId: 'vwap', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig }, inputs: d.inputs, plots: d.plots });
    expect(labels()).toEqual(['Anchor']);
    const select = host.querySelector<HTMLSelectElement>('.tcw-modal-body select')!;
    expect([...select.options].map((o) => o.value)).toEqual(['session', 'week', 'month', 'all']);
    expect(select.value).toBe('session');
    change(select, 'all');
    expect(onApply).toHaveBeenLastCalledWith('v1', { anchor: 'all' });
  });

  it('names VWAP’s anchor and its choices in the widget’s language', () => {
    const d = descriptor('vwap');
    const target = { instanceId: 'v1', indicatorId: 'vwap', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig }, inputs: d.inputs, plots: d.plots };
    dialog.open(target);
    const choices = () => [...host.querySelectorAll<HTMLOptionElement>('.tcw-modal-body select option')].map((o) => o.textContent);
    expect(choices()).toEqual(['Session', 'Week', 'Month', 'All bars']);
    dialog.destroy();
    const ja = createTranslator(resolveMessages('ja', JA_MESSAGES));
    dialog = new WidgetIndicatorSettings(host, { onApply, onStyle, onLevels, onIntervals, onSaveDefault, onClose }, ja);
    dialog.open(target);
    expect(labels()).toEqual([JA_MESSAGES['indicatorInput.anchor']]);
    expect(choices()).toEqual(['session', 'week', 'month', 'all'].map((a) => JA_MESSAGES[`indicatorInput.anchor.${a}` as MessageKey]));
    expect(choices()).not.toContain('session');
  });
});

describe('WidgetIndicatorSettings style', () => {
  it('has a row per line: shown or not, its colours (up and down for two-tone ones), its dash', () => {
    dialog.open(macdTarget());
    tab('style');
    expect(labels()).toEqual(['MACD', 'Signal', 'Histogram', 'Line width', 'Level 1']);
    const histogram = host.querySelector<HTMLElement>('[data-plot="histogram"]')!;
    expect(histogram.querySelectorAll('input[type="color"]')).toHaveLength(2);
    expect(histogram.querySelector('select')).toBeNull(); // bars have no dash
    change(histogram.querySelectorAll<HTMLInputElement>('input[type="color"]')[1], '#aa0000');
    expect(onStyle).toHaveBeenLastCalledWith('m1', { colors: ['#4c8dff', '#ff9f43', '#2ecc71', '#aa0000'] });
    const shown = histogram.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    shown.checked = false;
    shown.dispatchEvent(new Event('change'));
    expect(onStyle).toHaveBeenLastCalledWith('m1', { plots: { histogram: { visible: false } } });
    change(host.querySelector<HTMLSelectElement>('[data-plot="signal"] select')!, 'dashed');
    expect(onStyle).toHaveBeenLastCalledWith('m1', { plots: { signal: { lineStyle: 'dashed' } } });
  });

  it('sets the line width', () => {
    dialog.open(macdTarget());
    tab('style');
    change(host.querySelector<HTMLSelectElement>('[data-role="line-width"]')!, '3');
    expect(onStyle).toHaveBeenLastCalledWith('m1', { lineWidths: [3] });
  });

  it('edits, adds and removes the levels under the lines', () => {
    dialog.open(rsiTarget());
    tab('style');
    expect(host.querySelector('.tcw-settings-section-title')?.textContent).toBe('Levels');
    const inputs = () => [...host.querySelectorAll<HTMLInputElement>('.tcw-indi-level input')];
    change(inputs()[1], '80');
    expect(onLevels).toHaveBeenLastCalledWith('r1', [30, 80]);
    host.querySelector<HTMLButtonElement>('.tcw-indi-add')!.click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', [30, 80, 90]);
    expect(document.activeElement).toBe(inputs()[2]);
    host.querySelector<HTMLButtonElement>('.tcw-indi-remove')!.click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', [80, 90]);
    expect(document.activeElement).toBe(host.querySelector('.tcw-indi-remove'));
  });

  it('moves an overlay to the left price scale, and offers no scale to a pane indicator', () => {
    const onScale = vi.fn();
    dialog.destroy();
    dialog = new WidgetIndicatorSettings(host, { onApply, onStyle, onLevels, onScale, onClose });
    const d = descriptor('ema');
    dialog.open({
      instanceId: 'e1', indicatorId: 'ema', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig },
      inputs: d.inputs, plots: d.plots, colors: ['#4c8dff'], lineWidth: 1.5, scale: 'right',
    });
    tab('style');
    expect(labels()).toContain('Price scale');
    change(host.querySelector<HTMLSelectElement>('[data-role="scale"]')!, 'left');
    expect(onScale).toHaveBeenCalledWith('e1', 'left');
    dialog.open(macdTarget());
    tab('style');
    expect(labels()).not.toContain('Price scale');
  });
});

describe('WidgetIndicatorSettings visibility', () => {
  const unit = (name: string) => host.querySelector<HTMLElement>(`[data-unit="${name}"]`)!;
  const box = (name: string) => unit(name).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  const range = (name: string) => [...unit(name).querySelectorAll<HTMLInputElement>('input[type="number"]')];
  const tick = (name: string, on: boolean) => {
    box(name).checked = on;
    box(name).dispatchEvent(new Event('change'));
  };

  it('ticks every interval it shows on, with the range of each', () => {
    dialog.open({ ...macdTarget(), intervals: { minutes: false, hours: [1, 4] } });
    tab('visibility');
    expect([...host.querySelectorAll<HTMLElement>('[data-unit]')].map((u) => u.dataset.unit))
      .toEqual(['ticks', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months']);
    expect(box('minutes').checked).toBe(false);
    expect(range('minutes').every((i) => i.disabled)).toBe(true);
    expect(range('hours').map((i) => i.value)).toEqual(['1', '4']);
    expect(range('days').map((i) => i.value)).toEqual(['1', '366']);
    expect(range('ticks')).toHaveLength(0);
  });

  it('keeps it off a unit, to a range, and on all of them again', () => {
    dialog.open(macdTarget());
    tab('visibility');
    tick('seconds', false);
    expect(onIntervals).toHaveBeenLastCalledWith('m1', { seconds: false });
    change(range('days')[1], '7');
    expect(onIntervals).toHaveBeenLastCalledWith('m1', { seconds: false, days: [1, 7] });
    tick('seconds', true);
    change(range('days')[1], '366');
    expect(onIntervals).toHaveBeenLastCalledWith('m1', null);
  });
});

describe('WidgetIndicatorSettings Cancel, Ok and the defaults', () => {
  it('undoes every change on Cancel, and closes', () => {
    dialog.open({ ...macdTarget(), intervals: { weeks: false } });
    change(host.querySelector<HTMLInputElement>('input[type="number"]')!, '8');
    tab('style');
    change(host.querySelectorAll<HTMLInputElement>('input[type="color"]')[0], '#000000');
    change(host.querySelector<HTMLSelectElement>('[data-role="line-width"]')!, '3');
    tab('visibility');
    host.querySelector<HTMLInputElement>('[data-unit="days"] input[type="checkbox"]')!.click();
    for (const fn of [onApply, onStyle, onIntervals]) fn.mockClear();
    footer('cancel').click();
    expect(onApply).toHaveBeenCalledWith('m1', { fast: 12, slow: 26, signal: 9, source: 'close' });
    expect(onStyle).toHaveBeenCalledWith('m1', { colors: ['#4c8dff', '#ff9f43', '#2ecc71', '#e74c3c'], lineWidths: [1.5] });
    expect(onIntervals).toHaveBeenCalledWith('m1', { weeks: false });
    expect(dialog.isOpen()).toBe(false);
  });

  it('undoes nothing that was not changed', () => {
    dialog.open(macdTarget());
    footer('cancel').click();
    expect(onApply).not.toHaveBeenCalled();
    expect(onStyle).not.toHaveBeenCalled();
    expect(onLevels).not.toHaveBeenCalled();
    expect(onIntervals).not.toHaveBeenCalled();
  });

  it('keeps the changes on Ok, a value still being typed included', () => {
    dialog.open(macdTarget());
    const fast = host.querySelector<HTMLInputElement>('input[type="number"]')!;
    fast.focus();
    fast.value = '8';
    footer('ok').click();
    expect(onApply).toHaveBeenLastCalledWith('m1', { fast: 8 });
    expect(dialog.isOpen()).toBe(false);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('resets the inputs, lines, levels and intervals from the Defaults menu', () => {
    dialog.open({ ...rsiTarget(), params: { period: 21, source: 'close' }, levels: [20, 80], intervals: { days: false } });
    footer('defaults').click();
    menuItem('Reset settings').click();
    expect(onApply).toHaveBeenLastCalledWith('r1', { period: 14, source: 'close' });
    expect(onLevels).toHaveBeenLastCalledWith('r1', null);
    expect(onIntervals).toHaveBeenLastCalledWith('r1', null);
    expect(host.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe('14');
  });

  it('saves what was chosen as the default for new ones of its kind', () => {
    dialog.open({ ...rsiTarget(), params: { period: 21, source: 'close' }, plotStyles: { value: { lineStyle: 'dotted' } } });
    footer('defaults').click();
    menuItem('Save as default').click();
    // The source and the width are the indicator's own: nothing to keep of them.
    expect(onSaveDefault).toHaveBeenCalledWith('rsi', {
      params: { period: 21 },
      style: { colors: ['#7e57c2'], plots: { value: { lineStyle: 'dotted' } } },
    });
  });

  it('leaves out the colours the chart gave, and a line of another indicator', () => {
    const palette = [...TC_SERIES_COLORS.slice(2), ...TC_SERIES_COLORS.slice(0, 2)];
    dialog.open({ ...rsiTarget(), params: { period: 14, source: 'ind:e1:value' }, colors: palette, lineWidth: 2 });
    footer('defaults').click();
    menuItem('Save as default').click();
    const saved = onSaveDefault.mock.calls[0][1];
    expect(saved.params).toEqual({});
    expect(saved.style.lineWidths).toEqual([2]);
  });

  it('puts the levels back on the indicator’s own defaults when it had no levels of its own', () => {
    dialog.open(rsiTarget());
    tab('style');
    change(host.querySelector<HTMLInputElement>('.tcw-indi-level input')!, '25');
    footer('cancel').click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', null);
    dialog.open({ ...rsiTarget(), ownLevels: true });
    tab('style');
    change(host.querySelector<HTMLInputElement>('.tcw-indi-level input')!, '25');
    footer('cancel').click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', [30, 70]);
  });

  it('ignores a level still being typed when Escape cancels', () => {
    dialog.open(rsiTarget());
    tab('style');
    const level = host.querySelector<HTMLInputElement>('.tcw-indi-level input')!;
    level.focus();
    level.value = '55';
    level.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    level.dispatchEvent(new Event('change')); // its blur, on the way out
    expect(onLevels).not.toHaveBeenCalled();
  });
});

describe('WidgetIndicatorSettings keyboard and screen readers', () => {
  const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));

  it('names the dialog by its title and starts on the first input', () => {
    dialog.open(macdTarget());
    const modal = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(document.getElementById(modal.getAttribute('aria-labelledby')!)!.textContent).toBe('MACD settings');
    expect(document.activeElement).toBe(host.querySelector('.tcw-modal-body input'));
  });

  it('moves between tabs with the arrow keys, keeping focus on the tabs', () => {
    dialog.open(macdTarget());
    tabs()[0].focus();
    key(tabs()[0], 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    expect(host.querySelector('[role="tabpanel"]')!.getAttribute('aria-labelledby')).toBe(tabs()[1].id);
    key(tabs()[1], 'End');
    expect(document.activeElement).toBe(tabs()[2]);
    const first = tabs()[0];
    first.click();
    expect(tabs()[0]).toBe(first); // marked in place, not rebuilt
  });

  it('cancels on Escape, a value still being typed included, and gives focus back', () => {
    const opener = document.createElement('button');
    host.appendChild(opener);
    opener.focus();
    dialog.open(macdTarget());
    const fast = host.querySelector<HTMLInputElement>('.tcw-modal-body input')!;
    fast.focus();
    fast.value = '8';
    key(fast, 'Escape');
    expect(onApply).not.toHaveBeenCalled();
    expect(dialog.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});

describe('lineSourcesFor', () => {
  const active = (id: string, instanceId: string, params: Record<string, unknown> = {}) => {
    const d = descriptor(id);
    return { instanceId, id, params: { ...d.defaultConfig, ...params }, descriptor: d, visible: true };
  };

  it('offers every drawn line of the other indicators', () => {
    const list = lineSourcesFor('s1', [active('sma', 's1'), active('macd', 'm1')]);
    expect(list.map((l) => l.label)).toEqual(['MACD 12 26 9: Histogram', 'MACD 12 26 9: MACD', 'MACD 12 26 9: Signal']);
    expect(list[1].value).toBe('ind:m1:macd');
  });

  it('leaves out itself and whatever already reads from it', () => {
    const list = lineSourcesFor('r1', [
      active('rsi', 'r1'),
      active('sma', 's1', { source: 'ind:r1:value' }),
      active('ema', 'e1', { source: 'ind:s1:value' }),
      active('obv', 'o1'),
    ]);
    expect(list.map((l) => l.value)).toEqual(['ind:o1:value']);
  });
});

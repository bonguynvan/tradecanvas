// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IndicatorDescriptor } from '@tradecanvas/commons';
import { IndicatorEngine, registerBuiltInIndicators } from '@tradecanvas/core';
import { WidgetIndicatorSettings, type IndicatorSettingsTarget } from '../WidgetIndicatorSettings.js';
import { lineSourcesFor } from '../ChartWidget.js';

const engine = new IndicatorEngine();
registerBuiltInIndicators(engine);
const descriptor = (id: string): IndicatorDescriptor => engine.getAvailableIndicators().find((d) => d.id === id)!;

let host: HTMLDivElement;
let dialog: WidgetIndicatorSettings;
const onApply = vi.fn();
const onStyle = vi.fn();
const onLevels = vi.fn();

const macdTarget = (): IndicatorSettingsTarget => {
  const d = descriptor('macd');
  return {
    instanceId: 'm1', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig },
    inputs: d.inputs, plots: d.plots, colors: ['#4c8dff', '#ff9f43', '#2ecc71', '#e74c3c'], lineWidth: 1.5,
    levels: [0], defaultLevels: [],
    lineSources: [{ value: 'ind:r1:value', label: 'RSI 14: RSI' }],
  };
};
const tabs = () => [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const tab = (name: string) => tabs().find((b) => b.dataset.tab === name)!.click();
const labels = () => [...host.querySelectorAll('.tcw-modal-body .tcw-settings-label')].map((l) => l.textContent);

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  onApply.mockReset();
  onStyle.mockReset();
  onLevels.mockReset();
  dialog = new WidgetIndicatorSettings(host, { onApply, onStyle, onLevels, onClose: () => {} });
});

afterEach(() => {
  dialog.destroy();
  host.remove();
});

describe('WidgetIndicatorSettings', () => {
  it('shows inputs, style and levels tabs', () => {
    dialog.open(macdTarget());
    expect(tabs().map((b) => b.textContent)).toEqual(['Inputs', 'Style', 'Levels']);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(labels()).toEqual(['Fast', 'Slow', 'Signal', 'Source']);
  });

  it('picks a source among prices and other indicators’ lines', () => {
    dialog.open(macdTarget());
    const select = host.querySelector<HTMLSelectElement>('select')!;
    expect([...select.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['Price', 'Indicators']);
    expect([...select.options].map((o) => o.value)).toContain('hlc3');
    select.value = 'ind:r1:value';
    select.dispatchEvent(new Event('change'));
    expect(onApply).toHaveBeenLastCalledWith('m1', { source: 'ind:r1:value' });
  });

  it('keeps a number within its declared bounds', () => {
    const d = descriptor('rsi');
    dialog.open({ instanceId: 'r1', name: d.name, defaults: { period: 14 }, params: { period: 14 }, inputs: { period: { min: 2, max: 50 } } });
    const input = host.querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '500';
    input.dispatchEvent(new Event('change'));
    expect(onApply).toHaveBeenLastCalledWith('r1', { period: 50 });
    expect(host.querySelector<HTMLElement>('.tcw-modal-tabs')!.hidden).toBe(true); // nothing but inputs: no tab bar
  });

  it('edits a colour per line, up and down for two-tone ones, and the line width', () => {
    dialog.open(macdTarget());
    tab('style');
    expect(labels()).toEqual(['MACD', 'Signal', 'Histogram up', 'Histogram down', 'Line width']);
    const colors = host.querySelectorAll<HTMLInputElement>('input[type="color"]');
    colors[3].value = '#aa0000';
    colors[3].dispatchEvent(new Event('input'));
    expect(onStyle).toHaveBeenLastCalledWith('m1', { colors: ['#4c8dff', '#ff9f43', '#2ecc71', '#aa0000'] });
    const width = host.querySelector<HTMLSelectElement>('select')!;
    width.value = '3';
    width.dispatchEvent(new Event('change'));
    expect(onStyle).toHaveBeenLastCalledWith('m1', { lineWidths: [3] });
  });

  it('edits, adds, removes and resets levels', () => {
    const d = descriptor('rsi');
    dialog.open({ instanceId: 'r1', name: d.name, defaults: d.defaultConfig, params: { ...d.defaultConfig }, levels: [30, 70], defaultLevels: [30, 70] });
    tab('levels');
    const inputs = () => [...host.querySelectorAll<HTMLInputElement>('.tcw-indi-level input')];
    inputs()[1].value = '80';
    inputs()[1].dispatchEvent(new Event('change'));
    expect(onLevels).toHaveBeenLastCalledWith('r1', [30, 80]);
    host.querySelector<HTMLButtonElement>('.tcw-indi-add')!.click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', [30, 80, 90]);
    host.querySelector<HTMLButtonElement>('.tcw-indi-remove')!.click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', [80, 90]);
    host.querySelector<HTMLButtonElement>('.tcw-modal-footer .tcw-reset-link')!.click();
    expect(onLevels).toHaveBeenLastCalledWith('r1', null);
    expect(inputs().map((i) => i.value)).toEqual(['30', '70']);
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

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetIndicatorLegend, type IndicatorLegendPane } from '../WidgetIndicatorLegend.js';
import { WidgetIntervalInput } from '../WidgetIntervalInput.js';
import { IndicatorTemplateStore } from '../indicatorTemplates.js';

const labels = {
  show: 'Show', hide: 'Hide', settings: 'Settings', remove: 'Remove', collapse: 'Collapse', expand: 'Expand',
  more: 'More', paneUp: 'Move pane up', paneDown: 'Move pane down', paneCollapse: 'Collapse pane',
  paneExpand: 'Expand pane', paneMaximize: 'Maximize pane', paneRestore: 'Restore panes',
};

let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(() => host.remove());

describe('pane buttons in the legend', () => {
  const pane = (over: Partial<IndicatorLegendPane> = {}): IndicatorLegendPane => ({
    instanceId: 'rsi', x: 500, y: 300, label: 'RSI 14', collapsed: false, maximized: false, canMoveUp: false, canMoveDown: true, ...over,
  });
  const visible = () => [...host.querySelectorAll<HTMLButtonElement>('.tcw-pane-btn')].filter((b) => !b.hidden).map((b) => b.getAttribute('aria-label'));

  it('offers what the pane can do, named for its indicator', () => {
    const legend = new WidgetIndicatorLegend(host, { onToggleVisible: vi.fn(), onSettings: vi.fn(), onRemove: vi.fn(), onPaneAction: vi.fn() }, labels);
    legend.update([], { left: 0, top: 0 }, [pane()]);
    expect(visible()).toEqual(['Move pane down RSI 14', 'Collapse pane RSI 14', 'Maximize pane RSI 14']);
    legend.update([], { left: 0, top: 0 }, [pane({ collapsed: true, canMoveUp: true })]);
    expect(visible()).toEqual(['Move pane up RSI 14', 'Move pane down RSI 14', 'Expand pane RSI 14', 'Maximize pane RSI 14']);
    // Maximised: only "restore".
    legend.update([], { left: 0, top: 0 }, [pane({ maximized: true })]);
    expect(visible()).toEqual(['Restore panes RSI 14']);
    legend.destroy();
    expect(host.querySelector('.tcw-pane-controls')).toBeNull();
  });

  it('says which action a button asks for, as the pane is now', () => {
    const onPaneAction = vi.fn();
    const legend = new WidgetIndicatorLegend(host, { onToggleVisible: vi.fn(), onSettings: vi.fn(), onRemove: vi.fn(), onPaneAction }, labels);
    legend.update([], { left: 0, top: 0 }, [pane({ collapsed: true, canMoveUp: true })]);
    const click = (act: string) => host.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!.click();
    click('fold');
    click('max');
    click('up');
    expect(onPaneAction.mock.calls).toEqual([['rsi', 'expand'], ['rsi', 'maximize'], ['rsi', 'up']]);
    legend.destroy();
  });

  it('opens the row’s “more” menu under its button', () => {
    const onMore = vi.fn();
    const legend = new WidgetIndicatorLegend(host, { onToggleVisible: vi.fn(), onSettings: vi.fn(), onRemove: vi.fn(), onMore }, labels);
    legend.update([{ instanceId: 'ema', label: 'EMA 20', visible: true, values: [], pane: null }], { left: 0, top: 0 });
    const more = host.querySelector<HTMLButtonElement>('[data-act="more"]')!;
    expect(more.getAttribute('aria-label')).toBe('More EMA 20');
    more.click();
    expect(onMore).toHaveBeenCalledWith('ema', more);
    legend.destroy();
  });
});

describe('typed interval', () => {
  const ui = (onApply: (tf: string) => boolean) => new WidgetIntervalInput(host, { title: 'Change interval', hint: 'Enter to apply', invalid: 'Not an interval' }, onApply);
  const field = () => host.querySelector<HTMLInputElement>('.tcw-interval-field')!;
  const type = (text: string) => {
    field().value = text;
    field().dispatchEvent(new Event('input'));
  };
  const key = (k: string) => field().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('starts with the digit typed and switches on Enter', () => {
    const applied: string[] = [];
    const input = ui((tf) => { applied.push(tf); return true; });
    input.open('4');
    expect(field().value).toBe('4');
    type('4h');
    key('Enter');
    expect(applied).toEqual(['4h']);
    expect(input.isOpen()).toBe(false);
    input.destroy();
  });

  it('says when the text is not an interval, and stays open', () => {
    const input = ui(() => false);
    input.open('1');
    type('1x');
    expect(host.querySelector('.tcw-interval-hint')!.textContent).toBe('Not an interval');
    type('2');
    key('Enter'); // the chart refuses 2m
    expect(input.isOpen()).toBe(true);
    expect(field().hasAttribute('aria-invalid')).toBe(true);
    key('Escape');
    expect(input.isOpen()).toBe(false);
    input.destroy();
  });
});

describe('indicator templates', () => {
  beforeEach(() => localStorage.clear());
  const rsi = { id: 'rsi', instanceId: 'tc_rsi_1', params: { period: 14 } };

  it('saves, lists by name, replaces a name and removes', () => {
    const store = new IndicatorTemplateStore('t:');
    store.save('  Swing  ', [rsi]);
    store.save('Alpha', [{ ...rsi, params: { period: 7 } }]);
    store.save('Swing', [{ ...rsi, params: { period: 21 } }]);
    expect(store.list().map((t) => t.name)).toEqual(['Alpha', 'Swing']);
    expect(store.get('Swing')!.indicators[0].params).toEqual({ period: 21 });
    store.remove('Alpha');
    expect(store.list().map((t) => t.name)).toEqual(['Swing']);
  });

  it('reads back only what is a template', () => {
    localStorage.setItem('t:', JSON.stringify([
      { name: 'Good', indicators: [rsi] },
      { name: '', indicators: [rsi] },
      { name: 'No indicators', indicators: [{ nope: 1 }] },
      'junk',
    ]));
    expect(new IndicatorTemplateStore('t:').list().map((t) => t.name)).toEqual(['Good']);
    localStorage.setItem('t:', '{broken');
    expect(new IndicatorTemplateStore('t:').list()).toEqual([]);
  });

  it('wants a name', () => {
    expect(() => new IndicatorTemplateStore('t:').save('   ', [rsi])).toThrow(/name/);
  });
});

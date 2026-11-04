import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine, registerBuiltInIndicators, type SnapshotIndicator } from '@tradecanvas/core';
import { LayoutManager } from '../../layout/LayoutManager.js';
import { captureIndicatorSetup, dependencyOrder, keptInPlace, renameSources, restorePanes, sameKindAndPlace } from '../IndicatorSetup.js';

const bars: OHLCBar[] = Array.from({ length: 40 }, (_, i) => ({ time: i * 60_000, open: 10, high: 11, low: 9, close: 10 + (i % 3), volume: 1 }));

function setup() {
  const engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
  const layout = new LayoutManager();
  layout.resize(800, 900);
  return { engine, layout };
}

const ind = (instanceId: string, extra: Partial<SnapshotIndicator> = {}): SnapshotIndicator => ({ id: 'rsi', instanceId, params: {}, ...extra });

describe('captureIndicatorSetup', () => {
  it('keeps inputs, scale, a shared pane, and a pane\'s size, order, fold, maximise, scale and style', () => {
    const { engine, layout } = setup();
    const sma = engine.addIndicator('sma', { period: 9 }, bars, { scale: 'left' });
    const rsi = engine.addIndicator('rsi', {}, bars);
    layout.addPanel(rsi, 'bottom', 120);
    const macd = engine.addIndicator('macd', {}, bars);
    layout.addPanel(macd, 'bottom', 90);
    const inRsi = engine.addIndicator('sma', {}, bars, { pane: rsi });
    layout.setPanelCollapsed(macd, true);
    layout.setPanelScale(rsi, { log: true, invert: true, percent: true });
    layout.setMaximizedPanel(rsi);
    engine.setLevels(rsi, [20, 80]);

    const setup_ = captureIndicatorSetup(engine, layout, (id) => (id === rsi ? { background: '#123456' } : null));
    const byId = new Map(setup_.map((s) => [s.instanceId, s]));
    expect(setup_.map((s) => s.instanceId)).toEqual([sma, rsi, macd, inRsi]);
    expect(byId.get(sma)).toMatchObject({ id: 'sma', params: { period: 9 }, scale: 'left' });
    expect(byId.get(sma)).not.toHaveProperty('paneSize');
    expect(byId.get(rsi)).toMatchObject({
      position: 'bottom', paneSize: 120, paneOrder: 0, paneMaximized: true,
      paneLog: true, paneInvert: true, panePercent: true, levels: [20, 80], paneStyle: { background: '#123456' },
    });
    expect(byId.get(macd)).toMatchObject({ paneSize: 90, paneOrder: 1, paneCollapsed: true });
    expect(byId.get(macd)).not.toHaveProperty('paneStyle');
    expect(byId.get(inRsi)).toMatchObject({ pane: rsi });
  });

  it('copies what it keeps', () => {
    const { engine, layout } = setup();
    const sma = engine.addIndicator('sma', { period: 9 }, bars);
    const [kept] = captureIndicatorSetup(engine, layout, () => null);
    kept.params.period = 99;
    expect(engine.getIndicatorConfig(sma)?.params.period).toBe(9);
  });
});

describe('restorePanes', () => {
  it('puts sizes, folds, scales, order and the maximised pane back', () => {
    const { layout } = setup();
    for (const id of ['a', 'b', 'c']) layout.addPanel(id, 'bottom', 100);
    restorePanes(layout, [
      [ind('a', { paneSize: 150, paneOrder: 2, paneLog: true }), 'a'],
      [ind('b', { paneSize: 80, paneOrder: 0, paneCollapsed: true }), 'b'],
      [ind('c', { paneSize: 60, paneOrder: 1, paneMaximized: true }), 'c'],
    ]);
    const panels = layout.getPanels();
    expect(panels.map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(panels.find((p) => p.id === 'a')).toMatchObject({ size: 150, logScale: true });
    expect(panels.find((p) => p.id === 'b')?.collapsed).toBe(true);
    expect(layout.getMaximizedPanel()).toBe('c');
  });

  it('opens a fold the restored pane does not have, and clears the maximised pane', () => {
    const { layout } = setup();
    layout.addPanel('a', 'bottom', 100);
    layout.setPanelCollapsed('a', true);
    layout.setMaximizedPanel('a');
    restorePanes(layout, [[ind('a', { paneSize: 100 }), 'a']]);
    expect(layout.isPanelCollapsed('a')).toBe(false);
    expect(layout.getMaximizedPanel()).toBeNull();
  });
});

describe('dependencyOrder', () => {
  it('puts a pane\'s host and a line\'s source before their readers', () => {
    const list = [
      ind('reader', { id: 'sma', params: { source: 'ind:src:value' } }),
      ind('member', { pane: 'host' }),
      ind('src'),
      ind('host'),
    ];
    expect(dependencyOrder(list).map((i) => i.instanceId)).toEqual(['src', 'reader', 'host', 'member']);
  });

  it('keeps the order given otherwise, and ends on a cycle', () => {
    const cycle = [ind('a', { pane: 'b' }), ind('b', { pane: 'a' }), ind('c')];
    expect(dependencyOrder(cycle).map((i) => i.instanceId)).toEqual(['b', 'a', 'c']);
  });
});

describe('sameKindAndPlace and keptInPlace', () => {
  it('tells the same indicator in the same place', () => {
    expect(sameKindAndPlace(ind('a', { params: { period: 1 } }), ind('a', { params: { period: 2 } }))).toBe(true);
    expect(sameKindAndPlace(ind('a'), ind('a', { id: 'macd' }))).toBe(false);
    expect(sameKindAndPlace(ind('a'), ind('a', { pane: 'p' }))).toBe(false);
    expect(sameKindAndPlace(ind('a'), ind('a', { scale: 'left' }))).toBe(false);
    expect(sameKindAndPlace(ind('a'), ind('a', { position: 'bottom' }))).toBe(false);
  });

  it('keeps those wanted under the same id and alike', () => {
    const current = [ind('a'), ind('b'), ind('c', { pane: 'a' })];
    const wanted = [ind('a', { params: { period: 3 } }), ind('c'), ind('d')];
    expect([...keptInPlace(current, wanted)]).toEqual(['a']);
  });
});

describe('renameSources', () => {
  it('follows lines read from renamed indicators, leaving the rest', () => {
    const ids = new Map([['old', 'new']]);
    expect(renameSources({ source: 'ind:old:value', other: 'ind:x:value', period: 14, price: 'close' }, ids))
      .toEqual({ source: 'ind:new:value', other: 'ind:x:value', period: 14, price: 'close' });
  });
});

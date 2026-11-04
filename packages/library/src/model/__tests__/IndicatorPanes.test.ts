import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine, registerBuiltInIndicators } from '@tradecanvas/core';
import { LayoutManager } from '../../layout/LayoutManager.js';
import { IndicatorPanes } from '../IndicatorPanes.js';

const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => {
  const p = 100 + Math.sin(i / 4) * 5;
  return { time: i * 60_000, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 1000 };
});

/** A real engine and layout, as the chart wires them; the handover is recorded. */
function setup() {
  const engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
  const layout = new LayoutManager();
  layout.resize(800, 600);
  const handed: string[] = [];
  const panes = new IndicatorPanes(engine, layout, {
    passStyle: (from, heir) => handed.push(`style ${from}>${heir}`),
    renamePane: (from, to) => {
      layout.renamePanel(from, to);
      handed.push(`pane ${from}>${to}`);
    },
    invalidateScales: () => handed.push('scales'),
  });
  /** Add as the chart does: a panel indicator not drawn in another pane gets one of its own. */
  const add = (id: string, params: Record<string, number | string | boolean> = {}, requested?: string) => {
    const descriptor = engine.getAvailableIndicators().find((d) => d.id === id)!;
    const pane = panes.paneFor(descriptor, params, requested);
    const instanceId = engine.addIndicator(id, params, bars, pane ? { pane } : {});
    if (descriptor.placement === 'panel' && !pane) layout.addPanel(instanceId, 'bottom');
    return instanceId;
  };
  const paneIds = () => layout.getPanels().map((p) => p.id);
  const paneOfConfig = (id: string) => engine.getIndicatorConfig(id)?.pane ?? null;
  return { engine, layout, panes, add, handed, paneIds, paneOfConfig };
}

describe('IndicatorPanes: where an indicator is drawn', () => {
  it('draws a price-pane indicator reading a pane indicator\'s line in that pane', () => {
    const { panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const sma = add('sma', { source: `ind:${rsi}:value` });
    expect(paneOfConfig(sma)).toBe(rsi);
    expect(panes.paneOf(sma)).toBe(rsi);
    expect(panes.paneOf(rsi)).toBe(rsi);
  });

  it('draws an indicator asked into another\'s pane there, on that pane\'s host', () => {
    const { panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const macd = add('macd', {}, rsi);
    // Asked into a member's pane: the pane's host.
    const stoch = add('stochastic', {}, macd);
    expect(paneOfConfig(macd)).toBe(rsi);
    expect(paneOfConfig(stoch)).toBe(rsi);
    expect(panes.hostOf(rsi, rsi)).toBeNull();
  });

  it('keeps a price-pane indicator in the price pane', () => {
    const { panes, add } = setup();
    const sma = add('sma');
    expect(panes.ownsPane(sma)).toBe(false);
    expect(panes.paneOf(sma)).toBe(sma);
    expect(panes.hostOf(sma)).toBeNull();
  });
});

describe('IndicatorPanes: an indicator follows its source', () => {
  it('goes into the pane of the line it now reads, and back out', () => {
    const { engine, panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const sma = add('sma');
    let before = panes.sourceOf(sma);
    engine.updateIndicator(sma, { source: `ind:${rsi}:value` }, bars);
    expect(panes.followSource(sma, before)).toBe(true);
    expect(paneOfConfig(sma)).toBe(rsi);

    before = panes.sourceOf(sma);
    engine.updateIndicator(sma, { source: 'close' }, bars);
    expect(panes.followSource(sma, before)).toBe(true);
    expect(paneOfConfig(sma)).toBeNull();
  });

  it('stays in a pane it was put in when its price source changes', () => {
    const { engine, panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const sma = add('sma', {}, rsi);
    const before = panes.sourceOf(sma);
    engine.updateIndicator(sma, { source: 'open' }, bars);
    expect(panes.followSource(sma, before)).toBe(false);
    expect(paneOfConfig(sma)).toBe(rsi);
  });

  it('does nothing when the source did not change', () => {
    const { engine, panes, add } = setup();
    const sma = add('sma');
    const before = panes.sourceOf(sma);
    engine.updateIndicator(sma, { period: 30 }, bars);
    expect(panes.followSource(sma, before)).toBe(false);
  });
});

describe('IndicatorPanes: removing an indicator', () => {
  it('hands its pane to the first pane indicator drawn in it, the others staying', () => {
    const { panes, add, handed, paneIds, paneOfConfig } = setup();
    const rsi = add('rsi');
    const sma = add('sma', {}, rsi);
    const macd = add('macd', {}, rsi);
    expect(panes.detach(rsi)?.sort()).toEqual([macd, sma].sort());
    expect(paneIds()).toEqual([macd]);
    expect(paneOfConfig(macd)).toBeNull();
    expect(paneOfConfig(sma)).toBe(macd);
    expect(handed).toEqual([`style ${rsi}>${macd}`, `pane ${rsi}>${macd}`]);
  });

  it('sends price-pane indicators back to the price pane when no pane indicator takes it', () => {
    const { panes, add, handed, paneIds, paneOfConfig } = setup();
    const rsi = add('rsi');
    const sma = add('sma', {}, rsi);
    panes.detach(rsi);
    expect(paneIds()).toEqual([]);
    expect(paneOfConfig(sma)).toBeNull();
    expect(handed).toEqual([`style ${rsi}>null`]);
  });

  it('reports each member once it is in its new pane, before the next moves', () => {
    const { panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const macd = add('macd', {}, rsi);
    const sma = add('sma', {}, rsi);
    const ema = add('ema', {}, rsi);
    const seen: [string, (string | null)[]][] = [];
    panes.detach(rsi, (member) => seen.push([member, [macd, sma, ema].map(paneOfConfig)]));
    expect(seen.map(([m]) => m)).toEqual([macd, sma, ema]);
    // While sma is reported, ema still points at the pane that went.
    expect(seen[1][1]).toEqual([null, macd, rsi]);
    expect(seen[2][1]).toEqual([null, macd, macd]);
  });

  it('returns null for an unknown indicator', () => {
    expect(setup().panes.detach('nope')).toBeNull();
  });
});

describe('IndicatorPanes: moving an indicator', () => {
  it('moves a pane member into a pane of its own', () => {
    const { panes, add, paneIds, paneOfConfig } = setup();
    const rsi = add('rsi');
    const macd = add('macd', {}, rsi);
    expect(panes.move(macd, 'new')).toEqual([macd]);
    expect(paneIds()).toEqual([rsi, macd]);
    expect(paneOfConfig(macd)).toBeNull();
  });

  it('moves a price-pane indicator out of a pane, back to the price pane', () => {
    const { panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const sma = add('sma', {}, rsi);
    expect(panes.move(sma, 'price')).toEqual([sma]);
    expect(paneOfConfig(sma)).toBeNull();
  });

  it('moves a pane\'s owner into another pane: a member takes its pane over, its readers follow it', () => {
    const { panes, add, handed, paneIds, paneOfConfig } = setup();
    const rsi = add('rsi');
    const macd = add('macd', {}, rsi);
    const reader = add('sma', { source: `ind:${rsi}:value` });
    const stoch = add('stochastic');
    const changed = panes.move(rsi, stoch);
    expect(changed?.sort()).toEqual([macd, reader, rsi].sort());
    expect(paneIds()).toEqual([macd, stoch]);
    expect(paneOfConfig(rsi)).toBe(stoch);
    expect(paneOfConfig(reader)).toBe(stoch);
    expect(paneOfConfig(macd)).toBeNull();
    expect(handed).toEqual([`style ${rsi}>${macd}`, `pane ${rsi}>${macd}`, 'scales']);
  });

  it('brings the readers along into a new pane of its own', () => {
    const { panes, add, paneOfConfig } = setup();
    const rsi = add('rsi');
    const macd = add('macd', {}, rsi);
    const reader = add('sma', { source: `ind:${macd}:macd` });
    expect(paneOfConfig(reader)).toBe(rsi);
    expect(panes.move(macd, 'new')?.sort()).toEqual([macd, reader].sort());
    expect(paneOfConfig(reader)).toBe(macd);
  });

  it('says where it can\'t go', () => {
    const { panes, add } = setup();
    const rsi = add('rsi');
    const sma = add('sma');
    const reader = add('sma', { source: `ind:${rsi}:value` });
    // A pane of its own it already has; the price pane only takes overlays not on it.
    expect(panes.moveHost(rsi, 'new')).toBeUndefined();
    expect(panes.moveHost(rsi, 'price')).toBeUndefined();
    expect(panes.moveHost(sma, 'price')).toBeUndefined();
    // An overlay reading another indicator's line stays with the line.
    expect(panes.moveHost(reader, 'price')).toBeUndefined();
    // Into its own pane, or the one it is in.
    expect(panes.moveHost(rsi, rsi)).toBeUndefined();
    expect(panes.moveHost('nope', rsi)).toBeUndefined();
    expect(panes.move(rsi, 'new')).toBeNull();
    expect(panes.moveHost(sma, rsi)).toBe(rsi);
  });
});

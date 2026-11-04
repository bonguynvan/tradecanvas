import { describe, it, expect, vi } from 'vitest';
import { AlertManager, type PriceAlert } from '@tradecanvas/core';
import { checkAlerts, DrawingAlertStash, followChannel, moveAlertsToHeirs, restoreLayoutAlerts } from '../AlertWatch.js';

const line = (values: Record<string, number>[]) => (id: string) => (id === 'tc_rsi_1' ? values : undefined);

describe('checkAlerts', () => {
  it('fires a price alert, and a line alert with the line\'s last value', () => {
    const alerts = new AlertManager();
    const fired: string[] = [];
    alerts.on('triggered', (a) => fired.push(a.channel));
    alerts.addAlert(100, 'greaterThan');
    alerts.addAlert(70, 'greaterThan', undefined, false, 'tc_rsi_1:value');
    checkAlerts(alerts, { price: 99, barTime: 1, lines: line([{ value: 50 }]) });
    expect(fired).toEqual([]);
    checkAlerts(alerts, { price: 101, barTime: 2, lines: line([{ value: 50 }, { value: 75 }]) });
    expect(fired.sort()).toEqual(['price', 'tc_rsi_1:value']);
  });

  it('reads no line without lines (a replay), and skips a value that is not a finite number', () => {
    const alerts = new AlertManager();
    const fired: string[] = [];
    alerts.on('triggered', (a) => fired.push(a.channel));
    alerts.addAlert(70, 'greaterThan', undefined, false, 'tc_rsi_1:value');
    checkAlerts(alerts, { price: 101, barTime: 1, lines: null });
    checkAlerts(alerts, { price: 101, barTime: 2, lines: line([{ value: Number.NaN }]) });
    expect(fired).toEqual([]);
  });

  it('gives the alerts the bar time first', () => {
    const calls: string[] = [];
    const alerts = {
      getAlerts: () => [] as PriceAlert[],
      setBarTime: (t: number | null) => calls.push(`time ${t}`),
      checkChannels: (v: Map<string, number>) => calls.push(`channels ${[...v.keys()]}`),
      checkDrawings: (p: number) => calls.push(`drawings ${p}`),
    };
    checkAlerts(alerts, { price: 5, barTime: null, lines: null });
    expect(calls).toEqual(['time null', 'channels price', 'drawings 5']);
  });
});

describe('moveAlertsToHeirs', () => {
  const kinds = new Map([['tc_rsi_9', 'rsi'], ['tc_macd_9', 'macd']]);
  const kindOf = (id: string) => kinds.get(id);

  it('moves alerts on a gone indicator to the one new indicator of its kind, options kept', () => {
    const alerts = new AlertManager();
    alerts.addAlert(70, 'crossing', 'hi', true, 'tc_rsi_1:value', 'L', { target: 'tc_rsi_1:signal', onBarClose: true });
    moveAlertsToHeirs(alerts, new Map([['tc_rsi_1', 'rsi']]), ['tc_rsi_9', 'tc_macd_9'], kindOf);
    const [moved] = alerts.getAlerts();
    expect(moved).toMatchObject({ channel: 'tc_rsi_9:value', target: 'tc_rsi_9:signal', message: 'hi', repeating: true, label: 'L', onBarClose: true });
  });

  it('keeps a move\'s percent and bars, and an end time, through the move', () => {
    const alerts = new AlertManager();
    alerts.addAlert(0, 'movesUp', undefined, false, 'tc_rsi_1:value', undefined, { percent: 2, bars: 5, expiresAt: 9e15 });
    moveAlertsToHeirs(alerts, new Map([['tc_rsi_1', 'rsi']]), ['tc_rsi_9'], kindOf);
    expect(alerts.getAlerts()[0]).toMatchObject({ channel: 'tc_rsi_9:value', percent: 2, bars: 5, expiresAt: 9e15 });
    alerts.clearAlerts();
  });

  it('leaves alerts with no heir or two heirs, and those of an indicator still there', () => {
    const alerts = new AlertManager();
    alerts.addAlert(1, 'crossing', undefined, false, 'tc_rsi_1:value');
    alerts.addAlert(1, 'crossing', undefined, false, 'tc_sma_1:value');
    alerts.addAlert(1, 'crossing', undefined, false, 'tc_rsi_9:value');
    const ids = alerts.getAlerts().map((a) => a.id);
    moveAlertsToHeirs(alerts, new Map([['tc_rsi_1', 'rsi'], ['tc_sma_1', 'sma'], ['tc_rsi_9', 'rsi']]), ['tc_rsi_9', 'tc_rsi_8'], (id) => (id === 'tc_rsi_8' ? 'rsi' : kindOf(id)));
    expect(alerts.getAlerts().map((a) => a.id)).toEqual(ids);
  });
});

describe('followChannel', () => {
  it('follows a renamed indicator and leaves the price and other channels', () => {
    const ids = new Map([['old_1', 'tc_rsi_3']]);
    expect(followChannel('old_1:value', ids)).toBe('tc_rsi_3:value');
    expect(followChannel('price', ids)).toBe('price');
    expect(followChannel('other_1:value', ids)).toBe('other_1:value');
  });
});

describe('restoreLayoutAlerts', () => {
  const saved = (extra: Partial<PriceAlert>): PriceAlert => ({ id: 'x', price: 10, condition: 'crossing', triggered: false, repeating: false, channel: 'price', ...extra });

  it('puts back the alerts of a layout: renamed lines, drawings that take one; not fired, expired or broken ones', () => {
    const alerts = new AlertManager();
    alerts.setDrawingLevels(() => [12]);
    alerts.addAlert(1);
    const leftOut = vi.fn();
    restoreLayoutAlerts(alerts, [
      saved({ channel: 'old_1:value', target: 'old_1:signal', condition: 'crossingUp' }),
      saved({ triggered: true }),
      saved({ triggered: true, repeating: true, price: 11 }),
      saved({ expired: true }),
      saved({ drawingId: 'd1' }),
      saved({ drawingId: 'gone' }),
      saved({ drawingId: 'd1', condition: 'greaterThan' }),
      saved({ condition: 'movesUp' }),
    ], new Map([['old_1', 'tc_rsi_3']]), (id) => id === 'd1', leftOut);
    expect(alerts.getAlerts().map((a) => [a.channel, a.target, a.price, a.drawingId])).toEqual([
      ['tc_rsi_3:value', 'tc_rsi_3:signal', 10, undefined],
      ['price', undefined, 11, undefined],
      ['price', undefined, 12, 'd1'],
    ]);
    expect(leftOut).toHaveBeenCalledOnce();
  });
});

describe('DrawingAlertStash', () => {
  it('takes a drawing\'s alerts with it and puts them back when it comes back', () => {
    const alerts = new AlertManager();
    alerts.setDrawingLevels(() => [12]);
    const id = alerts.addDrawingAlert('d1');
    const stash = new DrawingAlertStash(alerts);
    stash.removed('d1');
    expect(alerts.getAlerts()).toEqual([]);
    stash.created('d1');
    expect(alerts.getAlerts().map((a) => a.id)).toEqual([id]);
    stash.created('d1');
    expect(alerts.getAlerts()).toHaveLength(1);
  });

  it('prunes alerts on drawings not on the chart and forgets what it kept', () => {
    const alerts = new AlertManager();
    alerts.setDrawingLevels(() => [12]);
    alerts.addDrawingAlert('d1');
    alerts.addDrawingAlert('d2');
    const stash = new DrawingAlertStash(alerts);
    stash.removed('d1');
    expect(stash.prune(new Set(['d1']))).toBe(1);
    stash.created('d1');
    expect(alerts.getAlerts()).toEqual([]);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { AlertManager, type PriceAlert } from '../AlertManager.js';

let manager: AlertManager;
let fired: PriceAlert[];
/** The drawing's line(s) at the current time, as the chart would report them. */
let levels: Record<string, number[] | null>;

beforeEach(() => {
  manager = new AlertManager();
  fired = [];
  levels = {};
  manager.on('triggered', (a) => fired.push(a));
  manager.setDrawingLevels((id) => levels[id] ?? null);
});

describe('AlertManager alerts on drawings', () => {
  it('fires when the price crosses a line that moves', () => {
    manager.addDrawingAlert('line', 'crossingUp');
    levels.line = [100];
    manager.checkPrice(95);
    levels.line = [102]; // the trend line rose
    manager.checkPrice(101); // still under it
    expect(fired).toHaveLength(0);
    levels.line = [103];
    manager.checkPrice(104);
    expect(fired).toHaveLength(1);
    expect(fired[0].drawingId).toBe('line');
    expect(fired[0].price).toBe(103);
  });

  it('checks the direction', () => {
    manager.addDrawingAlert('line', 'crossingDown');
    levels.line = [100];
    manager.checkPrice(95);
    manager.checkPrice(105);
    expect(fired).toHaveLength(0);
    manager.checkPrice(99);
    expect(fired).toHaveLength(1);
  });

  it('fires on any line of a channel', () => {
    manager.addDrawingAlert('channel', 'crossing');
    levels.channel = [100, 110];
    manager.checkPrice(105);
    manager.checkPrice(111);
    expect(fired).toHaveLength(1);
  });

  it('stays quiet while the drawing does not reach the current time', () => {
    manager.addDrawingAlert('line', 'crossing');
    levels.line = [100];
    manager.checkPrice(95);
    levels.line = null; // past the end of an unextended line
    manager.checkPrice(105);
    levels.line = [100];
    manager.checkPrice(106);
    expect(fired).toHaveLength(0);
  });

  it('re-arms a repeating alert', () => {
    manager.addDrawingAlert('line', 'crossing', undefined, true);
    levels.line = [100];
    for (const price of [95, 105, 106, 95]) manager.checkPrice(price); // re-armed by a tick that crossed nothing
    expect(fired).toHaveLength(2);
  });

  it('only takes crossing conditions', () => {
    expect(() => manager.addDrawingAlert('line', 'greaterThan')).toThrow(RangeError);
  });

  it('removes a drawing’s alerts with it, and leaves price alerts alone', () => {
    manager.addDrawingAlert('line', 'crossing');
    manager.addDrawingAlert('other', 'crossing');
    manager.addAlert(100, 'crossing');
    manager.removeDrawingAlerts('line');
    expect(manager.getAlerts().map((a) => a.drawingId ?? 'price')).toEqual(['other', 'price']);
  });

  it('keeps drawing alerts out of the price alerts’ checks', () => {
    manager.addDrawingAlert('line', 'crossing');
    levels.line = [100];
    const alert = manager.getAlerts()[0];
    manager.checkChannel('price', 50);
    manager.checkChannel('price', alert.price + 500);
    expect(fired).toHaveLength(0);
  });
});

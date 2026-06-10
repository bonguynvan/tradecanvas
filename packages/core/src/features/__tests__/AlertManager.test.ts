import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { AlertManager } from '../AlertManager.js';

// Linear price scale: y = top + height * (1 - (price-min)/(max-min)).
// With min=0, max=100, chartRect y=0 height=100 → price 100 → y 0, price 0 → y 100.
function viewport(): ViewportState {
  return {
    visibleRange: { from: 0, to: 10 },
    priceRange: { min: 0, max: 100 },
    barWidth: 6,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 200, height: 100 },
  };
}

describe('AlertManager.getAlertAtPoint', () => {
  it('returns the alert whose line is within tolerance of the point', () => {
    const am = new AlertManager();
    const id = am.addAlert(50, 'crossing'); // price 50 → y 50
    const vp = viewport();

    expect(am.getAlertAtPoint({ x: 10, y: 50 }, vp, 6)?.id).toBe(id);
    expect(am.getAlertAtPoint({ x: 10, y: 54 }, vp, 6)?.id).toBe(id);
    expect(am.getAlertAtPoint({ x: 10, y: 70 }, vp, 6)).toBeNull();
  });

  it('picks the nearest alert when several are close', () => {
    const am = new AlertManager();
    am.addAlert(50, 'crossing'); // y 50
    const near = am.addAlert(52, 'crossing'); // y 48
    const vp = viewport();
    // Point at y=48.5 is closest to the 52 alert.
    expect(am.getAlertAtPoint({ x: 10, y: 48.5 }, vp, 6)?.id).toBe(near);
  });

  it('ignores points outside the chart rect', () => {
    const am = new AlertManager();
    am.addAlert(50, 'crossing');
    const vp = viewport();
    expect(am.getAlertAtPoint({ x: 10, y: -5 }, vp, 6)).toBeNull();
    expect(am.getAlertAtPoint({ x: 10, y: 120 }, vp, 6)).toBeNull();
  });
});

describe('AlertManager.updateAlertPrice', () => {
  it('moves the alert and re-arms a triggered one', () => {
    const am = new AlertManager();
    const id = am.addAlert(50, 'crossing');
    // Trigger it: cross from below.
    am.checkPrice(40);
    am.checkPrice(60);
    expect(am.getAlerts()[0].triggered).toBe(true);

    let updated = false;
    am.on('updated', () => { updated = true; });
    am.updateAlertPrice(id, 80);

    const alert = am.getAlerts()[0];
    expect(alert.price).toBe(80);
    expect(alert.triggered).toBe(false);
    expect(updated).toBe(true);
  });

  it('ignores non-finite prices and unknown ids', () => {
    const am = new AlertManager();
    const id = am.addAlert(50, 'crossing');
    am.updateAlertPrice(id, Number.NaN);
    expect(am.getAlerts()[0].price).toBe(50);
    am.updateAlertPrice('nope', 10); // no throw
  });
});

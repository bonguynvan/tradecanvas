import { describe, expect, it, vi } from 'vitest';
import { DARK_THEME, type OHLCBar, type ViewportState } from '@tradecanvas/commons';
import { BaselineRenderer } from '../BaselineRenderer.js';
import { strokeRecorder } from '../../__tests__/strokeRecorder.js';

const bars: OHLCBar[] = Array.from({ length: 40 }, (_, i) => {
  const p = 100 + Math.sin(i / 3) * 5;
  return { time: i * 60_000, open: p, high: p + 1, low: p - 1, close: p, volume: 1 };
});

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 39 },
  priceRange: { min: 90, max: 110 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 400, height: 300 },
};

vi.stubGlobal('Path2D', class { moveTo() {} lineTo() {} rect() {} closePath() {} });

describe('BaselineRenderer fills', () => {
  it('fills each side in its colour at an eighth, however the colour is written', () => {
    const rec = strokeRecorder();
    new BaselineRenderer().render(rec.ctx, bars, viewport, { ...DARK_THEME, candleUp: 'red', candleDown: 'hsl(200 50% 50%)' });
    expect(rec.pathFills.map((f) => f.color)).toEqual(['red', 'hsl(200 50% 50%)']);
    for (const f of rec.pathFills) expect(f.alpha).toBeCloseTo(0x20 / 0xff);
  });
});

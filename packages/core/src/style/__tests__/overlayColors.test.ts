import { describe, it, expect } from 'vitest';
import { DARK_THEME, DEFAULT_TRADING_CONFIG, resolveChartTheme, type TradingConfig } from '@tradecanvas/commons';
import { drawingHandleColor, markerStyleFor, tradingConfigFor, zoneStyleFor } from '../overlayColors.js';
import { SignalMarkerManager } from '../../features/SignalMarkerManager.js';
import { TradeZoneManager } from '../../features/TradeZoneManager.js';
import { strokeRecorder } from '../../__tests__/strokeRecorder.js';
import type { OHLCBar, SignalMarker, ViewportState } from '@tradecanvas/commons';

const styled = (overrides: Parameters<typeof resolveChartTheme>[2]) => resolveChartTheme(DARK_THEME, 'candlestick', overrides);

describe('the overlays coloured by style keys', () => {
  it('keeps the trading config as it is without keys', () => {
    const config = { ...DEFAULT_TRADING_CONFIG } as TradingConfig;
    expect(tradingConfigFor(config, styled({}))).toBe(config);
    expect(tradingConfigFor(config, DARK_THEME)).toBe(config);
  });

  it('puts the keys over the trading config, the rest kept', () => {
    const config = { ...DEFAULT_TRADING_CONFIG, positionColors: { profit: '#0a0', loss: '#a00', entry: '#00a' } } as TradingConfig;
    const out = tradingConfigFor(config, styled({ 'trading.buyColor': '#111111', 'trading.profitColor': '#222222' }));
    expect(out.orderColors).toEqual({ ...config.orderColors, buy: '#111111' });
    expect(out.positionColors).toEqual({ profit: '#222222', loss: '#a00', entry: '#00a' });
    expect(config.positionColors?.profit).toBe('#0a0');
  });

  it('colours the markers and the trade zones by key over their own style', () => {
    const theme = styled({ 'markers.shortColor': '#333333', 'tradeZones.lossColor': '#444444' });
    expect(markerStyleFor({ longColor: '#0f0', shortColor: '#f00' }, theme)).toEqual({ longColor: '#0f0', shortColor: '#333333' });
    expect(zoneStyleFor({ profitColor: '#0f0', lossColor: '#f00' }, theme)).toEqual({ profitColor: '#0f0', lossColor: '#444444' });
  });

  it('fills the drawing handles in white unless a key says otherwise', () => {
    expect(drawingHandleColor(styled({}))).toBe('#FFFFFF');
    expect(drawingHandleColor(null)).toBe('#FFFFFF');
    expect(drawingHandleColor(styled({ 'drawings.handleColor': '#555555' }))).toBe('#555555');
  });
});


const bars: OHLCBar[] = Array.from({ length: 20 }, (_, i) => ({ time: i * 60_000, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
const viewport: ViewportState = {
  visibleRange: { from: 0, to: 19 },
  priceRange: { min: 90, max: 110 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 600, height: 400 },
};

describe('the overlays drawn in the keys’ colours', () => {
  it('draws a long marker and an open trade in the colours the keys give', () => {
    const theme = styled({ 'markers.longColor': '#123456', 'tradeZones.activeColor': '#654321' });
    const markers = new SignalMarkerManager();
    markers.setDataGetter(() => bars);
    markers.setMarkers([{ id: 'm', time: bars[5].time, price: 100, direction: 'long', confidence: 1, source: 't' } as SignalMarker]);
    const rec = strokeRecorder();
    markers.render(rec.ctx, viewport, theme);
    expect(rec.pathFills.map((f) => f.color)).toContain('#123456');

    const zones = new TradeZoneManager();
    zones.setDataGetter(() => bars);
    zones.setZones([{ id: 'z', entryTime: bars[3].time, entryPrice: 100, direction: 'long' }]);
    const rec2 = strokeRecorder();
    zones.render(rec2.ctx, viewport, theme);
    expect(rec2.fills.map((f) => f.color)).toContain('#654321');
  });
});

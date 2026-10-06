import { useRef, useEffect, useImperativeHandle, forwardRef, type CSSProperties } from 'react';
import {
  Chart,
  BinanceAdapter,
  DARK_THEME,
  LIGHT_THEME,
} from '@tradecanvas/chart';
import type {
  ChartType,
  TimeFrame,
  ChartOptions,
  FeaturesConfig,
  Theme,
  OHLCBar,
  SignalMarker,
  TradeZone,
  SignalMarkerStyle,
  TradeZoneStyle,
  DataAdapter,
  StreamConfig,
  ChartStyleOverrides,
} from '@tradecanvas/chart';

export interface TradeCanvasRef {
  getChart(): Chart | null;
  screenshot(filename?: string): void;
  screenshotDataURL(): string | null;
}

export interface TradeCanvasProps {
  symbol?: string;
  timeframe?: TimeFrame;
  theme?: 'dark' | 'light' | Theme;
  chartType?: ChartType;
  indicators?: string[];
  data?: OHLCBar[];
  adapter?: DataAdapter;
  historyLimit?: number;
  features?: FeaturesConfig;
  autoScale?: boolean;
  signalMarkers?: SignalMarker[];
  signalMarkerStyle?: SignalMarkerStyle;
  tradeZones?: TradeZone[];
  tradeZoneStyle?: TradeZoneStyle;
  /** Style overrides, by key: all of your app's (`chart.setOverrides`). */
  overrides?: ChartStyleOverrides;
  watermarkText?: string;
  onReady?: (chart: Chart) => void;
  onCrosshairMove?: (payload: unknown) => void;
  className?: string;
  style?: CSSProperties;
}

function resolveTheme(theme: 'dark' | 'light' | Theme | undefined): Theme {
  if (!theme || theme === 'dark') return DARK_THEME;
  if (theme === 'light') return LIGHT_THEME;
  return theme;
}

export const TradeCanvas = forwardRef<TradeCanvasRef, TradeCanvasProps>(
  function TradeCanvas(props, ref) {
    const {
      symbol = 'BTCUSDT',
      timeframe = '5m' as TimeFrame,
      theme = 'dark',
      chartType = 'candlestick' as ChartType,
      indicators = [],
      data,
      adapter,
      historyLimit = 500,
      features,
      autoScale = true,
      signalMarkers,
      signalMarkerStyle,
      tradeZones,
      tradeZoneStyle,
      overrides,
      watermarkText,
      onReady,
      onCrosshairMove,
      className,
      style,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const indicatorIdsRef = useRef<Map<string, string>>(new Map());
    const prevStreamRef = useRef({ symbol, timeframe });

    useImperativeHandle(ref, () => ({
      getChart: () => chartRef.current,
      screenshot: (filename?: string) => chartRef.current?.screenshot(filename),
      screenshotDataURL: () => chartRef.current?.screenshotDataURL() ?? null,
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const opts: ChartOptions = {
        chartType,
        theme: resolveTheme(theme),
        autoScale,
        rightMargin: 5,
        crosshair: { mode: 'magnet' },
        features: {
          drawings: true,
          drawingMagnet: true,
          drawingUndoRedo: true,
          indicators: true,
          trading: true,
          volume: true,
          legend: true,
          crosshair: true,
          keyboard: true,
          screenshot: true,
          alerts: true,
          barCountdown: true,
          logScale: true,
          watermark: true,
          ...features,
        },
      };

      if (watermarkText) {
        opts.watermark = { text: watermarkText, fontSize: 48, color: 'rgba(255,255,255,0.03)' };
      }

      const chart = new Chart(container, opts);
      chartRef.current = chart;
      indicatorIdsRef.current = new Map();

      if (data) {
        chart.setData(data);
      } else {
        const dataAdapter = adapter ?? new BinanceAdapter();
        chart.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
      }

      onReady?.(chart);

      return () => {
        chart.disconnectStream();
        chart.destroy();
        chartRef.current = null;
        indicatorIdsRef.current.clear();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const chart = chartRef.current;
      if (!chart || data) return;
      const prev = prevStreamRef.current;
      if (prev.symbol === symbol && prev.timeframe === timeframe) return;
      prevStreamRef.current = { symbol, timeframe };

      chart.disconnectStream();
      const dataAdapter = adapter ?? new BinanceAdapter();
      chart.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
      if (watermarkText !== undefined) {
        chart.setWatermark(watermarkText);
      }
    }, [symbol, timeframe, adapter, historyLimit, data, watermarkText]);

    useEffect(() => {
      chartRef.current?.setTheme(resolveTheme(theme));
    }, [theme]);

    useEffect(() => {
      chartRef.current?.setChartType(chartType);
    }, [chartType]);

    useEffect(() => {
      if (data) chartRef.current?.setData(data);
    }, [data]);

    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const current = indicatorIdsRef.current;
      const desired = new Set(indicators);
      for (const [name, instanceId] of current) {
        if (!desired.has(name)) {
          chart.removeIndicator(instanceId);
          current.delete(name);
        }
      }
      for (const name of indicators) {
        if (!current.has(name)) {
          const instanceId = chart.addIndicator(name);
          if (instanceId) current.set(name, instanceId);
        }
      }
    }, [indicators]);

    useEffect(() => {
      if (signalMarkers) chartRef.current?.setSignalMarkers(signalMarkers);
    }, [signalMarkers]);

    useEffect(() => {
      if (signalMarkerStyle) chartRef.current?.setSignalMarkerStyle(signalMarkerStyle);
    }, [signalMarkerStyle]);

    useEffect(() => {
      if (tradeZones) chartRef.current?.setTradeZones(tradeZones);
    }, [tradeZones]);

    useEffect(() => {
      if (tradeZoneStyle) chartRef.current?.setTradeZoneStyle(tradeZoneStyle);
    }, [tradeZoneStyle]);

    // All of the host's overrides: keys left out of the prop are taken away.
    // Without the prop, overrides set through the chart itself are left alone.
    const overridesGiven = useRef(false);
    useEffect(() => {
      if (overrides === undefined && !overridesGiven.current) return;
      overridesGiven.current = overrides !== undefined;
      chartRef.current?.setOverrides(overrides ?? {});
    }, [overrides]);

    useEffect(() => {
      const chart = chartRef.current;
      if (!chart || !onCrosshairMove) return;
      chart.on('crosshairMove', onCrosshairMove as (e: unknown) => void);
    }, [onCrosshairMove]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%', ...style }}
      />
    );
  },
);

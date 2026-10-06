import { useRef, useEffect, useImperativeHandle, forwardRef, type CSSProperties } from 'react';
import {
  Chart,
  BinanceAdapter,
  DARK_THEME,
  LIGHT_THEME,
  syncIndicators,
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
  IndicatorSpec,
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
  /** Indicators by id (`'rsi'`), or with their inputs (`{ id: 'ema', params: { period: 50 } }`). */
  indicators?: IndicatorSpec[];
  /** Static bars: the chart shows these, and opens no stream of its own when it has them at mount. */
  data?: OHLCBar[];
  adapter?: DataAdapter;
  /** `false`: no stream until you say so (no Binance by default); the chart waits for `data`. Default `true`. */
  stream?: boolean;
  historyLimit?: number;
  /** What users can do on the chart; changes after mount are applied too (the keys given). */
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
      stream = true,
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
    /** The stream open now (`symbol|timeframe`), or null. */
    const streamKeyRef = useRef<string | null>(null);
    const featuresRef = useRef(JSON.stringify(features ?? null));

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
      } else if (stream) {
        const dataAdapter = adapter ?? new BinanceAdapter();
        chart.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
        streamKeyRef.current = `${symbol}|${timeframe}`;
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

    // A stream of its own while it has no data; `stream={false}` closes it. Data given later leaves it be.
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;
      if (!stream) {
        if (streamKeyRef.current !== null) chart.disconnectStream();
        streamKeyRef.current = null;
        return;
      }
      if (data) return;
      const key = `${symbol}|${timeframe}`;
      if (streamKeyRef.current === key) return;
      streamKeyRef.current = key;

      chart.disconnectStream();
      const dataAdapter = adapter ?? new BinanceAdapter();
      chart.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
      if (watermarkText !== undefined) {
        chart.setWatermark(watermarkText);
      }
    }, [symbol, timeframe, adapter, historyLimit, data, stream, watermarkText]);

    useEffect(() => {
      const next = JSON.stringify(features ?? null);
      if (next === featuresRef.current) return;
      featuresRef.current = next;
      if (features) chartRef.current?.setFeatures(features);
    }, [features]);

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
      if (chart) syncIndicators(chart, indicators, indicatorIdsRef.current);
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

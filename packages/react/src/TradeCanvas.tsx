import { useRef, useEffect, useImperativeHandle, forwardRef, type CSSProperties } from 'react';
import {
  Chart,
  BinanceAdapter,
  DARK_THEME,
  LIGHT_THEME,
  syncIndicators,
  feedBars,
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
  FedBars,
} from '@tradecanvas/chart';

export interface TradeCanvasRef {
  getChart(): Chart | null;
  screenshot(filename?: string): void;
  screenshotDataURL(): string | null;
}

/**
 * The chart is made once, on mount. Later changes to `symbol`, `timeframe`,
 * `theme`, `chartType`, `indicators`, `data`, `stream`, `features`,
 * `overrides`, the markers and zones and `onCrosshairMove` go to it
 * (`setTheme`, `setChartType`, `setData`…). `options` and `autoScale` are
 * read at mount; `adapter`, `historyLimit` and `watermarkText` when the
 * stream connects (at mount, or for a new symbol or interval). Unmounting
 * closes the chart's stream and destroys it.
 */
export interface TradeCanvasProps {
  /** The stream's symbol (`'BTCUSDT'`); a new one reconnects the stream, while there is no `data`. */
  symbol?: string;
  /** The stream's interval (`'5m'`); a new one reconnects it, while there is no `data`. */
  timeframe?: TimeFrame;
  theme?: 'dark' | 'light' | Theme;
  chartType?: ChartType;
  /**
   * Indicators by id (`'rsi'`), or with their inputs (`{ id: 'ema', params: { period: 50 } }`).
   * A new list is matched to what's on the chart: added, removed, and one
   * whose inputs changed put back with them (its style edits go).
   */
  indicators?: IndicatorSpec[];
  /**
   * The bars: the chart shows these, and opens no stream of its own when it
   * has them at mount. A new array that goes on from the last one, its last
   * bar changed or bars added after it (`[...bars.slice(0, -1), forming]`,
   * `[...bars, next]`), goes in as a live feed's ticks do (`updateLastBar`,
   * `appendBar`, `appendBars`): the view isn't reset, only the end is
   * computed again, and alerts follow the price. Any other new array is a new
   * series (`setData`): the view goes back to the newest bar and every
   * indicator is computed again. So is one after a stream, or code through
   * the ref, gave the chart bars of its own. A new array that changes one of
   * the last three bars before the forming one, its time the same, goes in
   * as a correction (`updateBar`): the view stays, and the indicators are
   * computed again from that bar. A change further back is a new series.
   */
  data?: OHLCBar[];
  /** The stream's feed (Binance by default), taken when the stream connects. */
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
  /**
   * Chart options the props don't cover (`maxBarSpacing`, `rightMargin`,
   * `renderer`…), merged over the component's defaults at mount; later
   * changes are not applied. `chartType`, `theme` and `autoScale` always come
   * from their props.
   */
  options?: Partial<ChartOptions>;
  /**
   * Called with the chart when it is made, on mount: once, or twice in
   * React's StrictMode in development, which mounts twice (the first chart
   * is destroyed). The ref's `getChart()` gives it too.
   */
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
      options,
      onReady,
      onCrosshairMove,
      className,
      style,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const indicatorIdsRef = useRef<Map<string, string>>(new Map());
    /** The bars last given to the chart (`feedBars`). */
    const fedRef = useRef<FedBars | null>(null);
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
        rightMargin: 5,
        crosshair: { mode: 'magnet' },
        ...options,
        chartType,
        theme: resolveTheme(theme),
        autoScale,
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
          ...options?.features,
          ...features,
        },
      };

      if (watermarkText) {
        opts.watermark = { text: watermarkText, fontSize: 48, color: 'rgba(255,255,255,0.03)' };
      }

      const chart = new Chart(container, opts);
      chartRef.current = chart;
      indicatorIdsRef.current = new Map();

      fedRef.current = data ? feedBars(chart, data, null) : null;
      if (!data && stream) {
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
      const chart = chartRef.current;
      if (!chart) return;
      // Without data, the next bars are a new series: a stream may have come in between.
      fedRef.current = data ? feedBars(chart, data, fedRef.current) : null;
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
      const handler = onCrosshairMove as (e: unknown) => void;
      chart.on('crosshairMove', handler);
      // A new handler (an inline one is new each render) replaces this one.
      return () => chart.off('crosshairMove', handler);
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

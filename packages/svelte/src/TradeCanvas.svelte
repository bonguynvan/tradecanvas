<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
    FeaturesConfig,
    Theme,
    OHLCBar,
    SignalMarker,
    TradeZone,
    SignalMarkerStyle,
    TradeZoneStyle,
    DataAdapter,
    ChartStyleOverrides,
    IndicatorSpec,
  } from '@tradecanvas/chart';

  interface Props {
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
    chart?: Chart | null;
  }

  let {
    symbol = 'BTCUSDT',
    timeframe = '5m' as TimeFrame,
    theme = 'dark' as 'dark' | 'light' | Theme,
    chartType = 'candlestick' as ChartType,
    indicators = [] as IndicatorSpec[],
    data = undefined as OHLCBar[] | undefined,
    adapter = undefined as DataAdapter | undefined,
    stream = true,
    historyLimit = 500,
    features = undefined as FeaturesConfig | undefined,
    autoScale = true,
    signalMarkers = undefined as SignalMarker[] | undefined,
    signalMarkerStyle = undefined as SignalMarkerStyle | undefined,
    tradeZones = undefined as TradeZone[] | undefined,
    tradeZoneStyle = undefined as TradeZoneStyle | undefined,
    overrides = undefined as ChartStyleOverrides | undefined,
    watermarkText = undefined as string | undefined,
    onReady = undefined as ((chart: Chart) => void) | undefined,
    chart = $bindable(null) as Chart | null,
  }: Props = $props();

  function resolveTheme(t: 'dark' | 'light' | Theme): Theme {
    if (t === 'dark') return DARK_THEME;
    if (t === 'light') return LIGHT_THEME;
    return t as Theme;
  }

  let container: HTMLDivElement;
  let instance: Chart | null = null;
  const indicatorIds = new Map<string, string>();
  /** The stream open now (`symbol|timeframe`), or null. */
  let streamKey: string | null = null;
  /** The features last applied, as text. */
  let featuresKey: string | null = null;

  onMount(() => {
    instance = new Chart(container, {
      chartType,
      theme: resolveTheme(theme),
      autoScale,
      rightMargin: 5,
      crosshair: { mode: 'magnet' },
      watermark: watermarkText
        ? { text: watermarkText, fontSize: 48, color: 'rgba(255,255,255,0.03)' }
        : undefined,
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
    });

    chart = instance;

    if (data) {
      instance.setData(data);
    } else if (stream) {
      const dataAdapter = adapter ?? new BinanceAdapter();
      instance.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
      streamKey = `${symbol}|${timeframe}`;
    }
    featuresKey = JSON.stringify($state.snapshot(features) ?? null);

    onReady?.(instance);
  });

  onDestroy(() => {
    if (instance) {
      instance.disconnectStream();
      instance.destroy();
      instance = null;
      chart = null;
    }
  });

  // A stream of its own while it has no data; `stream={false}` closes it. Data given later leaves it be.
  $effect(() => {
    const key = `${symbol}|${timeframe}`;
    const on = stream;
    const hasData = !!data;
    if (!instance) return;
    if (!on) {
      if (streamKey !== null) instance.disconnectStream();
      streamKey = null;
      return;
    }
    if (hasData || streamKey === key) return;
    streamKey = key;
    instance.disconnectStream();
    const dataAdapter = adapter ?? new BinanceAdapter();
    instance.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
    if (watermarkText) instance.setWatermark(watermarkText);
  });

  $effect(() => {
    const next = $state.snapshot(features);
    const key = JSON.stringify(next ?? null);
    if (!instance || key === featuresKey) return;
    featuresKey = key;
    if (next) instance.setFeatures(next);
  });

  $effect(() => { instance?.setTheme(resolveTheme(theme)); });
  $effect(() => { instance?.setChartType(chartType); });
  $effect(() => { if (data) instance?.setData(data); });

  $effect(() => {
    const specs = $state.snapshot(indicators) as IndicatorSpec[];
    if (instance) syncIndicators(instance, specs, indicatorIds);
  });

  $effect(() => { if (signalMarkers) instance?.setSignalMarkers(signalMarkers); });
  $effect(() => { if (signalMarkerStyle) instance?.setSignalMarkerStyle(signalMarkerStyle); });
  $effect(() => { if (tradeZones) instance?.setTradeZones(tradeZones); });
  $effect(() => { if (tradeZoneStyle) instance?.setTradeZoneStyle(tradeZoneStyle); });
  // All of the host's overrides: keys left out of the prop are taken away.
  // Without the prop, overrides set through the chart itself are left alone.
  let overridesGiven = false;
  $effect(() => {
    const next = $state.snapshot(overrides);
    if (next === undefined && !overridesGiven) return;
    overridesGiven = next !== undefined;
    instance?.setOverrides(next ?? {});
  });
</script>

<div bind:this={container} style="width:100%;height:100%"></div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    BinanceAdapter,
    DARK_THEME,
    LIGHT_THEME,
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
  } from '@tradecanvas/chart';

  interface Props {
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
    watermarkText?: string;
    onReady?: (chart: Chart) => void;
    chart?: Chart | null;
  }

  let {
    symbol = 'BTCUSDT',
    timeframe = '5m' as TimeFrame,
    theme = 'dark' as 'dark' | 'light' | Theme,
    chartType = 'candlestick' as ChartType,
    indicators = [] as string[],
    data = undefined as OHLCBar[] | undefined,
    adapter = undefined as DataAdapter | undefined,
    historyLimit = 500,
    features = undefined as FeaturesConfig | undefined,
    autoScale = true,
    signalMarkers = undefined as SignalMarker[] | undefined,
    signalMarkerStyle = undefined as SignalMarkerStyle | undefined,
    tradeZones = undefined as TradeZone[] | undefined,
    tradeZoneStyle = undefined as TradeZoneStyle | undefined,
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
  let prevSymbol = symbol;
  let prevTimeframe = timeframe;

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
    } else {
      const dataAdapter = adapter ?? new BinanceAdapter();
      instance.connect({ adapter: dataAdapter, symbol, timeframe, historyLimit });
    }

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

  $effect(() => {
    if (!instance || data) return;
    const _s = symbol;
    const _tf = timeframe;
    if (_s === prevSymbol && _tf === prevTimeframe) return;
    prevSymbol = _s;
    prevTimeframe = _tf;
    instance.disconnectStream();
    const dataAdapter = adapter ?? new BinanceAdapter();
    instance.connect({ adapter: dataAdapter, symbol: _s, timeframe: _tf, historyLimit });
    if (watermarkText) instance.setWatermark(watermarkText);
  });

  $effect(() => { instance?.setTheme(resolveTheme(theme)); });
  $effect(() => { instance?.setChartType(chartType); });
  $effect(() => { if (data) instance?.setData(data); });

  $effect(() => {
    if (!instance) return;
    const desired = new Set(indicators);
    for (const [name, instanceId] of indicatorIds) {
      if (!desired.has(name)) {
        instance.removeIndicator(instanceId);
        indicatorIds.delete(name);
      }
    }
    for (const name of indicators) {
      if (!indicatorIds.has(name)) {
        const instanceId = instance.addIndicator(name);
        if (instanceId) indicatorIds.set(name, instanceId);
      }
    }
  });

  $effect(() => { if (signalMarkers) instance?.setSignalMarkers(signalMarkers); });
  $effect(() => { if (signalMarkerStyle) instance?.setSignalMarkerStyle(signalMarkerStyle); });
  $effect(() => { if (tradeZones) instance?.setTradeZones(tradeZones); });
  $effect(() => { if (tradeZoneStyle) instance?.setTradeZoneStyle(tradeZoneStyle); });
</script>

<div bind:this={container} style="width:100%;height:100%"></div>

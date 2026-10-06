<template>
  <div ref="containerEl" :style="{ width: '100%', height: '100%' }" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
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

const props = withDefaults(
  defineProps<{
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
  }>(),
  {
    symbol: 'BTCUSDT',
    timeframe: '5m' as TimeFrame,
    theme: 'dark',
    chartType: 'candlestick' as ChartType,
    indicators: () => [],
    stream: true,
    historyLimit: 500,
    autoScale: true,
  },
);

const emit = defineEmits<{
  ready: [chart: Chart];
  crosshairMove: [payload: unknown];
}>();

function resolveTheme(theme: 'dark' | 'light' | Theme): Theme {
  if (theme === 'dark') return DARK_THEME;
  if (theme === 'light') return LIGHT_THEME;
  return theme as Theme;
}

const containerEl = ref<HTMLDivElement>();
let chart: Chart | null = null;
const indicatorIds = new Map<string, string>();
/** The stream open now (`symbol|timeframe`), or null. */
let streamKey: string | null = null;

/** The specs as plain values (not Vue's proxies), for the chart to keep. */
const plainSpecs = (specs: readonly IndicatorSpec[]): IndicatorSpec[] =>
  specs.map((spec) => (typeof spec === 'string'
    ? spec
    : { id: spec.id, ...(spec.params ? { params: { ...spec.params } } : {}), ...(spec.position ? { position: spec.position } : {}) }));
/** The features last applied, as text. */
let featuresKey = JSON.stringify(props.features ?? null);

/** A stream of its own while it has no data; `stream: false` closes it. Data given later leaves it be. */
function syncStream(): void {
  if (!chart) return;
  if (!props.stream) {
    if (streamKey !== null) chart.disconnectStream();
    streamKey = null;
    return;
  }
  if (props.data) return;
  const key = `${props.symbol}|${props.timeframe}`;
  if (streamKey === key) return;
  const opened = streamKey !== null;
  streamKey = key;
  if (opened) chart.disconnectStream();
  const adapter = props.adapter ?? new BinanceAdapter();
  chart.connect({ adapter, symbol: props.symbol, timeframe: props.timeframe, historyLimit: props.historyLimit });
  if (opened && props.watermarkText) chart.setWatermark(props.watermarkText);
}

function getChart(): Chart | null {
  return chart;
}

function screenshot(filename?: string): void {
  chart?.screenshot(filename);
}

function screenshotDataURL(): string | null {
  return chart?.screenshotDataURL() ?? null;
}

defineExpose({ getChart, screenshot, screenshotDataURL });

onMounted(() => {
  if (!containerEl.value) return;

  chart = new Chart(containerEl.value, {
    chartType: props.chartType,
    theme: resolveTheme(props.theme),
    autoScale: props.autoScale,
    rightMargin: 5,
    crosshair: { mode: 'magnet' },
    watermark: props.watermarkText
      ? { text: props.watermarkText, fontSize: 48, color: 'rgba(255,255,255,0.03)' }
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
      ...props.features,
    },
  });

  if (props.data) chart.setData(props.data);
  else syncStream();

  // Apply initial reactive collections not covered by the constructor options.
  // Vue's watches aren't immediate, so without this the first render of
  // indicators / signal markers / trade zones would be dropped.
  syncIndicators(chart, plainSpecs(props.indicators), indicatorIds);
  if (props.signalMarkers) chart.setSignalMarkers(props.signalMarkers);
  if (props.signalMarkerStyle) chart.setSignalMarkerStyle(props.signalMarkerStyle);
  if (props.tradeZones) chart.setTradeZones(props.tradeZones);
  if (props.tradeZoneStyle) chart.setTradeZoneStyle(props.tradeZoneStyle);
  if (props.overrides) chart.setOverrides(props.overrides);

  emit('ready', chart);
});

onUnmounted(() => {
  if (chart) {
    chart.disconnectStream();
    chart.destroy();
    chart = null;
  }
});

watch(() => [props.symbol, props.timeframe, !props.data, props.stream] as const, syncStream);
watch(() => props.features, (f) => {
  const key = JSON.stringify(f ?? null);
  if (key === featuresKey) return;
  featuresKey = key;
  if (f) chart?.setFeatures({ ...f });
}, { deep: true });

watch(() => props.theme, (t) => { chart?.setTheme(resolveTheme(t)); });
watch(() => props.chartType, (ct) => { chart?.setChartType(ct); });
watch(() => props.data, (d) => { if (d) chart?.setData(d); }, { deep: true });

watch(
  () => props.indicators,
  (specs) => { if (chart) syncIndicators(chart, plainSpecs(specs), indicatorIds); },
  { deep: true },
);

watch(() => props.signalMarkers, (m) => { if (m) chart?.setSignalMarkers(m); }, { deep: true });
watch(() => props.signalMarkerStyle, (s) => { if (s) chart?.setSignalMarkerStyle(s); }, { deep: true });
watch(() => props.tradeZones, (z) => { if (z) chart?.setTradeZones(z); }, { deep: true });
watch(() => props.tradeZoneStyle, (s) => { if (s) chart?.setTradeZoneStyle(s); }, { deep: true });
// All of the host's overrides: keys left out of the prop are taken away.
watch(() => props.overrides, (o) => { chart?.setOverrides({ ...o }); }, { deep: true });
</script>

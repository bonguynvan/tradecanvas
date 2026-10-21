<template>
  <div ref="containerEl" :style="{ width: '100%', height: '100%' }" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRaw } from 'vue';
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
  ChartOptions,
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
    /**
     * Bars: the chart shows these, and opens no stream of its own when it has
     * them at mount. A bar pushed onto the same array, or its last bar changed,
     * goes in as a live tick (the view stays where it is); a new array is a new
     * series. An older bar changed in place needs a new array.
     */
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
    /**
     * Chart options the props don't cover (`maxBarSpacing`, `rightMargin`,
     * `renderer`…), merged over the component's defaults at mount; later
     * changes are not applied. `chartType`, `theme` and `autoScale` always come
     * from their props.
     */
    options?: Partial<ChartOptions>;
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
    rightMargin: 5,
    crosshair: { mode: 'magnet' },
    ...props.options,
    chartType: props.chartType,
    theme: resolveTheme(props.theme),
    autoScale: props.autoScale,
    ...(props.watermarkText
      ? { watermark: { text: props.watermarkText, fontSize: 48, color: 'rgba(255,255,255,0.03)' } }
      : {}),
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
      ...props.options?.features,
      ...props.features,
    },
  });

  if (props.data) feed(chart, props.data);
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
/** The bars last given to the chart: the array, how many, and the last one as text. */
let fed: { bars: readonly OHLCBar[]; length: number; last: string } | null = null;
const barKey = (b: OHLCBar | undefined) => (b ? `${b.time},${b.open},${b.high},${b.low},${b.close},${b.volume}` : '');
const plain = (b: OHLCBar): OHLCBar => ({ ...toRaw(b) });

/**
 * Bars into the chart: on the same array, a bar pushed or the last one
 * changed goes in as a tick, so the view stays put and only the end is
 * recalculated; anything else is a new series. The chart gets plain bars, not
 * Vue's proxies, to read in its frames.
 */
function feed(target: Chart, data: readonly OHLCBar[]): void {
  const bars = toRaw(data);
  const n = bars.length;
  const last = barKey(bars[n - 1]);
  const prev = fed;
  fed = { bars, length: n, last };
  if (prev && prev.bars === bars && prev.length > 0) {
    if (n === prev.length) {
      if (last !== prev.last) target.updateLastBar(plain(bars[n - 1]));
      return;
    }
    if (n === prev.length + 1) {
      target.updateLastBar(plain(bars[n - 2]));
      target.appendBar(plain(bars[n - 1]));
      return;
    }
  }
  target.setData(bars.map(plain));
}

watch(() => props.features, (f) => {
  const key = JSON.stringify(f ?? null);
  if (key === featuresKey) return;
  featuresKey = key;
  if (f) chart?.setFeatures({ ...f });
}, { deep: true });

watch(() => props.theme, (t) => { chart?.setTheme(resolveTheme(t)); });
watch(() => props.chartType, (ct) => { chart?.setChartType(ct); });
// The array, its length and the last bar's fields: a bar pushed or the
// forming bar changed, without walking every bar as a deep watch does.
watch(
  () => [props.data, props.data?.length, barKey(props.data?.[props.data.length - 1])],
  () => { if (props.data && chart) feed(chart, props.data); },
);

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

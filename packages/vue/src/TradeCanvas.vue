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

const props = withDefaults(
  defineProps<{
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
  }>(),
  {
    symbol: 'BTCUSDT',
    timeframe: '5m' as TimeFrame,
    theme: 'dark',
    chartType: 'candlestick' as ChartType,
    indicators: () => [],
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

  if (props.data) {
    chart.setData(props.data);
  } else {
    const adapter = props.adapter ?? new BinanceAdapter();
    chart.connect({ adapter, symbol: props.symbol, timeframe: props.timeframe, historyLimit: props.historyLimit });
  }

  // Apply initial reactive collections not covered by the constructor options.
  // Vue's watches aren't immediate, so without this the first render of
  // indicators / signal markers / trade zones would be dropped.
  for (const name of props.indicators) {
    const instanceId = chart.addIndicator(name);
    if (instanceId) indicatorIds.set(name, instanceId);
  }
  if (props.signalMarkers) chart.setSignalMarkers(props.signalMarkers);
  if (props.signalMarkerStyle) chart.setSignalMarkerStyle(props.signalMarkerStyle);
  if (props.tradeZones) chart.setTradeZones(props.tradeZones);
  if (props.tradeZoneStyle) chart.setTradeZoneStyle(props.tradeZoneStyle);

  emit('ready', chart);
});

onUnmounted(() => {
  if (chart) {
    chart.disconnectStream();
    chart.destroy();
    chart = null;
  }
});

watch(
  () => [props.symbol, props.timeframe] as const,
  ([newSymbol, newTimeframe]) => {
    if (!chart || props.data) return;
    chart.disconnectStream();
    const adapter = props.adapter ?? new BinanceAdapter();
    chart.connect({ adapter, symbol: newSymbol, timeframe: newTimeframe, historyLimit: props.historyLimit });
    if (props.watermarkText) chart.setWatermark(props.watermarkText);
  },
);

watch(() => props.theme, (t) => { chart?.setTheme(resolveTheme(t)); });
watch(() => props.chartType, (ct) => { chart?.setChartType(ct); });
watch(() => props.data, (d) => { if (d) chart?.setData(d); }, { deep: true });

watch(
  () => props.indicators,
  (newIndicators) => {
    if (!chart) return;
    const desired = new Set(newIndicators);
    for (const [name, instanceId] of indicatorIds) {
      if (!desired.has(name)) {
        chart.removeIndicator(instanceId);
        indicatorIds.delete(name);
      }
    }
    for (const name of newIndicators) {
      if (!indicatorIds.has(name)) {
        const instanceId = chart.addIndicator(name);
        if (instanceId) indicatorIds.set(name, instanceId);
      }
    }
  },
  { deep: true },
);

watch(() => props.signalMarkers, (m) => { if (m) chart?.setSignalMarkers(m); }, { deep: true });
watch(() => props.signalMarkerStyle, (s) => { if (s) chart?.setSignalMarkerStyle(s); }, { deep: true });
watch(() => props.tradeZones, (z) => { if (z) chart?.setTradeZones(z); }, { deep: true });
watch(() => props.tradeZoneStyle, (s) => { if (s) chart?.setTradeZoneStyle(s); }, { deep: true });
</script>

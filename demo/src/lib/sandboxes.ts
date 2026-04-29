import sdk from '@stackblitz/sdk';

const CHART_VERSION = '^0.6.0';

const BODY_CSS = 'body { margin: 0; background: #131722; }';

const BASIC_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src'],
  },
  null,
  2,
);

// ---------------------------------------------------------------------------
// Vanilla JS
// ---------------------------------------------------------------------------

export function openVanillaSandbox(): void {
  sdk.openProject(
    {
      title: 'TradeCanvas — Vanilla JS',
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: 'tc-sandbox-vanilla',
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: { '@tradecanvas/chart': CHART_VERSION },
            devDependencies: { vite: '^6.0.0', typescript: '~5.7.0' },
          },
          null,
          2,
        ),
        'tsconfig.json': BASIC_TSCONFIG,
        'index.html': [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '  <title>TradeCanvas — Vanilla JS</title>',
          `  <style>${BODY_CSS}</style>`,
          '</head>',
          '<body>',
          '  <div id="chart" style="width:100%;height:100vh"></div>',
          '  <script type="module" src="/src/main.ts"></script>',
          '</body>',
          '</html>',
        ].join('\n'),
        'src/main.ts': [
          "import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart';",
          '',
          "const container = document.getElementById('chart')!;",
          '',
          'const chart = new Chart(container, {',
          "  chartType: 'candlestick',",
          '  theme: DARK_THEME,',
          '  autoScale: true,',
          '  features: { drawings: true, indicators: true, volume: true },',
          '});',
          '',
          'const adapter = new BinanceAdapter();',
          "chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m' });",
          '',
          '// Add an SMA indicator',
          "chart.addIndicator('sma', { period: 20 });",
        ].join('\n'),
      },
    },
    { openFile: 'src/main.ts', newWindow: true },
  );
}

// ---------------------------------------------------------------------------
// React
// ---------------------------------------------------------------------------

export function openReactSandbox(): void {
  sdk.openProject(
    {
      title: 'TradeCanvas — React',
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: 'tc-sandbox-react',
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: {
              react: '^19.0.0',
              'react-dom': '^19.0.0',
              '@tradecanvas/chart': CHART_VERSION,
            },
            devDependencies: {
              '@vitejs/plugin-react': '^4.0.0',
              '@types/react': '^19.0.0',
              '@types/react-dom': '^19.0.0',
              vite: '^6.0.0',
              typescript: '~5.7.0',
            },
          },
          null,
          2,
        ),
        'tsconfig.json': JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'ESNext',
              moduleResolution: 'bundler',
              jsx: 'react-jsx',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
        'vite.config.ts': [
          "import { defineConfig } from 'vite';",
          "import react from '@vitejs/plugin-react';",
          '',
          'export default defineConfig({',
          '  plugins: [react()],',
          '});',
        ].join('\n'),
        'index.html': [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '  <title>TradeCanvas — React</title>',
          `  <style>${BODY_CSS}</style>`,
          '</head>',
          '<body>',
          '  <div id="root"></div>',
          '  <script type="module" src="/src/main.tsx"></script>',
          '</body>',
          '</html>',
        ].join('\n'),
        'src/main.tsx': [
          "import { createRoot } from 'react-dom/client';",
          "import { App } from './App';",
          '',
          "createRoot(document.getElementById('root')!).render(<App />);",
        ].join('\n'),
        'src/App.tsx': [
          "import { TradingChart } from './TradingChart';",
          '',
          'export function App() {',
          '  return <TradingChart />;',
          '}',
        ].join('\n'),
        'src/TradingChart.tsx': [
          "import { useRef, useEffect } from 'react';",
          "import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart';",
          '',
          'export function TradingChart() {',
          '  const containerRef = useRef<HTMLDivElement>(null);',
          '',
          '  useEffect(() => {',
          '    if (!containerRef.current) return;',
          '',
          '    const chart = new Chart(containerRef.current, {',
          "      chartType: 'candlestick',",
          '      theme: DARK_THEME,',
          '      autoScale: true,',
          '      features: { drawings: true, indicators: true, volume: true },',
          '    });',
          '',
          '    const adapter = new BinanceAdapter();',
          "    chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m' });",
          "    chart.addIndicator('sma', { period: 20 });",
          '',
          '    return () => chart.destroy();',
          '  }, []);',
          '',
          '  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;',
          '}',
        ].join('\n'),
      },
    },
    { openFile: 'src/TradingChart.tsx', newWindow: true },
  );
}

// ---------------------------------------------------------------------------
// Svelte
// ---------------------------------------------------------------------------

export function openSvelteSandbox(): void {
  sdk.openProject(
    {
      title: 'TradeCanvas — Svelte',
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: 'tc-sandbox-svelte',
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: { '@tradecanvas/chart': CHART_VERSION },
            devDependencies: {
              svelte: '^5.0.0',
              '@sveltejs/vite-plugin-svelte': '^5.0.0',
              vite: '^6.0.0',
              typescript: '~5.7.0',
            },
          },
          null,
          2,
        ),
        'svelte.config.js': [
          "import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';",
          '',
          'export default {',
          '  preprocess: vitePreprocess(),',
          '};',
        ].join('\n'),
        'tsconfig.json': JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
        'vite.config.ts': [
          "import { defineConfig } from 'vite';",
          "import { svelte } from '@sveltejs/vite-plugin-svelte';",
          '',
          'export default defineConfig({',
          '  plugins: [svelte()],',
          '});',
        ].join('\n'),
        'index.html': [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '  <title>TradeCanvas — Svelte</title>',
          `  <style>${BODY_CSS}</style>`,
          '</head>',
          '<body>',
          '  <div id="app"></div>',
          '  <script type="module" src="/src/main.ts"></script>',
          '</body>',
          '</html>',
        ].join('\n'),
        'src/main.ts': [
          "import { mount } from 'svelte';",
          "import App from './App.svelte';",
          '',
          "mount(App, { target: document.getElementById('app')! });",
        ].join('\n'),
        'src/App.svelte': [
          '<script lang="ts">',
          "  import TradingChart from './TradingChart.svelte';",
          '</script>',
          '',
          '<TradingChart />',
        ].join('\n'),
        'src/TradingChart.svelte': [
          '<script lang="ts">',
          "  import { onMount, onDestroy } from 'svelte';",
          "  import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart';",
          '',
          '  let container: HTMLDivElement;',
          '  let chart: Chart | null = null;',
          '',
          '  onMount(() => {',
          '    chart = new Chart(container, {',
          "      chartType: 'candlestick',",
          '      theme: DARK_THEME,',
          '      autoScale: true,',
          '      features: { drawings: true, indicators: true, volume: true },',
          '    });',
          '',
          '    const adapter = new BinanceAdapter();',
          "    chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m' });",
          "    chart.addIndicator('sma', { period: 20 });",
          '  });',
          '',
          '  onDestroy(() => chart?.destroy());',
          '</script>',
          '',
          '<div bind:this={container} style="width: 100%; height: 100vh" />',
        ].join('\n'),
      },
    },
    { openFile: 'src/TradingChart.svelte', newWindow: true },
  );
}

// ---------------------------------------------------------------------------
// Vue
// ---------------------------------------------------------------------------

export function openVueSandbox(): void {
  sdk.openProject(
    {
      title: 'TradeCanvas — Vue',
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: 'tc-sandbox-vue',
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: {
              vue: '^3.5.0',
              '@tradecanvas/chart': CHART_VERSION,
            },
            devDependencies: {
              '@vitejs/plugin-vue': '^5.0.0',
              vite: '^6.0.0',
              typescript: '~5.7.0',
            },
          },
          null,
          2,
        ),
        'tsconfig.json': JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
        'vite.config.ts': [
          "import { defineConfig } from 'vite';",
          "import vue from '@vitejs/plugin-vue';",
          '',
          'export default defineConfig({',
          '  plugins: [vue()],',
          '});',
        ].join('\n'),
        'index.html': [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '  <title>TradeCanvas — Vue</title>',
          `  <style>${BODY_CSS}</style>`,
          '</head>',
          '<body>',
          '  <div id="app"></div>',
          '  <script type="module" src="/src/main.ts"></script>',
          '</body>',
          '</html>',
        ].join('\n'),
        'src/main.ts': [
          "import { createApp } from 'vue';",
          "import App from './App.vue';",
          '',
          "createApp(App).mount('#app');",
        ].join('\n'),
        'src/App.vue': [
          '<template>',
          '  <TradingChart />',
          '</template>',
          '',
          '<script setup lang="ts">',
          "import TradingChart from './TradingChart.vue';",
          '</script>',
        ].join('\n'),
        'src/TradingChart.vue': [
          '<template>',
          '  <div ref="chartContainer" style="width: 100%; height: 100vh" />',
          '</template>',
          '',
          '<script setup lang="ts">',
          "import { ref, onMounted, onUnmounted } from 'vue';",
          "import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart';",
          '',
          'const chartContainer = ref<HTMLDivElement>();',
          'let chart: Chart | null = null;',
          '',
          'onMounted(() => {',
          '  if (!chartContainer.value) return;',
          '',
          '  chart = new Chart(chartContainer.value, {',
          "    chartType: 'candlestick',",
          '    theme: DARK_THEME,',
          '    autoScale: true,',
          '    features: { drawings: true, indicators: true, volume: true },',
          '  });',
          '',
          '  const adapter = new BinanceAdapter();',
          "  chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m' });",
          "  chart.addIndicator('sma', { period: 20 });",
          '});',
          '',
          'onUnmounted(() => chart?.destroy());',
          '</script>',
        ].join('\n'),
      },
    },
    { openFile: 'src/TradingChart.vue', newWindow: true },
  );
}

// ---------------------------------------------------------------------------
// Widget (ChartWidget)
// ---------------------------------------------------------------------------

export function openWidgetSandbox(): void {
  sdk.openProject(
    {
      title: 'TradeCanvas — ChartWidget',
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: 'tc-sandbox-widget',
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: { '@tradecanvas/chart': CHART_VERSION },
            devDependencies: { vite: '^6.0.0', typescript: '~5.7.0' },
          },
          null,
          2,
        ),
        'tsconfig.json': BASIC_TSCONFIG,
        'index.html': [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '  <title>TradeCanvas — ChartWidget</title>',
          `  <style>${BODY_CSS} #chart { width: 100%; height: 100vh; }</style>`,
          '</head>',
          '<body>',
          '  <div id="chart"></div>',
          '  <script type="module" src="/src/main.ts"></script>',
          '</body>',
          '</html>',
        ].join('\n'),
        'src/main.ts': [
          "import { ChartWidget } from '@tradecanvas/chart/widget';",
          "import { BinanceAdapter } from '@tradecanvas/chart';",
          '',
          "const container = document.getElementById('chart')!;",
          '',
          'const widget = new ChartWidget(container, {',
          "  symbol: 'BTCUSDT',",
          "  timeframe: '5m',",
          '  adapter: new BinanceAdapter(),',
          "  theme: 'dark',",
          '  onReady: (chart) => {',
          "    chart.addIndicator('sma', { period: 20 });",
          '  },',
          '});',
        ].join('\n'),
      },
    },
    { openFile: 'src/main.ts', newWindow: true },
  );
}

// ---------------------------------------------------------------------------
// Finance Charts — Waterfall + Gauge (combined)
// ---------------------------------------------------------------------------

export function openFinanceChartsSandbox(): void {
  sdk.openProject(
    {
      title: 'TradeCanvas — Finance Charts (Waterfall + Gauge)',
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: 'tc-sandbox-finance',
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: { '@tradecanvas/chart': CHART_VERSION },
            devDependencies: { vite: '^6.0.0', typescript: '~5.7.0' },
          },
          null,
          2,
        ),
        'tsconfig.json': BASIC_TSCONFIG,
        'index.html': [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8" />',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '  <title>TradeCanvas — Finance Charts</title>',
          `  <style>${BODY_CSS} .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }`,
          `    .card { background: #1e222d; border-radius: 8px; overflow: hidden; }`,
          `    .card-label { padding: 10px 16px; font: 600 11px sans-serif; color: #787b86; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #2a2e39; }`,
          `    .chart { height: 320px; width: 100%; }</style>`,
          '</head>',
          '<body>',
          '  <div class="grid">',
          '    <div class="card"><div class="card-label">P&L Attribution</div><div id="waterfall" class="chart"></div></div>',
          '    <div class="card"><div class="card-label">Fear & Greed</div><div id="gauge" class="chart"></div></div>',
          '  </div>',
          '  <script type="module" src="/src/main.ts"></script>',
          '</body>',
          '</html>',
        ].join('\n'),
        'src/main.ts': [
          "import { WaterfallChart, GaugeChart } from '@tradecanvas/chart';",
          "import type { WaterfallBar } from '@tradecanvas/chart';",
          '',
          '// P&L Attribution Waterfall',
          'const waterfallData: WaterfallBar[] = [',
          "  { label: 'Start', value: 10000, type: 'total' },",
          "  { label: 'BTC Long', value: 1850 },",
          "  { label: 'ETH Short', value: -620 },",
          "  { label: 'SOL Long', value: 420 },",
          "  { label: 'Fees', value: -85 },",
          "  { label: 'End', value: 11565, type: 'total' },",
          '];',
          '',
          "const waterfallEl = document.getElementById('waterfall')!;",
          'new WaterfallChart(waterfallEl, {',
          '  data: waterfallData,',
          '  showValues: true,',
          "  connectorStyle: 'dashed',",
          '  valueFormat: (v) => `$${v.toLocaleString()}`,',
          '  crosshair: true,',
          '});',
          '',
          '// Fear & Greed Gauge',
          "const gaugeEl = document.getElementById('gauge')!;",
          'const gauge = new GaugeChart(gaugeEl, {',
          '  value: 72,',
          '  min: 0,',
          '  max: 100,',
          "  label: 'Fear & Greed',",
          '  zones: [',
          "    { from: 0, to: 25, color: '#ef4444' },",
          "    { from: 25, to: 50, color: '#f59e0b' },",
          "    { from: 50, to: 75, color: '#eab308' },",
          "    { from: 75, to: 100, color: '#10b981' },",
          '  ],',
          '  animate: true,',
          '});',
          '',
          '// Animate the gauge value every 3 seconds',
          'setInterval(() => {',
          '  gauge.setValue(Math.round(30 + Math.random() * 60));',
          '}, 3000);',
        ].join('\n'),
      },
    },
    { openFile: 'src/main.ts', newWindow: true },
  );
}

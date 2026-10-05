import sdk from '@stackblitz/sdk';

// Caret ranges from the release the sandboxes' code needs: each installs the latest published 1.x.
const CHART_VERSION = '^1.12.0';
const WRAPPER_VERSION = '^1.0.15';
const VITE_VERSION = '^6.0.0';
const TS_VERSION = '~5.7.0';

const BODY_CSS = 'html, body { margin: 0; height: 100%; background: #0c1016; }';

const TSCONFIG = JSON.stringify(
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
);

function indexHtml(title: string, entry: string, body = '<div id="app"></div>', css = ''): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `  <title>${title}</title>`,
    `  <style>${BODY_CSS}${css}</style>`,
    '</head>',
    '<body>',
    `  ${body}`,
    `  <script type="module" src="${entry}"></script>`,
    '</body>',
    '</html>',
  ].join('\n');
}

interface ViteSandbox {
  slug: string;
  title: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  files: Record<string, string>;
  openFile: string;
}

/** Open a Vite project on StackBlitz: package.json + tsconfig + the given files. */
function openViteSandbox(box: ViteSandbox): void {
  sdk.openProject(
    {
      title: `TradeCanvas — ${box.title}`,
      template: 'node',
      files: {
        'package.json': JSON.stringify(
          {
            name: `tc-sandbox-${box.slug}`,
            private: true,
            type: 'module',
            scripts: { dev: 'vite' },
            dependencies: box.dependencies,
            devDependencies: { vite: VITE_VERSION, typescript: TS_VERSION, ...box.devDependencies },
          },
          null,
          2,
        ),
        'tsconfig.json': TSCONFIG,
        ...box.files,
      },
    },
    { openFile: box.openFile, newWindow: true },
  );
}

// ---------------------------------------------------------------------------
// Vanilla — the headless Chart
// ---------------------------------------------------------------------------

export function openVanillaSandbox(): void {
  openViteSandbox({
    slug: 'vanilla',
    title: 'Vanilla Chart',
    dependencies: { '@tradecanvas/chart': CHART_VERSION },
    openFile: 'src/main.ts',
    files: {
      'index.html': indexHtml('TradeCanvas — Vanilla', '/src/main.ts', '<div id="chart" style="height:100vh"></div>'),
      'src/main.ts': `import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {
  theme: DARK_THEME,
  features: { drawings: true, indicators: true, volume: true },
});

void chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '15m' });

chart.addIndicator('bb', { period: 20, stdDev: 2 });
chart.addIndicator('rsi');
chart.setShapes({ tagRadius: 4 }); // rounded price tags

// Let the user draw: try 'fibRetracement', 'infoLine', 'xabcdPattern', …
chart.setDrawingTool('trendLine');

chart.on('crosshairMove', (e) => {
  // e.payload.bar has the hovered OHLCV
});
chart.on('chartTypeChange', (e) => console.log('type', e.payload.type));

// Bars of 100 trades instead of 15 minutes:
// await chart.setTimeframe('100T');
`,
    },
  });
}

// ---------------------------------------------------------------------------
// ChartWidget — full UI in one call
// ---------------------------------------------------------------------------

export function openWidgetSandbox(): void {
  openViteSandbox({
    slug: 'widget',
    title: 'ChartWidget',
    dependencies: { '@tradecanvas/chart': CHART_VERSION },
    openFile: 'src/main.ts',
    files: {
      'index.html': indexHtml('TradeCanvas — ChartWidget', '/src/main.ts', '<div id="chart" style="height:100vh"></div>'),
      'src/main.ts': `import { ChartWidget } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'PEPEUSDT'],
  timeframe: '5m',
  adapter: new BinanceAdapter(),
  theme: 'dark',
  ui: 'studio', // the look: 'studio' · 'terminal' · 'capsule', or a theme of yours
  locale: 'en', // 'vi', 'ja', 'ar' (right to left)… with messages from '@tradecanvas/chart/widget/locales'
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
      { id: 'memes', name: 'Memes', symbols: ['PEPEUSDT', 'DOGEUSDT'] },
    ],
  },
  trading: true,
  onReady: (chart) => {
    chart.addIndicator('ema', { period: 21 });
    chart.addIndicator('macd');
  },
});

widget.toggleSymbolInfo(true); // price, market status, the day's numbers

// widget.setUI('capsule')     — pills and floating bars
// widget.setTimeframe('100T') — a bar per 100 trades
// widget.toggleReplay()       — bar replay with a scrubber
`,
    },
  });
}

// ---------------------------------------------------------------------------
// React — @tradecanvas/react
// ---------------------------------------------------------------------------

export function openReactSandbox(): void {
  openViteSandbox({
    slug: 'react',
    title: 'React',
    dependencies: {
      '@tradecanvas/chart': CHART_VERSION,
      '@tradecanvas/react': WRAPPER_VERSION,
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
    },
    openFile: 'src/App.tsx',
    files: {
      'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
`,
      'index.html': indexHtml('TradeCanvas — React', '/src/main.tsx'),
      'src/main.tsx': `import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('app')!).render(<App />);
`,
      'src/App.tsx': `import { useRef, useState } from 'react';
import { TradeCanvas, type TradeCanvasRef } from '@tradecanvas/react';
import type { TimeFrame } from '@tradecanvas/chart';

const TIMEFRAMES: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h'];

export function App() {
  const [timeframe, setTimeframe] = useState<TimeFrame>('15m');
  const ref = useRef<TradeCanvasRef>(null);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', gap: 6, padding: 8 }}>
        {TIMEFRAMES.map((tf) => (
          <button key={tf} onClick={() => setTimeframe(tf)} disabled={tf === timeframe}>{tf}</button>
        ))}
        <button onClick={() => ref.current?.getChart()?.setDrawingTool('fibRetracement')}>Fib</button>
      </nav>
      <div style={{ flex: 1 }}>
        <TradeCanvas ref={ref} symbol="BTCUSDT" timeframe={timeframe} indicators={['bb', 'rsi']} />
      </div>
    </div>
  );
}
`,
    },
  });
}

// ---------------------------------------------------------------------------
// Vue 3 — @tradecanvas/vue
// ---------------------------------------------------------------------------

export function openVueSandbox(): void {
  openViteSandbox({
    slug: 'vue',
    title: 'Vue 3',
    dependencies: {
      '@tradecanvas/chart': CHART_VERSION,
      '@tradecanvas/vue': WRAPPER_VERSION,
      vue: '^3.5.0',
    },
    devDependencies: { '@vitejs/plugin-vue': '^5.2.0' },
    openFile: 'src/App.vue',
    files: {
      'vite.config.ts': `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({ plugins: [vue()] });
`,
      'index.html': indexHtml('TradeCanvas — Vue', '/src/main.ts'),
      'src/main.ts': `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`,
      'src/env.d.ts': `declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}
`,
      'src/App.vue': `<script setup lang="ts">
import { ref } from 'vue';
import { TradeCanvas } from '@tradecanvas/vue';
import type { Chart, TimeFrame } from '@tradecanvas/chart';

const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h'];
const timeframe = ref<TimeFrame>('15m');
let chart: Chart | null = null;
</script>

<template>
  <div style="height: 100vh; display: flex; flex-direction: column">
    <nav style="display: flex; gap: 6px; padding: 8px">
      <button v-for="tf in timeframes" :key="tf" :disabled="tf === timeframe" @click="timeframe = tf">{{ tf }}</button>
      <button @click="chart?.setDrawingTool('fibRetracement')">Fib</button>
    </nav>
    <div style="flex: 1">
      <TradeCanvas symbol="BTCUSDT" :timeframe="timeframe" :indicators="['bb', 'rsi']" @ready="(c: Chart) => (chart = c)" />
    </div>
  </div>
</template>
`,
    },
  });
}

// ---------------------------------------------------------------------------
// Svelte 5 — @tradecanvas/svelte
// ---------------------------------------------------------------------------

export function openSvelteSandbox(): void {
  openViteSandbox({
    slug: 'svelte',
    title: 'Svelte 5',
    dependencies: {
      '@tradecanvas/chart': CHART_VERSION,
      '@tradecanvas/svelte': WRAPPER_VERSION,
      svelte: '^5.0.0',
    },
    devDependencies: { '@sveltejs/vite-plugin-svelte': '^5.0.0' },
    openFile: 'src/App.svelte',
    files: {
      'vite.config.ts': `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({ plugins: [svelte()] });
`,
      'index.html': indexHtml('TradeCanvas — Svelte', '/src/main.ts'),
      'src/main.ts': `import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
`,
      'src/App.svelte': `<script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte';
  import type { Chart, TimeFrame } from '@tradecanvas/chart';

  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h'];
  let timeframe = $state<TimeFrame>('15m');
  let chart = $state<Chart | null>(null);
</script>

<div style="height: 100vh; display: flex; flex-direction: column">
  <nav style="display: flex; gap: 6px; padding: 8px">
    {#each timeframes as tf}
      <button disabled={tf === timeframe} onclick={() => (timeframe = tf)}>{tf}</button>
    {/each}
    <button onclick={() => chart?.setDrawingTool('fibRetracement')}>Fib</button>
  </nav>
  <div style="flex: 1">
    <TradeCanvas symbol="BTCUSDT" {timeframe} indicators={['bb', 'rsi']} bind:chart />
  </div>
</div>
`,
    },
  });
}

// ---------------------------------------------------------------------------
// Finance charts — Waterfall + Gauge
// ---------------------------------------------------------------------------

export function openFinanceChartsSandbox(): void {
  openViteSandbox({
    slug: 'finance',
    title: 'Finance Charts',
    dependencies: { '@tradecanvas/chart': CHART_VERSION },
    openFile: 'src/main.ts',
    files: {
      'index.html': indexHtml(
        'TradeCanvas — Finance Charts',
        '/src/main.ts',
        '<div class="grid"><div class="card"><div class="card-label">P&amp;L Attribution</div><div id="waterfall" class="chart"></div></div><div class="card"><div class="card-label">Fear &amp; Greed</div><div id="gauge" class="chart"></div></div></div>',
        ' .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }'
          + ' .card { background: #161b23; border-radius: 8px; overflow: hidden; }'
          + ' .card-label { padding: 10px 16px; font: 600 11px sans-serif; color: #7d8696; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #1f2630; }'
          + ' .chart { height: 320px; width: 100%; }',
      ),
      'src/main.ts': `import { WaterfallChart, GaugeChart } from '@tradecanvas/chart';
import type { WaterfallBar } from '@tradecanvas/chart';

const waterfallData: WaterfallBar[] = [
  { label: 'Start', value: 10000, type: 'total' },
  { label: 'BTC Long', value: 1850 },
  { label: 'ETH Short', value: -620 },
  { label: 'SOL Long', value: 420 },
  { label: 'Fees', value: -85 },
  { label: 'End', value: 11565, type: 'total' },
];

new WaterfallChart(document.getElementById('waterfall')!, {
  data: waterfallData,
  showValues: true,
  connectorStyle: 'dashed',
  valueFormat: (v) => \`\${v < 0 ? '-' : ''}$\${Math.abs(v).toLocaleString()}\`,
  crosshair: true,
});

const gauge = new GaugeChart(document.getElementById('gauge')!, {
  value: 72,
  min: 0,
  max: 100,
  label: 'Fear & Greed',
  zones: [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 25, to: 45, color: '#f2a93b', label: 'Fear' },
    { from: 45, to: 55, color: '#8a93a3', label: 'Neutral' },
    { from: 55, to: 75, color: '#62c895', label: 'Greed' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ],
  animate: true,
});

setInterval(() => gauge.setValue(Math.round(30 + Math.random() * 60)), 3000);
`,
    },
  });
}

import{a as c,f as s}from"../chunks/D1Xo73DX.js";import"../chunks/BMDqXj-z.js";import{s as a,f,e as u,c as r,$ as y,r as d,n as T}from"../chunks/Bfa79lMJ.js";import{h as g}from"../chunks/DC6RaQJL.js";var C=s('<meta name="description" content="React, Vue, and Svelte wrapper packages for TradeCanvas with idiomatic props and refs."/>'),b=s(`<h1>Framework wrappers</h1> <p>Idiomatic wrappers for React, Vue, and Svelte. All three expose the same prop surface and forward a ref to the underlying <code>Chart</code> instance.</p> <h2>React</h2> <pre><code></code></pre> <h2>Vue</h2> <pre><code></code></pre> <h2>Svelte</h2> <pre><code></code></pre> <h2>Shared props</h2> <table><thead><tr><th>Prop</th><th>Type</th><th>Notes</th></tr></thead><tbody><tr><td><code>symbol</code></td><td><code>string</code></td><td>Required.</td></tr><tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr><tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr><tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>Live stream source.</td></tr><tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Initial bars to load.</td></tr><tr><td><code>trading</code></td><td><code>boolean</code></td><td>Enable trading overlay.</td></tr><tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Fires after the chart mounts.</td></tr></tbody></table> <blockquote>The wrapper packages are currently demo/docs-only and not published to npm.
  Their source lives in <code>packages/react</code>, <code>packages/vue</code>,
  and <code>packages/svelte</code> — copy them into your project for now.</blockquote>`,1);function B(p){var o=b();g("r1m12u",l=>{var v=C();u(()=>{y.title="Frameworks — TradeCanvas docs"}),c(l,v)});var e=a(f(o),6),m=r(e);m.textContent=`import { TradeCanvas, type TradeCanvasHandle } from '@tradecanvas/react'
import { BinanceAdapter } from '@tradecanvas/chart'
import { useRef } from 'react'

function App() {
  const chartRef = useRef<TradeCanvasHandle>(null)

  return (
    <TradeCanvas
      ref={chartRef}
      symbol="BTCUSDT"
      timeframe="5m"
      theme="dark"
      adapter={new BinanceAdapter()}
      onReady={(chart) => {
        chart.on('orderPlace', e => console.log(e.payload))
      }}
    />
  )
}`,d(e);var t=a(e,4),i=r(t);i.textContent=`<script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
import { BinanceAdapter } from '@tradecanvas/chart'

const adapter = new BinanceAdapter()
<\/script>

<template>
  <TradeCanvas
    symbol="BTCUSDT"
    timeframe="5m"
    theme="dark"
    :adapter="adapter"
    @ready="(chart) => console.log('ready', chart)"
  />
</template>`,d(t);var n=a(t,4),h=r(n);h.textContent=`<script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import { BinanceAdapter } from '@tradecanvas/chart'

  const adapter = new BinanceAdapter()
<\/script>

<TradeCanvas
  symbol="BTCUSDT"
  timeframe="5m"
  theme="dark"
  {adapter}
  onReady={(chart) => console.log('ready', chart)}
/>`,d(n),T(6),c(p,o)}export{B as component};

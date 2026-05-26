import{a as u,f as g}from"../chunks/D1Xo73DX.js";import"../chunks/BMDqXj-z.js";import{s as a,f as B,t as U,e as W,c as e,$ as D,r,n as t}from"../chunks/Bfa79lMJ.js";import{h as S}from"../chunks/DC6RaQJL.js";import{s as n}from"../chunks/DoGDV8-e.js";import{b as o}from"../chunks/DS2J6IQa.js";var F=g('<meta name="description" content="Install TradeCanvas and render your first canvas trading chart in under a minute."/>'),G=g(`<h1>Getting started</h1> <p>Install TradeCanvas and render a chart in under a minute.</p> <h2>Installation</h2> <p>Use whichever package manager you prefer:</p> <pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre> <h2>Drop-in widget</h2> <p><code>ChartWidget</code> is the fastest path to a working chart. It renders a full
  TradingView-like UI inside any host element — toolbar, drawing sidebar, settings
  dialog, status bar — with zero framework dependency.</p> <pre><code></code></pre> <h2>Headless Chart</h2> <p>For full control over the surrounding UI, use the lower-level <code>Chart</code> class directly. You bring your own toolbar; you keep all features:</p> <pre><code></code></pre> <h2>Framework wrappers</h2> <p>React, Vue, and Svelte wrappers are available in the <a>frameworks</a> section.</p> <h2>Next steps</h2> <ul><li><a>API reference</a> — full surface of <code>Chart</code> and <code>ChartWidget</code></li> <li><a>Chart types</a> — 17 built-in chart types</li> <li><a>Indicators</a> — catalog of 33 indicators</li> <li><a>Realtime &amp; replay</a> — streaming adapters and replay mode</li> <li><a>Analytics</a> — strategy backtester and risk metrics</li></ul>`,1);function N(y){var m=G();S("di86c5",x=>{var A=F();W(()=>{D.title="Getting Started — TradeCanvas docs"}),u(x,A)});var i=a(B(m),14),w=e(i);w.textContent=`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
})`,r(i);var s=a(i,6),_=e(s);_.textContent=`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`,r(s);var d=a(s,4),C=a(e(d));t(),r(d);var f=a(d,4),c=e(f),b=e(c);t(4),r(c);var l=a(c,2),k=e(l);t(),r(l);var h=a(l,2),I=e(h);t(),r(h);var p=a(h,2),$=e(p);t(),r(p);var v=a(p,2),T=e(v);t(),r(v),r(f),U(()=>{n(C,"href",`${o??""}/docs/frameworks`),n(b,"href",`${o??""}/docs/api`),n(k,"href",`${o??""}/docs/chart-types`),n(I,"href",`${o??""}/docs/indicators`),n($,"href",`${o??""}/docs/realtime`),n(T,"href",`${o??""}/docs/analytics`)}),u(y,m)}export{N as component};

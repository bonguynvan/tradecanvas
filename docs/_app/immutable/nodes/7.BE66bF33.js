import{a as l,f as v}from"../chunks/DOUrfpK2.js";import"../chunks/COi7oFzy.js";import{s as t,C as x,t as B,D as _,c as e,$ as A,r as a,F as c}from"../chunks/BntjNYH4.js";import{h as I}from"../chunks/chjofuKx.js";import{s as M}from"../chunks/3lYKNLhY.js";import{b as P}from"../chunks/DE6mlWRc.js";var D=v('<meta name="description" content="API reference for Chart, ChartWidget, ChartGrid and the core TradeCanvas surface."/>'),S=v("<h1>API reference</h1> <p>Public surface of the three top-level classes: <code>Chart</code>, <code>ChartWidget</code>, and <code>ChartGrid</code>.</p> <h2>Chart</h2> <p>Headless renderer. Bring your own UI; subscribe to events; mutate state imperatively.</p> <h3>Construction</h3> <pre><code></code></pre> <h3>Data</h3> <table><thead><tr><th>Method</th><th>Purpose</th></tr></thead><tbody><tr><td><code>setData(data)</code></td><td>Replace the entire series.</td></tr><tr><td><code>appendBar(bar)</code></td><td>Append a new bar; auto-scroll if enabled.</td></tr><tr><td><code>appendBars(bars)</code></td><td>Batch append; recalculates indicators once.</td></tr><tr><td><code>updateLastBar(bar)</code></td><td>Mutate the current forming bar.</td></tr><tr><td><code>updateLastBarFromTick(tick)</code></td><td>Merge a tick into the last bar.</td></tr><tr><td><code>getData()</code></td><td>Read the raw OHLC series.</td></tr></tbody></table> <h3>Chart type &amp; theme</h3> <table><thead><tr><th>Method</th><th>Purpose</th></tr></thead><tbody><tr><td><code>setChartType(type)</code></td><td>One of 17 types — see <a>Chart types</a>.</td></tr><tr><td><code>setTheme(name)</code></td><td>Switch between built-in themes.</td></tr><tr><td><code>setTimeframe(tf)</code></td><td>Switch active timeframe; rewires the live stream.</td></tr></tbody></table> <h3>Indicators</h3> <table><thead><tr><th>Method</th><th>Purpose</th></tr></thead><tbody><tr><td><code>addIndicator(id, params?, position?)</code></td><td>Adds an overlay or panel indicator. Returns instance id.</td></tr><tr><td><code>updateIndicator(instanceId, params)</code></td><td>Mutate a live indicator.</td></tr><tr><td><code>removeIndicator(instanceId)</code></td><td>Remove and tear down.</td></tr></tbody></table> <h3>Events</h3> <p>All events are typed via <code>ChartEventMap</code>:</p> <pre><code></code></pre> <h2>ChartWidget</h2> <p>Wraps <code>Chart</code> in a complete UI. Same instance is available via <code>widget.chart</code>.</p> <pre><code></code></pre> <h2>ChartGrid</h2> <p>Synchronized multi-chart layouts.</p> <pre><code></code></pre> <p>Layouts: <code>'1x2'</code>, <code>'2x2'</code>, <code>'2x3'</code>, <code>'3x3'</code>.</p>",1);function G(f){var i=S();I("1c8t0id",w=>{var T=D();_(()=>{A.title="API Reference — TradeCanvas docs"}),l(w,T)});var r=t(x(i),10),b=e(r);b.textContent="new Chart(host: HTMLElement, options?: ChartOptions)",a(r);var d=t(r,8),h=t(e(d)),s=e(h),p=t(e(s)),u=t(e(p));c(),a(p),a(s),c(2),a(h),a(d);var o=t(d,10),C=e(o);C.textContent=`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { length } */)`,a(o);var n=t(o,6),y=e(n);y.textContent=`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { drawings: true, indicators: true },
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`,a(n);var m=t(n,6),g=e(m);g.textContent=`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
await grid.connectAll(new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`,a(m),c(2),B(()=>M(u,"href",`${P??""}/docs/chart-types`)),l(f,i)}export{G as component};

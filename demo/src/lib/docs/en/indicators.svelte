<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => Object.values(i.inputs).some((x) => x.kind === 'source');
</script>

<svelte:head>
  <title>Indicators — TradeCanvas docs</title>
  <meta name="description" content="{catalog.length} built-in technical indicators: moving averages, bands, oscillators, volume and volatility, with sources, indicators on indicators and editable levels." />
</svelte:head>

<h1>Indicators</h1>
<p>
  {catalog.length} built-in indicators. Add one by its id; parameters you leave out take
  their defaults, and invalid ones fall back to them.
</p>

<h2>Adding an indicator</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> returns an instance id: the same indicator can be added several
  times, each instance with its own inputs, colours and levels.
</p>

<p>
  In TypeScript the built-in ids and their inputs are typed: <code>BuiltInIndicators</code> lists each indicator
  with its inputs, their defaults, and the keys of its lines, so an editor offers them as you type and a misspelt
  input fails the type check. An indicator a plugin registers takes any id and inputs.
</p>

<h2>Sources and indicators on indicators</h2>
<p>
  Indicators marked <em>source</em> below can run on another price than the close
  (<code>open</code>, <code>high</code>, <code>low</code>, <code>hl2</code>, <code>hlc3</code>,
  <code>ohlc4</code>, <code>hlcc4</code>) or on another indicator's line. A moving average of RSI
  is drawn in RSI's pane, on its scale, and goes when RSI does.
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  Pane indicators can also share a pane:
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>.
</p>

<h2>Levels, colours and values</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  The legend shows each line's latest value. To tag it on the axis as well, in the line's colour, turn on
  <code>features.indicatorValueLabels: true</code> or <code>setIndicatorValueLabelsVisible(true)</code> (off by default).
  A pane's lines, levels, axis and crosshair share one scale.
</p>

<h2>On some intervals only</h2>
<p>
  An indicator can be kept to some intervals: a 200-day average on the daily chart and
  up, a fast oscillator on the minute charts only. Each kind of interval (ticks, seconds,
  minutes, hours, days, weeks, months) is left on, switched off, or given a range of
  counts; a kind left out shows it on all. The chart reads the rules against the interval
  of the stream it is connected to, as the interval changes; for bars given with <code>setData</code>,
  <code>chart.setDataTimeframe('1h')</code> tells it theirs (ChartWidget does this itself); with neither
  it shows the indicator. The rules are saved with the layout and undone like any other edit.
</p>
<pre><code>{`chart.setIndicatorIntervals(ema, { seconds: false, minutes: false, hours: [1, 4] })
chart.getIndicatorIntervals(ema)    // { seconds: false, minutes: false, hours: [1, 4] }
chart.setIndicatorIntervals(ema, null)  // all of them again`}</code></pre>
<p>
  <code>getActiveIndicators()</code> says of each whether it is <code>visible</code> (switched on) and
  <code>shown</code> (drawn on this interval). In ChartWidget, its legend row greys out while it isn't.
</p>

<h2>In ChartWidget</h2>
<p>
  The toolbar's <strong>Indicators</strong> opens a dialog. Type to search every indicator by its
  name or short name (<kbd>Enter</kbd> adds the best match); or pick a group down the side:
  <strong>Favourites</strong>, <strong>Templates</strong>, <strong>All</strong>, then each kind
  (moving averages, trend, oscillators, volatility, volume, bands and channels, price and
  patterns). A row adds its indicator and the dialog stays open for the next; a count shows how
  many are on the chart, and the star beside it keeps it in the favourites. On a phone the groups
  are a row of chips over the list.
</p>
<p>
  An indicator's settings (its legend row's name, or its gear) have three tabs:
  <strong>Inputs</strong>; <strong>Style</strong>, a row per line (shown or not, its colours, its
  dash), the line width, an overlay's price scale and the levels; and <strong>Visibility</strong>,
  the intervals it shows on. Every edit shows at once. <strong>Cancel</strong> or <kbd>Esc</kbd>
  puts it all back, <strong>OK</strong> keeps it. <strong>Defaults</strong> resets it, or saves it as
  the default: new indicators of its kind then start with these inputs and this look, in this
  browser.
</p>

<h2>On the price pane ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>Name</th><th>Default params</th><th>Lines</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· source</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> plots a moving average from a higher timeframe on the current chart — the
  daily 50-MA on 1h bars, say. It averages only <em>completed</em> higher-timeframe closes, so it
  steps at each boundary and never repaints.
</p>

<p>
  <code>vwap</code> starts again at its <code>anchor</code>: <code>'session'</code>, the default, each trading
  day, from midnight in the exchange's time zone (the symbol's <code>timeZone</code>, else the market's, else
  UTC); <code>'week'</code> each Monday; <code>'month'</code> on the 1st; <code>'all'</code> never: it averages
  every bar loaded, so it moves when older bars are paged in. On daily bars the session VWAP is each bar's
  typical price: choose <code>'week'</code> or <code>'month'</code> there. <code>svwap</code> is the session VWAP
  with σ bands, and <code>avwap</code> starts at the bar you anchor it to. <code>svwap</code>, <code>mtfma</code>,
  the prior-day lines and the market profile's sessions count their days in the same zone.
  <code>mtfma</code>'s 2h to 12h frames start at the exchange's midnight too, while a feed's own 4h candles
  stay on UTC's grid, and on daily bars <code>svwap</code> gives its line alone, without bands. In ChartWidget a VWAP at another anchor is named by it ('VWAP Week') in the legend, the chips and the Objects panel, and the anchor and its choices read in the widget's language; the CSV column stays <code>VWAP</code>.
</p>
<pre><code>{`chart.addIndicator('vwap')                      // starts again each trading day
chart.addIndicator('vwap', { anchor: 'week' })  // each Monday: for daily bars
chart.addIndicator('vwap', { anchor: 'all' })   // every bar loaded, as it was before`}</code></pre>

<p>
  <code>volumeProfile</code> draws one row per price band from the left edge of the plot; each row's length
  follows the volume traded in that band. The rows are see-through, so the legend over them and the candles
  under them stay readable; give the indicator a lower <code>opacity</code> with <code>updateIndicatorStyle</code>
  to fade it further.
</p>

<h2>In a pane of their own ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>Name</th><th>Default params</th><th>Lines</th><th>Levels</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· source</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code> (Volume Delta) is what the buyers took of each bar less what the sellers did.
  A bar that says who took its trades (its <code>buyVolume</code>) gives its true delta. One that
  does not is read from the way it closed: all its volume up when it closed at or over its open,
  down otherwise, which is the nearest an OHLCV bar comes. <code>mode: 0</code> is the per-bar
  histogram, <code>mode: 1</code> the cumulative delta, which starts again with each
  <code>anchor</code> period (<code>'session'</code>, <code>'week'</code> or <code>'month'</code>;
  never with <code>'all'</code>, the default).
</p>

<h2>Indicators from Asian price boards</h2>
<p>
  Indicators that traders in Korea, Japan and Vietnam expect on their price boards: the Psychological Line (<code>psy</code>) and the New Psychological Line (<code>newpsy</code>), Volume Ratio (<code>vr</code>), AB Ratio (<code>abratio</code>), <code>sonar</code>, <code>sigma</code>, Binary Wave (<code>binarywave</code>), Trade Value (<code>tradevalue</code>) with Volume Change (<code>volchange</code>), the DeMark projected range (<code>demark</code>) and a moving-average <code>rainbow</code> of up to 20 lines. Trade Value is an estimate, close × volume per bar; the exchange's own figure comes from its feed.
</p>
<pre><code>{`chart.addIndicator('psy', { period: 10 }, 'bottom')              // share of up closes; 25 and 75 marked
chart.addIndicator('vr', { period: 20 }, 'bottom')                // volume of up days against down days
chart.addIndicator('tradevalue', {}, 'bottom')                    // close × volume, each bar
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 }) // ten averages, 10 to 100 bars`}</code></pre>

<h2>Candlestick patterns</h2>
<p>
  64 patterns from one to five bars: dojis, hammers and shooting stars, marubozu and belt holds; engulfing bars, harami, piercing lines and dark clouds, tweezers, kicking; morning and evening stars, abandoned babies, three soldiers and crows, three inside and outside, tasuki gaps; three-line strikes, three methods, mat holds, breakaways and ladder bottoms. A reversal counts only after the trend it reverses (the close before it past both its 10-bar average and the close 10 bars back, <code>trendPeriod</code>), and a body is long or short against the average body of the bars before. The indicator draws an arrow under a bullish pattern and over a bearish one, with its short name once the bars are wide enough; a bar that ends several shows the longest. <code>reversal</code>, <code>continuation</code> and <code>indecision</code> (1 or 0) choose the kinds.
</p>
<pre><code>{`chart.addIndicator('candlepatterns')                  // an arrow and the name on each bar that ends one
chart.addIndicator('candlepatterns', { indecision: 1 }) // dojis and spinning tops too

import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/chart'

const found = detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer'] })
// [{ index, time, pattern: { id, name, short, direction, kind, bars } }]
CANDLE_PATTERNS.length                                 // 64`}</code></pre>
<p>
  A page that finds patterns and draws no chart (a scanner, a screener) imports the two from
  <code>@tradecanvas/core/patterns</code>: the detector alone, about 4 kB gzipped, in a chunk of its
  own, so the page does not load the chart's engine even when other pages of the app do. List
  <code>@tradecanvas/core</code> in the app's dependencies to import it.
</p>
<pre><code>{`import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/core/patterns'`}</code></pre>

<h2 id="fair-value-gaps">Fair value gaps</h2>
<p>
  Three bars leave a fair value gap where the third bar's low is over the first bar's high (or, going down, its high under the first bar's low): between the two, only the middle bar traded. The chart draws a box over those prices, from the middle bar to the right edge while the gap is open, teal for a gap going up and pink for a gap going down (the colours of the candlestick patterns' marks, kept apart from the candles' green and red; the indicator's style changes them). A gap is filled by the first later bar that trades through all of it, and is then taken off the chart unless <code>showFilled</code> is 1. <code>detectFairValueGaps</code> gives them all with no chart, with the bar that filled each.
</p>
<pre><code>{`chart.addIndicator('fvg')                              // a box over each gap still open
chart.addIndicator('fvg', { minPercent: 0.1 })         // leave out gaps under 0.1% of the price
chart.addIndicator('fvg', { showFilled: 1 })           // keep the filled ones, fainter, to the bar that filled them

import { detectFairValueGaps } from '@tradecanvas/chart'

detectFairValueGaps(bars, { minPercent: 0.1 })
// [{ index, formed, direction: 'up' | 'down', top, bottom, filledAt }]`}</code></pre>

<h2 id="divergences">Divergences</h2>
<p>
  A divergence is the price and an oscillator turning twice and not the same way. Bullish, at two lows: the price makes a lower low and the oscillator a higher one. Bearish, at two highs: the price makes a higher high and the oscillator a lower one. <code>rsidiv</code> is the RSI with a line between its two turns at each divergence and a mark at the second; <code>hidden: 1</code> adds the hidden ones (the price holds, the RSI does not), dashed. A turn stands out from <code>left</code> bars before it and <code>right</code> bars after, so a divergence is known <code>right</code> bars late and, once the bar that confirms it has closed, does not change (on that bar, still forming, it can come and go); the two turns are <code>minBars</code> to <code>maxBars</code> apart. <code>detectDivergences(bars, line, options)</code> reads any line with one value a bar (null where it has none) and needs no chart.
</p>
<pre><code>{`chart.addIndicator('rsidiv', {}, 'bottom')                    // the RSI, its divergences marked
chart.addIndicator('rsidiv', { hidden: 1 }, 'bottom')         // the hidden ones too, dashed
chart.addIndicator('rsidiv', { left: 3, right: 3 }, 'bottom') // nearer turns: known 3 bars late, and more of them

import { detectDivergences } from '@tradecanvas/chart'

detectDivergences(bars, macdHistogram, { left: 5, right: 5, minBars: 5, maxBars: 60, hidden: true })
// [{ kind: 'bullish' | 'bearish', hidden, from, to, confirmed, valueFrom, valueTo, priceFrom, priceTo }]`}</code></pre>

<h2 id="session-volume-profile">Session volume profile</h2>
<p>
  <code>svp</code> draws each trading day's volume by price: the day's range split into <code>rows</code>, each bar's volume shared by the rows its range covers, drawn as rows growing right from the day's first bar. Over them, the day's point of control (the busiest row) and its value area (the rows around it holding <code>valueArea</code> percent of the day's volume, 70 by default, taken on two rows at a time from the heavier side, as Market Profile counts it) are lines across the day. A day starts at midnight on the exchange's clock (<code>setExchangeTimeZone</code>), as Session VWAP's does. Each bar's <code>poc</code>, <code>vah</code> and <code>val</code> are its whole day's, the bars after it included: on a past day a morning bar carries the day's closing profile, and on the day still trading they move as it trades. They are for reading a day, not for signals or a backtest at that bar. <code>volumeProfile</code> is one profile of every bar loaded; <code>sessionVolumeProfiles</code> gives the days' rows with no chart.
</p>
<pre><code>{`chart.addIndicator('svp')                           // a profile a day, with its POC and value area
chart.addIndicator('svp', { rows: 40, valueArea: 68 }) // finer rows, a narrower value area

import { sessionVolumeProfiles } from '@tradecanvas/chart'

sessionVolumeProfiles(bars, { rows: 24, valueArea: 70, timeZone: 'America/New_York' })
// [{ start, end, time, low, high, rowHeight, volumes, total, poc, valueAreaLow, valueAreaHigh, valueAreaRows }]`}</code></pre>

<h2 id="order-blocks">Order blocks</h2>
<p>
  A swing high is a bar higher than the <code>length</code> bars before it and no lower than the <code>length</code> after (5), so it is known <code>length</code> bars late; a swing low the same way down. When a close goes over the latest swing high not yet broken, the lowest bar between the swing and that close is a bullish order block, its high to its low; a close under the latest swing low makes the highest bar between a bearish one. A swing makes one block. <code>orderblocks</code> draws each as a box, in the colours of fair value gaps, to the right edge while it stands; a close through it (under a bullish block, over a bearish one) breaks it and takes it off, unless <code>showBroken</code> is 1. <code>detectOrderBlocks</code> gives them all with no chart, with the bar that broke each.
</p>
<pre><code>{`chart.addIndicator('orderblocks')                    // the blocks standing
chart.addIndicator('orderblocks', { length: 3 })       // shorter swings: more blocks, known sooner
chart.addIndicator('orderblocks', { showBroken: 1 })   // the broken ones too, fainter, to the bar that broke them

import { detectOrderBlocks } from '@tradecanvas/chart'

detectOrderBlocks(bars, { length: 5 })
// [{ kind: 'bullish' | 'bearish', index, formed, top, bottom, swing, brokenAt }]`}</code></pre>

<h2>Your own indicator</h2>
<p>
  The short way is <code>defineIndicator</code>: its inputs, and one function that returns its lines from the
  bars, with <code>ta</code> for the sums (<code>ta.ema</code>, <code>ta.rsi</code>, <code>ta.crossover</code>…).
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

chart.registerIndicator(defineIndicator({
  id: 'smoothRsi',
  name: 'Smoothed RSI',
  inputs: { period: { default: 14, kind: 'int', min: 2 }, smooth: { default: 5, kind: 'int', min: 1 } },
  scale: { min: 0, max: 100 },
  levels: [30, 70],
  calculate: ({ bars, inputs, ta }) => ({ value: ta.ema(ta.rsi(bars.close, inputs.period), inputs.smooth) }),
}))
chart.addIndicator('smoothRsi')`}</code></pre>
<p>
  For an indicator that keeps up with ticks on a long history, or draws something of its own, extend
  <code>IndicatorBase</code> and declare what it draws (<code>plots</code>), its pane scale,
  levels and inputs; the chart draws it, scales its pane, tags its values and lists it in the
  widget's legend and settings without rendering code of yours. Its <code>category</code>
  (<code>'oscillators'</code>, <code>'volume'</code>…) puts it in that group of the Indicators dialog;
  without one it is under Other. A group of your own, <code>{`{ id: 'my-app', label: 'My App' }`}</code>,
  lists your app's indicators together under its name, before the built-in kinds. See the
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">custom indicator recipe</a>.
  An indicator that groups bars by day, week or month reads the exchange's zone as
  <code>config.exchangeTimeZone</code> (set by the chart; unset: UTC). A new zone computes again only
  the indicators that read it and those that read their lines: one of yours that doesn't can say
  <code>readsExchangeTimeZone: false</code> in its descriptor, and is left as it is.
</p>
<p>
  Each input's <code>kind</code> (<code>'int'</code>, <code>'number'</code>, <code>'boolean'</code>,
  <code>'choice'</code>, <code>'source'</code>, <code>'color'</code>, <code>'text'</code>) and its
  <code>min</code>, <code>max</code> and <code>step</code> decide its field in the settings: an
  <code>'int'</code> is rounded as it is typed, as a period is read. Without a kind it is read from the
  default (a number is a <code>'number'</code>: only a declared <code>'int'</code> is rounded). <code>describeInputs(descriptor)</code> lists the
  inputs as the settings dialog, these docs and the MCP server read them.
</p>
<pre><code>{`inputs: {
  period: { kind: 'int', min: 2, max: 500 },
  mult: { kind: 'number', min: 0.1, step: 0.1 },
  source: { source: true },
  type: { kind: 'choice', options: [{ value: 'ema', label: 'Exponential' }, { value: 'sma', label: 'Simple' }] },
}`}</code></pre>
<p>
  A choice's <code>options</code> are values, or values with the label the settings show for them
  (<code>{'{ value, label }'}</code>), in your app's language; the indicator is given the value.
</p>
<p>
  The descriptor also says how its plots look, and the chart draws them so: <code>fills</code> shade between two
  plots where both have a value, under the lines; a plot's <code>width</code> keeps it at that width whatever the
  indicator's (a thin middle line); <code>lineStyle</code> dashes it until its style says otherwise, and the
  settings show and restore that dash; <code>opacity</code> sets it back; <code>breakOn</code> names a field
  that numbers periods, and the line breaks where it changes. The built-in channels, bands, Supertrend and
  Parabolic SAR are drawn this way.
</p>
<pre><code>{`plots: [
  { key: 'upper', title: 'Upper', color: 0 },
  { key: 'middle', title: 'Basis', color: 1, width: 1, lineStyle: 'dashed' },
  { key: 'lower', title: 'Lower', color: 0 },
],
fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }],`}</code></pre>
<p>
  A plot of <code>kind: 'markers'</code> marks the bars where its field has a value (a turn, a signal) with a
  <code>shape</code> (<code>'triangleUp'</code>, <code>'triangleDown'</code>, <code>'arrowUp'</code>, <code>'arrowDown'</code>,
  <code>'dot'</code>, <code>'square'</code> or <code>'diamond'</code>), at the value or, on the
  price pane, above the bar's high or below its low (<code>position: 'aboveBar'</code>, <code>'belowBar'</code>). It is
  not a value to read: it gets none in the legend, no tag on the axis and no column in an export, and is not offered
  as a line another indicator can read. In a pane, its marks are at their values. Leave the field unset on the bars without a mark.
</p>
<p>
  Its marks are as wide as the bars allow, 4 to 8 px. A viewer picks another shape and a size in the indicator's
  Style tab, and code sets them in the plot's style: <code>shape</code>, and <code>size</code> in pixels across (2 to
  40) or <code>'auto'</code>. Williams Fractals is drawn this way: a triangle above a high and one below a low.
</p>
<pre><code>{`chart.updateIndicatorStyle(fractals, { plots: { up: { shape: 'arrowUp', size: 14 }, down: { size: 'auto' } } });`}</code></pre>
<pre><code>{`plots: [
  { key: 'value', title: 'MACD', color: 0 },
  { key: 'turn', title: 'Turn', color: 1, kind: 'markers', shape: 'triangleUp', position: 'belowBar' },
],`}</code></pre>

<h2>Panes: resize, fold, maximise, reorder</h2>
<p>
  <strong>Drag the divider</strong> above a pane to resize it. In ChartWidget each pane
  has buttons at its top right: move it up or down, fold it to its header, maximise it
  (the other panes fold and the price pane keeps a strip). Saved layouts keep each
  pane's size, order, fold and maximise. The same from code:
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  Right-click a pane in ChartWidget for its own logarithmic, inverted or percent scale.
</p>

<h2>Moving an indicator to another pane</h2>
<p>
  An indicator can join another indicator's pane (it then shares that pane's scale),
  take a pane of its own, or go back to the price pane. When it leaves a pane it owned,
  the others in it stay (the next pane indicator takes the pane over), and those reading
  its lines follow it. In ChartWidget, the <strong>⋯</strong> button on a legend row
  offers the pane above, the pane below, a new pane and the price pane.
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>Undo, and templates</h2>
<p>
  Adding, removing, editing and moving indicators are undo steps in the same history
  as drawings (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>); an undone indicator
  comes back under its own id, so alerts on its lines still match. A burst of edits to
  one indicator (a colour dragged, a period typed) is one step. A loaded layout starts a
  fresh history.
</p>
<p>
  The indicators can be taken and put back as a whole, which is what ChartWidget's
  indicator templates do: <strong>Save indicators as template…</strong> on the Templates tab
  of the Indicators dialog keeps them (inputs, style, levels, panes) under a name, and picking a template
  puts them in place of the chart's, as one undo step.
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>Computing outside the chart</h2>
<p>
  <code>IndicatorWorkerHost</code> computes an indicator from bars in the worker the package ships
  (<code>createIndicatorWorker()</code>), the one the chart uses with <code>indicatorWorker: 'auto'</code>.
  Pass <code>null</code> instead and register the plugins to compute in place (SSR, tests, scripts):
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator, createIndicatorWorker } from '@tradecanvas/core'

const config = { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }

const inWorker = new IndicatorWorkerHost(await createIndicatorWorker())
const output = await inWorker.calculate('rsi', config, bars)

const inPlace = new IndicatorWorkerHost(null)
inPlace.registerFallbackPlugin(new RSIIndicator())
const same = await inPlace.calculate('rsi', config, bars)`}</code></pre>

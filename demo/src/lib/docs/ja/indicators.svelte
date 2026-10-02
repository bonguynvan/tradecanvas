<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
</script>

<svelte:head>
  <title>インジケーター — TradeCanvas ドキュメント</title>
  <meta name="description" content="{catalog.length} 種類の組み込みテクニカルインジケーター：移動平均、バンド、オシレーター、出来高、ボラティリティ。ソースの指定、インジケーターへの適用、編集できるレベルに対応しています。" />
</svelte:head>

<h1>インジケーター</h1>
<p>
  {catalog.length} 種類の組み込みインジケーターがあります。id を指定して追加します。省略したパラメーターは
  既定値になり、無効な値も既定値に戻ります。
</p>

<h2>インジケーターの追加</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> はインスタンス id を返します。同じインジケーターを何度でも追加でき、
  インスタンスごとに独自の入力、色、レベルを持てます。
</p>

<h2>ソースとインジケーターへの適用</h2>
<p>
  下の表で <em>ソース</em> と記されたインジケーターは、終値以外の価格
  （<code>open</code>、<code>high</code>、<code>low</code>、<code>hl2</code>、<code>hlc3</code>、
  <code>ohlc4</code>、<code>hlcc4</code>）や、別のインジケーターのラインに対して計算できます。
  RSI の移動平均は RSI のペインに RSI のスケールで描かれ、RSI を削除すると一緒に消えます。
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  ペインのインジケーター同士で 1 つのペインを共有することもできます：
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>。
</p>

<h2>レベル、色、値</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  各ラインの最新値は、そのラインの色で軸上にタグ表示されます。タグは
  <code>features.indicatorValueLabels: false</code> または <code>setIndicatorValueLabelsVisible(false)</code> で
  非表示にできます。ペインのライン、レベル、軸、クロスヘアは 1 つのスケールを共有します。
</p>

<h2>価格ペインに表示 ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>名前</th><th>既定のパラメーター</th><th>ライン</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· ソース</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> は、上位時間足の移動平均を現在のチャートに描きます。たとえば 1 時間足のバーに
  日足の 50 MA を表示できます。上位時間足の<em>確定した</em>終値だけを平均するため、境界ごとに
  階段状に変化し、リペイントすることはありません。
</p>

<h2>独自のペインに表示 ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>名前</th><th>既定のパラメーター</th><th>ライン</th><th>レベル</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· ソース</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code>（Volume Delta）は、OHLCV から買い / 売りの圧力を近似します。上昇して引けたバーは
  出来高をプラス、下落したバーはマイナスとして加えます。<code>mode: 0</code> はバーごとのヒストグラム、
  <code>mode: 1</code> は累積デルタです。（本来のティックデルタには約定ごとの bid / ask データが必要ですが、
  OHLCV の系列にはその情報が含まれていません。）
</p>

<h2>独自のインジケーター</h2>
<p>
  <code>IndicatorBase</code> を継承し、描画する内容（<code>plots</code>）、ペインのスケール、レベル、
  入力を宣言します。描画のコードを書かなくても、チャートが描画し、ペインのスケールを調整し、値をタグ表示し、
  ウィジェットの凡例と設定に表示します。詳しくは
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">カスタムインジケーターのレシピ</a>を参照してください。
</p>

<h2>サイズ変更できるペイン</h2>
<p>
  ペインの上の<strong>区切り線をドラッグ</strong>してサイズを変えるか、高さを指定します：
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)   // px, clamped to a minimum`}</code></pre>

<h2>チャートの外での計算</h2>
<p>
  <code>IndicatorWorkerHost</code> は、Web Worker が使うのと同じメッセージで、バーからインジケーターを計算します。
  ワーカースクリプトはまだ公開パッケージに含まれていないため、<code>null</code> を渡してプラグインを登録し、
  その場で計算してください（SSR、テスト、スクリプト向け）：
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>

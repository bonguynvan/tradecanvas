<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>プラグイン — TradeCanvas ドキュメント</title>
  <meta name="description" content="プラグイン SDK で、独自のインジケーター、描画ツール、チャートタイプ、オーバーレイを追加して TradeCanvas を拡張できます。" />
</svelte:head>

<h1>プラグイン</h1>
<p>
  独自の<strong>インジケーター</strong>、<strong>描画ツール</strong>、<strong>チャートタイプ</strong>、
  <strong>オーバーレイ</strong>でチャートを拡張できます。グローバルにも、チャートごとにも登録できます。
</p>

<h2>登録</h2>
<p>登録方法は 3 つあり、優先順位の順に、グローバルな既定、コンストラクター、インスタンスへの命令的な呼び出しです。</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>

<h2>プラグインの種類</h2>
<table>
  <thead><tr><th>種類</th><th>インターフェース</th><th>描画先</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render()</code></td><td>オーバーレイまたはパネル</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>オーバーレイレイヤー</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + 任意の <code>transform()</code></td><td>メイン系列</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>カスタムインジケーター</h2>
<p>描画用のヘルパーを使うために <code>IndicatorBase</code> を継承し、登録したら組み込みのインジケーターと同じように追加します：</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap, registerPlugin } from '@tradecanvas/chart'

class DoubleSMA extends IndicatorBase {
  descriptor = {
    id: 'double-sma', name: 'Double SMA',
    placement: 'overlay', defaultConfig: { fast: 10, slow: 30 },
  }
  calculate(data, config) { /* values = new IndicatorValueMap(); return { values, series } */ }
  render(ctx, output, viewport, style) { /* draw lines */ }
}

registerPlugin({ kind: 'indicator', plugin: new DoubleSMA() })
chart.addIndicator('double-sma', { fast: 10, slow: 30 })`}</code></pre>
<p>
  <code>values</code> には <code>new Map()</code> の代わりに <code>new IndicatorValueMap()</code> を使ってください。
  そのまま置き換えられる <code>Map</code> で、時間順に 1 本ずつ値を入れていく場合のコストが数分の 1 で済みます。
  シンボルや時間足を切り替えるたびに、履歴全体に対してまさにこの処理が行われます。
</p>

<h3>高速なライブ更新（任意）</h3>
<p>
  ライブのティックごとに変わるのは形成中のバーだけです。<code>update()</code> を実装すると、履歴全体ではなく
  <code>from</code> 以降のバーだけを再計算できます。チャートはティックと新しいバーでこれを使い、
  未実装の場合や <code>null</code> を返した場合は <code>calculate()</code> にフォールバックします。
  <code>calculate()</code> と同じ値を返す必要があります。
</p>
<pre><code>{`update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null   // IndicatorBase helper
  for (let i = from; i < data.length; i++) {
    this.writePoint(prev, data, i, { value: /* recompute bar i */ 0 })
  }
  return prev
}`}</code></pre>

<h2>カスタム描画ツール</h2>
<p>
  ヘルパー（アンカーからピクセルへの変換、線のスタイル、ハンドル）を使うために
  <code>DrawingBase</code> を継承し、ツールを記述して登録します。
  <code>descriptor.options</code> に挙げた設定は、ウィジェットの設定ダイアログに表示され、
  描画と一緒に保存されます。
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* this.anchorToPixel(state.anchors[0], viewport) の位置に */ }
  hitTest(point, state, viewport, tolerance) { /* ポインターが描画の上にあるか？ */ return false }
  // 任意：ラインの価格。アラートがラインを追従できるようにする
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  ディスクリプターでは、ツールの描き方（<code>creation</code>：
  <code>'clicks'</code>、<code>'freehand'</code>、<code>'path'</code>。
  <code>maxAnchors</code> も指定できます）と、ダイアログで塗りつぶし
  （<code>fill</code>）やテキスト（<code>text</code>）を設定できるかどうかも記述できます。
  ツールは <code>moveHandle()</code> でアンカーではないハンドルを動かせ、バーをもとに描画する場合は
  <code>setDataGetter()</code> でチャートのバーを受け取ります。
</p>

<h2>カスタムチャートタイプ</h2>
<p><code>ChartTypePlugin</code> はレンダラーと、任意でデータの変換を提供します。組み込みのタイプと同じように切り替えられます：</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>カスタムオーバーレイ</h2>
<p><code>OverlayPlugin</code> は選んだレイヤーに毎フレーム描画し、現在のビューポート、データ、テーマを受け取ります：</p>
<pre><code>{`registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'vwap-band', name: 'VWAP Band', layer: 'main' },
    render(ctx, { viewport, data, theme }) {
      // draw onto the main layer with the current viewport + data
    },
  },
})`}</code></pre>

<p>プラグインの型シグネチャの全体は、<a href={href('/docs/api')}>API リファレンス</a>を参照してください。</p>

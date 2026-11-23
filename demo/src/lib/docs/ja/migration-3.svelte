<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>3.0 への移行 — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas 2.x から 3.0 でコードに影響する変更点：変わった動作のそれぞれと、以前の動作を保つオプション。3.0 は専用ブランチで開発中です。" />
</svelte:head>

<h1>3.0 への移行</h1>
<p>
  3.0 は <code>3.0</code> ブランチで開発中です。まだ npm にはなく、このページは開発とともに増えていきます。2.x
  向けに書かれたコードを壊しうる変更と、その対処を一つずつ挙げます。1.x から 2.0 への移行は
  <a href={href('/docs/migration')}>2.0 への移行</a> を参照してください。
</p>

<h2 id="behaviour">変わった動作</h2>

<h3 id="brackets">確定したブラケットは執行アダプターに送られます</h3>
<p>
  執行アダプターを接続している場合（<code>chart.connectExecution(adapter)</code>）、確定したブラケットは 1
  つの注文としてアダプターに送られるようになりました：エントリーとその数量、ストップロス、テイクプロフィットです。2.x
  では、アダプターを <code>brackets: 'place'</code> で接続しない限り <code>bracketPlace</code>
  イベントのままで、チャートは送信されなかったことをコンソールに一度だけ警告していました。
</p>
<ul>
  <li>
    <strong>イベントのブラケットを自分のコードで発注している場合。</strong><code>brackets: 'event'</code>
    で接続してください。そうしないとブラケットが 2 回発注されます：チャートから 1 回、あなたのコードから 1 回です。
  </li>
  <li>
    <strong><code>brackets: 'place'</code> を渡していた場合。</strong>何もする必要はありません。このオプションは外せます。
  </li>
  <li>
    <strong>アダプターを接続していない場合。</strong>変更はありません：ブラケットは <code>bracketPlace</code>
    イベントです。
  </li>
</ul>
<pre><code>{`// 2.x：指定しない限りイベント           // 3.0：指定しない限り注文
chart.connectExecution(broker)             chart.connectExecution(broker, { brackets: 'event' })
chart.connectExecution(broker, { brackets: 'place' })   →   chart.connectExecution(broker)`}</code></pre>
<p>
  ブラケットは、そのサイズから決まる数量とともに送られます。数量のないブラケットは確定されずチャートに残り、
  <code>executionError</code> がその旨を伝えます（<code>reason: 'noQuantity'</code>）。ウィジェットのブラケットバーに数量の入力欄が加わったため、ツールバーから始めたブラケットには数量があります。自分のコードで始めるブラケットは、第
  3 引数でサイズを受け取ります（<a href={href('/docs/trading')}>トレーディング</a> を参照）：
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // ストップで 50 を失う数量`}</code></pre>

<h3 id="stop-limit">ペーパー口座はストップリミットを指値の範囲内で約定します</h3>
<p>
  <code>PaperExecutionAdapter</code> はこれまで <code>stopLimit</code> 注文をストップ価格で、ストップ注文と同じように約定していました。今後は、価格がストップに達すると
  <code>price</code> を指値とする指値注文になります：価格が指値の範囲内に入るまで、注文は有効なまま残ります（タイプは
  <code>'limit'</code> になります）。ストップに達した時点でポジションができることを期待していたテストは、先に価格を指値の範囲内へ動かすか、<code>'stop'</code>
  注文を使ってください。
</p>

<h3 id="hand-prices">手で決めた価格は市場の価格の刻みに乗ります</h3>
<p>
  <code>orderModify</code>、<code>positionModify</code>、<code>bracketPlace</code>、下書き注文や右クリックメニューの <code>orderPlace</code>、
  <code>priceAxisAdd</code>、<code>chartContextMenu</code> は、これまでポインター下の価格をピクセルから求めたまま
  （<code>62549.71592675613</code>）運んでいました。今は市場の呼値に、なければ価格軸が表示する小数桁に丸めた価格を運びます：
  <code>chart.roundPrice</code> が返す値です。ブラケットと下書き注文も、どの価格から始めても刻みの上から始まり、ドラッグしたアラートも刻みに乗ります。元の刻みのまま離したラインは何も通知しません。自分で丸めていたコードは不要になります。
</p>

<h2 id="types">広がった型</h2>
<p>
  <code>TimeInForce</code> は <code>'gtc' | 'day' | 'gtd' | 'ioc' | 'fok'</code> になりました。すべてのメンバーを扱うコード（default
  のない <code>switch</code>、<code>Record&lt;TimeInForce, …&gt;</code>）には新しい 3 つが必要です。独自の執行アダプターは、受け付けないものを拒否してかまいません。
</p>
<p>
  <code>FillReason</code> には <code>'liquidation'</code> も加わりました。ペーパー口座が強制決済で閉じたポジションのためのものです。
  <code>ExecutionEventType</code> には <code>'marginCall'</code> が加わりました。ペーパー口座に <code>stopOutLevel</code> または
  <code>marginCallLevel</code> を指定しない限りどちらも起こりませんが、すべてのメンバーを扱うコードにはこれらが必要です。
</p>

<h2 id="unchanged">変わっていないもの</h2>
<ul>
  <li>データ、および 2.x で保存したレイアウトと設定は、これまでどおり読み込めます。</li>
  <li>インジケーター、描画、テーマ、スタイルキーの名前は変わりません。</li>
</ul>

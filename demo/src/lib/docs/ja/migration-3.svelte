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

<h2 id="unchanged">変わっていないもの</h2>
<ul>
  <li>データ、および 2.x で保存したレイアウトと設定は、これまでどおり読み込めます。</li>
  <li>インジケーター、描画、テーマ、スタイルキーの名前は変わりません。</li>
</ul>

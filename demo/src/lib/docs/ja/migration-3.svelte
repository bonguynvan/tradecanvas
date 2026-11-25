<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>3.0 への移行 — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas 2.x から 3.0 でコードに影響する変更点：変わった動作のそれぞれと、以前の動作を保つオプション。3.0 は npm で公開されています。" />
</svelte:head>

<h1>3.0 への移行</h1>
<p>
  3.0 は npm で公開されています（<code>npm i @tradecanvas/chart</code>）。2.x
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

<h3 id="trade-buttons">執行アダプターを接続すると、チャート上に売りと買いが表示されます</h3>
<p>
  執行アダプターが接続され、注文チケットがオンのとき、ウィジェットはチャートの凡例の下に売りと買いを表示するようになりました。
  自分の注文とポジションを描くためだけにアダプターを接続しているホストは、これをオフにします：
</p>
<pre><code>{`new ChartWidget(el, { features: { tradeButtons: false } });`}</code></pre>
<p>
  <code>orderTicket</code> がオフのとき、またはアダプターがないときは、表示されません。注文関連のスイッチを名前で一つずつオフにしているホストには、
  指定する名前が一つ増えます。<code>tradeButtons</code> は新しいスイッチで、設定しなければオンです。
</p>

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
  その日の値幅制限がある市場では、注文そのものの価格も制限内に保たれます。制限を越えてドラッグすると、制限の価格で通知されます。
</p>

<h3 id="finger">指で操作する場合、32 px 未満のコントロールはなくなりました</h3>
<p>
  主なポインターが粗いデバイス（スマートフォン、タブレット）では、どの外観と <code>density</code> でも、ウィジェットのコントロールが縦横とも 32 px 以上になりました。
  タブレット上の <code>compact</code> なウィジェットに 24 px のボタンはもうなく、インジケーター凡例の各行は 20 px ではなく 32 px の高さです。
  マウスでは描画はそのままで、変わるのは押下領域だけです（縦横とも 20 px 以上）。タッチ画面でウィジェットの各部（凡例の高さ、ダイアログの高さ）を測っているページでは、より大きな値になります。
</p>

<h3 id="order-answer">チケットからの注文はアダプターの答えを待ちます</h3>
<p>
  執行アダプターが接続されているとき、注文チケットは発注と同時には閉じなくなりました。アダプターの <code>placeOrder</code> が resolve する（閉じる）か、
  reject する（残って理由を表示する）まで待ちます。<code>placeOrder</code> がいつまでも終わらないアダプターでは、チケットは待ち続けます：
  注文で resolve するか、理由を付けて reject してください。これに伴ってさらに 3 つ変わりました。すべての <code>orderPlace</code> ペイロードが
  <code>clientOrderId</code> を持つようになり、<code>placeOrderIntent</code> は送り出した注文を返します（以前は何も返しませんでした）。
  チケットからの成行注文は、フィードが両方を渡す場合、買いなら売気配、売りなら買気配を <code>price</code> として持ちます（以前は最新価格でした）。
  右クリックメニューや板情報ラダーから 1 回の操作で出す注文は、市場に売買単位があればその単位の数量になります（以前は 1 で、ラダーの注文には数量がありませんでした）。
</p>

<h3 id="orders-by-symbol">注文、ポジション、約定はそれぞれの銘柄に描かれます</h3>
<p>
  <code>symbol</code> を示す注文、ポジション、約定は、チャートがその銘柄を表示しているときだけ描かれます。
  別の銘柄では保持されます。<code>getOrders()</code>、<code>getPositions()</code>、<code>getFills()</code> は
  口座全体を返し、そのうちどれが描かれているかは <code>chart.getSymbol()</code> でわかります。チャートはすべての
  <code>orderPlace</code> ペイロードに表示中の銘柄を付けるようになり、ペーパー口座はそれを保持します。そのため、
  ある銘柄で開いたポジションが、以前のように次の銘柄に描かれて誤った価格で損益が計算されることはなくなりました。
  銘柄を示していないものは、これまでどおりすべての銘柄で描かれます。複数銘柄の口座のための独自のアダプターは、
  注文、ポジション、約定に銘柄を付けてください。
</p>
<p>
  これに伴って 3 つ変わりました。チャートが銘柄を表示していれば、<code>executionFill</code> と
  <code>getFills()</code> が伝えるすべての約定に <code>symbol</code> が付きます。<code>ChartWidget</code> は
  銘柄が変わっても約定を消さなくなりました。履歴と実現損益は口座のもので、印はその銘柄とともに戻ります。
  <code>setMarkPrice</code> は第 3 引数として銘柄を受け取り、チャートはリプレイ中にそれを渡します。銘柄を付けた
  価格を渡されると、ペーパー口座は銘柄ごとにその銘柄の価格で処理と評価を行い、銘柄を付けない価格を渡されると、
  これまでどおり 1 つの市場として扱います。また、バーを手動で設定している場合、チャートは伝えられるまで銘柄を
  知りません。<code>chart.setSymbol(symbol)</code> で伝えます。<code>ChartWidget</code> は自分で呼び出します。
</p>
<h3 id="hold-tooltip">チャート上の長押しで価格ポップアップを表示します</h3>
<p>
  <code>ChartWidget</code> では、プロット上でマウスボタンを動かさずに 0.5 秒押し続けると、カーソル位置のバーの
  フローティング OHLCV ツールチップが、ボタンを離すまで表示されます。ツールチップはカーソルに追従し、その間チャートは
  パンしません。そのため、これだけ長く押した操作はクリックにもパンの開始にもなりません。ウィジェットの
  <code>crosshairTooltip</code> 機能は、<code>false</code> だったものが <code>'hold'</code> になりました。
  これまでどおりポップアップなしにするには <code>{`chartOptions: { features: { crosshairTooltip: false } }`}</code> を、
  ホバーで表示するには <code>true</code> を渡してください。ヘッドレスの <code>Chart</code> は変わりません。
  指定しない限りツールチップはカーソルに追従し、<code>'hold'</code> も受け付けます。
</p>

<h3 id="live-price">ワンクリックの注文はリアルタイム価格を待ちます</h3>
<p>
  独自のフィード（<code>adapter</code>）がある場合、そのフィードが切断されている間、<code>ChartWidget</code> は
  ワンクリックの注文（右クリックメニュー、板情報）も、確定したブラケット注文やドラフト注文も送らなくなりました。
  代わりに理由を表示します。フィードが切断されているか、1 分間何も送ってこない間（<code>feedQuietAfter</code>）、
  チケットは成行注文を送らず、止まったストリームに対して「Live」と表示していたステータスバーは
  「価格の更新がありません」と表示します。<code>feedQuietAfter: 0</code> にすると、接続中のフィードが静かだと
  判定されることはなくなりますが、切断されたフィードは変わらず注文を保留します。
</p>

<h3 id="confirmations">ワンクリックの取引は確認され、板の買い気配は買う価格になります</h3>
<p>
  <code>ChartWidget</code> は、ポジションの決済やドテン（口座パネル、チャート上のボタン）の前と、右クリックメニューや
  板情報からの発注の前に確認するようになりました。これまではワンクリックで送信されていました。
  <code>confirmOrders: false</code> でワンクリックのままにできます。板情報では、買い気配を押すとその価格に
  <strong>買い</strong>指値が、売り気配を押すと<strong>売り</strong>指値が出されるようになりました。これまでは
  買い気配に売り、売り気配で買っていました。同じセルからの <code>orderPlace</code> は、以前とは反対の売買になります。
  これらのセルを押していた、あるいは注文がすぐ出ることを前提にしていたテストやスクリプトは、確認ダイアログのボタン
  （<code>.tcw-confirm .tcw-done-btn</code>）を押すか、このオプションを使ってください。
</p>

<h3 id="graphite">ウィジェットの既定の外観は Graphite です</h3>
<p>
  <code>ui</code> のない <code>ChartWidget</code> は、これまでの Modern に代わって Graphite の外観で描かれます。
  無彩色の地、3 px の角、40 px のツールバーで、選択中のものはアンバーではなく明るい地に示します。チャートの色も
  それに合わせて変わります（<code>GRAPHITE_DARK_THEME</code>、<code>GRAPHITE_LIGHT_THEME</code>）。<code>theme</code> が
  自分のオブジェクトなら変わりません。<code>ui: 'modern'</code> で以前の外観と色を保てます。スタイルシートの既定の
  トークンは Graphite のものなので、Modern の上にいくつかの <code>--tcw-*</code> トークンを設定していた CSS は、
  Graphite の上に設定することになります。どの外観でも、注文チケットのボタンは注文の内容を示し
  （<code>Buy 100 HPG</code>）、注文の金額はボタンのすぐ上の最後の行になり、口座パネルではポジションの
  ドテンと決済のボタンが損益のすぐ後に来ます。ボタンの文字や列の位置を読むテストは直す必要があります。
</p>

<h3 id="money">ベトナム株の金額はドンで計算されます</h3>
<p>
  <code>MARKET_HOSE</code>、<code>MARKET_HOSE_ETF</code>、<code>MARKET_HNX</code>、<code>MARKET_UPCOM</code>
  は価格を千ドン単位で表し（26.40 は 26,400 ドン）、それを明示するようになりました。
  <code>contractMultiplier</code> は 1,000 です。注文チケットの注文金額、口座パネルのポジションの損益、
  チャートのタグの金額はこの値で計算されるため、26.40 の 100 株は 2,640 ではなく 2,640,000 と表示されます。
  どの市場でも、チャートのタグの金額（ポジションの損益、ストップやターゲットの金額）は、口座パネルと同じく
  市場の乗数で計算されます。VN30F のポジションのタグはポイントではなくドンで表示されます。
  <code>scaleMarketPrices</code> は乗数を係数で割るので、価格をドンで読む
  <code>scaleMarketPrices(MARKET_HOSE, 1000)</code> の乗数は 1 です。自分で 1,000 を掛けていた場合
  （<code>formatAmount</code> や、チャートの横に表示する値で）は、やめてください。
  独自の <code>multiplier</code> を渡されていない <code>PaperExecutionAdapter</code> は、接続先のチャートから
  市場の乗数を受け取るようになりました（チャートは接続時と市場の変更時に、アダプターの任意のメソッド
  <code>setMultiplier</code> を呼びます）。証拠金、残高、約定の損益が同じ金額の単位になります。
  <code>multiplier</code> を渡したものはそのままです。ロング／ショートポジションの描画と、<code>risk</code> で
  数量を決めるブラケットも、数量を乗数で計算します。リスク 5,000,000 ドンでストップが 1.00 離れていれば
  5,000 株で、以前は 5,000,000 株でした。<code>positionLevels(drawing, multiplier)</code> は第 2 引数に市場の
  乗数を取ります。ポジションは建てたときの乗数を保ちます（<code>TradingPosition.multiplier</code>。ペーパー口座が設定します）。
  チャートが別の市場や別の銘柄を表示しても、建っているポジションは再評価されず、パネルとチャートのタグは
  ポジションごとの乗数で計算します。プリセットをスプレッドして作った市場はプリセットの乗数を保ちます。
  ドン建ての価格用の <code>{'{'} ...MARKET_HOSE, pricePrecision: 0, priceStep: 10 {'}'}</code> は 1,000 のままで、
  金額が千倍になります。<code>scaleMarketPrices(MARKET_HOSE, 1000)</code> を使うか、スプレッドで
  <code>contractMultiplier: 1</code> を指定してください。
  ブローカーに送られる内容は、上記のようにリスクから計算される数量を除き、以前のままです。
</p>

<h3 id="mark">ポジションの <code>markPrice</code> が評価に使われます</h3>
<p>
  執行アダプターがポジションに <code>markPrice</code> を与えると、口座パネルの行とチャート上のタグはその価格で
  ポジションを評価するようになりました。チャート自身の銘柄のポジションでも同じです。以前は別の銘柄のポジションに
  だけこの価格が読まれ、それ以外はチャートの最新価格で計算されていました。そのため常に最新に保ってください。
  マーク価格が動いたらポジションをもう一度送ります。一度だけ設定するアダプターでは行が止まったままになります。
  このフィールドを省けば、これまでどおりチャートの最新価格が使われます。<code>markPrice</code> が 0 の場合は
  ないものとして扱われます。
</p>

<h3 id="ticket-dock">注文チケットはチャート横のドックで開きます</h3>
<p>
  ウィジェットの注文チケットは、これまでチャートの上に重なるダイアログで、入力している価格そのものを隠していました。今後はチャート横のドックの 1 ページになります：価格を隠さず、チャートを押しても閉じず、注文を 1 件送ったあとも次の注文のために残り、売買の別・種類・数量を保ちます。ボタンはドックのレールにあり、<code>widget.openPanel('orderTicket')</code> で成行のチケットを開けます。
</p>
<p>
  <code>'orderTicket'</code> は新しい <code>WidgetPanel</code> です：<code>getOpenPanel()</code> と <code>onPanelChange</code> がこれを報告し、独自のページはこの id を使えません。スマートフォンでは、またはドックをオフにした場合（<code>features: {'{'} dock: false {'}'}</code>）、チケットはこれまでどおりダイアログです。どの幅でもダイアログにしたいホストは次のように指定します：
</p>
<pre><code>{`new ChartWidget(el, { ticketPlace: 'dialog' });`}</code></pre>

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

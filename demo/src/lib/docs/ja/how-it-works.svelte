<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram, { type DiagramWords } from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: '足が入ってくる', text: 'DataFeed には履歴を要求し（getBars）、リアルタイムの足を購読します。BinanceAdapter のような DataAdapter はすべてをイベントとして送ります。StreamManager は feed を adapter に変換し、チャートの時間足にリサンプリングし、ティックから足を組み立てます。' },
    { nodes: ['chart', 'stream', 'code'], title: 'チャートが受け取る', text: 'chart.connect() は snapshot、barUpdate、barClose、barCorrection の各イベントを受け取ります。自分のコードからは setData、appendBar、updateLastBar、updateBar で同じ足を書き込め、feed は不要です。' },
    { nodes: ['store', 'chart'], title: '一つのストア', text: 'すべての書き込みは SeriesStore を通ります。表示中の足、時間外の足を隠しているときの全系列、リプレイ中に退避したリアルタイム系列を保持し、各書き込みで何が起きたかをチャートに伝えます。' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: '描くものを計算する', text: 'DisplaySeries はチャートタイプが描く系列（平均足、練行足、カギ足…）を作り、足が変わるまでキャッシュします。IndicatorEngine は最初に変わった足からだけ再計算します。PriceFit は価格スケールを合わせ、PaneLayout はペインの大きさを決めます。' },
    { nodes: ['viewport', 'input', 'fit'], title: 'ビュー', text: 'Viewport は、どの足が見えているか、1 本の幅、どこまでスクロールしたかを保持します。ドラッグ、ホイール、キー操作は InteractionManager を通してスクロールとズームを行います。' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: '1 フレーム', text: 'RenderEngine は変わったレイヤーに印を付け、次のアニメーションフレームで描きます。リアルタイムのティックは先にまとめられるので、連続した更新も 1 フレームです。scene キャンバスはグリッド、系列、インジケーター、描画、軸を、top キャンバスはクロスヘアと凡例を持つため、ポインターを動かしても再描画されるのは top だけです。renderer: \'webgl\' では、下にある GPU キャンバスがローソク足と出来高を描きます。' },
    { nodes: ['events', 'chart'], title: 'アプリへ戻る', text: 'チャートはイベントで知らせます：crosshairMove、dataUpdate、visibleRangeChange、symbolChange など。一覧は API リファレンスにあります。' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: '一つの公開クラス', text: 'ChartWidget は公開メソッドと初期化を受け持ちます。コンストラクターは、部品が互いを必要とする順に並んだステップの列です：readOptions、buildRoot、buildToolbar、buildBody、buildChart … finishSetup。' },
    { nodes: ['areas', 'hosts', 'widget'], title: 'エリアごとに host を通す', text: 'リプレイ、取引、アラート、比較、ウォッチリスト、凡例、メニュー、コマンド、レイアウト、ドック、Chart Settings、描画の編集、時間足は、それぞれ独立したクラスです。各クラスは widget から使うものを正確に並べた host インターフェースを受け取り、ChartWidget の公開メソッドは担当のエリアに処理を渡します。' },
    { nodes: ['chart', 'areas'], title: '一つのチャート', text: 'buildChart は widget が包む唯一の Chart を作ります。各エリアは host を通してこれに触れ、自分のチャートは持ちません。widget はチャートのイベントを受け取り、ツールバーと凡例を合わせます。' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signal', text: '複数の部品が表示する状態は signal です：テーマ（look）、ツールバーのどのボタンが開いているか（openRoles）、Chart Settings。一つの effect が表示箇所をすべて更新するので、書き込む側が更新を一つずつ呼ぶ必要はありません。' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: 'ダイアログは初めて開くときに読み込む', text: '大きなダイアログ、インジケーターのダイアログ、コマンドパレット、銘柄検索は DIALOGS にあり、初めて開くときにコードを読み込みます。これらは overlayHost の中で開き、全画面では overlayHost が widget の内側に移ります。' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: '足を選ぶ', text: 'リプレイボタンでリプレイバーが開きます。足をクリックするか replayFrom() を呼ぶと、開始位置が決まります。' },
    { nodes: ['chart', 'store', 'manager'], title: '開始', text: 'chart.replayStart() は SeriesStore にリアルタイムの足を退避させ、再生する足を ReplayManager に読み込みます。ReplayManager は開始位置で一時停止して待ちます。' },
    { nodes: ['manager', 'chart', 'store'], title: 'ステップ', text: '再生、一時停止、1 本進む・戻る、速度の操作は ReplayManager に届きます。各ステップは bar イベントを送り、チャートはそこまでの足を表示します（showReplayed、進むときは appendReplayed）。' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: 'リプレイに合わせて動くもの', text: 'インジケーターは変わった足から再計算され、価格ラインは再生中の終値を示し、ペーパー口座は再生中の価格で約定します。実口座の注文とアラートはリアルタイムのままです。' },
    { nodes: ['stop', 'store', 'ui'], title: '終了', text: '最後の足に達するとリプレイは一時停止します。抜けると replayStop() が呼ばれ、SeriesStore がリアルタイム系列を戻し、チャートはリアルタイムに戻ります。' },
  ];

  const dataWords: DiagramWords = {
    code: { title: 'あなたのコード' },
    stream: { note: 'リサンプル · TickAggregator' },
    store: { note: '表示 · 全体 · 退避' },
    display: { note: 'チャートタイプごと' },
    engine: { note: '変更レイヤー · rAF' },
    scene: { title: 'scene キャンバス', note: '系列 · 軸 · 描画' },
    top: { title: 'top キャンバス', note: 'クロスヘア · 凡例' },
    input: { title: 'マウス・ホイール・キー' },
  };

  const widgetWords: DiagramWords = {
    widget: { note: '公開 API · 初期化' },
    hosts: { note: 'エリアごとに 1 つ' },
    dialogs: { note: 'LazyPart · 初回に読込' },
    ui: { title: 'ツールバー · テーマ', note: 'effect が 1 つずつ' },
    areas: { title: 'Widget… エリア', note: 'Replay · Trading · Alerts…' },
    overlay: { note: 'portal · 全画面' },
    chart: { note: 'widget ごとに 1 つ' },
  };

  const replayWords: DiagramWords = {
    ui: { note: 'toggleReplay · 足をクリック' },
    store: { note: 'リアルタイム系列を退避' },
    paper: { title: 'ペーパー口座' },
  };
</script>

<svelte:head>
  <title>仕組み — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas の内部の仕組み：足がデータソースから画面に届くまで、ChartWidget の構成、バーリプレイの流れ。コード中の名前を使った 3 つの図。" />
</svelte:head>

<h1>仕組み</h1>
<p>ライブラリを内側から見た 3 つの図です。コード中の名前を使っているので、ソースの中で各部分を探せます。
  ステップにポインターを合わせるか Tab キーで移動すると、そのステップに関わるボックスが強調されます。
  チャートを使うだけならこの知識は不要です。データソースやプラグインを書くとき、ライブラリ自体を変更するときに役立ちます。</p>

<h2 id="data-flow">データソースから画面まで</h2>
<p>足は取引所から来ても自分のコードから来ても同じ経路をたどり、一つのストアに保持されます。
  描画されるものはすべて、このストアとビューから計算されます。</p>
<Diagram {...DATA_FLOW} label="SeriesStore を通って、データソースから 2 枚のキャンバスへ届く足" steps={dataSteps} words={dataWords} />
<p>独自のデータソースの書き方は <a href={href('/docs/realtime')}>リアルタイムとリプレイ</a>、
  フレームあたりのコストは <a href={href('/docs/performance')}>パフォーマンス</a> を参照してください。</p>

<h2 id="widget">ChartWidget の構成</h2>
<p><code>ChartWidget</code> は 1 つの <code>Chart</code> を囲む取引画面全体です。各部分は小さなクラスで、
  渡されたものだけを見ます。</p>
<Diagram {...WIDGET_PARTS} label="1 つの Chart を囲む ChartWidget と、そのエリア、signal、ダイアログ" steps={widgetSteps} words={widgetWords} />

<h2 id="replay">バーリプレイ</h2>
<p>リプレイは同じチャートの上で過去を 1 本ずつ再生し、リアルタイムの足は終わるまで退避しておきます。</p>
<Diagram {...REPLAY} label="最初のクリックからリアルタイムのチャートに戻るまでのバーリプレイ" steps={replaySteps} words={replayWords} />
<p>オプションとイベントは <a href={href('/docs/realtime')}>リアルタイムとリプレイ</a> にあります。</p>

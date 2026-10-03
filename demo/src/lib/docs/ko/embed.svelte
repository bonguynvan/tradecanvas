<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>임베드 위젯 — TradeCanvas 문서</title>
  <meta name="description" content="iframe URL 하나로 완전히 구성된 트레이딩 차트를 어떤 페이지에든 삽입합니다." />
</svelte:head>

<h1>임베드 위젯</h1>
<p>
  <code>&lt;iframe&gt;</code> URL 하나로 완전히 구성된 트레이딩 차트를 어떤 페이지에든
  넣을 수 있습니다. npm 설치도, 빌드 단계도 필요 없습니다.
</p>

<h2>기본 iframe</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>URL 파라미터</h2>
<table>
  <thead><tr><th>파라미터</th><th>기본값</th><th>비고</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Binance 종목.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>, <code>5m</code>, <code>15m</code>, <code>1h</code>, <code>4h</code>, <code>1d</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>, <code>light</code>, <code>darkTerminal</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>18가지 유형 중 아무것이나.</td></tr>
    <tr><td><code>indicators</code></td><td><em>없음</em></td><td>쉼표로 구분한 id. 예: <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>트레이딩 패널을 표시합니다.</td></tr>
  </tbody>
</table>

<h2>실제 페이지</h2>
<p>
  문서 화면의 틀 없이 미리 보려면 <a href="{base}/embed">임베드 경로</a>를
  직접 열어 보세요.
</p>

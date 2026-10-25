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

<h2 id="mobile-app">휴대폰 앱 안에서</h2>
<p>
  차트와 위젯은 어떤 WebView에서도 동작합니다: React Native(<code>react-native-webview</code>), Capacitor, Tauri, 네이티브 앱 자체의 WebView. 너비가 641 px 미만이면 위젯이 휴대폰에 맞게 배치됩니다: 툴바에는 종목, 주기, 차트 종류, 지표가 남고 나머지는 “더보기” 안으로 들어갑니다. 드로잉 도구는 차트 위 버튼 뒤에 있고, 메뉴는 아래에서 올라오는 시트로 열리며, 그리드는 차트를 하나씩 탭으로 보여 줍니다. 더 넓어도 들어가지 않는 툴바는 똑같이 합니다. 손가락으로 마우스가 하는 일을 모두 할 수 있습니다.
</p>
<p>페이지에 화면 전체를 덮는 viewport를 지정하세요. 위젯은 시트를 노치와 홈 바에서 떨어뜨리고 화면 키보드 위에 둡니다.</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>대부분의 WebView는 앱이 백그라운드로 가면 페이지가 숨겨졌다고 알립니다. 그러면 차트는 스스로 그리기를 멈추고(<code>pauseWhenHidden</code>), 너무 오래 조용한 스트림은 앱이 돌아올 때 다시 연결됩니다. 알리지 않는 WebView라면 앱에서 일시 정지하세요.</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>스크롤되는 화면 안의 차트는 세로 스와이프를 화면에 맡깁니다.</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>
  Tauri의 콘텐츠 보안 정책이 페이지가 데이터 피드의 호스트에 연결하도록 허용해야 합니다. 위젯에는 추가로, 위젯이 넣는 <code>&lt;style&gt;</code> 요소 하나를 위한 <code>style-src 'unsafe-inline'</code>과 입력란과 체크박스의 작은 아이콘을 위한 <code>img-src data:</code>가 필요합니다. 앞의 것이 없으면 위젯이 스타일 없이 표시되고, 뒤의 것이 없으면 입력란의 아이콘이 사라집니다. 차트 이미지 복사에는 더 필요한 것이 없습니다.
</p>
<pre><code>{`// tauri.conf.json (Tauri 2): the feed's hosts, the widget's styles and icons
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  }
}`}</code></pre>
<p>
  Tauri는 페이지 자체 HTML의 <code>&lt;style&gt;</code> 요소마다 <code>style-src</code>에 nonce를 추가하며(isolation 패턴에서는 해시도 추가합니다), nonce가 있으면 브라우저는 <code>'unsafe-inline'</code>을 무시하므로 위젯의 스타일이 다시 차단됩니다. 페이지의 스타일은 스타일시트 파일에 두거나, <code>dangerousDisableAssetCspModification</code>에 <code>"style-src"</code>를 넣으세요.
</p>
<p>
  차트는 픽셀 비율 최대 2로 그립니다(<code>maxPixelRatio</code>). 화면을 닫을 때 제거하면(<code>chart.destroy()</code>) 캔버스 메모리가 바로 반환됩니다.
</p>

<h2>실제 페이지</h2>
<p>
  문서 화면의 틀 없이 미리 보려면 <a href="{base}/embed">임베드 경로</a>를
  직접 열어 보세요.
</p>

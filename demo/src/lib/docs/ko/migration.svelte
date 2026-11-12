<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>2.0으로 마이그레이션 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas 1.x에서 2.0으로 오면서 코드에 영향을 주는 변경 사항: 베타 설치, 기본 외관과 1.x의 외관을 유지하는 옵션 하나, 제거된 이름과 대신 쓸 이름, 달라진 동작." />
</svelte:head>

<h1>2.0으로 마이그레이션</h1>
<p>
  2.0에서는 차트와 위젯의 기본 외관이 달라졌고, 1.x에서 deprecated였던 이름이 제거되었으며, 네 가지 동작이
  바뀌었습니다. 데이터, 저장한 레이아웃, 지표, 그리기, 트레이딩, 테마는 그대로 이어집니다. 이 페이지는 변경 사항을
  하나씩 짚고 무엇을 해야 하는지 설명합니다.
</p>

<h2 id="install">설치</h2>
<p>
  2.0은 베타입니다. 모든 패키지가 <code>beta</code> 태그로 <code>2.0.0-beta.N</code> 버전으로 배포됩니다.
  2.0이 정식 출시될 때까지 <code>latest</code>는 1.x입니다.
</p>
<pre><code>{`npm install @tradecanvas/chart@beta

# 프레임워크 컴포넌트를 쓴다면 그 패키지도 함께
npm install @tradecanvas/react@beta
npm install @tradecanvas/vue@beta
npm install @tradecanvas/svelte@beta`}</code></pre>

<h2 id="look">기본 외관</h2>
<p>
  차트와 위젯은 그리는 것 주변에 전보다 넓은 여유를 두고 열립니다. 옵션 하나로 1.x의 외관을 유지할 수 있습니다.
</p>
<pre><code>{`// 1.x 그대로의 위젯
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// 1.x 그대로의 직접 만든 차트
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code>(더 작은 컨트롤)는 달라지지 않았습니다.
</p>
<p>기본값에서 달라진 점:</p>
<table>
  <thead><tr><th>대상</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>가장 최근 봉 뒤의 여백</td><td>5칸</td><td>8칸</td></tr>
    <tr><td>가격 위아래의 여백</td><td>높이의 9%</td><td>높이의 11.5%</td></tr>
    <tr><td>단독으로 쓰는 <code>Chart</code>의 봉</td><td>classic</td><td>golden. 몸통이 칸의 62%이며, 위젯이 이미 그리던 방식입니다</td></tr>
    <tr><td>범례 위치(그리기 영역의 모서리에서)</td><td>8 px 안쪽</td><td>12 px 안쪽</td></tr>
    <tr><td>단독 <code>Chart</code>의 숫자(축, 태그, 범례)</td><td>고정폭 글꼴</td><td>시스템 산세리프 글꼴(위젯, 금융 차트와 동일). <code>font: {'{'} family: MONO_FONT_FAMILY {'}'}</code>로 이전 글꼴을 유지할 수 있습니다</td></tr>
    <tr><td>위젯의 간격 <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>Print의 버튼</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>버튼 레이블 양옆의 여백</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  위젯의 모든 크기와 간격은 이제 짝수 픽셀이며, 화면 배율 125%와 150%에서 가는 선은 기기 픽셀 하나 너비로
  그려집니다.
</p>
<p>코드에서 확인할 부분:</p>
<ul>
  <li><code>--tcw-space-*</code>를 덮어쓰는 CSS, 또는 컨트롤이 33 px라고 가정하는 CSS.</li>
  <li><code>rightMargin</code>을 넘기는 코드. 지정한 값은 여전히 우선합니다.</li>
  <li>
    React, Vue, Svelte 컴포넌트는 더 이상 <code>rightMargin: 5</code>를 스스로 설정하지 않습니다. 유지하려면
    <code>options</code>에 <code>density: 'compact'</code>나 <code>rightMargin: 5</code>를 넘기세요.
  </li>
  <li>
    <code>@tradecanvas/core</code>의 <code>PRICE_SCALE_MARGIN</code>이나
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code>을 읽는 코드. 둘 다 값이 바뀌었습니다.
  </li>
</ul>
<pre><code>{`// React. Vue와 Svelte 컴포넌트도 같은 options를 받습니다
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  각 밀도가 정하는 값 전체는 <a href={href('/docs/styling#density')}>스타일링 → 밀도</a>에 있습니다.
</p>

<h2 id="removed">제거된 이름</h2>
<p>모두 1.x에서 deprecated였고, 2.0에는 없습니다.</p>
<table>
  <thead><tr><th>제거됨</th><th>대신 쓸 것</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>: UTC에서 동쪽으로 몇 분인지, 또는 브라우저의 시간대를 쓰려면 <code>null</code></td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>DEFAULT_FONT_FAMILY</code></td><td><code>MONO_FONT_FAMILY</code>: 고정폭 글꼴이며, 더 이상 기본 글꼴이 아닙니다</td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>timeFormatter</code>에서의 <code>TimeFormatContext.kind === 'date'</code></td><td>시간 축은 <code>'year'</code>, <code>'month'</code>, <code>'day'</code>를 줍니다. <code>'date'</code>는 1.x에서 이미 주지 않았고, 이제 타입에서도 빠졌습니다.</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code>과 <code>SessionBreaks.renderLabels()</code>(<code>@tradecanvas/core</code>)</td><td>호출을 지우세요. 둘 다 아무 일도 하지 않았습니다.</td></tr>
    <tr><td>위젯의 문자열 키 <code>replay.barsPerSecond</code></td><td><code>messages</code> 재정의에서 지우세요. 쓰이지 않던 키입니다. 리플레이 속도 문구는 <code>replay.rate</code>입니다.</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone">종목의 <code>timezone</code>은 더 이상 읽지 않습니다</h3>
<p>
  이전 필드는 전혀 읽지 않습니다. <code>timezone</code>만 주는 종목은 <code>symbols</code>,
  <code>resolveSymbol</code>, 피드, 어댑터 어디에서 왔든 이제 자체 시간대가 없는 것으로 다룹니다.
</p>
<ul>
  <li><code>setTimeZone('exchange')</code>와 일봉의 날짜는 시장의 시간대로, 그것도 없으면 UTC로 돌아갑니다.</li>
  <li>종목 자체의 <code>sessions</code>는 음영으로 표시되지 않습니다(시장을 설정했다면 시장의 거래 시간은 표시됩니다).</li>
  <li>종목의 상태는 24시간 거래되는 시장으로 표시되고, 종목 정보 패널에 시간대가 나타나지 않습니다.</li>
</ul>
<p>
  여전히 넘기는 <code>timezone</code>은 <code>getSymbolInfo()</code>에 그대로 남지만 어디에서도 읽지 않습니다.
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">바뀌지 않은 이름</h3>
<p>
  이름이 서로 비슷하니 찾아 바꾸기를 할 때 주의하세요. 위젯의 설정은 여전히 <code>timezone</code>으로 씁니다.
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  위젯의 문자열 키 <code>settings.timezone</code>과 <code>menu.chart.timezone</code>도 이름이 그대로입니다.
</p>

<h3 id="find">찾는 방법</h3>
<p>
  코드에서 <code>Timezone(</code>과 <code>EXCHANGE_TIMEZONE</code>, 그리고 종목 객체 안의 <code>timezone:</code>을
  검색하세요. 제거된 이름은 TypeScript가 하나하나 오류로 알려 줍니다.
</p>

<h2 id="behaviour">달라진 동작</h2>
<p>이름은 그대로이고 동작만 바뀐 것들입니다.</p>
<ul>
  <li>
    <strong>패널 가장자리의 가격 축 레이블.</strong> 패널의 위쪽이나 아래쪽 가장자리에 잘리게 되는 레이블은 그리지
    않습니다. 그 격자선은 남습니다.
  </li>
  <li>
    <strong>패널이 많을 때의 가격 패널.</strong> 지표 패널을 몇 개 열든 가격 패널은 차트 높이의 38.2% 이상을
    유지하고, 열린 패널들은 나머지를 각자의 크기에 비례해 나눠 가집니다. 패널에 지정한 크기는 보존되며, 차트가
    높아지면 다시 그 크기로 보입니다. 전에는 패널이 높이를 유지해서 가격 패널에 높이가 남지 않을 수 있었습니다.
  </li>
  <li>
    <strong>정수 픽셀 사이의 선 너비.</strong> 그런 너비의 선은 그 너비를 넘지 않는 정수 개의 기기 픽셀로
    그려집니다. 1.5 px는 100%에서 기기 픽셀 하나입니다(전에는 둘).
  </li>
  <li>
    <strong><code>setBarLayout()</code>과 <code>setDensity()</code>.</strong> 실행 중에
    <code>chart.setBarLayout()</code>으로 정한 봉 레이아웃은 나중에 <code>setDensity()</code>를 호출해도 유지됩니다.
  </li>
</ul>

<h2 id="unchanged">달라지지 않은 것</h2>
<ul>
  <li>
    데이터: <code>DataAdapter</code>, <code>DataFeed</code>, <code>setData</code>, <code>appendBar</code>,
    <code>updateLastBar</code>.
  </li>
  <li>1.x에서 저장한 레이아웃과 설정은 전과 같이 불러옵니다.</li>
  <li>지표, 그리기, 트레이딩, 테마, 스타일 키의 이름은 그대로입니다.</li>
</ul>

<svelte:head>
  <title>차트 유형 — TradeCanvas 문서</title>
  <meta name="description" content="내장 차트 유형 17종: 캔들스틱, OHLC, 하이킨아시, 렌코, 카기, 포인트 앤 피겨, 이퀴볼륨 등." />
</svelte:head>

<h1>차트 유형</h1>
<p>내장 차트 유형 17종을 제공합니다. 런타임에 <code>chart.setChartType(type)</code>으로 전환합니다.</p>

<h2>기본</h2>
<table>
  <thead><tr><th>유형</th><th>설명</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>전통적인 OHLC 캔들.</td></tr>
    <tr><td><code>bar</code></td><td>OHLC 바(서양식).</td></tr>
    <tr><td><code>line</code></td><td>종가 라인 차트.</td></tr>
    <tr><td><code>area</code></td><td>종가 선 아래를 채운 영역.</td></tr>
    <tr><td><code>baseline</code></td><td>기준 가격 위 / 아래를 두 가지 색으로 채웁니다.</td></tr>
    <tr><td><code>stepLine</code></td><td>계단식 선 — 개별 봉의 종가를 강조합니다.</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>선과 각 데이터 지점의 점.</td></tr>
    <tr><td><code>hollowCandle</code></td><td>종가 &gt; 이전 종가이면 몸통을 비웁니다.</td></tr>
    <tr><td><code>hlcArea</code></td><td>고가-저가 밴드와 종가 선.</td></tr>
  </tbody>
</table>

<h2>파생</h2>
<table>
  <thead><tr><th>유형</th><th>설명</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>하이킨아시 변환으로 평활화한 캔들 시리즈.</td></tr>
    <tr><td><code>renko</code></td><td>고정 가격 벽돌 차트. 시간과 무관합니다.</td></tr>
    <tr><td><code>kagi</code></td><td>퍼센트 임계값에 따라 반전하는 양/음 선.</td></tr>
    <tr><td><code>lineBreak</code></td><td>3선 전환(3-line break) 반전 패턴.</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>X/O 열. 박스 크기 + 반전 칸 수.</td></tr>
    <tr><td><code>rangeBars</code></td><td>각 봉의 고가-저가 폭이 고정된 범위와 같습니다.</td></tr>
  </tbody>
</table>

<h2>거래량 가중</h2>
<table>
  <thead><tr><th>유형</th><th>설명</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>캔들 너비가 거래량에 비례합니다.</td></tr>
    <tr><td><code>equivolume</code></td><td>
      거래량 비중에 비례하는 너비의 전체 범위 박스. 색상은 종가와 이전 종가의 비교로 정해집니다(Richard Arms 방식).
    </td></tr>
  </tbody>
</table>

<h2>런타임 전환</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  변환(하이킨아시, 렌코, 카기, 라인 브레이크, P&amp;F, 레인지 바)은 내부에서
  처리되므로 <code>chart.getData()</code>는 여전히 원본 입력 시리즈를 반환합니다.
</p>

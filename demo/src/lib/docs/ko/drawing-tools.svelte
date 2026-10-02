<svelte:head>
  <title>그리기 도구 — TradeCanvas 문서</title>
  <meta name="description" content="내장 그리기 도구 40종: 추세선, 피보나치 채널과 팬, 쉬프 피치포크, 하모닉 패턴, 갠, 엘리엇 파동, 고정 범위 매물대, 롱/숏 포지션 등." />
</svelte:head>

<h1>그리기 도구</h1>
<p>내장 그리기 도구 40종을 제공합니다. 모든 도구는 자석 스냅, 실행 취소/다시 실행, 완전한 JSON 직렬화를 지원합니다.</p>

<h2>도구 활성화</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>자동 피보나치</h2>
<p>
  클릭 한 번으로 보이는 범위의 주요 스윙(극단 고점과 저점)에 피보나치 되돌림을
  그립니다. 상승 스윙은 저점→고점, 하락 스윙은 고점→저점으로
  고정됩니다. 명령 팔레트("자동 피보나치")에서 실행하거나
  코드로 실행합니다.
</p>
<pre><code>{`chart.autoFib()  // returns the new drawing id, or null if no clear swing

// general drawing append (active style applied, id auto-assigned)
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`}</code></pre>

<h2>도구 목록</h2>

<h3>선</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>horizontalRay</code> — <code>horizontalLine</code>과 같지만 앵커에서 시간상 앞쪽으로만 연장됩니다.</li>
  <li><code>verticalLine</code></li>
  <li><code>crossLine</code> — 한 지점을 지나는 수평선과 수직선(한 번 클릭).</li>
  <li><code>infoLine</code> — 통계 상자가 붙은 추세선: 가격 변화와 %, 봉 수와 시간 범위, 각도.</li>
  <li><code>trendAngle</code> — 화면상의 각도를 도 단위로 표시하는 추세선.</li>
</ul>

<h3>채널</h3>
<ul>
  <li><code>parallelChannel</code></li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>도형</h3>
<ul>
  <li><code>rectangle</code></li>
  <li><code>ellipse</code></li>
  <li><code>triangle</code></li>
  <li><code>circle</code> — 중심점을 찍은 다음 가장자리의 한 점을 찍습니다.</li>
</ul>

<h3>피보나치</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — 두 앵커로 정한 시간 간격에서 피보나치 간격의 수직선을 투영합니다.</li>
  <li><code>fibChannel</code> — A→B가 기준 추세선이고 C가 폭을 정합니다. 그 폭의 피보나치 비율 위치에 평행선을 그립니다.</li>
  <li><code>fibSpeedResistanceFan</code> — A에서 출발해 A→B 움직임의 피보나치 비율 지점을 가격과 시간 양쪽으로 지나는 반직선.</li>
</ul>

<h3>고급</h3>
<ul>
  <li><code>pitchfork</code> — 앤드루스 피치포크.</li>
  <li><code>schiffPitchfork</code> — 중앙선이 A의 시간에서, 가격으로는 A와 B의 중간에서 시작합니다.</li>
  <li><code>modifiedSchiffPitchfork</code> — 중앙선이 A와 B의 중점에서 시작합니다.</li>
  <li><code>cyclicLines</code> — A→B 간격으로 반복되는 수직선.</li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>패턴</h3>
<ul>
  <li><code>xabcdPattern</code> — XB, AC, BD, XD 비율이 표시되는 하모닉 XABCD(가틀리, 배트, 버터플라이, 크랩…).</li>
  <li><code>abcdPattern</code> — BC/AB와 CD/BC 비율이 표시되는 ABCD.</li>
  <li><code>headAndShoulders</code> — 일곱 개의 피벗과, 두 넥 지점을 지나는 넥라인.</li>
  <li><code>elliottWave</code> — 1-2-3-4-5-A-B-C 파동 카운트.</li>
</ul>

<h3>측정</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
  <li><code>dateAndPriceRange</code> — 가격 변화, 봉 수, 시간, 거래량을 상자 하나로 측정합니다.</li>
</ul>

<h3>주석</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
  <li><code>priceLabel</code> — 한 지점에 고정되어 그 가격(또는 <code>style.text</code>)을 보여 주는 말풍선.</li>
</ul>

<h3>포지션</h3>
<ul>
  <li><code>riskReward</code> — "롱/숏 포지션": 진입가에서 손절가까지 드래그하면 방향과 음영 처리된 손익비 영역(기본 2:1)이 자동으로 계산됩니다.</li>
</ul>

<h2>직렬화</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code>는 형식이 잘못된 그림, 주문, 지표를 걸러 냅니다.
  일부만 있거나 손상된 데이터가 더 이상 차트를 망가뜨리지 않습니다.
</p>

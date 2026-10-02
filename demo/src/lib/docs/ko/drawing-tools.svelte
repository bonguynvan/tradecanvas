<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>그리기 도구 — TradeCanvas 문서</title>
  <meta name="description" content="도구마다 고유한 설정을 가진 내장 그리기 도구 69종: 피보나치와 갠 도구, 엘리엇 파동, 하모닉 패턴, 노트, 브러시, 수량 계산을 지원하는 롱/숏 포지션, 그림에 거는 알림, 그룹과 레이어." />
</svelte:head>

<h1>그리기 도구</h1>
<p>
  내장 그리기 도구 69종을 제공합니다. 모든 도구는 자석으로 봉에 스냅되고,
  실행 취소와 다시 실행을 지원하며, 각자의 설정을 유지하고, 레이아웃과 함께 저장됩니다.
</p>

<h2>포인터로 그리기</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // 이후의 클릭으로 추세선을 그림
chart.setDrawingTool(null)          // 커서로 돌아감
chart.setStayInDrawingMode(true)    // 그림을 하나 그린 뒤에도 도구를 유지`}</code></pre>
<p>도구를 그리는 방식은 세 가지입니다.</p>
<ul>
  <li><b>클릭</b> — 점마다 한 번씩 클릭합니다(추세선은 두 번, XABCD 패턴은 다섯 번).</li>
  <li><b>프리핸드</b> — 누른 채 드래그합니다. <code>brush</code>와 <code>highlighter</code>.</li>
  <li><b>경로</b> — 점마다 한 번씩 클릭한 뒤 더블클릭하거나 <kbd>Enter</kbd>를 누르거나 마지막 점을 클릭하면 끝납니다. <code>path</code>와 <code>polyline</code>.</li>
</ul>
<p><kbd>Escape</kbd>를 누르면 아직 끝나지 않은 그림을 버립니다.</p>

<h2>코드로 그림 추가하기</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reverse: true, extendRight: true },
})

chart.autoFib()   // 보이는 범위의 주요 스윙에 그린 되돌림, 없으면 null`}</code></pre>

<h2>설정</h2>
<p>
  스타일(색상, 선 두께, 선 스타일, 채우기, 텍스트) 외에도 도구마다 고유한 설정을
  제공할 수 있습니다. 피보나치 레벨, 선을 왼쪽이나 오른쪽으로 연장하기, 라벨, 배경,
  아이콘, 파동 차수 등입니다. 위젯의 설정 대화상자는 이 설정을 바탕으로 만들어집니다.
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // 도구가 제공하는 설정
chart.getDrawingOptions(id)                   // 현재 값, 기본값으로 채워짐
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// 여러 변경을 하나의 실행 취소 단계로 묶음
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// 변경을 미리 보는 대화상자: 실행 취소 한 단계, 취소하면 원래대로 되돌림
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// 새 피보나치 되돌림이 처음에 갖는 값
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>저장된 레이아웃이나 붙여넣은 그림의 설정은 도구에 맞게 검사되며, 도구가 받지 않는 값은 버려집니다.</p>

<h2>롱/숏 포지션</h2>
<p>
  <code>riskReward</code>: 진입가에서 손절가까지 드래그합니다. 목표가는 손익비만큼 떨어진
  곳에 놓이며, 목표가의 핸들로 손익비를 바꿉니다. 계좌 자금과 리스크(계좌의 퍼센트 또는
  금액)로 수량을 계산하고, 각 선의 가격, 거리, 손익을 보여 줍니다.
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>그림에 거는 알림</h2>
<p>
  알림은 추세선, 반직선, 연장선, 수평선, 또는 평행 채널의 선을 따라가게 할 수 있습니다.
  가격이 그 선의 최신 봉 위치를 교차할 때 발생하며, 선의 위치는 차트에 그려진 대로
  정해집니다(봉 사이는 직선, 로그 눈금에서는 로그 가격 기준).
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>알림은 그림과 함께 움직이고, 실행 취소 시 그림과 함께 돌아오며, 레이아웃과 함께 저장됩니다.</p>

<h2>순서와 그룹</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // 실행 취소 한 단계
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)`}</code></pre>
<p>그룹에 속한 그림 하나를 클릭하면 그룹 전체가 선택됩니다.</p>

<h2>지우개, 확대, 자석</h2>
<pre><code>{`chart.setEraserMode(true)          // 그림을 클릭할 때마다 삭제, Escape를 누를 때까지
chart.setZoomAreaMode(true)        // 다음 드래그로 상자 안의 봉을 확대
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>약한 자석은 포인터가 봉의 시가, 고가, 저가, 종가 가까이에 있을 때 점을 그 값에 스냅하고, 강한 자석은 항상 스냅합니다.</p>

<h2>키보드</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> 실행 취소, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> 또는 <kbd>Ctrl</kbd> + <kbd>Y</kbd> 다시 실행.</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> 그림 복사 및 붙여넣기, <kbd>Ctrl</kbd> + <kbd>D</kbd> 복제, <kbd>Delete</kbd> 삭제.</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> 선택한 그림 그룹화, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> 그룹 해제.</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> 앞으로 가져오기 / 뒤로 보내기, <kbd>Shift</kbd>를 함께 누르면 맨 앞으로 / 맨 뒤로.</li>
  <li><kbd>Enter</kbd> 경로 끝내기, <kbd>Escape</kbd> 도구, 지우개, 선택 해제.</li>
</ul>

<h2>이벤트</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id }
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } 또는 { zoomArea }`}</code></pre>
<p>실행 취소와 다시 실행은 되살리거나, 없애거나, 바꾼 그림에 대해 <code>drawingCreate</code>, <code>drawingRemove</code>, <code>drawingUpdate</code>를 보냅니다.</p>

<h2>도구 목록</h2>

<h3>선</h3>
<ul>
  <li><code>trendLine</code> — 필요하면 왼쪽이나 오른쪽으로 연장됩니다.</li>
  <li><code>ray</code>, <code>extendedLine</code></li>
  <li><code>horizontalLine</code>, <code>horizontalRay</code>(그 점에서 시간상 앞쪽으로), <code>verticalLine</code>, <code>crossLine</code></li>
  <li><code>infoLine</code> — 가격 변화, 봉 수, 시간, 각도를 보여 주는 상자가 붙습니다.</li>
  <li><code>trendAngle</code> — 화면상의 각도가 함께 표시됩니다.</li>
</ul>

<h3>채널</h3>
<ul>
  <li><code>parallelChannel</code> — 선택 사항인 중간선이 있고, 양쪽 어느 방향으로든 연장할 수 있습니다.</li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>피보나치</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — 편집 가능한 레벨, 가격과 퍼센트, 왼쪽 또는 오른쪽 라벨, 배경, 반전.</li>
  <li><code>fibChannel</code>, <code>fibTimeZones</code>, <code>fibSpeedResistanceFan</code></li>
  <li><code>fibArcs</code> — 움직임의 시작점을 중심으로 한 호, 반원 또는 전체 원.</li>
  <li><code>fibCircles</code> — 반지름의 피보나치 배수 위치에 그리는 원.</li>
  <li><code>fibSpiral</code> — 중심에서 뻗어 나가는 황금 나선.</li>
  <li><code>fibWedge</code> — 꼭짓점에서 뻗은 두 선 사이의 호.</li>
</ul>

<h3>갠 및 피치포크</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — 피벗에서 두 점 사이의 레벨을 지나는 반직선.</li>
  <li><code>gannFan</code>, <code>gannBox</code>, <code>gannSquare</code></li>
</ul>

<h3>도형</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code></li>
  <li><code>polyline</code> — 닫힌 도형, 클릭마다 점 하나.</li>
  <li><code>curve</code> — 세 번째 점을 지나며 휘어지는 곡선, <code>arc</code> — 세 점을 지나는 원호.</li>
</ul>

<h3>브러시</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — 프리핸드.</li>
  <li><code>path</code> — 점들을 잇는 선, 끝에 화살표가 붙습니다.</li>
</ul>

<h3>패턴</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — 각 비율이 표시됩니다.</li>
  <li><code>headAndShoulders</code> — 넥라인이 포함됩니다.</li>
</ul>

<h3>엘리엇 파동</h3>
<ul>
  <li><code>elliottWave</code>(1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — 라벨은 파동 차수에 맞는 스타일로 표시됩니다: ①, (1), 1 또는 i.</li>
</ul>

<h3>주기</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>측정</h3>
<ul>
  <li><code>measure</code>, <code>priceRange</code>, <code>dateRange</code>, <code>dateAndPriceRange</code></li>
</ul>

<h3>주석과 표시</h3>
<ul>
  <li><code>text</code>, <code>note</code>(텍스트가 붙은 핀), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code>(위, 아래, 왼쪽 또는 오른쪽, 라벨 포함), <code>flag</code>, <code>icon</code>(별, 하트, 체크, 엑스, 원, 삼각형, 번개)</li>
</ul>

<h3>예측</h3>
<ul>
  <li><code>riskReward</code> — 롱/숏 포지션(위 참고).</li>
  <li><code>forecast</code> — 가격이 목표에 닿으면 초록색, 그 전에 시간이 다 지나면 빨간색이 됩니다.</li>
  <li><code>projection</code> — 움직임을 세 번째 점에서 시작하도록 옮겨 그립니다.</li>
  <li><code>barsPattern</code> — 일부 봉의 복사본을 바, 선, 고가-저가 중 하나로 표시하며, 좌우 반전이나 상하 반전도 할 수 있습니다.</li>
  <li><code>anchoredVWAP</code>, <code>volumeProfileRange</code></li>
</ul>

<h2>저장</h2>
<pre><code>{`const json = chart.saveState()   // 그림과 그 설정 및 그룹, 지표, 알림 등
chart.loadState(json)            // 모든 그림을 검사하며, 형식이 잘못된 그림은 제외됨`}</code></pre>

<h2>사용자 지정 도구</h2>
<p>
  도구는 <code>DrawingPlugin</code>이며,
  <code>chart.registerDrawingTool(plugin)</code>으로 등록합니다. 디스크립터에는 설정(<code>options</code>), 그리는 방식
  (<code>creation</code>), 채우기나 텍스트의 유무를 나열합니다. 또한 선의 가격
  (알림에 쓰이는 <code>priceAt</code>)과 앵커가 아닌 이동 핸들(<code>moveHandle</code>)을
  제공할 수 있고, 차트의 봉 데이터(<code>setDataGetter</code>)를 받을 수도 있습니다.
  <a href={href('/docs/plugins')}>플러그인</a>을 참고하세요.
</p>

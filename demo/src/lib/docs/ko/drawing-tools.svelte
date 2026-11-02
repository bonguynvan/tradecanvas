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

<h2 id="panes">지표 패널 위에</h2>
<p>
  지표 패널(RSI, MACD 등)에서 시작한 그리기는 그 패널 위에 그려집니다. 앵커의 가격은 패널의 값이고, 자석은 패널의 선에 붙으며, 그리기는 패널의 스케일을 따르고 패널 밖으로 나가지 않습니다. 옆 패널과 접힌 패널에는 그릴 수 없고, 봉의 가격을 읽는 도구(앵커드 VWAP, 거래량 프로파일, 롱/숏 포지션)는 가격 패널에서만 쓸 수 있습니다. 패널의 그리기에는 가격 알림을 걸 수 없습니다.
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // RSI 스케일의 70
  paneId: rsi,                          // 패널 id, getIndicatorPanes()가 알려 주는 값
})`}</code></pre>
<p>
  패널을 가진 지표를 지우고 패널 안의 다른 지표가 이어받으면 그리기도 패널과 함께 옮겨 갑니다. 패널이 없어지면 그리기는 숨겨지고, 실행 취소하면 패널과 함께 돌아옵니다. 저장한 레이아웃은 그리기를 원래 패널에 다시 놓습니다.
</p>

<h2 id="text">텍스트</h2>
<p>
  텍스트 도구(텍스트, 노트, 말풍선, 가격 라벨, 화살표 마크)는 같은 글자 스타일을 씁니다. 크기, 굵게, 기울임꼴, 그리고 따로 정하는 글자 색입니다. 텍스트, 노트, 말풍선은 줄을 왼쪽·가운데·오른쪽으로 맞추고, 배경과 테두리를 두며, 정한 너비에서 줄을 바꿀 수 있습니다. 텍스트는 자기 줄 바꿈을 지키고 너비를 정하지 않으면 줄을 바꾸지 않으며, 노트와 말풍선은 240 px에서 줄을 바꿉니다.
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // 텍스트의 줄 바꿈은 그대로
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px. 0이면 텍스트가 줄을 바꾸는 곳에서만
  },
})`}</code></pre>
<p>
  위젯에서는 텍스트, 노트, 말풍선을 그리자마자 내용을 묻습니다. 설정이 텍스트 탭에서 열리고 글자가 선택되어 있으며, 취소를 누르면 그리기가 취소됩니다. 더블 클릭해도 같은 탭이 열립니다. 선택했을 때의 도구 모음에서 채우기와 글자가 있는 도구의 채우기 색과 글자 색을 바꿀 수 있습니다.
</p>

<h3 id="line-text">선과 상자의 텍스트</h3>
<p>
  추세선, 레이, 연장선, 정보선, 각도선, 화살표, 수평선, 수직선, 사각형도 같은 스타일로 텍스트를 가질 수 있습니다. <code>textAlign</code>은 선의 왼쪽 끝, 가운데, 오른쪽 끝에, <code>textVAlign</code>은 선 위, 선 위에 겹쳐, 선 아래에 둡니다. 사각형에서는 안쪽의 위, 가운데, 아래에 둡니다. 텍스트는 선의 기울기를 따르고 항상 왼쪽에서 오른쪽으로, 수직선에서는 아래에서 위로 읽힙니다. 위젯의 텍스트 탭에 이 두 줄이 있습니다.
</p>
<pre><code>{`chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 98 }, { time: t2, price: 104 }],
  style: { color: '#4c8dff', lineWidth: 2, lineStyle: 'solid',
    text: 'Breakout', textAlign: 'right', textVAlign: 'top' },  // 'top' | 'middle' | 'bottom'
})
chart.addDrawing({ type: 'verticalLine', anchors: [{ time: t3, price: 0 }], options: { showTime: true } })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b], options: { trendLine: false, oneColor: true } })`}</code></pre>
<p>
  수평선과 수평 레이는 <code>showPrice: false</code>로 가격을 숨깁니다. 수직선은 <code>showTime: true</code>로 그 봉의 시간을 크로스헤어와 같은 방식으로 표시합니다. 사각형에는 핸들이 여덟 개 있습니다. 모서리마다 하나, 각 변의 가운데에 하나씩이며, 변의 핸들은 그 변만 옮깁니다. 피보나치 되돌림과 확장은 점들을 지나는 점선(<code>trendLine</code>, 기본으로 켜짐)을 그리고, <code>oneColor</code>로 모든 레벨을 드로잉 색으로 그립니다.
</p>

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

<h3 id="settings-dialog">설정 대화상자</h3>
<p>
  위젯에서 그림을 더블 클릭하면(또는 그 그림의 도구 모음, 메뉴, 개체 트리에서 설정을 누르면) 그림의 설정이
  탭으로 나뉘어 열립니다. <strong>스타일</strong>: 한 행에 놓인 선(색상, 두께, 선 모양), 선 끝, 채우기, 이어서 도구의
  스위치와 선택 항목, 그리고 레벨. <strong>텍스트</strong>(글을 쓰는 도구에만 있음): 텍스트와 그 크기.
  <strong>좌표</strong>: 각 점의 가격, 날짜, 시간(차트 시간대 기준). <strong>표시</strong>: 그림이 보이는 시간 단위.
  모든 변경은 바로 반영되며, <strong>확인</strong>은 변경을 하나의 실행 취소 단계로 유지하고, <strong>취소</strong>(또는
  Escape)는 그림을 원래대로 되돌립니다. <strong>템플릿</strong> 메뉴는 저장된 템플릿을 적용하거나 삭제하고, 그림의
  모양을 템플릿으로 저장하고, 설정을 도구의 기본값으로 저장하고, 그 설정을 재설정합니다.
</p>

<h3 id="drawing-intervals">일부 시간 단위에서만 표시</h3>
<p>
  그림도 지표와 같은 규칙으로 일부 시간 단위에서만 보이게 할 수 있습니다. 한 종류를 끄거나
  (<code>minutes: false</code>) 그 범위를 지정합니다(<code>hours: [1, 4]</code>). 다른 시간 단위에서는 그려지지 않고,
  클릭되지 않으며, 선택되지 않습니다. 규칙은 레이아웃과 함께 저장됩니다.
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // 분봉에서는 표시하지 않음
chart.isDrawingShown(id)                                    // 5m 차트에서는 false
chart.updateDrawing(id, { intervals: null })                // 다시 모든 시간 단위에 표시

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>스트림 없이 Chart를 직접 쓸 때는 <code>chart.setDataTimeframe('5m')</code>로 봉의 시간 단위를 알려 주세요.</p>

<h3 id="line-stats">선의 끝, 중간점, 통계</h3>
<p>
  추세선, 반직선, 연장선은 중간점과, 두 점 사이의 통계를 표시할 수 있습니다. 가격의 변화와 그 퍼센트, 두 점 사이의
  봉 수와 시간, 각도입니다. 통계는 선이 선택되어 있는 동안 또는 항상 표시되며, 오른쪽 끝, 중간점, 왼쪽 끝 중 한 곳
  옆에 놓입니다. 추세선의 끝은 화살표로 만들 수 있습니다. 모두 켜기 전까지는 꺼져 있습니다.
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // 추세선: leftEnd, rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">선택한 그림 위의 도구 모음</h2>
<p>
  위젯에서 그림을 클릭하면 바로 위에 작은 도구 모음이 나타납니다: 색, 선 두께와 선 모양, 이어서 설정, 그 선에 거는 알림, 잠금, 그림의 전체 메뉴(오른쪽 클릭과 같음), 삭제. 여러 그림을 선택하면 모두의 위에 놓이고 변경은 각각에 적용됩니다. 그림을 옮기거나 이동·확대할 때 따라가고, 그리기 도구·지우개·영역 확대가 켜져 있으면 비켜나며, 화살표 키로 이동하는 하나의 탭 정지점입니다.
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

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
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // 실행 취소 한 단계
chart.removeAll('drawings')         // 모든 그리기. 'indicators', 둘 다는 'all': 실행 취소 한 단계, 잠긴 그리기는 남음
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // 선택한 그림(Ctrl+C)
chart.pasteDrawings()                // Ctrl+V, 이 차트나 페이지의 다른 차트에
chart.canPasteDrawings()             // 붙여넣을 것이 있는지`}</code></pre>
<p>그룹에 속한 그림 하나를 클릭하면 그룹 전체가 선택됩니다.</p>
<p>위젯의 객체 트리에서 드로잉 이름을 클릭하면 선택되고, 더블클릭하면 이름을 바꿉니다. 행의 버튼으로 복제하고, 그립을 끌어 다른 행의 순서 자리로 옮깁니다. 그립에서 화살표 키를 누르면 한 칸씩 움직입니다.</p>

<h2>지우개, 확대, 자석</h2>
<pre><code>{`chart.setEraserMode(true)          // 그림을 클릭할 때마다 삭제, Escape를 누를 때까지
chart.setZoomAreaMode(true)        // 다음 드래그로 상자 안의 봉을 확대
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>약한 자석은 포인터가 봉의 시가, 고가, 저가, 종가 가까이에 있을 때 점을 그 값에 스냅하고, 강한 자석은 항상 스냅합니다. 위젯에서는 자석이 꺼진 채로 시작합니다. 자석 버튼으로 켜기 전까지 그리기는 놓은 자리에 그대로 있습니다.</p>

<h2 id="editing">포인터와 키로 편집하기</h2>
<ul>
  <li>핸들을 끌거나 드로잉 전체를 옮길 때도 자석이 작동합니다. 잡은 곳에서 가장 가까운 점이 가격에 붙고, 나머지 점은 그 점과의 위치를 유지합니다. 약한 자석은 50 px까지 닿습니다.</li>
  <li>그리거나 끄는 동안 <kbd>Ctrl</kbd>/<kbd>⌘</kbd>를 누르고 있으면 그동안 자석이 뒤집힙니다. 꺼져 있으면 켜지고, 켜져 있으면 꺼집니다.</li>
  <li>그리거나 핸들을 끄는 동안 <kbd>Shift</kbd>를 누르고 있으면 선이 화면에서 수평, 수직 또는 45°로 유지됩니다. 차트의 빈 곳에서는 <kbd>Shift</kbd> + 끌기가 여전히 측정입니다. 선과 경로에 적용되며, 사각형, 채널의 폭, 피치포크의 점은 자유롭습니다.</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>는 선택한 드로잉을 가로로 봉 하나, 위아래로 1픽셀 옮깁니다. <kbd>Shift</kbd>를 함께 누르면 10입니다. 연달아 누른 것은 실행 취소 한 번이고, 잠긴 드로잉은 움직이지 않습니다.</li>
  <li>드로잉 위에서 <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 끌기는 복사본을 끌어냅니다(드로잉이 선택에 들어 있으면 선택 전체). 실행 취소는 한 번입니다. <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 클릭은 여전히 선택에 넣거나 빼고, 빈 곳에서 <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 끌기는 선택 상자를 그립니다. 선택한 드로잉의 핸들 위에서는 <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 끌기가 자석을 뒤집은 채 모양을 바꿉니다.</li>
</ul>

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

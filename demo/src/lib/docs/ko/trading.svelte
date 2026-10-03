<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>트레이딩 오버레이 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas 트레이딩 오버레이로 포지션, 주문, 신호 마커, 거래 구간을 차트에 직접 렌더링합니다." />
</svelte:head>

<h1>트레이딩 오버레이</h1>
<p>
  포지션, 주문, 신호 마커, 거래 구간을 차트에 직접 렌더링합니다.
  수동 트레이딩과 알고리즘 트레이딩 흐름 모두에 통합할 수 있도록 설계되었습니다.
</p>

<h2>트레이딩 비활성화</h2>
<p>
  트레이딩 오버레이는 기본적으로 켜져 있지만, 오른쪽 클릭 주문 메뉴는 기본적으로 꺼져 있습니다(1.3부터).
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  메뉴가 없으면 차트에서 브라우저 기본 오른쪽 클릭이 정상적으로 동작합니다.
</p>

<h2>포지션</h2>
<pre><code>{`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`}</code></pre>

<h2>주문</h2>
<pre><code>{`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`}</code></pre>

<p>가격선을 드래그해 주문을 수정하고, <code>chart.on('orderModify', ...)</code>로 변경을 구독합니다.</p>

<h2>실시간 실행 (어댑터 연결)</h2>
<p>
  기본적으로 차트는 백엔드를 위해 주문/포지션 의도(<code>orderPlace</code>,
  <code>orderModify</code>, <code>orderCancel</code>, <code>positionModify</code>,
  <code>positionClose</code>)를 <em>발생시킬</em> 뿐, 직접 거래하지는 않습니다.
  <code>ExecutionAdapter</code>를 연결하면 차트는 이 의도를 어댑터로 전달하고,
  어댑터가 돌려주는 확정된 주문/포지션을 렌더링합니다(어댑터가
  단일 진실 공급원입니다).
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))
// chart.disconnectExecution()`}</code></pre>
<p>
  실제 브로커 / OMS를 연결하려면 <code>ExecutionAdapter</code>(<code>DataAdapter</code>와 같은 구조)를
  구현하세요: <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, 그리고 <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> 이벤트.
  <code>PaperExecutionAdapter</code>는 데모와 테스트를 위한 가상 체결 샌드박스입니다.
</p>

<h2>차트에서 주문과 포지션 다루기</h2>
<p>
  주문선과 포지션선의 오른쪽 끝에는 작은 버튼이 있습니다. <strong>×</strong>는 주문을
  취소하거나 포지션을 청산하고, <strong>⇅</strong>는 포지션을 반전하며, 손절선이나 익절선의
  ×는 해당 선을 제거합니다. 이 버튼들은 API와 같은 의도(<code>orderCancel</code>,
  <code>positionClose</code>, <code>positionReverse</code>, <code>null</code>을 넘긴
  <code>positionModify</code>)를 발생시키므로, 연결된 어댑터가 이를 처리하고 어댑터가 없는
  호스트 앱은 이벤트를 받습니다. 버튼은 그 위에서 손을 뗄 때 동작하며, 누른 채로 버튼
  밖으로 벗어나면 아무 동작도 하지 않습니다. <code>setTradingConfig</code>의 <code>lineButtons</code>로
  원하는 버튼을 끌 수 있습니다.
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent('pos-1', { stopLoss: null }) // null removes the stop`}</code></pre>
<p>
  한 번에 반전할 수 있는 어댑터는 <code>reversePosition</code>을 구현합니다.
  구현하지 않으면 차트가 포지션을 청산한 뒤 반대 방향으로 시장가 주문을 보냅니다.
  주문에는 <code>stopLoss</code>, <code>takeProfit</code>,
  <code>timeInForce</code>(<code>'gtc'</code> 또는 <code>'day'</code>)를 지정할 수 있으며,
  이 값은 주문으로 생긴 포지션에 그대로 이어집니다.
</p>
<p>
  <strong>어댑터 작성자를 위한 참고:</strong> <code>PositionModifyIntent</code>에서
  <code>stopLoss: null</code>(또는 <code>takeProfit: null</code>)은 제거를 뜻하고,
  필드가 없으면 그대로 둔다는 뜻입니다. <code>intent.stopLoss ?? position.stopLoss</code>처럼
  작성한 코드는 사용자가 제거한 손절을 그대로 남겨 둡니다.
</p>

<h2>차트 위의 체결</h2>
<p>
  체결은 해당 봉 위에 작은 표시로 나타납니다. 포지션을 연 체결은 속이 찬 표시,
  포지션을 닫은 체결은 속이 빈 표시입니다. 차트는 어댑터가 보고한 체결을 기록하고,
  체결 이유(<code>'order'</code>, <code>'close'</code>, <code>'reverse'</code>,
  <code>'stopLoss'</code>, <code>'takeProfit'</code>)와 실현 손익을 담아
  <code>executionFill</code>을 발생시킵니다.
</p>
<pre><code>{`chart.on('executionFill', (e) => {
  const { side, price, quantity, reason, pnl } = e.payload
})

chart.addFill({ orderId: 'o-7', side: 'buy', price: 64_150, quantity: 1, time: Date.now() })
chart.getFills()        // the latest 1000
chart.getRealisedPnl()  // every fill's P&L since the last clearFills
chart.clearFills()
chart.setTradingConfig({ fillMarks: false })  // no marks`}</code></pre>

<h2>오른쪽 클릭 메뉴와 가격 축의 “+”</h2>
<p>
  차트를 오른쪽 클릭하면 클릭한 영역(<code>'plot'</code>, <code>'pane'</code>,
  <code>'priceAxis'</code>, <code>'timeAxis'</code>)과 그 위치의 가격, 시간을 담은
  <code>chartContextMenu</code>가 발생합니다. <code>features.priceAxisAddButton</code>을 켜면
  가격 축을 따라 십자선을 따라다니는 “+”가 나타나고, 이를 누르면 그 가격을 담은
  <code>priceAxisAdd</code>가 발생합니다.
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget의 메뉴는 이 이벤트를 바탕으로 만들어집니다. 플롯 영역을 오른쪽 클릭하면 그 가격의
  알림, 매수와 매도(체결을 기다리는 쪽이면 지정가, 반대쪽이면 스톱), 주문 티켓, 수평선,
  보기 재설정, 그림 관련 항목이 나옵니다. 가격 축에서는 눈금 전환, 시간 축에서는 보기 재설정과
  날짜로 이동이 나옵니다. <code>chartMenuItems</code>로 직접 항목을 추가할 수 있습니다
  (<a href={href('/docs/api')}>API 레퍼런스</a> 참고).
</p>

<h2>주문 티켓과 계좌 패널 (ChartWidget)</h2>
<p>
  위젯의 영수증 버튼을 누르면 차트 아래에 계좌 패널이 열립니다. 보유 포지션과 손익,
  대기 주문, 지금까지의 체결과 실현 손익이 표시되며, 각 행에서 청산, 반전, 취소를 할 수
  있습니다. <strong>새 주문</strong>을 누르면 주문 티켓이 열립니다. 매수 또는 매도,
  시장가·지정가·스톱, 수량, 가격, 선택 사항인 손절과 익절, 주문 유효 기간을 정합니다.
  입력하는 동안 주문을 검사하고(매수 지정가는 시장가보다 아래, 손절은 진입가 기준 손실 쪽…)
  손익비를 보여 줍니다. 주문을 넣으면 <code>orderPlace</code> 의도가 전송됩니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.`}</code></pre>
<p>
  체결 표시는 차트에 표시된 종목에 속합니다. 위젯에서 종목을 바꾸면 다음 종목은 체결 표시
  없이 시작합니다.
</p>

<h2>드래그로 주문 만들기</h2>
<p>
  드래그할 수 있는 주문선 하나를 시작해 원하는 가격으로 끌어다 놓고 확정합니다. 주문 유형
  (지정가 또는 스탑)은 현재 가격 대비 놓은 위치로 결정됩니다.
  <code>connectExecution</code>과 함께 쓰면 확정된 초안이 즉시 체결됩니다.
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>브래킷 주문 (드래그해서 주문)</h2>
<p>
  진입가와 손절·익절 구간으로 이루어진 드래그 가능한 브래킷을 시작한 다음,
  세 개의 선을 드래그해 진입가, 리스크, 보상을 조정합니다. <kbd>Enter</kbd>
  (또는 주문 버튼)로 확정하고 <kbd>Esc</kbd>로 취소합니다. 위젯에서는
  도구 모음의 초록/빨강 화살표로 롱/숏 브래킷을 시작합니다. 차트는
  백엔드가 처리할 <code>bracketPlace</code> 이벤트 하나만 발생시키며,
  직접 주문을 내지는 않습니다.
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, riskReward } = e.payload
  // submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

chart.confirmBracket()  // same as Enter
chart.cancelBracket()   // same as Esc`}</code></pre>

<h2>호가창 (클릭해서 거래)</h2>
<p>
  필요할 때 켜는 호가창은 호가를 매수/매도 잔량 열이 있는 가격 행으로
  보여 줍니다. 매도 셀을 클릭하면 그 가격에 매수하고, 매수 셀을 클릭하면 매도합니다.
  <code>depthLadder: true</code>로 활성화하고 <code>widget.setDepth</code>로
  호가 데이터를 넘깁니다. 클릭하면 OMS를 위한 <code>orderPlace</code> 의도가
  발생합니다(차트는 직접 거래하지 않습니다). 같은 데이터로 차트 위의
  심도 오버레이도 그립니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>유동성 히트맵</h2>
<p>
  호가 스냅샷을 캔들 뒤의 히트맵으로 누적합니다. 각 스냅샷은
  세로 띠 하나가 되며, 가격 레벨별 대기 잔량이 밝게 표시됩니다
  (매수는 초록, 매도는 빨강). 오랫동안 유지되는 유동성 벽이 두드러져 보입니다.
  설정 창(또는 <code>chart.setDepthHeatmapVisible</code>)에서 켜고 끄며,
  <code>widget.setDepth</code>는 호가가 갱신될 때마다 스냅샷을 기록합니다.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()`}</code></pre>

<h2>신호 마커</h2>
<p>봇이나 신호 트레이딩 연동에서 오버레이에 방향 화살표를 표시할 수 있습니다.</p>
<pre><code>{`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})

// A marker under the pointer, and a click on one
chart.on('signalMarkerHover', (e) => showNote(e.payload.marker, e.payload.x, e.payload.y))  // marker null: off it
chart.on('signalMarkerClick', (e) => openSignal(e.payload.marker))`}</code></pre>
<p>
  ChartWidget에서는 포인터 아래에 있는 마커 옆에 메모가 표시됩니다. 레이블과 출처, 방향, 가격,
  신뢰도, 시각이 나옵니다.
</p>

<h2>거래 구간</h2>
<p>진입 → 청산 사각형을 손익 색상과 방향 배지로 시각화합니다.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`}</code></pre>

<h2>포지션 라벨 토큰</h2>
<p>
  포지션마다 차트에 표시되는 라벨을 사용자 지정합니다. <code>positionLabel</code>은
  템플릿 문자열 또는 문자열을 반환하는 함수를 받습니다.
</p>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  사용 가능한 토큰:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>손익 그라데이션 기준점</h2>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`}</code></pre>

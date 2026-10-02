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
})`}</code></pre>

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

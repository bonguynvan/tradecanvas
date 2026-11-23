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
<pre><code>{`chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
}])`}</code></pre>

<p>
  각 선의 오른쪽 끝, 가격 축 옆에 태그가 붙습니다. 진입가 태그에는 수량, 방향, 평가 손익이 표시되고 그다음
  <strong>⇅</strong>와 <strong>×</strong>가 있습니다. 손절과 익절 태그에는 가격이 그곳에 닿았을 때의 손익이 표시됩니다.
  모든 가격은 축에도 표시됩니다. 서로 겹칠 태그는 나란히 놓이고, 축의 태그는 서로 비켜 섭니다. 손절이나 익절은 선이나
  태그를 끌어 옮깁니다.
</p>
<p>
  손절이나 익절이 없는 포지션은 진입가 태그에 <strong>SL</strong> 또는 <strong>TP</strong> 버튼이 있습니다. 누른 채
  새 선을 원하는 곳으로 끌거나, 그냥 클릭해 시작 위치에 둡니다. 손절은 진입가에서 1% 떨어진 곳에서, 익절은 손절 거리의
  두 배에서 시작하며(브래킷과 같습니다), 둘 다 현재 가격에서 최소 1% 너머에서 시작하므로 정하자마자 닿는 일은 없습니다.
  놓으면 손절을 끌 때처럼 <code>positionModify</code>가 전송되므로 연결된 실행 어댑터가 이를 적용합니다.
  <code>lineButtons: {'{'} addStops: false {'}'}</code>로 버튼을 숨길 수 있습니다.
  선을 가격으로 끄는 동안에는 십자선이 수평선을 그리지 않고 가격 축에도 가격을 적지 않습니다. 가격은 그 선의 태그에 있습니다.
  손으로 정한 가격은 시장의 가격 눈금에 맞춰집니다. 끌어 옮긴 주문·손절·익절·익절 단계, 브래킷과 초안 주문의 선, 끌어 옮긴 알림, 오른쪽 클릭이나 가격 축 옆 “+”가 주는 가격이 그렇습니다. 시장의 호가 단위(<code>setMarket</code>, 또는 종목의 <code>minTick</code>)에, 없으면 가격 축이 보여 주는 소수 자릿수에 맞춥니다: <code>chart.roundPrice</code>입니다. 십자선도 포인터 아래 가격을 같은 눈금으로 적으므로, 보이는 가격이 곧 옆의 “+”가 주문을 내는 가격입니다.
  그날의 상한가와 하한가가 있는 시장(<code>setPriceLimits</code>)에서는 주문 자체의 가격도 그 안에 머뭅니다. 넘겨 끌어도 주문의 선은 상한가나 하한가에서 멈추고, 브래킷의 진입가와 초안 주문은 그 안에서 시작해 그 안에 남으며, 메뉴는 그 밖에서는 주문을 제안하지 않고, 호가창도 그 밖에서는 주문을 내지 않습니다. 포지션의 손절·익절·익절 단계는 묶이지 않습니다. 그날의 주문이 아니기 때문입니다.
</p>
<p>
  포지션, 주문과 그 체결은 숨길 수 있고, 그 선은 잠글 수 있습니다. 숨기면 어느 것도 그려지지 않고 누를 수도 없지만, 그대로
  보관되고 실행 어댑터를 계속 따르며, 내고 있는 브래킷이나 주문은 여전히 보입니다. 잠그면 선이나 태그를 끌 수 없고 포지션에서
  SL이나 TP를 끌어낼 수도 없지만, 버튼(청산, 취소, 반전, 트레일, 스톱 제거)은 그대로 동작합니다. 위젯에서는 그리기
  사이드바의 숨기기와 잠금 버튼 메뉴로 합니다.
</p>
<pre><code>{`chart.setTradingVisible(false)   // isTradingVisible()
chart.setTradingLocked(true)     // isTradingLocked()
chart.setIndicatorsVisible(ids, false)   // 여러 지표를 한 번에, 실행 취소 한 단계로`}</code></pre>

<h2>주문</h2>
<pre><code>{`chart.setOrders([{
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
  stopLoss: 66_000,      // dotted until it fills
  takeProfit: 64_500,
}])`}</code></pre>

<p>
  주문 태그에는 수량과 종류(<code>0.25</code>, <code>Sell limit</code>), 그리고 취소용 <strong>×</strong>가
  표시되고, 가격 축의 태그에는 축과 같은 방식으로 쓴 가격이 표시됩니다. 손절과 익절을 달고 진입하는 주문은 그것들을
  점선으로, 닿았을 때의 손익과 함께 보여 줍니다. 선이나 태그를 끌어 주문을 수정하고, <code>chart.on('orderModify', ...)</code>로
  변경을 구독합니다.
</p>

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

chart.on('executionError', (e) => toast(e.payload.message))   // e.payload.command: the intent that failed
// A confirmed bracket goes to it too: see Bracket orders
// chart.disconnectExecution()`}</code></pre>
<p>
  실제 브로커 / OMS를 연결하려면 <code>ExecutionAdapter</code>(<code>DataAdapter</code>와 같은 구조)를
  구현하세요: <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, 그리고 <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> 이벤트.
  <code>PaperExecutionAdapter</code>는 데모와 테스트를 위한 가상 체결 샌드박스입니다.
</p>

<h3 id="order-outcome">주문이 어떻게 되었는지</h3>
<p>
  요청된 모든 주문은 고유한 ID인 <code>clientOrderId</code>와 함께 나갑니다. 주문에 이미 있던 것, 없으면 차트가 부여한 것이며,
  <code>placeOrderIntent</code>는 보낸 그대로의 주문을 반환합니다. 어댑터가 답할 때까지 주문은 전송 중입니다. <code>orderPlaced</code>는
  어댑터가 주문을 받았음을, 그로부터 만든 주문과 함께 알립니다. <code>command: 'orderPlace'</code>와 같은 <code>clientOrderId</code>를 가진
  <code>executionError</code>는 거부되었음을 알립니다. 어댑터의 <code>placeOrder</code>는 어느 쪽으로든 끝나야 합니다: 주문으로 resolve하거나,
  이유와 함께 reject합니다. 이 ID를 받는 브로커에게는 그대로 전달하고, 같은 ID가 다시 오면 이미 만든 주문으로 답하세요.
  그러면 두 번 전송된 한 번의 누름도 주문 하나가 됩니다(모의 계좌가 그렇게 합니다).
</p>
<pre><code>{`const sent = chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1 })
chart.on('orderPlaced', (e) => { if (e.payload.intent.clientOrderId === sent?.clientOrderId) done(e.payload.order) })
chart.on('executionError', (e) => { if (e.payload.clientOrderId === sent?.clientOrderId) failed(e.payload.cause) })`}</code></pre>

<h3 id="order-kinds">함께 동작하는 주문, 그리고 주문의 유효 기간</h3>
<p>
  주문의 의도(<code>chart.placeOrderIntent</code>, 어댑터의 <code>placeOrder</code>)는 가격 말고도 더 많은 것을
  알려 줍니다:
</p>
<ul>
  <li>
    <strong><code>ocoGroup</code></strong>: 하나가 나머지를 취소하는 주문들이 함께 쓰는 이름입니다. 같은 청산을 위한
    목표가 주문과 스톱 주문이 그 예입니다. 하나가 체결되면 그룹의 나머지는 취소됩니다. 차트에서 이 주문들의 태그에는
    OCO라고 적힙니다.
  </li>
  <li>
    <strong><code>timeInForce</code></strong>: <code>'gtc'</code>(취소할 때까지 유효), <code>'day'</code>,
    <code>'gtd'</code>(정한 날짜까지 유효: <code>expireTime</code>, 밀리초), 그리고 즉시 체결되거나 아예 체결되지 않는
    주문을 위한 <code>'ioc'</code> 또는 <code>'fok'</code>.
  </li>
  <li>
    <strong><code>type: 'stopLimit'</code></strong>: <code>stopPrice</code>는 주문이 동작하기 시작하는 가격이고
    <code>price</code>는 그 뒤에 동작하는 지정가입니다. 차트에서 이 주문의 선은 지정가이고, 스톱에는 STOP 태그가 붙은 일점쇄선이 따로 그려지며 그 가격이 가격 축에 적힙니다.
    주문의 선을 끌면 간격을 유지한 채 둘 다 움직이고, 스톱의 선이나 그 태그를 끌면 스톱만 움직입니다.
    이때 <code>orderModify</code>는 <code>newPrice</code>와 함께 <code>newStopPrice</code>를 담으며, 모의 계좌는 그대로 따릅니다.
  </li>
</ul>
<pre><code>{`// A target and a stop for one exit: whichever fills first takes the other off
chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 66_000, quantity: 1, ocoGroup: 'exit' })
chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 63_000, stopPrice: 63_000, quantity: 1, ocoGroup: 'exit' })

// Works until midnight UTC
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1, timeInForce: 'gtd', expireTime: Date.UTC(2027, 0, 1) })`}</code></pre>
<p>
  모의 계좌는 각각에 대해 브로커가 할 일을 합니다. 그룹에서는 먼저 체결된 주문이 나머지를 취소합니다.
  스톱 리밋 주문은 가격이 스톱에 닿으면 <code>price</code>의 지정가 주문이 되고, 그 지정가 안에서만
  체결됩니다(스톱에 닿은 가격이 그 안에 있으면 그 가격에). <code>'gtd'</code> 주문은
  <code>setMarkPrice</code>에 준 시각이 그 날짜에 이르면 내려가고(시각을 주지 않으면 시계의 시각),
  날짜가 이미 지난 주문은 거부됩니다. <code>'ioc'</code> 또는 <code>'fok'</code> 지정가 주문은 현재 있는 가격이
  지정가 안에 있으면 그 가격에 즉시 체결되고, 그렇지 않으면 거부됩니다(<code>executionError</code>). 모의 시장에는 자체 물량이 없어서,
  물량을 주지 않는 한(<a href="#partial-fills">아래</a>) 거기서는 둘이 같습니다. 위젯의 주문 티켓은 지정가 주문에 둘 다 제공하고, 계좌 패널은
  그룹에 속한 주문 옆에 OCO를, 날짜가 있는 주문에는 그 날짜를 적습니다. <code>'day'</code>는 시장의 하루가 언제 끝나는지 아는 앱에 맡깁니다.
  티켓은 지정가 주문과 스톱 주문에 기한 지정을 제공합니다. 차트의 시계 기준으로 날짜와 시각을 고르며, 처음에는 지금부터 하루 뒤입니다. 기한이 지난 주문은 내지 않습니다.
  IOC·FOK 지정가 주문은 시장가를 넘어선 가격으로 낼 수 있습니다. 체결은 시장가에서 이루어지며, 티켓은 금액과 위험, 목표를 그 가격에서 계산합니다.
  티켓은 스톱 리밋 주문도 받으며, 스톱 가격과 지정가를 입력합니다. 취소할 때까지, 당일, 또는 기한 지정으로 낼 수 있습니다. 스톱 가격에서 지정가 사이 어디서든 체결될 수 있으므로 손절은 스톱 가격 바깥에, 익절은 지정가 바깥에 둡니다. 계좌 패널은 주문 종류와 두 가격을 스톱 가격부터 적습니다.
</p>
<p>
  <strong>하나의 순포지션.</strong> 기본적으로 모의 계좌는 체결된 주문마다 포지션을 하나씩 열며, 매수 포지션이
  매도 포지션 옆에 놓입니다(<code>positions: 'hedge'</code>). <code>{`new PaperExecutionAdapter({ positions: 'net' })`}</code>는
  선물 계좌처럼 포지션을 하나만 유지합니다: 같은 방향의 체결은 가격의 평균으로 포지션에 더해지고,
  반대 방향의 체결은 포지션에서 덜어 내며 그 부분을 실현하고(체결의 <code>pnl</code>), 더 큰 체결은 포지션을
  뒤집어 나머지가 체결 가격에서 열립니다. 포지션에 더하는 체결은 손절·익절이 있으면 그것을 가져오고,
  덜어 내는 체결은 포지션의 손절·익절을 그대로 두며, 뒤집는 체결은 자신의 것을 가져옵니다.
</p>
<h3 id="partial-fills">부분 체결되는 주문</h3>
<p>
  지정가 주문은 시장에 놓여 있다가 다른 주문이 다가오는 대로 체결되며, 흔히 한 번에 일부씩 체결됩니다.
  <code>fillSize</code>를 주면 모의 계좌는 한 가격에서 지정가 주문을 그 수량까지만 체결합니다: 더 큰 주문은
  지정가에 닿는 가격마다(<code>setMarkPrice</code>마다) 일부가 체결되고, 나머지는 계속 대기합니다.
  주문은 <code>filledQuantity</code>와 함께 <code>chart.getOrders()</code>에 남습니다. 각 부분은
  별개의 체결(<code>executionFill</code>)이고, 그 <code>remaining</code>은 그 체결이 대기 상태로 남긴 수량이며,
  마지막 부분이 주문을 내립니다. 차트는 체결된 수량을 주문의 태그에(<code>2/5</code>),
  위젯의 계좌 패널은 주문의 행에 적습니다. 주문의 손절과 목표가 태그는 주문의 나머지가 낼 손익을
  알려 줍니다. 체결된 부분은 자체 태그를 가진 포지션이기 때문입니다.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({ fillSize: 2 })   // two of a limit order at each price
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 })

chart.on('executionFill', (e) => console.log(e.payload.quantity, e.payload.remaining))   // 2 3, then 2 1, then 1 undefined
chart.on('ordersChange', (e) => console.log(e.payload.orders[0]?.filledQuantity))        // 2, 4, then no order`}</code></pre>
<p>
  한 주문의 부분들은 가격의 평균으로 하나의 포지션을 만듭니다. 순포지션 계좌에서는 그 계좌의 포지션에
  더해지거나 거기서 덜어 냅니다. 포지션은 첫 부분에서 주문의 손절, 익절, 레벨을 받으며,
  뒤의 부분은 이를 다시 가져오지 않습니다: 그 뒤에 옮기거나 없앤 손절은 둔 그대로
  남습니다. 포지션이 청산된 뒤에 체결되는 부분은 다시 주문의 손절·익절과 함께 새 포지션을 엽니다. 레벨은
  전체 계획을 기준으로 한 수량이므로 처음 부분들만으로는 그 수량에 못 미칠 수 있습니다: 레벨은 열려 있는 수량까지만 가져갑니다. 스톱 리밋 주문도
  지정가로 동작하기 시작하면 부분 체결됩니다. 각 부분은 자신의 수수료를 내며, 계좌가 더는 감당할 수 없는 부분은 주문의 남은 수량을
  취소합니다(<code>executionError</code>). 남은 수량은 옮기거나, 취소하거나, 그 날짜에 끝날 수 있고, 첫
  부분이 주문 그룹의 나머지를 취소합니다. <code>'ioc'</code> 주문은 즉시 체결되는 만큼 체결되고
  나머지는 버려집니다(그 체결의 <code>dropped</code>가 버려진 수량을 알려 주고, <code>quantity</code>는 요청한 것보다 적습니다.
  <code>placeOrder</code>가 돌려주는 주문에는 <code>filledQuantity</code>가 있습니다. 로그는 나머지를 취소로 기록하고,
  위젯은 얼마나 체결되었는지 알립니다). 물량보다 큰 <code>'fok'</code> 주문은 거부됩니다. 시장가 주문과
  스톱은 청산과 마찬가지로 전량 체결됩니다: 모의 시장은 이를 현재 있는 가격에 받으며, 슬리피지를 모델링하지 않습니다.
  직접 만든 어댑터도 브로커의 부분 체결을 같은 방식으로 보고합니다: <code>orders</code>에
  <code>filledQuantity</code>가 있는 주문을, 그리고 부분마다 <code>fill</code>을 하나씩.
</p>

<h3 id="take-profit-levels">분할 익절</h3>
<p>
  포지션은 나누어 청산할 수 있습니다. 주문의 의도나 포지션
  (<code>chart.modifyPositionIntent</code>)에 주는 <code>takeProfits</code>는 레벨의 목록이며, 각 레벨은 <code>price</code>와
  거기서 청산되는 <code>quantity</code>입니다. 가격이 레벨에 닿으면 그 부분이 레벨의 가격에 청산되고
  레벨은 사라집니다. 레벨이 남긴 수량은 열린 채로 남아 <code>takeProfit</code>이나 손절이 청산합니다.
  손절은 어떤 레벨이 기다리고 있든 남은 전부를 청산하고, 익절을 지난 레벨에는 결코
  닿지 않으며, 레벨은 아직 열려 있는 수량까지만 가져갑니다.
  차트는 레벨마다 선과 태그를 그리고(TP1이 가장 가까운 레벨입니다) 그 부분과 그것이 낼 손익을 적으며,
  위젯의 계좌 패널은 가장 가까운 레벨과 그 밖에 몇 개가 더 있는지 적습니다.
</p>
<pre><code>{`chart.placeOrderIntent({
  side: 'buy', type: 'market', price: 64_000, quantity: 3,
  stopLoss: 63_000,
  takeProfits: [{ price: 65_000, quantity: 1 }, { price: 66_000, quantity: 1 }],   // a third at each
  takeProfit: 67_000,                                                              // the rest
})

chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: [{ price: 65_500, quantity: 2 }] })   // all of them, anew
chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: null })                               // none`}</code></pre>
<p>
  모의 계좌는 부분들을 청산하고(부분마다 체결 하나, <code>reason: 'takeProfit'</code>과 실현한
  손익을 담아) 이를 포지션의 <code>closedQuantity</code>에 셉니다. 진입가에서 볼 때 이익인 레벨만
  받으며, 순포지션 계좌에서는 레벨을 가져오는 주문이 손절·익절을 주듯이 포지션에 그 레벨을
  줍니다. 차트의 TP1은 아직 기다리고 있는 가장 가까운 레벨입니다. 직접 만든 어댑터는 브로커의 레벨을
  보고합니다. 위젯의 주문 티켓에서는 익절에 이르기까지의
  <strong>목표 수</strong>를 하나, 둘 또는 셋으로 할 수 있습니다: 둘 이상이면 가는 길의 목표마다, 진입가에서
  같은 간격으로, 수량을 고르게 나눈 부분이 청산되고, 익절이 남은 것을 청산합니다. 티켓은 주문을 넣기 전에
  어디서 얼마가 청산되는지 나열합니다.
</p>
<p>
  포지션의 레벨은 손절이나 익절처럼 차트에서 그 선이나 태그를 잡고 끕니다:
  선이 포인터를 따라가고 원래 있던 자리가 그 뒤에 흐리게 남으며, 놓으면
  그 레벨을 옮긴 포지션의 모든 <code>takeProfits</code>를 가장 가까운 것부터 담아
  <code>positionModify</code>가 발생합니다. 레벨은 이익이므로, 진입가나 그보다 손실 쪽에서 놓은 레벨은 원래 자리로 돌아가고
  아무것도 발생하지 않습니다. 누른 자리에서 닿는 두 레벨 중에서는 더 가까운 것이 잡힙니다. 같은 자리의 주문선, 손절,
  익절은 레벨보다 먼저 잡히며, 그때에도 레벨은 그 태그로 옮길 수 있습니다. 아직 대기 중인
  주문의 레벨은 주문이 가져오는 계획이지 손잡이가 아닙니다. 선이 잠겨 있는 동안에는 어떤 레벨도
  손잡이가 아닙니다.
</p>

<h3 id="account">돈이 있는 계좌</h3>
<p>
  <code>balance</code>를 주면 모의 계좌는 브로커처럼 돈을 관리합니다. 청산으로 얻거나 잃은 금액은
  잔고에 들어가고, 열린 포지션은 증거금(포지션의 가치를 <code>leverage</code>로 나눈 값)을 잡아 두며, 체결마다
  <code>commission</code>을 냅니다. 주문 가능 증거금이 감당할 수 없는 주문은 거부되고
  (<code>executionError</code>), 반전도 마찬가지입니다. 가격이 왔을 때 돈이 이미 없는 대기 주문은
  취소되며, 이것도 <code>executionError</code>가 알립니다. <code>multiplier</code>는 선물 계약에서 가격이
  1 움직일 때 한 단위의 가치입니다: 시장의 <code>contractMultiplier</code>를 주세요. 위젯의 패널은
  이것으로 포지션의 손익을 계산합니다. 계좌는 그것을 바꾼 체결보다 먼저 알려지므로,
  <code>executionFill</code> 리스너 안의 <code>chart.getAccount()</code>는 체결이 남긴 상태의 계좌를
  읽습니다. <code>balance</code>가 없으면 계좌가 없고, 이전처럼 어떤 주문이든 받습니다.
</p>
<p>
  포지션이 증거금을 잡고 있는 동안 계좌는 평가 자산이 증거금에 비해 어떤 수준인지 알려 줍니다: <code>marginLevel</code>, 즉
  사용 증거금에 대한 평가 자산의 비율입니다(<code>1.5</code>는 150%). 두 기준이 이에 따라 작동하며, 각각 주지 않으면
  쓰이지 않습니다. <code>marginCallLevel</code> 아래에서는 계좌가 한 번 경고하고(<code>marginCall</code> 이벤트),
  평가 자산이 그 기준 위로 돌아온 뒤에야 다시 경고합니다. 아무것도 청산하지 않습니다.
  <code>stopOutLevel</code> 아래에서는 손실이 가장 큰 포지션부터 현재 있는 가격에 청산하며,
  기준 위로 돌아오거나 포지션이 없어질 때까지 계속합니다: 하나를 청산하면 그 증거금이 풀리고, 그것으로 충분할 수 있습니다. 각각은
  <code>reason: 'liquidation'</code>인 체결입니다. 둘 다 가격이 올 때마다, 그 가격이 닿은 주문과 손절·익절을
  처리한 뒤에 계산하므로 손절이 먼저 포지션을 청산하고, 평가 자산을 기준 아래로 끌어내린 체결은
  다음 가격에서 처리됩니다. 포지션의 증거금은 진입가 기준으로 잡히므로 증거금 유지율은 평가 자산에 따라서만
  움직입니다. 강제 청산은 대기 중인 주문을 그대로 둡니다: 돈이 없는 주문은 그 가격이 올 때
  취소됩니다. 두 기준이 모두 없으면 아무것도 청산되지 않고 잔고가 0 아래로 내려갈 수 있습니다.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({
  balance: 10_000,
  leverage: 10,                                 // a position holds a tenth of its value
  commission: { rate: 0.0004, min: 0.1 },       // 0.04% of each fill's value, no less than 0.1; perUnit: an amount a unit
  positions: 'net',
  marginCallLevel: 1,                           // warn when the equity falls under the margin held
  stopOutLevel: 0.5,                            // close positions when it falls under half of it
})
chart.connectExecution(broker)

chart.getAccount()   // { balance, equity, unrealisedPnl, realisedPnl, marginUsed, freeMargin, commission, marginLevel? } or null
chart.on('accountChange', (e) => console.log(e.payload.account?.equity))
chart.on('executionFill', (e) => console.log(e.payload.commission, e.payload.reason))   // 'liquidation' for a stop-out
chart.on('marginCall', (e) => warn(e.payload))   // { marginLevel: 0.9, level: 1, equity, marginUsed }`}</code></pre>
<p>
  위젯의 계좌 패널은 합계 맨 앞에 잔고, 평가 자산, 주문 가능 증거금을 두고, 증거금 유지율이 있는 동안에는
  그것도 둡니다. 마진콜은 경고로 보여 주고, 강제 청산의 체결은 내역에 그 이름으로 적습니다.
  직접 만든 어댑터도 <code>getAccount()</code>를 구현하고, 돈이 바뀔 때 <code>AccountSummary</code>와 함께
  <code>account</code>를, 브로커가 경고할 때 <code>marginCall</code>을 내보내면 같은 일을 합니다.
</p>

<h3 id="symbols">여러 종목을 거래하는 계좌</h3>
<p>
  차트는 한 종목을 보여 주지만 계좌는 여러 종목을 가질 수 있습니다. 주문, 포지션, 체결은 각각 자신의 종목
  (<code>symbol</code>)을 밝힐 수 있습니다. 차트는 지금 보여 주는 종목의 것과 종목을 밝히지 않은 것을 그립니다.
  다른 종목을 밝힌 것은 보관해 두었다가 그 종목이 표시될 때 다시 그립니다. <code>getOrders()</code>,
  <code>getPositions()</code>, <code>getFills()</code>는 계좌 전체를 돌려주며, <code>ordersChange</code>와
  <code>positionsChange</code>도 마찬가지입니다. 그중 어느 것이 차트에 있는지는 <code>chart.getSymbol()</code>이
  알려 줍니다. 차트가 내는 주문에는 표시 중인 종목이 붙고(<code>orderPlace</code>의 <code>symbol</code>), 모의
  계좌는 그것을 주문, 그 주문이 여는 포지션, 그 체결에 그대로 둡니다. 여러 종목 계좌를 위한 직접 만든 어댑터는
  각각에 종목을 밝혀 주세요. 차트는 추측하지 않습니다. 종목을 밝히지 않은 것은 이전처럼 모든 종목에 그려집니다.
  두 이름은 대소문자와 관계없이 같은 종목이며, 한쪽만 거래소를 밝힌 경우에는 티커로 비교합니다(<code>BTCUSDT</code>와
  <code>BINANCE:BTCUSDT</code>). 둘 다 거래소를 밝혔다면 같은 거래소여야 합니다.
</p>
<p>
  체결은 한 종목의 봉 위에 찍히는 표시이므로 차트는 체결마다 종목을 줍니다. 체결 자신의 종목, 없으면 그 포지션이나
  주문의 종목, 그것도 없으면 체결이 들어올 때 표시하던 종목입니다. 위젯의 계좌 패널은 모든 종목의 행을 나열하고,
  다른 종목의 행이 있으면 종목 이름을 표시합니다. 다른 종목의 포지션에는 어댑터가 준 가격(포지션의
  <code>markPrice</code>)과 그 가격의 손익이 표시되고, 없으면 둘 다 표시되지 않습니다. 차트의 가격은 그 종목의
  가격이 아니기 때문입니다. 호가창은 자신이 보여 주는 종목의 주문만 표시합니다.
</p>
<p>
  스트림(<code>connect</code>, <code>switchStream</code>)이 있으면 차트는 자신의 종목을 압니다. 봉을 직접 설정할
  때는 봉을 바꿀 때 종목을 알려 주세요. <code>ChartWidget</code>은 종목이 선택되면 스스로 알립니다.
</p>
<pre><code>{`chart.setData(barsOf('ETHUSDT'))
chart.setSymbol('ETHUSDT')        // ETHUSDT의 주문과 포지션을 그림. ''이면 다시 전부 그림
chart.getSymbol()                 // 'ETHUSDT'

chart.setPositions([
  { id: 'p1', symbol: 'BTCUSDT', side: 'buy', entryPrice: 64_000, quantity: 1, markPrice: 64_250 },   // 보관되고 그려지지 않음
  { id: 'p2', symbol: 'ETHUSDT', side: 'sell', entryPrice: 3_150, quantity: 2 },                      // 그려짐
])`}</code></pre>
<p>
  가격도 한 종목의 것입니다. 모의 계좌에 가격을 줄 때 종목을 밝히면 그 가격은 그 종목의 주문과 스톱만 처리하고 그
  종목의 포지션만 평가합니다. 포지션은 자기 종목의 최신 가격으로 청산, 반전, 강제 청산되며, 순포지션 계좌는 종목마다
  포지션 하나를 유지합니다. 종목을 밝히지 않은 가격은 이전처럼 계좌가 가진 모든 것의 가격입니다. 넘겨주는 모든 가격에 종목을
  밝히거나, 어느 가격에도 밝히지 마세요. 종목을 밝히지 않은 가격 하나가 계좌를 다시 하나의 시장으로 만듭니다. 리플레이에서는
  차트가 넘겨주는 가격에 종목을 밝힙니다.
</p>
<pre><code>{`feed.onTrade((trade) => broker.setMarkPrice(trade.price, trade.time, trade.symbol))`}</code></pre>

<h3 id="live-price">더 이상 실시간이 아닌 가격</h3>
<p>
  위젯의 피드가 연결되어 데이터를 보내는 동안 차트의 가격은 실시간입니다. 피드가 끊겼거나, 연결되어 있어도 1분
  (<code>feedQuietAfter</code>, 초) 동안 아무것도 보내지 않으면 마지막 가격이 그대로 남습니다. 이때 상태 표시줄은
  “Live” 대신 그 사실을 알리고, 티켓은 시장가 주문을 보내지 않으며 다른 주문에는 경고를 표시합니다(가격은 트레이더가
  직접 입력한 것이므로). 피드가 끊긴 동안에는 한 번 눌러 내는 주문(우클릭 메뉴, 호가창)과 차트에서 확정한 브래킷 주문이나
  초안 주문도 안내와 함께 보류됩니다(뒤의 둘은 <code>chart.setOrderGate</code>가 보류합니다). 포지션 청산과 주문 취소는
  보류되지 않습니다. 닫힌 시장(종목의 <code>sessions</code>)은 원래 조용하므로 판단하지 않고, 리플레이와 직접 넣은 봉
  (<code>adapter</code> 없음)도 판단하지 않습니다. 그런 경우에는 직접 만든 <code>orderPlace</code> 핸들러에서 주문을
  막으세요.
</p>
<pre><code>{`new ChartWidget(host, { adapter, symbol: 'BTCUSDT', trading: true, feedQuietAfter: 30 })   // seconds; 0: never
chart.getFeedTime()   // when the stream last told anything, ms; null before it has`}</code></pre>

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
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop
chart.modifyPositionIntent({ positionId: 'pos-1', trailingStop: 150 }) // the stop trails the price by 150; null ends the trail`}</code></pre>
<p>
  한 번에 반전할 수 있는 어댑터는 <code>reversePosition</code>을 구현합니다.
  구현하지 않으면 차트가 포지션을 청산한 뒤 반대 방향으로 시장가 주문을 보냅니다.
  주문에는 <code>stopLoss</code>, <code>takeProfit</code>,
  트레일링 거리를 지정할 수 있으며,
  이 값은 주문으로 생긴 포지션에 그대로 이어집니다.
</p>
<p>
  <strong>어댑터 작성자를 위한 참고:</strong> <code>PositionModifyIntent</code>에서
  <code>stopLoss: null</code>(또는 <code>takeProfit: null</code>)은 제거를 뜻하고,
  필드가 없으면 그대로 둔다는 뜻입니다. <code>intent.stopLoss ?? position.stopLoss</code>처럼
  작성한 코드는 사용자가 제거한 손절을 그대로 남겨 둡니다.
</p>
<p>
  <strong>트레일링 스톱</strong>은 가격을 따라가는 손절입니다. 포지션의 <code>trailingStop</code> 은 손절이 가장 유리한 가격 뒤에 유지하는 거리(가격 단위)이며, 롱은 위로, 숏은 아래로 따라가고 결코 되돌아가지 않습니다. 차트에서는 태그가 TSL 로 표시됩니다. 손절 태그의 버튼은 현재 가격에서 손절까지의 거리로 트레일을 시작하거나 끝냅니다. <code>lineButtons: {'{'} trailStop: false {'}'}</code> 로 버튼을 숨길 수 있습니다. 모의 계좌는 손절을 직접 옮깁니다. 브로커용 어댑터는 <code>modifyPosition</code> 에서 받은 <code>trailingStop</code> 을 전달하고(숫자는 트레일 시작, <code>null</code> 은 트레일을 끝내고 손절은 그 자리에 둡니다) 브로커가 옮긴 포지션의 <code>stopLoss</code> 를 보고합니다. 주문에도 실을 수 있습니다. 주문의 <code>trailingStop</code> 은 그 주문이 여는 포지션을 처음부터 트레일하게 하고, 대기 중인 주문의 손절은 TSL 로 표시됩니다. 주문 티켓에서는 손절 아래의 트레일링 스톱 스위치가 그것이며, 진입가에서 손절까지의 거리로 트레일합니다. 손절이 트레일 중일 때 태그의 트레일 버튼은 채워져 보입니다.
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
  <code>priceAxisAdd</code>가 발생합니다. “+”가 보이는 동안 주문과 포지션의 태그는 그 왼쪽에서
  끝나므로, 태그의 버튼을 가리지 않습니다.
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget의 메뉴는 이 이벤트를 바탕으로 만들어집니다. 플롯 영역을 오른쪽 클릭하면 그 가격의
  알림, 매수와 매도(체결을 기다리는 쪽이면 지정가, 반대쪽이면 스톱), 주문 티켓, 수평선이 나오고,
  이어서 보기 재설정, 복사한 그림 붙여넣기, 그림 숨기기와 삭제, 지표 삭제(다른 종목과의 비교는
  남습니다), 데이터 내보내기, 설정이 나옵니다.
</p>
<p>
  가격 축을 오른쪽 클릭하면 눈금 재설정, 자동 눈금, 반전 눈금과 왼쪽 눈금, 네 가지 모드(일반, 로그,
  퍼센트, 100 기준) 중 하나, 두 하위 메뉴에 담긴 축 위의 라벨과 차트를 가로지르는 라인, 그 가격의
  알림, 그리고 눈금 탭이 열린 설정이 나옵니다. 시간 축에는 재설정, 날짜로 이동, 시간대가 있습니다.
</p>
<p>
  위젯 단축키가 켜져 있는 동안에는 항목에 그 키가 표시됩니다: <kbd>Alt</kbd> + <kbd>R</kbd> 보기
  재설정, <kbd>Alt</kbd> + <kbd>I</kbd> 눈금 반전, <kbd>Alt</kbd> + <kbd>G</kbd> 날짜로 이동. 하위
  메뉴는 클릭하거나 <kbd>Enter</kbd>, <kbd>→</kbd>를 누르거나 포인터를 잠시 올려 두면 열리고,
  <kbd>←</kbd>나 <kbd>Escape</kbd>를 누르면 돌아갑니다. 메뉴가 아래에서 열리는 휴대폰에서는 하위
  메뉴의 첫 행을 누르면 돌아갑니다. <code>chartMenuItems</code>로 직접 항목을 추가할 수 있습니다
  (<a href={href('/docs/api')}>API 레퍼런스</a> 참고).
</p>

<h2>주문 티켓과 계좌 패널 (ChartWidget)</h2>
<p>
  도구 모음의 <strong>거래</strong> 메뉴에서 <strong>계좌</strong>를 누르면 차트 아래에 계좌 패널이 열립니다. 보유 포지션과 손익,
  대기 주문, 지금까지의 체결과 실현 손익, 그리고 주문에 일어난 일의 로그가 표시되며, 각 행에서 청산, 반전, 취소를 할 수
  있습니다. <strong>새 주문</strong>을 누르면 주문 티켓이 열립니다. 매수 또는 매도,
  시장가·지정가·스톱, 수량, 가격, 선택 사항인 손절과 익절, 주문 유효 기간을 정합니다.
  입력하는 동안 주문을 검사하고(매수 지정가는 시장가보다 아래, 손절은 진입가 기준 손실 쪽…)
  손익비를 보여 줍니다. 주문을 넣으면 <code>orderPlace</code> 의도가 전송됩니다.
  시장을 설정하면(<code>chart.setMarket</code>) 각 가격을 시장의 호가 단위에 맞추고 주문 가격을 그날의 상한가와 하한가 안에
  두며, 수량은 1매매 단위에서 시작하고 1매매 단위를 넘으면 그 배수만 받습니다(그보다 적은 주식은 별도의 단주
  주문입니다).
</p>
<p>
  피드가 매수호가와 매도호가를 모두 주면, 주문 티켓은 매수를 매도호가로, 매도를 매수호가로 평가하고 검사하고 보냅니다. 그렇지 않으면 둘 다 마지막 가격입니다.
  실행 어댑터가 연결되어 있으면 어댑터의 답을 기다립니다: 티켓은 열린 채로 버튼 자리에 <strong>전송 중…</strong>이 표시되고 아무것도 바꿀 수 없으며,
  주문이 받아들여지면 닫히고, 거부되면 입력한 내용을 그대로 두고 주문을 바꿀 때까지 이유를 알려 줍니다. 10초 동안 답이 없으면 그 사실을 알리고 계속 기다립니다. 다시 보내기 전에 주문을 확인하세요.
  티켓 바깥을 눌러도 닫히지 않습니다. Escape, 취소, 닫기 표시로 닫습니다. 오른쪽 클릭 메뉴나 호가창의 한 줄에서 한 번 눌러 내는 주문의 수량은
  그 시장의 매매 단위(<code>volumeUnit</code>)이며, 단위가 없으면 1입니다.
</p>
<p>
  주문 티켓은 제목 옆에 종목을 표시합니다. 주문 종류와 유효 기간은 한 줄의 선택지이며 화살표 키로 옮겨 다닙니다.
  −와 +는 수량을 매매 단위만큼, 가격을 시장의 호가 단위만큼 움직이고, 차트에서 가져온 가격은 처음에 그 단위로
  반올림됩니다. 켜 둔 손절과 익절에는 진입가로부터의 거리(%)와 닿았을 때의 손익이 표시되고, 그 아래 영수증에 주문
  금액, 위험, 보상, 보상 대비 위험이 정리됩니다. 매수와 매도를 바꿔도 대기 주문은 놓은 가격에 그대로 남고
  (시장가보다 위의 매수 스톱은 매도 지정가가 됩니다), 주문 버튼은 매수·매도의 색을 띱니다.
</p>
<p>
  위젯에서는 거래가 켜져 있을 때 선택한 롱/숏 포지션 그림의 도구 모음에 <b>주문 생성</b>이 나타납니다. 이것은 그림의
  값으로 채운 이 티켓을 엽니다: 방향, 가격으로 쓰는 진입가, 손절과 익절, 그리고 리스크로 살 수 있는 수량이며, 수량은
  그림이 쓰는 소수 자릿수로 내림합니다. 주문 종류는 시장가 대비 진입가의 위치를 따르며, 주문 버튼을 누르기 전에는
  아무것도 전송되지 않습니다.
</p>
<p>
  계좌 패널 머리에는 어느 탭에서나 평가 손익과 실현 손익이 표시됩니다. 숫자는 고정폭 글꼴로 오른쪽 정렬되고,
  금액은 호가 단위의 소수 자리와 숫자 로캘로 표기되며, 휴대폰에서는 각 행이 항목 이름이 붙은 카드가 됩니다.
</p>
<p>
  위젯은 보낸 주문이 어떻게 되었는지 알립니다. 어댑터가 거부한 주문은 어댑터가 한 말 그대로,
  일부만 체결되고 나머지가 버려진 주문은 얼마나 체결되었는지 알립니다.
</p>
<p>
  <strong>로그 탭</strong>은 주문에 일어난 일을 최신순으로 나열합니다: 접수되거나, 옮겨지거나,
  취소되거나, 체결된 각 주문, 그리고 브로커가 거부한 것과 그 사유. 차트가 이를 보관하므로 직접 만든 차트에서도
  쓸 수 있습니다: <code>chart.getActivityLog()</code>는 최근 200개 항목을 오래된 것부터 돌려주며, 각 항목은
  <code>{`{ time, kind, orderId, side, type, quantity, price, reason, pnl, message }`}</code> 가운데 그
  <code>kind</code>(<code>'placed'</code>, <code>'moved'</code>, <code>'cancelled'</code>,
  <code>'filled'</code>, <code>'rejected'</code>)에 있는 것을 가집니다. 로그는 실행 어댑터나 <code>setOrders</code>와 <code>addFill</code>로
  차트가 전달받은 주문, 체결, 오류에서 읽습니다. 로그가 시작될 때 있던 주문은
  로그에 없고, 어댑터가 연결되거나 해제될 때, 또는 (어댑터 없이) 종목이 바뀔 때 있던 주문도
  없습니다: 그것들은 거기 있는 주문일 뿐, 접수된 주문이 아닙니다. 일부 체결된 뒤 내려간 주문은
  취소로 기록됩니다. <code>chart.clearActivityLog()</code>는 로그를 비웁니다.
</p>
<p>
  <strong>차트 위의 매도와 매수.</strong> 실행 어댑터가 연결되어 있는 동안 위젯은 차트의 범례 아래에
  버튼 두 개를 보여 주며, 각 버튼에는 거래될 가격이 있습니다: 매도에는 최우선 매수호가, 매수에는 최우선 매도호가가
  있고 그 사이에 스프레드가 있습니다(<code>chart.setBidAsk</code>, 또는 틱에 이 값이 실려 오는 피드). 그렇지 않으면,
  리플레이에서나 피드가 한쪽만 줄 때처럼, 둘 다 마지막 가격입니다. 누르면 그 방향의 주문 티켓이
  열립니다. <code>executionChange</code>는 어댑터가 연결되거나 해제될 때를, <code>bidAskChange</code>는
  매수호가와 매도호가가 바뀔 때를 알리며, <code>tradeButtons</code> 스위치는 버튼을 끕니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
  features: { tradeButtons: true },   // default: Sell and Buy under the legend, with a broker connected
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.

widget.getChart().getActivityLog().at(-1)   // { time, kind: 'filled', side: 'buy', quantity: 1, price: 64_000, reason: 'order' }`}</code></pre>
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
  <code>bracketPlace</code> 이벤트 하나를 발생시키고, 연결된 실행 어댑터에 브래킷을 보냅니다(아래).
  어댑터가 없으면 이 이벤트는 백엔드가 처리하기 위한 것입니다.
</p>
<p>
  <strong>크기.</strong> 브래킷은 그 크기로 정해지는 수량의 주문입니다. <code>{`{ quantity: 2 }`}</code>는 그 수량입니다.
  <code>{`{ risk: 50 }`}</code>는 손절가에서 잃는 금액입니다: 수량은 50을 진입가에서 손절가까지의 거리
  (에 <code>multiplier</code>, 즉 가격이 1 움직일 때 한 단위의 가치를 곱한 값)로 나누고 <code>quantityStep</code>으로
  내림한 값이며, 선을 끌면 따라 바뀝니다. 수량은 진입선의 태그에 표시되고 <code>bracketPlace</code>에도 담깁니다.
  위젯에서는 브래킷 바의 입력란에 수량을 입력합니다. 입력란은 마지막으로 입력한 수량, 없으면 시장의 거래 단위에서
  시작합니다. <code>widget.startBracket(side, size)</code>도 크기를 받습니다: 위험 금액으로 크기를 정하는 브래킷에는
  입력란이 없습니다. <code>bracketQuantity(bracket, size)</code>는 같은 계산을 여러분의 코드에서 쓰기 위한 것입니다.
</p>
<p>
  실행 어댑터가 연결되어 있으면 차트는 확정한 브래킷을 어댑터에도 하나의 주문으로 보냅니다: 진입가
  (가격이 진입가로 되돌아와야 하면 지정가, 더 나아가야 하면 스톱), 수량, 그리고 주문에 붙는 손절가와 익절가입니다.
  어댑터가 받으면 차트는 그 주문과 함께 <code>bracketOrder</code>를 보냅니다. 어댑터가 거부하면
  <code>command: 'bracketPlace'</code>인 <code>executionError</code>를 보냅니다. 위젯은 그때에만 "주문됨"이라고
  알리며, 거부되면 이유를 알립니다. 수량이 없는 브래킷은 확정되지 않습니다. 주문할 크기를 아무도 보지 못했기 때문입니다:
  <code>confirmBracket()</code>은 false를 반환하고, 브래킷은 수량을 받을 때까지 차트에 남습니다. 지정가 진입과
  스톱 진입을 구분할 가격이 차트에 아직 없을 때 확정한 브래킷은 전송되지 않습니다.
  <code>executionError</code>가 <code>reason</code>(<code>'noQuantity'</code>, <code>'noPrice'</code>)을 알려 주고,
  위젯도 이를 알립니다. 이벤트의 브래킷을 직접 주문하는 앱은 <code>brackets: 'event'</code>로 연결합니다:
  그러면 브래킷은 이벤트로만 남고 위젯은 확정되었다고 알립니다. 3.0 이전에는 이것이 기본값이었습니다
  (<a href={href('/docs/migration-3')}>3.0으로 마이그레이션</a> 참고).
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.startBracket('buy', undefined, { quantity: 2 })                   // for two
chart.startBracket('buy', undefined, { risk: 50, quantityStep: 0.001 }) // for what loses 50 at the stop
chart.setBracketSize({ quantity: 3 })   // while it is placed
chart.getBracket()                      // { side, entry, stopLoss, takeProfit, quantity } or null

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, quantity, riskReward } = e.payload
  // with no adapter (or brackets: 'event'): submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

// The connected adapter places it
chart.connectExecution(broker)
chart.placesBrackets()   // true
chart.on('bracketOrder', (e) => console.log(e.payload.order.id))
// chart.connectExecution(broker, { brackets: 'event' })   // only the event: your code places it

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
<p>
  호가창은 차트 옆 dock의 한 페이지입니다(휴대폰에서는 시트). 거래 메뉴, 레일의 버튼, 또는
  <code>widget.openPanel('depthLadder')</code>로 열고, <code>dock.depthLadder: false</code>로 레일 버튼을 없앱니다.
  매도 호가가 매수 호가 위에 있고 그 사이에 스프레드가 표시되며, 각 잔량에는 가격 열에서 뻗어 나가는 막대가
  붙습니다. 내 대기 주문이 있는 가격 행에는 그 수량이 표시됩니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })
widget.openPanel('depthLadder')   // a page of the dock; the Trade menu opens it too

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>차트 위의 호가창</h2>
<p>
  <code>features.depth</code> 는 가격만 보여 주는 차트를 위해 호가창을 오른쪽 가장자리에서부터 플롯에 그립니다. 주문도 트레이딩 UI도
  필요 없고 <code>trading: false</code> 에서도 동작합니다. 데이터는 <code>chart.setDepthData</code> 로 넣습니다
  (<code>widget.setDepth</code> 도 같은 일을 합니다). <code>features.depth</code> 를 켜면 오버레이도 켜지며, 모양은 <code>setDepthOverlay</code> 로 바꿉니다.
</p>
<ul>
  <li><code>mode</code>: <code>'cumulative'</code>(기본)는 각 호가를 시장에 더 가까운 호가와 합하므로 시장에서 멀수록 막대가 길어집니다. <code>'level'</code> 은 호가마다 자기 수량만 그리므로 큰 벽이 긴 막대 하나로 보입니다.</li>
  <li><code>rowSize</code>: 막대의 높이를 가격 단위로 정합니다. 호가가 이 간격의 행으로 합쳐지므로, 거친 가격 눈금 위의 촘촘한 호가창이나 빈 호가가 있는 호가창도 고른 막대로 그려집니다(풋프린트의 행에 맞출 수 있습니다). 이때 <code>markBest</code> 는 최우선 행의 가운데에 선을 긋습니다.</li>
  <li><code>rowOrigin</code>: 행이 시작하는 가격입니다. 이때 k번째 행은 <code>rowOrigin + k × rowSize</code> 에서 다음 행의 시작까지이고, 행의 시작에 정확히 놓인 호가는 그 행에 들어갑니다. 행 크기의 배수에서 칸이 시작하고 각 틱이 그 가격을 가운데로 하는 풋프린트는 <code>rowOrigin: -tick / 2</code> 로 맞춰집니다. 지정하지 않으면 각 행은 <code>rowSize</code> 의 배수를 가운데로 합니다.</li>
  <li><code>markBest</code>: 최우선 매수호가와 최우선 매도호가에 선을 긋습니다(<code>bestBidColor</code>, <code>bestAskColor</code>).</li>
  <li><code>maxWidth</code>: 막대의 최대 길이(픽셀, 플롯 너비까지), <code>bidColor</code>, <code>askColor</code>.</li>
</ul>
<p>
  막대는 가장 최근 캔들 위에 놓입니다. 공간을 만들려면 <code>rightMargin</code> 을 늘리고 <code>maxWidth</code> 를 그만큼의 봉 너비쯤으로 두세요.
  트레이딩이 켜져 있으면 이전처럼 <code>{`setTradingConfig({ depthOverlay: { enabled: true } })`}</code> 로 켤 수 있습니다.
</p>
<pre><code>{`const chart = new Chart(host, {
  features: { trading: false, depth: true },       // display only: no orders, no trading UI
  depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 },
  rightMargin: 14,                                  // empty slots past the newest bar, room for the bars
})
chart.setDepthData(orderBook)                       // { bids, asks }; null clears it
chart.setDepthOverlay({ mode: 'cumulative' })       // change the look later`}</code></pre>

<h2>유동성 히트맵</h2>
<p>
  호가 스냅샷을 캔들 뒤의 히트맵으로 누적합니다. 각 스냅샷은
  세로 띠 하나가 되며, 가격 레벨별 대기 잔량이 밝게 표시됩니다
  (매수는 초록, 매도는 빨강). 오랫동안 유지되는 유동성 벽이 두드러져 보입니다.
  설정 창(또는 <code>chart.setDepthHeatmapVisible</code>)에서 켜고 끄며,
  <code>widget.setDepth</code>는 호가가 갱신될 때마다 스냅샷을 기록합니다.
  리플레이 중에는 시간 없이 기록된 호가는 실시간 시리즈의 마지막 봉에 속하고, 히트맵은 리플레이가 보여 준 봉의 호가만
  표시하며, 플롯 가장자리의 호가창(실시간 시장의 것)은 리플레이가 끝날 때까지 숨겨집니다.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

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

<h2>마크</h2>
<p>
  어떤 시각에 일어난 일(뉴스, 실적 발표일, 배당, 액면분할)을 그 시각을 포함하는 봉 위치에,
  가격 창 아래쪽의 작은 배지로 표시합니다. 포인터를 배지에 올리면 제목과 설명을 읽을 수 있고,
  겹치게 될 배지는 개수가 적힌 하나로 묶입니다. 리플레이에서는 도달한 시점에 각 마크가 나타납니다.
  Renko, Kagi, 삼선전환도, P&amp;F, 레인지 바에는 마크를 그리지 않습니다: 이들의 봉은 시각이 아닙니다.
</p>
<pre><code>{`chart.setMarks([
  { id: 'q3', time: reportedAt, kind: 'earnings', title: 'Q3 earnings', text: 'EPS 1.42 vs 1.31 expected' },
  { id: 'div', time: exDate, kind: 'dividend', title: 'Dividend 0.24 a share' },
  { id: 'n1', time: publishedAt, kind: 'news', title: headline, text: source, url: 'https://example.com/story' },
])
const id = chart.addMark({ time: Date.now(), title: 'Trading halted', label: 'H', color: '#e5484d' })
chart.removeMark('div')
chart.getMarks()      // earliest first
chart.clearMarks()

chart.on('markClick', (e) => openStory(e.payload.marks))   // one mark, or the several a badge gathers
// a click on a badge is a markClick, not a click or a barClick
chart.on('markHover', (e) => e.payload.marks)              // null: the pointer left the badge
chart.on('marksChange', (e) => e.payload.count)

new Chart(host, { features: { marks: false } })            // or chart.setFeatures({ marks: false })`}</code></pre>
<p>
  <code>kind</code>가 글자와 색을 정합니다: <code>news</code>는 N, <code>earnings</code>는 E,
  <code>dividend</code>는 D, <code>split</code>은 S, <code>event</code>(또는 생략)는 i.
  <code>label</code>(한두 글자)과 <code>color</code>로 바꿀 수 있습니다. 마크에는
  <code>title</code>과 <code>time</code>이 있어야 하며, http(s) 링크만 유지되고, 차트는 최대
  2,000개를 유지합니다. 마크는 피드의 것이지 사용자의 것이 아닙니다: <code>saveState</code>에
  담기지 않으므로 불러온 뒤 다시 설정하세요.
</p>
<p>
  ChartWidget은 종목의 뉴스 제목을 뉴스 소스(<code>news</code> 또는 어댑터의
  <code>fetchNews</code>)에서 가져와 차트에 표시합니다. <code>newsMarks: false</code>이면 종목 정보
  패널에만 남습니다. 마크를 클릭하면 링크가 새 탭에서 열리고, 여러 개를 묶은 배지에서는 최신순
  목록이 열립니다. 위젯의 <code>marks</code> 기능 스위치는 모든 마크를 숨깁니다. 직접 호출한
  <code>setMarks</code>와 <code>clearMarks</code>는 위젯의 뉴스 마크를 지우지 않습니다.
</p>

<h2>거래 구간</h2>
<p>진입 → 청산 사각형을 손익 색상과 방향 배지로 시각화합니다.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  direction: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
})`}</code></pre>

<h2>포지션 라벨 토큰</h2>
<p>
  포지션 태그를 원하는 대로 씁니다. <code>positionLabel</code>은 수량 뒤의 방향과 손익 자리에 들어갑니다.
  템플릿 문자열 또는 문자열을 반환하는 함수를 받습니다.
</p>
<pre><code>{`chart.setTradingConfig({
  positionLabel: '{side} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  사용 가능한 토큰:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>손익 그라데이션 기준점</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  태그의 평가 손익과 현재가까지의 띠는, <code>pnl</code>이 포지션 손익(금액) 이하인 가장 높은 기준점의 색을 따릅니다.
</p>

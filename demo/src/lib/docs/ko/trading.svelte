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
  <code>timeInForce</code>(<code>'gtc'</code> 또는 <code>'day'</code>)를 지정할 수 있으며,
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
  대기 주문, 지금까지의 체결과 실현 손익이 표시되며, 각 행에서 청산, 반전, 취소를 할 수
  있습니다. <strong>새 주문</strong>을 누르면 주문 티켓이 열립니다. 매수 또는 매도,
  시장가·지정가·스톱, 수량, 가격, 선택 사항인 손절과 익절, 주문 유효 기간을 정합니다.
  입력하는 동안 주문을 검사하고(매수 지정가는 시장가보다 아래, 손절은 진입가 기준 손실 쪽…)
  손익비를 보여 줍니다. 주문을 넣으면 <code>orderPlace</code> 의도가 전송됩니다.
  시장을 설정하면(<code>chart.setMarket</code>) 각 가격을 시장의 호가 단위에 맞추고 주문 가격을 그날의 상한가와 하한가 안에
  두며, 수량은 1매매 단위에서 시작하고 1매매 단위를 넘으면 그 배수만 받습니다(그보다 적은 주식은 별도의 단주
  주문입니다).
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
  백엔드가 처리할 <code>bracketPlace</code> 이벤트 하나를 발생시킵니다.
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

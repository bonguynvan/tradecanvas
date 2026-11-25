<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>3.0으로 마이그레이션 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas 2.x에서 3.0으로 넘어갈 때 코드에 영향을 주는 변경 사항: 달라진 동작 하나하나와 이전 동작을 유지하는 옵션. 3.0은 별도 브랜치에서 개발 중입니다." />
</svelte:head>

<h1>3.0으로 마이그레이션</h1>
<p>
  3.0은 <code>3.0</code> 브랜치에서 개발 중입니다. 아직 npm에 없으며, 이 페이지는 개발과 함께 늘어납니다. 2.x용으로 작성한
  코드를 깨뜨릴 수 있는 변경 사항과 그 대처 방법을 하나씩 정리합니다. 1.x에서 2.0으로의 이동은
  <a href={href('/docs/migration')}>2.0으로 마이그레이션</a>을 참고하세요.
</p>

<h2 id="behaviour">달라진 동작</h2>

<h3 id="brackets">확정한 브래킷이 실행 어댑터로 전송됩니다</h3>
<p>
  실행 어댑터가 연결되어 있으면(<code>chart.connectExecution(adapter)</code>) 확정한 브래킷은 이제 하나의 주문으로
  어댑터에 전송됩니다: 진입가와 그 수량, 손절가, 익절가입니다. 2.x에서는 어댑터를 <code>brackets: 'place'</code>로
  연결하지 않는 한 <code>bracketPlace</code> 이벤트로만 남았고, 차트는 전송되지 않았다는 경고를 콘솔에 한 번 남겼습니다.
</p>
<ul>
  <li>
    <strong>이벤트의 브래킷을 직접 주문하는 코드.</strong> <code>brackets: 'event'</code>로 연결하세요. 그렇지 않으면
    브래킷이 두 번 주문됩니다: 차트가 한 번, 여러분의 코드가 한 번.
  </li>
  <li>
    <strong><code>brackets: 'place'</code>를 전달하던 코드.</strong> 할 일이 없습니다. 이 옵션은 빼도 됩니다.
  </li>
  <li>
    <strong>연결된 어댑터가 없는 경우.</strong> 달라지는 것이 없습니다: 브래킷은 <code>bracketPlace</code> 이벤트입니다.
  </li>
</ul>
<pre><code>{`// 2.x: 요청하지 않으면 이벤트            // 3.0: 요청하지 않으면 주문
chart.connectExecution(broker)             chart.connectExecution(broker, { brackets: 'event' })
chart.connectExecution(broker, { brackets: 'place' })   →   chart.connectExecution(broker)`}</code></pre>
<p>
  브래킷은 그 크기로 정해지는 수량과 함께 전송됩니다. 수량이 없는 브래킷은 확정되지 않고 차트에 남으며,
  <code>executionError</code>가 그 이유를 알립니다(<code>reason: 'noQuantity'</code>). 위젯의 브래킷 바에 수량 입력란이
  생겨, 툴바에서 시작한 브래킷에는 수량이 있습니다. 여러분의 코드가 시작하는 브래킷은 세 번째 인수로 크기를 받습니다
  (<a href={href('/docs/trading')}>트레이딩</a> 참고):
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // 손절가에서 50을 잃는 수량`}</code></pre>

<h3 id="trade-buttons">실행 어댑터를 연결하면 차트에 매도와 매수가 표시됩니다</h3>
<p>
  실행 어댑터가 연결되어 있고 주문 티켓이 켜져 있으면, 위젯은 이제 차트의 범례 아래에 매도와 매수를 보여 줍니다.
  자신의 주문과 포지션을 그리기 위해서만 어댑터를 연결하는 호스트는 이 버튼을 끕니다:
</p>
<pre><code>{`new ChartWidget(el, { features: { tradeButtons: false } });`}</code></pre>
<p>
  <code>orderTicket</code>이 꺼져 있거나 어댑터가 없으면 이 버튼은 표시되지 않습니다. 주문 관련 스위치를 이름으로 하나씩 끄는 호스트에는
  적을 이름이 하나 더 생겼습니다. <code>tradeButtons</code>는 새 스위치이며, 설정하지 않으면 켜져 있습니다.
</p>

<h3 id="stop-limit">모의 계좌는 스톱 리밋을 지정가 범위 안에서 체결합니다</h3>
<p>
  <code>PaperExecutionAdapter</code>는 이전에 <code>stopLimit</code> 주문을 스톱 가격에서 스톱 주문처럼 체결했습니다. 이제
  가격이 스톱에 닿으면 <code>price</code>를 지정가로 하는 지정가 주문이 됩니다: 가격이 지정가 범위 안에 들어올 때까지 주문은
  대기 상태로 남습니다(유형은 <code>'limit'</code>이 됩니다). 스톱에 닿자마자 포지션이 생기기를 기대하던 테스트는 먼저 가격을
  지정가 범위 안으로 옮기거나 <code>'stop'</code> 주문을 사용하세요.
</p>

<h3 id="hand-prices">손으로 정한 가격은 시장의 가격 눈금에 맞춰집니다</h3>
<p>
  <code>orderModify</code>, <code>positionModify</code>, <code>bracketPlace</code>, 초안 주문이나 오른쪽 클릭 메뉴의 <code>orderPlace</code>,
  <code>priceAxisAdd</code>, <code>chartContextMenu</code>는 지금까지 포인터 아래 가격을 픽셀이 주는 그대로
  (<code>62549.71592675613</code>) 실어 보냈습니다. 이제는 시장의 호가 단위에, 없으면 가격 축이 보여 주는 소수 자릿수에 맞춘 가격을 싣습니다:
  <code>chart.roundPrice</code>가 주는 값입니다. 브래킷과 초안 주문도 어떤 가격에서 시작하든 눈금 위에서 시작하고, 끌어 옮긴 알림도 눈금에 맞춰집니다. 원래 있던 눈금에서 놓은 선은 아무것도 알리지 않습니다. 직접 반올림하던 코드는 그만둬도 됩니다.
  그날의 상한가와 하한가가 있는 시장에서는 주문 자체의 가격도 그 안에 묶입니다. 넘겨 끌면 상한가나 하한가로 알립니다.
</p>

<h3 id="finger">손가락 아래에서는 32 px보다 작은 컨트롤이 없습니다</h3>
<p>
  주 포인터가 coarse인 기기(휴대폰, 태블릿)에서는 어떤 외관과 <code>density</code>에서도 위젯의 컨트롤이 이제 가로세로 최소 32 px입니다.
  태블릿의 <code>compact</code> 위젯에 더는 24 px 버튼이 없고, 지표 범례의 각 행은 20 px가 아니라 32 px 높이입니다.
  마우스에서는 그려진 모양은 그대로이고 누름 영역만 달라집니다(가로세로 최소 20 px). 터치 화면에서 위젯의 각 부분(범례의 높이, 대화상자의 높이)을 재는 페이지는 더 큰 값을 읽게 됩니다.
</p>

<h3 id="order-answer">티켓에서 낸 주문은 어댑터의 답을 기다립니다</h3>
<p>
  실행 어댑터가 연결되어 있으면 주문 티켓은 더 이상 주문을 내는 즉시 닫히지 않습니다. 어댑터의 <code>placeOrder</code>가 resolve될 때(닫힘)
  또는 reject될 때(남아서 이유를 알림)까지 기다립니다. <code>placeOrder</code>가 끝나지 않는 어댑터에서는 티켓이 계속 기다립니다:
  주문으로 resolve하거나 이유와 함께 reject하세요. 이와 함께 세 가지가 더 바뀌었습니다. 모든 <code>orderPlace</code> 페이로드가 이제
  <code>clientOrderId</code>를 가지며, <code>placeOrderIntent</code>는 보낸 그대로의 주문을 반환합니다(이전에는 아무것도 반환하지 않았습니다).
  티켓에서 낸 시장가 주문은 피드가 둘 다 줄 때 매수면 매도호가, 매도면 매수호가를 <code>price</code>로 가집니다(이전에는 마지막 가격이었습니다).
  그리고 오른쪽 클릭 메뉴나 호가창에서 한 번 눌러 내는 주문은 시장에 매매 단위가 있으면 그 단위만큼입니다(이전에는 1이었고, 호가창의 주문에는 수량이 없었습니다).
</p>

<h3 id="orders-by-symbol">주문, 포지션, 체결은 자기 종목에 그려집니다</h3>
<p>
  <code>symbol</code>을 밝힌 주문, 포지션, 체결은 차트가 그 종목을 보여 줄 때만 그려집니다. 다른 종목에서는
  보관됩니다. <code>getOrders()</code>, <code>getPositions()</code>, <code>getFills()</code>는 계좌 전체를
  돌려주고, 그중 어느 것이 그려지는지는 <code>chart.getSymbol()</code>이 알려 줍니다. 차트는 이제 모든
  <code>orderPlace</code> 페이로드에 표시 중인 종목을 밝히고 모의 계좌는 그것을 유지합니다. 그래서 한 종목에서
  연 포지션이 예전처럼 다음 종목에 그려져 잘못된 가격으로 손익이 계산되는 일이 없습니다. 종목을 밝히지 않은 것은
  이전처럼 모든 종목에 그려집니다. 여러 종목 계좌를 위한 직접 만든 어댑터는 주문, 포지션, 체결에 종목을 밝혀 주세요.
</p>
<p>
  이와 함께 세 가지가 바뀌었습니다. 차트가 종목을 보여 주고 있으면 <code>executionFill</code>과
  <code>getFills()</code>가 알리는 모든 체결에 <code>symbol</code>이 있습니다. <code>ChartWidget</code>은 종목이
  바뀌어도 더 이상 체결을 지우지 않습니다. 내역과 실현 손익은 계좌의 것이고, 표시는 자기 종목과 함께 돌아옵니다.
  <code>setMarkPrice</code>는 세 번째 인수로 종목을 받으며, 차트는 리플레이에서 그것을 넘겨줍니다. 종목을 밝힌
  가격을 받으면 모의 계좌는 종목마다 그 종목의 가격으로 처리하고 평가하며, 종목을 밝히지 않은 가격을 받으면
  이전처럼 하나의 시장입니다. 그리고 봉을 직접 설정한 경우 차트는 알려 주기 전까지 종목을 모릅니다.
  <code>chart.setSymbol(symbol)</code>로 알리며, <code>ChartWidget</code>은 스스로 호출합니다.
<h3 id="hold-tooltip">차트를 길게 누르면 가격 팝업이 표시됩니다</h3>
<p>
  <code>ChartWidget</code>에서 플롯 위에 마우스 버튼을 움직이지 않고 0.5초 누르고 있으면, 버튼을 놓을 때까지 포인터 아래
  봉의 플로팅 OHLCV 툴팁이 표시됩니다. 툴팁은 포인터를 따라가고 그동안 차트는 이동하지 않습니다. 따라서 그만큼 길게 누른
  동작은 더 이상 클릭도, 이동의 시작도 아닙니다. 위젯의 <code>crosshairTooltip</code> 기능은 이제
  <code>'hold'</code>이며 이전에는 <code>false</code>였습니다. 이전처럼 팝업이 없게 하려면
  <code>{`chartOptions: { features: { crosshairTooltip: false } }`}</code>를, 포인터를 올려놓기만 해도 표시하려면
  <code>true</code>를 넘기세요. 헤드리스 <code>Chart</code>는 바뀌지 않았습니다. 따로 지정하지 않으면 툴팁이 포인터를
  따라가며, <code>'hold'</code>도 받습니다.
</p>

<h3 id="live-price">한 번 눌러 내는 주문은 실시간 가격을 기다립니다</h3>
<p>
  자체 피드(<code>adapter</code>)가 있을 때, 그 피드가 끊긴 동안 <code>ChartWidget</code>은 한 번 눌러 내는 주문
  (우클릭 메뉴, 호가창)도, 확정한 브래킷 주문이나 초안 주문도 더 이상 보내지 않습니다. 대신 이유를 알립니다. 피드가
  끊겼거나 1분 동안 아무것도 보내지 않는 동안(<code>feedQuietAfter</code>) 티켓은 시장가 주문을 보내지 않으며, 멈춘
  스트림에 “Live”라고 표시하던 상태 표시줄은 “가격 업데이트 없음”이라고 표시합니다. <code>feedQuietAfter: 0</code>이면
  연결된 피드를 조용하다고 판단하지 않습니다. 끊긴 피드는 그래도 주문을 보류합니다.
</p>

<h3 id="confirmations">한 번 눌러 하는 거래는 확인을 거치고, 호가창의 매수 호가는 사는 가격입니다</h3>
<p>
  <code>ChartWidget</code>은 이제 포지션을 청산하거나 반전하기 전(계좌 패널, 차트 위의 버튼)과 우클릭 메뉴나 호가창에서
  주문을 내기 전에 먼저 묻습니다. 예전에는 한 번 누르면 나갔습니다. <code>confirmOrders: false</code>는 한 번 누르는
  방식을 유지합니다. 호가창에서 매수 호가를 누르면 이제 그 가격에 <strong>매수</strong> 지정가가, 매도 호가를 누르면
  <strong>매도</strong> 지정가가 나갑니다. 예전에는 매수 호가에 팔고 매도 호가에 샀습니다. 같은 칸에서 나오는
  <code>orderPlace</code>의 방향이 예전과 반대입니다. 그 칸을 누르거나 주문이 바로 나가기를 기대하던 테스트나 스크립트는
  확인 대화상자의 버튼(<code>.tcw-confirm .tcw-done-btn</code>)을 누르거나 이 옵션을 사용해야 합니다.
</p>

<h3 id="graphite">위젯의 기본 외관은 Graphite입니다</h3>
<p>
  <code>ui</code>가 없는 <code>ChartWidget</code>은 이제 Modern 대신 Graphite 외관으로 그려집니다. 중성 바탕,
  3 px 모서리, 40 px 툴바이며, 선택된 것은 앰버가 아니라 더 밝은 바탕에 표시됩니다. 차트의 색도 함께 바뀝니다
  (<code>GRAPHITE_DARK_THEME</code>, <code>GRAPHITE_LIGHT_THEME</code>). <code>theme</code>이 직접 만든 객체라면
  바뀌지 않습니다. <code>ui: 'modern'</code>은 이전 외관과 색을 그대로 유지합니다. 스타일시트의 기본 토큰은
  Graphite의 것이므로, Modern 위에 <code>--tcw-*</code> 토큰 몇 개를 설정하던 CSS는 이제 Graphite 위에 설정합니다.
  모든 외관에서 주문 티켓의 버튼은 주문 내용을 적고(<code>Buy 100 HPG</code>), 주문 금액은 버튼 바로 위 마지막
  줄이며, 계좌 패널에서 포지션의 반전과 청산 버튼은 손익 바로 뒤에 옵니다. 버튼의 글자나 열의 위치를 읽는
  테스트는 고쳐야 합니다.
</p>

<h3 id="money">베트남 주식의 금액은 동으로 계산됩니다</h3>
<p>
  <code>MARKET_HOSE</code>, <code>MARKET_HOSE_ETF</code>, <code>MARKET_HNX</code>, <code>MARKET_UPCOM</code>은
  가격을 천 동 단위로 적으며(26.40은 26,400동), 이제 그것을 명시합니다. <code>contractMultiplier</code>가
  1,000입니다. 주문 티켓의 주문 금액, 계좌 패널의 포지션 손익, 차트 태그의 금액이 이 값으로 계산되므로
  26.40에 100주는 2,640이 아니라 2,640,000으로 표시됩니다. 모든 시장에서 차트 태그의 금액(포지션 손익, 스톱이나
  타깃의 금액)은 이제 계좌 패널처럼 시장의 승수로 계산됩니다. VN30F 포지션의 태그는 포인트가 아니라 동으로
  표시됩니다. <code>scaleMarketPrices</code>는 승수를 계수로 나누므로, 가격을 동으로 읽는
  <code>scaleMarketPrices(MARKET_HOSE, 1000)</code>의 승수는 1입니다. 직접 1,000을 곱하고 있었다면
  (<code>formatAmount</code>에서, 또는 차트 옆에 표시하는 값에서) 그만두세요.
  자체 <code>multiplier</code>를 받지 않은 <code>PaperExecutionAdapter</code>는 이제 연결된 차트에서 시장의
  승수를 받습니다(차트는 연결할 때와 시장이 바뀔 때 어댑터의 선택적 메서드 <code>setMultiplier</code>를
  호출합니다). 그래서 증거금, 잔고, 체결 손익이 같은 금액 단위가 됩니다. <code>multiplier</code>를 받은 것은
  그대로 유지합니다. 롱/숏 포지션 그리기와 <code>risk</code>로 수량을 정하는 브래킷도 수량을 승수로
  계산합니다. 위험 5,000,000동에 스톱이 1.00 떨어져 있으면 5,000주이며, 이전에는 5,000,000주였습니다.
  <code>positionLevels(drawing, multiplier)</code>는 두 번째 인수로 시장의 승수를 받습니다. 포지션은 열릴 때의 승수를 유지합니다(<code>TradingPosition.multiplier</code>, 모의 계좌가 설정합니다). 차트가
  다른 시장이나 다른 종목을 보여도 열려 있는 포지션은 재평가되지 않으며, 패널과 차트의 태그는 포지션마다 자기
  승수로 계산합니다. 프리셋을 펼쳐 만든 시장은 프리셋의 승수를 유지합니다. 동 단위 가격을 위한
  <code>{'{'} ...MARKET_HOSE, pricePrecision: 0, priceStep: 10 {'}'}</code>는 여전히 1,000이어서 금액이 천 배가 됩니다.
  <code>scaleMarketPrices(MARKET_HOSE, 1000)</code>를 쓰거나 펼친 객체에 <code>contractMultiplier: 1</code>을
  지정하세요.
  브로커에게 보내는 내용은 위와 같이 위험에서 계산되는 수량을 빼고는 그대로입니다.
</p>

<h3 id="mark">포지션의 <code>markPrice</code>가 평가에 쓰입니다</h3>
<p>
  실행 어댑터가 포지션에 <code>markPrice</code>를 주면, 이제 계좌 패널의 행과 차트의 태그가 그 가격으로 포지션을
  평가합니다. 차트 자신의 종목 포지션도 마찬가지입니다. 이전에는 다른 종목의 포지션에만 이 가격을 읽었고 나머지는
  차트의 최신 가격으로 계산했습니다. 따라서 항상 최신으로 유지하세요. 마크 가격이 움직이면 포지션을 다시 보내야
  합니다. 한 번만 설정하는 어댑터는 행이 멈춰 있게 됩니다. 이 필드를 빼면 이전처럼 차트의 최신 가격이 쓰입니다.
  <code>markPrice</code>가 0이면 없는 것으로 봅니다.
</p>

<h3 id="ticket-dock">주문 티켓이 차트 옆 도크에서 열립니다</h3>
<p>
  위젯의 주문 티켓은 이전에는 차트 위에 뜨는 대화상자여서, 입력하려는 바로 그 가격을 가렸습니다. 이제는 차트 옆 도크의 한 페이지입니다: 가격을 가리지 않고, 차트를 눌러도 닫히지 않으며, 주문을 하나 보낸 뒤에도 다음 주문을 위해 남아 방향, 종류, 수량을 유지합니다. 버튼은 도크의 레일에 있고, <code>widget.openPanel('orderTicket')</code>은 시장가 티켓으로 엽니다.
</p>
<p>
  <code>'orderTicket'</code>은 새로 추가된 <code>WidgetPanel</code>입니다: <code>getOpenPanel()</code>과 <code>onPanelChange</code>가 이를 알려 주며, 직접 만든 페이지는 이 id를 쓸 수 없습니다. 휴대폰에서는, 또는 도크를 끈 경우(<code>features: {'{'} dock: false {'}'}</code>) 티켓은 이전과 같은 대화상자입니다. 모든 너비에서 대화상자를 원하는 호스트는 이렇게 지정합니다:
</p>
<pre><code>{`new ChartWidget(el, { ticketPlace: 'dialog' });`}</code></pre>

<h2 id="types">넓어진 타입</h2>
<p>
  <code>TimeInForce</code>는 이제 <code>'gtc' | 'day' | 'gtd' | 'ioc' | 'fok'</code>입니다. 모든 멤버를 처리하는 코드(default가
  없는 <code>switch</code>, <code>Record&lt;TimeInForce, …&gt;</code>)에는 새 멤버 세 개가 필요합니다. 직접 만든 실행 어댑터는
  받지 않는 유형을 거부해도 됩니다.
</p>
<p>
  <code>FillReason</code>에는 모의 계좌가 강제 청산한 포지션을 위한 <code>'liquidation'</code>도 있고,
  <code>ExecutionEventType</code>에는 <code>'marginCall'</code>이 있습니다. 모의 계좌에
  <code>stopOutLevel</code>이나 <code>marginCallLevel</code>을 주지 않으면 둘 다 일어나지 않지만, 모든 멤버를 처리하는 코드에는
  이들이 필요합니다.
</p>

<h2 id="unchanged">달라지지 않은 것</h2>
<ul>
  <li>데이터, 그리고 2.x에서 저장한 레이아웃과 설정은 이전처럼 불러옵니다.</li>
  <li>지표, 드로잉, 테마, 스타일 키의 이름은 그대로입니다.</li>
</ul>

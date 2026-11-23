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

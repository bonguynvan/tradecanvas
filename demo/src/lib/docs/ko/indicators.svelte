<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
</script>

<svelte:head>
  <title>지표 — TradeCanvas 문서</title>
  <meta name="description" content="{catalog.length}종의 내장 기술 지표: 이동평균, 밴드, 오실레이터, 거래량 및 변동성 지표. 소스 선택, 지표 위의 지표, 편집 가능한 레벨을 지원합니다." />
</svelte:head>

<h1>지표</h1>
<p>
  {catalog.length}종의 내장 지표를 제공합니다. id로 지표를 추가하며, 생략한 파라미터는
  기본값을 사용하고 잘못된 값도 기본값으로 대체됩니다.
</p>

<h2>지표 추가</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code>는 인스턴스 id를 반환합니다. 같은 지표를 여러 번 추가할 수 있으며,
  각 인스턴스는 고유한 입력값, 색상, 레벨을 가집니다.
</p>

<h2>소스와 지표 위의 지표</h2>
<p>
  아래 표에서 <em>소스</em>로 표시된 지표는 종가 대신 다른 가격
  (<code>open</code>, <code>high</code>, <code>low</code>, <code>hl2</code>, <code>hlc3</code>,
  <code>ohlc4</code>, <code>hlcc4</code>)이나 다른 지표의 선을 기반으로 계산할 수 있습니다. RSI의 이동평균은
  RSI 패널에 RSI의 눈금으로 그려지며, RSI를 삭제하면 함께 사라집니다.
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  패널 지표끼리 패널을 공유할 수도 있습니다:
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>.
</p>

<h2>레벨, 색상, 값</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  각 선의 최신 값은 선과 같은 색으로 축에 태그로 표시됩니다. 태그는
  <code>features.indicatorValueLabels: false</code> 또는 <code>setIndicatorValueLabelsVisible(false)</code>로 끌 수 있습니다.
  패널 안의 선, 레벨, 축, 십자선은 하나의 눈금을 공유합니다.
</p>

<h2>가격 패널 위 ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>이름</th><th>기본 파라미터</th><th>선</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· 소스</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code>는 상위 시간 단위의 이동평균을 현재 차트에 표시합니다. 예를 들어 1h 봉 위에
  일봉 50-MA를 그릴 수 있습니다. <em>완성된</em> 상위 시간 단위 종가만 평균하므로
  각 경계에서 계단식으로 바뀌며, 지나간 값이 다시 그려지지(repaint) 않습니다.
</p>

<h2>별도 패널 ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>이름</th><th>기본 파라미터</th><th>선</th><th>레벨</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· 소스</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code>(Volume Delta)는 OHLCV로 매수/매도 압력을 근사합니다. 상승 마감한 봉은
  양의 거래량을, 하락 봉은 음의 거래량을 더합니다. <code>mode: 0</code>은 봉별 히스토그램,
  <code>mode: 1</code>은 누적 델타입니다. (진짜 틱 델타를 구하려면 체결별 매수/매도 데이터가 필요한데,
  OHLCV 시리즈에는 그 정보가 없습니다.)
</p>

<h2>나만의 지표</h2>
<p>
  <code>IndicatorBase</code>를 상속하고 그릴 대상(<code>plots</code>), 패널 눈금,
  레벨, 입력값을 선언하세요. 렌더링 코드를 직접 작성하지 않아도 차트가 지표를 그리고,
  패널 눈금을 맞추고, 값을 태그로 표시하며, 위젯의 범례와 설정에 나열합니다.
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">사용자 지정 지표 레시피</a>를 참고하세요.
</p>

<h2>패널: 크기 조절, 접기, 최대화, 순서 바꾸기</h2>
<p>
  패널 위쪽의 <strong>구분선을 드래그</strong>해 크기를 조절합니다. ChartWidget에서는 패널마다 오른쪽 위에
  버튼이 있어 패널을 위나 아래로 옮기거나, 머리글만 남게 접거나, 최대화할 수 있습니다(다른 패널은 접히고
  가격 패널은 좁은 띠로 남습니다). 저장된 레이아웃에는 패널마다 크기, 순서, 접기와 최대화 상태가 유지됩니다.
  코드로는 다음과 같습니다.
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order'`}</code></pre>

<h2>지표를 다른 패널로 옮기기</h2>
<p>
  지표는 다른 지표의 패널에 합류하거나(그러면 그 패널의 눈금을 함께 씁니다), 자기만의 패널을 갖거나,
  가격 패널로 돌아갈 수 있습니다. 자신이 주인인 패널을 떠나도 그 패널의 다른 지표는 남고(다음 패널 지표가
  패널을 이어받습니다), 그 지표의 선을 읽는 지표는 함께 따라갑니다. ChartWidget에서는 범례 행의
  <strong>⋯</strong> 버튼으로 위 패널, 아래 패널, 새 패널, 가격 패널 중에서 고를 수 있습니다.
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>실행 취소와 템플릿</h2>
<p>
  지표 추가, 삭제, 편집, 이동은 그림과 같은 기록에 쌓이는 실행 취소 단계입니다
  (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>). 실행 취소로 되살아난 지표는 원래 id 그대로 돌아오므로
  그 선에 건 알림도 계속 연결됩니다. 한 지표에 잇따라 한 편집(색상 드래그, 기간 입력)은 한 단계로 묶입니다.
  레이아웃을 불러오면 기록이 새로 시작됩니다.
</p>
<p>
  지표 전체를 한꺼번에 꺼냈다가 다시 넣을 수 있으며, ChartWidget의 지표 템플릿이 바로 이 방식입니다.
  지표 메뉴의 <strong>지표를 템플릿으로 저장…</strong>은 지표(입력값, 스타일, 레벨, 패널)를 이름을 붙여
  저장하고, 템플릿을 고르면 차트의 지표가 그것으로 바뀝니다. 이 교체는 실행 취소 한 단계입니다.
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>차트 밖에서 계산하기</h2>
<p>
  <code>IndicatorWorkerHost</code>는 Web Worker가 사용하는 것과 같은 메시지로 봉 데이터에서
  지표를 계산합니다. 워커 스크립트는 아직 배포 패키지에 포함되어 있지 않으므로, <code>null</code>을
  넘기고 플러그인을 등록해 그 자리에서 계산하세요(SSR, 테스트, 스크립트).
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>

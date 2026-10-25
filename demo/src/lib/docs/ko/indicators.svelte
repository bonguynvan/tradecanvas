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

<p>
  TypeScript에서는 내장 지표의 id와 입력값에 타입이 있습니다. <code>BuiltInIndicators</code>는 각 지표의 입력값과 기본값,
  라인의 키를 나열하므로 편집기가 입력하는 동안 제안하고, 이름을 잘못 쓴 입력값은 타입 검사에서 실패합니다.
  플러그인이 등록한 지표는 어떤 id와 입력값이든 받습니다.
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
  각 선의 최신 값은 범례에 표시됩니다. 선과 같은 색으로 축에도 태그를 달려면
  <code>features.indicatorValueLabels: true</code> 또는 <code>setIndicatorValueLabelsVisible(true)</code>로 켭니다(기본값은 꺼짐).
  패널 안의 선, 레벨, 축, 십자선은 하나의 눈금을 공유합니다.
</p>

<h2>일부 시간 단위에서만</h2>
<p>
  지표를 일부 시간 단위에서만 보이게 할 수 있습니다. 200일 이동평균은 일봉 이상에서만, 빠른 오실레이터는
  분봉에서만 보이게 하는 식입니다. 시간 단위의 종류(틱, 초, 분, 시간, 일, 주, 월)마다 그대로 켜 두거나, 끄거나,
  범위를 지정할 수 있으며, 지정하지 않은 종류에서는 모든 시간 단위에 표시됩니다. 차트는 연결된 스트림의
  시간 단위에 규칙을 대조하며, 시간 단위가 바뀔 때마다 다시 판단합니다. <code>setData</code>로 넣은 바는
  <code>chart.setDataTimeframe('1h')</code>로 시간 단위를 알려 줍니다(ChartWidget은 자동으로 합니다). 둘 다 없으면 지표를 표시합니다.
  규칙은 레이아웃과 함께 저장되고, 다른 편집처럼 실행 취소할 수 있습니다.
</p>
<pre><code>{`chart.setIndicatorIntervals(ema, { seconds: false, minutes: false, hours: [1, 4] })
chart.getIndicatorIntervals(ema)    // { seconds: false, minutes: false, hours: [1, 4] }
chart.setIndicatorIntervals(ema, null)  // 다시 모든 시간 단위에 표시`}</code></pre>
<p>
  <code>getActiveIndicators()</code>는 지표마다 <code>visible</code>(켜짐)인지, <code>shown</code>(이 시간 단위에서
  그려짐)인지 알려 줍니다. ChartWidget에서는 그려지지 않는 동안 그 지표의 범례 행이 회색으로 바뀝니다.
</p>

<h2>ChartWidget에서</h2>
<p>
  도구 모음의 <strong>지표</strong>를 누르면 대화상자가 열립니다. 이름이나 약칭을 입력해 모든 지표를 검색하거나
  (<kbd>Enter</kbd>는 가장 잘 맞는 지표를 추가합니다), 옆에 늘어선 그룹을 고르세요. <strong>즐겨찾기</strong>,
  <strong>템플릿</strong>, <strong>전체</strong>, 그리고 종류별 그룹(이동평균, 추세, 오실레이터, 변동성, 거래량,
  밴드 및 채널, 가격 및 패턴)이 있습니다. 행을 누르면 그 지표가 추가되고, 대화상자는 다음 지표를 위해 열려 있습니다.
  숫자는 그 지표가 차트에 몇 개 있는지 보여 주고, 옆의 별을 누르면 즐겨찾기에 들어갑니다. 휴대폰에서는 그룹이
  목록 위에 칩 한 줄로 나옵니다.
</p>
<p>
  지표 설정(범례 행의 이름이나 톱니바퀴로 엽니다)에는 탭이 세 개 있습니다. <strong>입력값</strong>,
  <strong>스타일</strong>(선마다 한 행으로 표시 여부, 색상, 선 종류, 그리고 선 두께, 오버레이의 가격 눈금, 레벨),
  <strong>표시</strong>(지표가 보이는 시간 단위)입니다. 편집은 바로 반영됩니다. <strong>취소</strong>나
  <kbd>Esc</kbd>는 모두 되돌리고, <strong>확인</strong>은 그대로 유지합니다. <strong>기본값</strong>으로 설정을
  재설정하거나 기본값으로 저장할 수 있습니다. 저장하면 이 브라우저에서 같은 종류의 새 지표가 이 입력값과
  모양으로 시작합니다.
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

<p>
  <code>volumeProfile</code>은 가격대마다 한 줄을 플롯 왼쪽 가장자리부터, 그 가격대에서 거래된 거래량만큼의 길이로 그립니다.
  줄은 반투명하므로 아래에 있는 범례와 캔들도 그대로 읽힙니다. <code>updateIndicatorStyle</code>로
  <code>opacity</code>를 낮추면 더 흐리게 할 수 있습니다.
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

<h2>아시아 HTS에서 익숙한 지표</h2>
<p>
  한국, 일본, 베트남의 투자자가 시세 화면에서 익숙하게 쓰는 지표: 심리도(<code>psy</code>)와 신심리도(<code>newpsy</code>), VR(<code>vr</code>), AB Ratio(<code>abratio</code>), <code>sonar</code>, <code>sigma</code>, Binary Wave(<code>binarywave</code>), 거래대금(<code>tradevalue</code>)과 전일 대비 거래량(<code>volchange</code>), 디마크 목표가(<code>demark</code>), 최대 20개 선의 이동평균 그물망(<code>rainbow</code>). 거래대금은 봉마다 종가 × 거래량으로 추정한 값이며, 거래소의 공식 수치는 시세 데이터에 있습니다.
</p>
<pre><code>{`chart.addIndicator('psy', { period: 10 }, 'bottom')              // 상승 마감 비율, 25와 75 표시
chart.addIndicator('vr', { period: 20 }, 'bottom')                // 상승일과 하락일의 거래량 비율
chart.addIndicator('tradevalue', {}, 'bottom')                    // 봉마다 종가 × 거래량
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 }) // 10~100봉의 이동평균 10개`}</code></pre>

<h2>캔들 패턴</h2>
<p>
  1~5봉으로 이뤄진 64개 패턴: 도지, 망치형과 유성형, 장대양봉·음봉(마루보주)과 샅바형; 장악형, 잉태형, 관통형과 먹구름형, 집게형, 박차형; 샛별형과 석별형, 버려진 아기형, 적삼병과 흑삼병, 상승·하락 삼내부형과 삼외부형, 타스키 갭; 삼선타격형, 삼법형, 매트홀드, 탈출형, 사다리 바닥형. 반전 패턴은 뒤집을 추세가 있을 때만 세며(패턴 직전 종가가 10봉 평균과 10봉 전 종가를 모두 넘어설 때, <code>trendPeriod</code>), 몸통의 길고 짧음은 앞선 봉들의 평균 몸통과 비교합니다. 지표는 상승 패턴 아래, 하락 패턴 위에 화살표를 그리고 봉이 충분히 넓으면 짧은 이름을 붙입니다. 여러 패턴이 끝나는 봉에는 가장 긴 패턴을 보여 줍니다. <code>reversal</code>, <code>continuation</code>, <code>indecision</code>(1 또는 0)으로 종류를 고릅니다.
</p>
<pre><code>{`chart.addIndicator('candlepatterns')                  // 패턴이 끝나는 봉마다 화살표와 이름
chart.addIndicator('candlepatterns', { indecision: 1 }) // 도지와 팽이형도 표시

import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/chart'

const found = detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer'] })
// [{ index, time, pattern: { id, name, short, direction, kind, bars } }]
CANDLE_PATTERNS.length                                 // 64`}</code></pre>

<h2>나만의 지표</h2>
<p>
  <code>IndicatorBase</code>를 상속하고 그릴 대상(<code>plots</code>), 패널 눈금,
  레벨, 입력값을 선언하세요. 렌더링 코드를 직접 작성하지 않아도 차트가 지표를 그리고,
  패널 눈금을 맞추고, 값을 태그로 표시하며, 위젯의 범례와 설정에 나열합니다.
  <code>category</code>(<code>'oscillators'</code>, <code>'volume'</code>…)를 지정하면 지표 대화상자의 그 그룹에
  들어가고, 지정하지 않으면 기타에 들어갑니다.
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
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  ChartWidget에서 패널을 오른쪽 클릭하면 그 패널만의 로그 눈금, 반전 눈금, 퍼센트 눈금을 쓸 수 있습니다.
</p>

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
  지표 대화상자의 템플릿 탭에 있는 <strong>지표를 템플릿으로 저장…</strong>은 지표(입력값, 스타일, 레벨, 패널)를 이름을 붙여
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

<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => Object.values(i.inputs).some((x) => x.kind === 'source');
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
  <code>vwap</code>은 <code>anchor</code>에서 다시 계산합니다. <code>'session'</code>(기본값)은 거래일마다 거래소
  시간대의 자정부터(종목의 <code>timeZone</code>, 없으면 시장의, 없으면 UTC), <code>'week'</code>는 매주 월요일,
  <code>'month'</code>는 매월 1일, <code>'all'</code>은 초기화 없이 불러온 모든 봉의 평균이라 과거 데이터를 더
  불러오면 값이 바뀝니다. 일봉에서는 세션 VWAP이 각 봉의 대표가격과 같으므로 일봉 차트에서는
  <code>'week'</code>나 <code>'month'</code>를 고르세요. <code>svwap</code>은 σ 밴드가 있는 세션 VWAP이고,
  <code>avwap</code>은 고정한 봉부터 시작합니다. <code>svwap</code>, <code>mtfma</code>, 전일 가격선, 마켓 프로파일의
  세션도 같은 시간대로 날짜를 나눕니다. <code>mtfma</code>의 2h부터 12h까지의 주기도 거래소 자정부터 시작하고(피드 자체의
  4h 봉은 UTC 기준 그대로), 일봉에서 <code>svwap</code>은 밴드 없이 선만 표시합니다. ChartWidget에서는 다른 기준점의 VWAP이 범례, 칩, 개체 패널에서 기준점 이름과 함께('VWAP 주') 표시되고, 기준점과 그 선택지는 위젯의 언어로 나옵니다. CSV 열은 <code>VWAP</code> 그대로입니다.
</p>
<pre><code>{`chart.addIndicator('vwap')                      // 거래일마다 다시 계산
chart.addIndicator('vwap', { anchor: 'week' })  // 매주 월요일: 일봉용
chart.addIndicator('vwap', { anchor: 'all' })   // 불러온 모든 봉, 예전과 같음`}</code></pre>

<p>
  <code>volumeProfile</code>은 가격대마다 한 줄을 플롯 왼쪽 가장자리부터 그리며, 각 줄의 길이는 그 가격대에서 거래된 거래량을 따릅니다.
  줄은 반투명하므로 위에 겹친 범례와 아래에 있는 캔들도 그대로 읽힙니다. <code>updateIndicatorStyle</code>로
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
  <code>voldelta</code>(Volume Delta)는 각 봉에서 매수 측이 가져간 거래량에서 매도 측이 가져간 거래량을 뺀 값입니다.
  누가 체결을 가져갔는지 알려 주는 봉(봉의 <code>buyVolume</code>)은 실제 델타를 줍니다. 알려 주지 않는 봉은
  마감 방식으로 읽습니다: 시가 이상으로 마감하면 거래량 전체를 양으로, 아니면 음으로 보며, OHLCV 봉으로 할 수 있는
  가장 가까운 값입니다. <code>mode: 0</code>은 봉별 히스토그램, <code>mode: 1</code>은 누적 델타이며,
  <code>anchor</code> 기간마다 다시 시작합니다(<code>'session'</code>, <code>'week'</code> 또는 <code>'month'</code>.
  기본값 <code>'all'</code>에서는 다시 시작하지 않습니다).
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
<p>
  패턴만 찾고 차트는 그리지 않는 페이지(스캐너, 스크리너)는 두 가지를 <code>@tradecanvas/core/patterns</code>에서
  import합니다. 검출기만 담긴 gzip 약 4 kB의 별도 청크라서, 앱의 다른 페이지가 차트를 쓰더라도 이 페이지는 차트 엔진을
  불러오지 않습니다. import하려면 앱의 의존성에 <code>@tradecanvas/core</code>를 추가하세요.
</p>
<pre><code>{`import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/core/patterns'`}</code></pre>

<h2 id="fair-value-gaps">페어 밸류 갭</h2>
<p>
  세 개의 봉에서 세 번째 봉의 저가가 첫 번째 봉의 고가보다 위에 있으면(하락에서는 세 번째 봉의 고가가 첫 번째 봉의 저가보다 아래에 있으면) 페어 밸류 갭이 남습니다. 그 사이 가격에서는 가운데 봉만 거래되었습니다. 차트는 그 가격대에 상자를 그립니다. 갭이 열려 있는 동안에는 가운데 봉에서 오른쪽 끝까지, 상승 갭은 청록색, 하락 갭은 분홍색입니다(캔들 패턴 표시와 같은 색으로, 캔들의 초록과 빨강과 구분됩니다. 지표 스타일에서 바꿀 수 있습니다). 이후 처음으로 전체를 지나간 봉이 갭을 메우며, <code>showFilled</code>가 1이 아니면 차트에서 사라집니다. <code>detectFairValueGaps</code>는 차트 없이 전부를, 각각을 메운 봉과 함께 돌려줍니다.
</p>
<pre><code>{`chart.addIndicator('fvg')                              // 아직 열려 있는 갭마다 상자 하나
chart.addIndicator('fvg', { minPercent: 0.1 })         // 가격의 0.1% 미만인 갭은 제외
chart.addIndicator('fvg', { showFilled: 1 })           // 메워진 갭도 흐리게, 메운 봉까지 남김

import { detectFairValueGaps } from '@tradecanvas/chart'

detectFairValueGaps(bars, { minPercent: 0.1 })
// [{ index, formed, direction: 'up' | 'down', top, bottom, filledAt }]`}</code></pre>

<h2 id="divergences">다이버전스</h2>
<p>
  다이버전스는 가격과 오실레이터가 각각 두 번 방향을 바꾸되 같은 방향으로 움직이지 않는 것입니다. 강세는 두 저점에서 나타납니다. 가격은 더 낮은 저점을, 오실레이터는 더 높은 저점을 만듭니다. 약세는 두 고점에서 나타납니다. 가격은 더 높은 고점을, 오실레이터는 더 낮은 고점을 만듭니다. <code>rsidiv</code>는 RSI에 각 다이버전스의 두 전환점을 잇는 선과 두 번째 전환점의 표시를 더한 지표입니다. <code>hidden: 1</code>이면 히든 다이버전스(가격은 지키고 RSI는 지키지 못함)도 점선으로 추가됩니다. 전환점은 앞의 <code>left</code>개 봉과 뒤의 <code>right</code>개 봉보다 두드러져야 하므로, 다이버전스는 <code>right</code>개 봉 늦게 확정되고 확정하는 봉이 마감된 뒤로는 바뀌지 않습니다(그 봉이 아직 진행 중일 때는 나타났다 사라질 수 있습니다). 두 전환점의 간격은 <code>minBars</code>에서 <code>maxBars</code>개 봉입니다. <code>detectDivergences(bars, line, options)</code>는 봉마다 값이 하나인 어떤 선이든(값이 없는 곳은 null) 읽으며 차트가 필요 없습니다.
</p>
<pre><code>{`chart.addIndicator('rsidiv', {}, 'bottom')                    // RSI와 그 다이버전스 표시
chart.addIndicator('rsidiv', { hidden: 1 }, 'bottom')         // 히든 다이버전스도, 점선으로
chart.addIndicator('rsidiv', { left: 3, right: 3 }, 'bottom') // 더 가까운 전환점: 3개 봉 늦게 확정, 더 많이

import { detectDivergences } from '@tradecanvas/chart'

detectDivergences(bars, macdHistogram, { left: 5, right: 5, minBars: 5, maxBars: 60, hidden: true })
// [{ kind: 'bullish' | 'bearish', hidden, from, to, confirmed, valueFrom, valueTo, priceFrom, priceTo }]`}</code></pre>

<h2 id="session-volume-profile">세션 거래량 프로파일</h2>
<p>
  <code>svp</code>는 거래일마다 가격별 거래량을 그립니다. 그날의 가격 범위를 <code>rows</code>개 행으로 나누고, 각 봉의 거래량을 그 범위가 걸치는 행에 고르게 나눈 뒤, 그날 첫 봉에서 오른쪽으로 뻗는 행으로 그립니다. 그 위에 그날의 POC(거래량이 가장 많은 행)와 밸류 에어리어(그 주변에서 그날 거래량의 <code>valueArea</code>퍼센트, 기본 70을 담는 행. Market Profile처럼 더 무거운 쪽에서 두 행씩 더합니다)를 그날을 가로지르는 선으로 표시합니다. 하루는 거래소 시계의 자정에 시작합니다(<code>setExchangeTimeZone</code>). Session VWAP과 같습니다. 각 봉의 <code>poc</code>, <code>vah</code>, <code>val</code>은 그 봉이 속한 하루 전체의 값이므로, 그 봉 뒤의 봉까지 포함합니다. 지난 날에는 아침 봉이 그날 마감 시점의 프로파일을 갖고, 거래 중인 날에는 거래에 따라 움직입니다. 하루를 읽기 위한 것이며, 그 봉에서의 신호나 백테스트에는 맞지 않습니다. <code>volumeProfile</code>은 불러온 모든 봉의 프로파일 하나이며, <code>sessionVolumeProfiles</code>는 차트 없이 날마다의 행을 돌려줍니다.
</p>
<pre><code>{`chart.addIndicator('svp')                           // 하루에 프로파일 하나, POC와 밸류 에어리어 포함
chart.addIndicator('svp', { rows: 40, valueArea: 68 }) // 더 촘촘한 행, 더 좁은 밸류 에어리어

import { sessionVolumeProfiles } from '@tradecanvas/chart'

sessionVolumeProfiles(bars, { rows: 24, valueArea: 70, timeZone: 'America/New_York' })
// [{ start, end, time, low, high, rowHeight, volumes, total, poc, valueAreaLow, valueAreaHigh, valueAreaRows }]`}</code></pre>

<h2>나만의 지표</h2>
<p>
  짧은 방법은 <code>defineIndicator</code>입니다: 입력값, 그리고 봉에서 지표의 선을 돌려주는 함수 하나이며,
  계산에는 <code>ta</code>를 씁니다(<code>ta.ema</code>, <code>ta.rsi</code>, <code>ta.crossover</code>…).
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

chart.registerIndicator(defineIndicator({
  id: 'smoothRsi',
  name: 'Smoothed RSI',
  inputs: { period: { default: 14, kind: 'int', min: 2 }, smooth: { default: 5, kind: 'int', min: 1 } },
  scale: { min: 0, max: 100 },
  levels: [30, 70],
  calculate: ({ bars, inputs, ta }) => ({ value: ta.ema(ta.rsi(bars.close, inputs.period), inputs.smooth) }),
}))
chart.addIndicator('smoothRsi')`}</code></pre>
<p>
  긴 과거 데이터에서 틱을 따라가야 하는 지표나 자체적으로 무언가를 그리는 지표는
  <code>IndicatorBase</code>를 상속하고 그릴 대상(<code>plots</code>), 패널 눈금,
  레벨, 입력값을 선언하세요. 렌더링 코드를 직접 작성하지 않아도 차트가 지표를 그리고,
  패널 눈금을 맞추고, 값을 태그로 표시하며, 위젯의 범례와 설정에 나열합니다.
  <code>category</code>(<code>'oscillators'</code>, <code>'volume'</code>…)를 지정하면 지표 대화상자의 그 그룹에
  들어가고, 지정하지 않으면 기타에 들어갑니다. 직접 만든 그룹 <code>{`{ id: 'my-app', label: 'My App' }`}</code>는
  앱의 지표들을 그 이름 아래에 모아, 기본 제공 종류보다 앞에 나열합니다.
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">사용자 지정 지표 레시피</a>를 참고하세요.
  봉을 일, 주, 월 단위로 묶는 지표는 거래소 시간대를 <code>config.exchangeTimeZone</code>에서 읽습니다
  (차트가 설정하며, 없으면 UTC). 시간대가 바뀌면 그것을 읽는 지표와 그 지표의 선을 읽는 지표만
  다시 계산합니다. 시간대를 읽지 않는 직접 만든 지표는 descriptor에
  <code>readsExchangeTimeZone: false</code>를 적으면 그대로 남습니다.
</p>
<p>
  각 입력의 <code>kind</code>(<code>'int'</code>, <code>'number'</code>, <code>'boolean'</code>,
  <code>'choice'</code>, <code>'source'</code>, <code>'color'</code>, <code>'text'</code>)와
  <code>min</code>, <code>max</code>, <code>step</code>이 설정 창의 입력란을 정합니다.
  <code>'int'</code>는 기간을 읽는 방식대로 입력하는 즉시 정수로 반올림됩니다. <code>kind</code>가 없으면
  기본값에서 판단합니다(숫자는 <code>'number'</code>이며, <code>'int'</code>로 선언한 것만 반올림됩니다). <code>describeInputs(descriptor)</code>는 설정 대화상자,
  이 문서, MCP 서버가 읽는 그대로 입력을 나열합니다.
</p>
<pre><code>{`inputs: {
  period: { kind: 'int', min: 2, max: 500 },
  mult: { kind: 'number', min: 0.1, step: 0.1 },
  source: { source: true },
  type: { kind: 'choice', options: [{ value: 'ema', label: 'Exponential' }, { value: 'sma', label: 'Simple' }] },
}`}</code></pre>
<p>
  선택 입력의 <code>options</code>는 값이거나, 설정에 그 값 대신 보일 레이블을 붙인 값
  (<code>{'{ value, label }'}</code>)이며, 레이블은 앱의 언어로 적습니다. 지표에는 값이 전달됩니다.
</p>
<p>
  디스크립터는 플롯의 모양도 밝히고, 차트는 그대로 그립니다. <code>fills</code>는 두 플롯에 모두 값이 있는
  곳에서 그 사이를 선 아래에 칠합니다. 플롯의 <code>width</code>는 지표의 굵기와 상관없이 그 굵기를
  유지합니다(가는 중심선 등). <code>lineStyle</code>은 스타일이 달리 정할 때까지 점선으로 그리고, 설정
  대화상자도 그 선 종류를 보여 주고 되돌립니다. <code>opacity</code>는 선을 옅게 합니다. <code>breakOn</code>은
  기간에 번호를 매기는 필드를 가리키며, 그 값이 바뀌는 곳에서 선이 끊깁니다. 기본 제공 채널, 밴드,
  Supertrend, 파라볼릭 SAR이 이렇게 그려집니다.
</p>
<pre><code>{`plots: [
  { key: 'upper', title: 'Upper', color: 0 },
  { key: 'middle', title: 'Basis', color: 1, width: 1, lineStyle: 'dashed' },
  { key: 'lower', title: 'Lower', color: 0 },
],
fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }],`}</code></pre>
<p>
  <code>kind: 'markers'</code> 플롯은 해당 필드에 값이 있는 봉(전환점, 신호)에 <code>shape</code>
  (<code>'triangleUp'</code>, <code>'triangleDown'</code>, <code>'arrowUp'</code>, <code>'arrowDown'</code>,
  <code>'dot'</code>, <code>'square'</code> 또는 <code>'diamond'</code>)으로 표시를 그립니다. 위치는 그 값이며,
  가격 패널에서는 봉의 고가 위나 저가 아래에 둘 수도 있습니다(<code>position: 'aboveBar'</code>, <code>'belowBar'</code>).
  읽을 값이 아니므로 범례에 값이 없고, 축에 태그가 없고, 내보내기에 열이 없으며, 다른 지표가 읽을 수 있는 선으로도
  제공되지 않습니다. 별도 패널에서는 표시가 그 값의 위치에 그려집니다. 표시가 없는 봉에서는 필드를 비워 두세요.
</p>
<p>
  표시의 너비는 봉이 허용하는 만큼이며, 4~8 px입니다. 보는 사람은 지표의 스타일 탭에서 다른 모양과 크기를 고르고,
  코드에서는 플롯의 스타일에 지정합니다: <code>shape</code>, 그리고 가로 픽셀 수(2~40) 또는
  <code>'auto'</code>인 <code>size</code>. Williams Fractals가 이렇게 그려집니다: 고점 위에 삼각형 하나, 저점 아래에 삼각형 하나.
</p>
<pre><code>{`chart.updateIndicatorStyle(fractals, { plots: { up: { shape: 'arrowUp', size: 14 }, down: { size: 'auto' } } });`}</code></pre>
<pre><code>{`plots: [
  { key: 'value', title: 'MACD', color: 0 },
  { key: 'turn', title: 'Turn', color: 1, kind: 'markers', shape: 'triangleUp', position: 'belowBar' },
],`}</code></pre>

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
  <code>IndicatorWorkerHost</code>는 패키지에 포함된 워커(<code>createIndicatorWorker()</code>)에서 봉 데이터로
  지표를 계산합니다. 차트가 <code>indicatorWorker: 'auto'</code>일 때 쓰는 바로 그 워커입니다. 대신 <code>null</code>을
  넘기고 플러그인을 등록하면 그 자리에서 계산합니다(SSR, 테스트, 스크립트).
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator, createIndicatorWorker } from '@tradecanvas/core'

const config = { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }

const inWorker = new IndicatorWorkerHost(await createIndicatorWorker())
const output = await inWorker.calculate('rsi', config, bars)

const inPlace = new IndicatorWorkerHost(null)
inPlace.registerFallbackPlugin(new RSIIndicator())
const same = await inPlace.calculate('rsi', config, bars)`}</code></pre>

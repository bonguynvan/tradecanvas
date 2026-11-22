<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>플러그인 — TradeCanvas 문서</title>
  <meta name="description" content="플러그인 SDK로 사용자 지정 지표, 그리기 도구, 차트 유형, 오버레이를 추가해 TradeCanvas를 확장합니다." />
</svelte:head>

<h1>플러그인</h1>
<p>
  사용자 지정 <strong>지표</strong>, <strong>그리기 도구</strong>,
  <strong>차트 유형</strong>, <strong>오버레이</strong>로 차트를 확장합니다. 전역으로 등록하거나 차트별로 등록할 수 있습니다.
</p>

<h2>등록</h2>
<p>등록 방법은 세 가지이며, 우선순위 순서로 전역 기본값, 생성자, 인스턴스에 대한 명령형 호출입니다.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>
<p>
  <code>ChartWidget</code>은 플러그인을 <code>plugins</code>로 받습니다(타입이 지정되며, <code>chartOptions.plugins</code>와 함께 쓸 수 있습니다).
  위젯이 무엇이든 복원하기 전에 차트에 등록되므로, 직접 만든 지표를 담은 저장된 레이아웃
  (<code>persistLayouts</code>), 템플릿, 공유된 보기도 그 지표를 다시 불러옵니다.
  같은 id라면 위젯의 <code>plugins</code>가 <code>chartOptions.plugins</code>보다 우선하고, 그리드 셀 자체의
  <code>plugins</code>는 그리드가 공유하는 플러그인을 대체합니다. 레이아웃이 복원된 뒤 <code>widget.getChart()</code>에
  등록한 지표는 너무 늦습니다. 레이아웃이 이미 그 지표를 빼 버렸기 때문입니다.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>플러그인 종류</h2>
<table>
  <thead><tr><th>종류</th><th>계약</th><th>렌더링 위치</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>오버레이 또는 패널</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>오버레이 레이어</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + 선택적 <code>transform()</code></td><td>메인 시리즈</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2 id="define">사용자 지정 지표, 짧은 방법</h2>
<p>
  <code>defineIndicator</code>는 입력값과 봉을 받는 함수 하나로 지표를 만듭니다: 클래스도, 그리기 코드도
  없습니다. <code>calculate</code>는 열 형태의 봉(<code>bars.close[i]</code>), 입력값,
  그리고 지표를 이루는 계산인 <code>ta</code>를 받아, 지표의 선을 키별로 반환합니다. 차트는 그 선들을 그리고,
  패널 눈금을 맞추고, 범례에 나열하며, 설정 대화상자에 입력마다 입력란을 둡니다.
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

const emaCross = defineIndicator({
  id: 'emaCross',
  name: 'EMA Crossover',
  placement: 'overlay',                       // on the prices; 'panel' (the default) is a pane of its own
  inputs: {
    fast: { default: 9, kind: 'int', min: 1 },
    slow: { default: 21, kind: 'int', min: 2 },
  },
  plots: [
    { key: 'fast', title: 'Fast', color: 0 },
    { key: 'slow', title: 'Slow', color: 1 },
    { key: 'buy', title: 'Buy', color: 2, kind: 'markers', shape: 'arrowUp', position: 'belowBar' },
    { key: 'sell', title: 'Sell', color: 3, kind: 'markers', shape: 'arrowDown', position: 'aboveBar' },
  ],
  calculate({ bars, inputs, ta }) {
    const fast = ta.ema(bars.close, inputs.fast)
    const slow = ta.ema(bars.close, inputs.slow)
    return { fast, slow, buy: ta.crossover(fast, slow), sell: ta.crossunder(fast, slow) }
  },
})

chart.registerIndicator(emaCross)
chart.addIndicator('emaCross', { fast: 12 })`}</code></pre>
<ul>
  <li>
    <strong>입력.</strong> 각 입력에는 <code>default</code>가 있고 그 타입이 입력의 타입이며, 설정 대화상자가
    입력을 보여 주는 데 필요한 것이 있습니다: <code>kind</code>, <code>min</code>, <code>max</code>, <code>step</code>,
    선택 입력의 <code>options</code>, 가격 소스를 위한 <code>source: true</code>(그러면 지표는 그것을
    <code>bars.close</code>로 읽습니다). <code>calculate</code>는 각 숫자를 <code>min</code>과
    <code>max</code> 안의 값으로, <code>kind: 'int'</code>이면 정수로 받고, 선택 입력은 옵션 중 하나로 받습니다.
  </li>
  <li>
    <strong>선.</strong> 봉마다 값 하나이며, 값이 없는 곳은 <code>undefined</code>, <code>null</code> 또는 <code>NaN</code>입니다.
    <code>true</code>는 가격 위에 그리는 <code>kind: 'markers'</code> 플롯에서 봉을 표시합니다:
    <code>position</code>에 따라 봉의 위나 아래에, 없으면 봉의 종가에. 별도 패널의 표시는
    숫자이며, 그 값의 위치에 그려집니다. <code>plots</code>가 없으면 반환된 모든 선이
    테마의 시리즈 색으로 선으로 그려집니다. 봉이 너무 적으면 선을 반환하지 않는 지표는 선을 선언합니다.
  </li>
  <li>
    <strong>모양.</strong> <code>plots</code>(선, <code>'histogram'</code>, <code>'step'</code>,
    <code>'dots'</code>, <code>'markers'</code>, 각각 색, 굵기, 선 종류와 함께), 두 선 사이의 띠를 위한
    <code>fills</code>, 패널을 위한 <code>scale</code>과 <code>levels</code>. 아래의
    <a href="#descriptor">디스크립터</a>에서와 같습니다.
  </li>
  <li>
    <strong><code>ta</code></strong>에는 <code>sma</code>, <code>ema</code>, <code>wma</code>, <code>rma</code>,
    <code>stdev</code>, <code>highest</code>, <code>lowest</code>, <code>change</code>, <code>rsi</code>,
    <code>macd</code>, <code>atr</code>, <code>bollinger</code>, <code>crossover</code>,
    <code>crossunder</code>가 있습니다. 각각 봉마다 값 하나를 받아 봉마다 값 하나를 반환하므로, 하나가 다음의 입력이 됩니다
    (<code>ta.ema(ta.rsi(bars.close, 14), 9)</code>). <code>rsi</code>, <code>macd</code>, <code>atr</code>,
    <code>bollinger</code>는 기본 제공 지표 자체를 실행하므로 그 값은 차트의 값입니다.
  </li>
  <li>
    <strong><code>ta.indicator(id, input, params)</code></strong>는 어떤 기본 제공 지표든 실행해 그 선을 키별로
    반환합니다: <code>{`ta.indicator('stochastic', bars, { kPeriod: 14 }).k`}</code>,
    <code>{`ta.indicator('supertrend', bars).value`}</code>. id, 입력, 선은
    <a href={href('/docs/indicators')}>지표</a> 페이지에 있는 그대로이며, 타입이 지정되어 있습니다. <code>input</code>은 봉이거나,
    지표가 가격으로 읽을 봉마다의 값입니다(<code>{`ta.indicator('ema', rsi, { period: 5 })`}</code>).
    봉마다의 값에는 거래량도 시각도 없으므로, 거래량이나 하루의 세션을 다루는 지표(OBV, MFI, VWAP…)에는
    봉이 필요합니다. 다른 종목의 봉을 읽는 다섯 지표는 여기에 들어 있지 않습니다. 이것은
    따로도 export되어 있습니다: <code>{`import { ta } from '@tradecanvas/chart'`}</code>.
  </li>
</ul>
<p>
  틱마다 모든 봉에 대해 계산하며, 이런 계산에는 그래도 빠릅니다. 그것이 드러날 만큼 느린 지표나,
  봉마다의 값이 아닌 다른 것을 그리는 지표는 <code>update</code>가 있는 클래스입니다:
  아래의 긴 방법입니다.
</p>

<h2>사용자 지정 지표</h2>
<p>
  지표는 <code>IndicatorPlugin</code>입니다. 지표가 무엇이고 어떻게 보이는지 밝히는 <code>descriptor</code>와,
  봉마다 값을 내는 <code>calculate()</code>로 이루어집니다. <code>IndicatorBase</code>를 상속하면 나머지는 차트가
  디스크립터를 보고 처리합니다. 플롯을 그리고, 패널 눈금을 맞추고, 축에 값을 태그로 표시하고, 범례, 설정,
  지표 대화상자에 지표를 나열합니다. 다음은 선이 방향을 바꾸는 곳을 표시하는 MACD 전체입니다.
</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart'

const ema = (prev, value, period) => (prev === undefined ? value : prev + (2 / (period + 1)) * (value - prev))

class TurningMacd extends IndicatorBase {
  descriptor = {
    id: 'turning-macd', name: 'Turning MACD', shortName: 'TMACD',
    placement: 'panel',               // a pane of its own; 'overlay' draws on the price pane
    category: 'oscillators',          // its group in the Indicators dialog
    defaultConfig: { fast: 12, slow: 26, source: 'close' },
    inputs: {
      fast: { kind: 'int', min: 2, label: 'Fast' },
      slow: { kind: 'int', min: 3, label: 'Slow' },
      source: { kind: 'choice', label: 'Price', options: [{ value: 'close', label: 'Close' }, { value: 'hl2', label: 'Median' }] },
    },
    plots: [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers', tone: { field: 'up' }, downColor: 2 },
    ],
    scale: { zero: true },
    levels: [0],
    defaultStyle: (theme) => ({ colors: theme.name === 'light' ? ['#1f4e8c', '#0a7d3b', '#b3261e'] : ['#8ab4f8', '#4cc38a', '#f28b82'] }),
  }

  calculate(data, config) {
    const { fast, slow, source } = config.params
    const values = new IndicatorValueMap()
    const series = new Array(data.length).fill(null)
    let f, s
    for (let i = 0; i < data.length; i++) {
      const bar = data[i]
      const price = source === 'hl2' ? (bar.high + bar.low) / 2 : bar.close
      f = ema(f, price, fast)
      s = ema(s, price, slow)
      if (i < slow) continue
      const point = { value: f - s }
      const a = series[i - 2]?.value, b = series[i - 1]?.value
      // The bar before this one is a turn when the line changed direction there.
      if (a !== undefined && b !== undefined && (b - a) * (point.value - b) < 0) {
        series[i - 1] = { ...series[i - 1], turn: b, up: point.value > b ? 1 : 0 }
        values.set(data[i - 1].time, series[i - 1])
      }
      series[i] = point
      values.set(bar.time, point)
    }
    return { values, series }
  }
}`}</code></pre>
<p>
  <code>calculate(data, config)</code>는 봉과 인스턴스의 입력값(<code>config.params</code>)을 받아 값을 두 번
  반환합니다. 봉 인덱스 기준(<code>series</code>, 첫 값 이전은 <code>null</code>)과 봉 시간 기준(<code>values</code>)입니다.
  <code>values</code>에는 <code>new IndicatorValueMap()</code>을 사용하세요. 시간 순서대로 채울 때 몇 배 더 저렴한
  <code>Map</code>이며, 종목이나 시간 단위를 전환할 때마다 바로 이 작업을 합니다. 어떤 플롯도 가리키지 않는 필드
  (위의 <code>up</code>)는 그려지지도, 눈금에 반영되지도, 표시되지도 않습니다. 플롯의 <code>tone</code>을 위해 있는 것입니다.
</p>

<h3 id="descriptor">디스크립터</h3>
<ul>
  <li><strong>플롯</strong>은 각각 필드 하나를 그립니다. <code>'line'</code>(기본값), <code>'step'</code>,
    <code>'histogram'</code>, <code>'dots'</code>(점으로 그린 선), 또는 <code>'markers'</code>로, 필드에 값이 있는 봉에
    모양(<code>shape</code>: <code>'dot'</code>, <code>'triangleUp'</code>, <code>'triangleDown'</code>)을 그 값의 위치나,
    가격 패널에서는 봉의 위나 아래(<code>position</code>)에 그립니다. <code>color</code>는 스타일 색상의
    인덱스입니다. <code>tone</code>과 <code>downColor</code>는 플롯을 두 가지 색으로 그립니다.
    <code>width</code>, <code>lineStyle</code>, <code>opacity</code>, <code>breakOn</code>은 선의 모양을 정합니다.
    <code>fills</code>는 두 플롯 사이를 칠합니다.</li>
  <li><strong>입력</strong>은 <code>defaultConfig</code>의 각 입력을 편집하는 방식을 정합니다. <code>kind</code>,
    <code>label</code>, <code>min</code>, <code>max</code>, <code>step</code>, 그리고 선택 입력의 <code>options</code>로,
    값만 적거나 각각 레이블을 붙입니다(<code>{'{ value, label }'}</code>). <code>{'{ source: true }'}</code>는 다른
    가격이나 다른 지표의 선을 바탕으로 계산하게 합니다.</li>
  <li><strong>패널</strong>: <code>scale</code>은 범위를 고정하거나 0이 보이게 유지하고, <code>levels</code>는 사용자가
    편집할 수 있는 기준선을 그립니다.</li>
  <li><strong>모양</strong>: <code>defaultStyle</code>, 스타일 하나 또는 테마별 스타일(아래 참고).</li>
</ul>

<h3>실시간 틱: update와 revisesBefore</h3>
<p>
  틱마다 바뀌는 것은 가장 최신 봉뿐입니다. <code>update()</code>가 없으면 차트는 전체 과거 데이터에 대해
  <code>calculate()</code>를 다시 실행합니다. 있으면 차트가 마지막 출력(<code>prev</code>)과 처음으로 바뀐 봉
  (<code>from</code>)을 넘겨 주고, 지표는 거기서부터 다시 계산합니다. <code>null</code>을 반환하면 대신
  <code>calculate()</code>가 실행됩니다. 값은 <code>calculate()</code>가 낼 값과 같아야 합니다. <code>canResume</code>과
  <code>writePoint</code>는 <code>IndicatorBase</code>에 들어 있습니다.
</p>
<p>
  다음 지표의 각 봉은 TurningMacd의 평균처럼 누적되는 상태가 아니라 주변 봉으로부터 계산됩니다(누적 상태를 쓰는
  지표라면 자체 상태를 유지하거나 <code>update</code>를 생략합니다).
</p>
<pre><code>{`// A swing high: the bar is higher than the n bars either side of it.
pointAt(data, i, n) {
  if (i < n || i + n >= data.length) return null
  for (let k = 1; k <= n; k++) if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null
  return { high: data[i].high }
}

update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null
  const n = config.params.strength
  // A new bar decides the bar n back: rewrite from there.
  for (let i = Math.max(0, from - n); i < data.length; i++) this.writePoint(prev, data, i, this.pointAt(data, i, n))
  return prev
}

revisesBefore(config) { return config.params.strength }`}</code></pre>
<p>
  <code>from</code>은 언제나 처음으로 바뀐 봉입니다. 새 봉이 그 앞의 봉을 바꿀 수 있을 때(스윙 포인트, 전환점,
  프랙탈은 그 뒤의 봉으로 결정됩니다) <code>update</code>가 그 봉들을 직접 다시 쓰고,
  <code>revisesBefore(config)</code>는 그 개수를 알려 주어, 이 지표의 선을 읽는 지표들도 그 지점부터 다시 계산되게
  합니다. <code>from</code> 이후의 봉만 바뀐다면 생략하세요.
</p>

<h3>그리기</h3>
<p>
  <code>IndicatorBase</code>의 <code>render()</code>가 <code>plots</code>와 <code>fills</code>를 패널 눈금에 맞춰
  그리므로, 대부분의 지표에는 그리기 코드가 없습니다. 더 그리려면 이 메서드를 재정의하고 먼저 호출하세요. 다섯 번째
  인수에는 차트가 그릴 때 쓰는 테마가 들어 있어, 스타일이 주지 않는 색과 글꼴에 쓸 수 있습니다:
  <code>theme.candleUp</code>, <code>theme.candleDown</code>, <code>theme.text</code>, <code>theme.font</code>.
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>테마를 따르는 색</h3>
<p>
  디스크립터의 <code>defaultStyle</code>은 지표가 처음 갖는 모양입니다. 스타일 하나이거나, 테마를 받아 테마마다
  스타일을 내는 함수입니다. 이 모양을 쓰는 인스턴스는 <code>chart.setTheme()</code>을 따르고, 사용자가 고른 색은
  그대로 남습니다. 이 모양은 사용자가 저장한 기본값(<code>chart.setIndicatorDefaults()</code>, 위젯의
  <em>기본값으로 저장</em>) 아래에 있으므로, 앱의 색이 사용자의 색을 대신하는 일은 없습니다. 저장된 레이아웃은
  테마가 정하는 것을 빼고 저장하며, 다른 테마에서 열면 그 테마의 색을 씁니다.
</p>

<h3>레이아웃을 읽기 전에 등록하기</h3>
<p>
  저장된 레이아웃은 지표를 id로 가리키며, 레이아웃을 읽을 때 등록되지 않은 지표는 빠집니다.
  <code>ChartWidget</code>에는 지표를 <code>plugins</code>로 넘기세요. 위젯이 레이아웃(<code>persistLayouts</code>),
  템플릿, 공유된 보기를 복원하기 전에 등록됩니다. <code>Chart</code>에서는 생성자에 <code>plugins</code>를 넘기거나,
  <code>loadState()</code> 전에 등록하세요.
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>차트가 지표에서 읽는 것</h3>
<ul>
  <li><strong>범례</strong>는 <code>shortName</code>과 <code>defaultConfig</code>와 다른 입력값(선택 입력은 레이블)으로
    지표를 표시하고, markers를 뺀 각 플롯의 값을 그 색으로 보여 줍니다.</li>
  <li><strong>가격 축</strong>은 그 플롯들의 최신 값을 태그로 표시합니다.</li>
  <li><strong>CSV 내보내기</strong>에는 그 플롯마다 열이 있으며, 이름은 범례의 이름이고, 플롯이 둘 이상이면
    플롯의 <code>title</code>이 붙습니다.</li>
  <li><strong>설정 대화상자</strong>는 입력값을 편집하고, 각 플롯을 색, 표시 여부, 선이나 계단 플롯이면 선 종류와 함께
    나열하며, 레벨을 편집합니다.</li>
  <li><strong>지표 대화상자</strong>는 <code>category</code> 아래에 <code>name</code>으로 지표를 나열합니다: 종류
    (<code>'oscillators'</code>, <code>'volume'</code>…)이거나 직접 만든 그룹 <code>{`{ id: 'my-app', label: 'My App' }`}</code>이며,
    이 그룹은 앱의 지표들을 그 이름 아래에 모아 기본 제공 종류보다 앞에 둡니다(그룹이 여럿이면 각 그룹의 첫 지표가
    등록된 순서대로). 검색도 그 이름으로 지표를 찾습니다.</li>
  <li><strong>다른 지표</strong>는 이 지표의 선(같은 플롯들)을 소스로 읽을 수 있습니다.</li>
</ul>
<p>
  코딩 에이전트도 같은 가이드를, 게시된 패키지에 대해 타입 검사를 거친 코드와 함께, MCP 서버의
  <code>custom_indicator</code> 도구와 스킬의
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">사용자 지정 지표 레시피</a>에서 받습니다.
</p>

<h2>사용자 지정 그리기 도구</h2>
<p>
  앵커를 픽셀로 바꾸기, 선 스타일, 핸들 같은 헬퍼를 쓰려면 <code>DrawingBase</code>를
  상속하고, 도구를 기술한 다음 등록합니다. <code>descriptor.options</code>에 나열한 설정은
  위젯의 설정 대화상자에 나타나며 그림과 함께 저장됩니다.
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* this.anchorToPixel(state.anchors[0], viewport) 위치에 */ }
  hitTest(point, state, viewport, tolerance) { /* 포인터가 그 위에 있는가? */ return false }
  // 선택 사항: 선의 가격. 알림이 선을 따라갈 수 있게 함
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  도구 이름은 차트가 도구 이름을 받는 곳(<code>setDrawingTool</code>, <code>addDrawing</code> 등)이면 TypeScript에서도 그대로 쓸 수 있습니다.
  <code>DrawingToolType</code>은 어떤 이름이든 받으면서 기본 도구의 자동 완성도 유지합니다. 기본 도구는 <code>BuiltInDrawingToolType</code>에 있습니다.
</p>
<p>
  디스크립터에는 도구를 그리는 방식(<code>creation</code>:
  <code>'clicks'</code>, <code>'freehand'</code> 또는 <code>'path'</code>,
  <code>maxAnchors</code> 포함)과 대화상자에서 채우기(<code>fill</code>)나
  텍스트(<code>text</code>)를 제공할지도 적을 수 있습니다. 도구는
  <code>moveHandle()</code>로 앵커가 아닌 핸들을 옮길 수 있고, 봉을 바탕으로
  그릴 때는 <code>setDataGetter(getter, revision)</code>를 통해 차트의 봉을 받습니다.
  같은 배열 안에서 봉이 수정되면(<code>updateBar</code>) <code>revision()</code>이 바뀌므로,
  봉으로 계산한 결과를 보관하는 도구는 그때 다시 계산합니다.
</p>

<h2>사용자 지정 차트 유형</h2>
<p><code>ChartTypePlugin</code>은 렌더러와 선택적 데이터 변환을 제공합니다. 내장 유형처럼 전환해 사용합니다.</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>사용자 지정 오버레이</h2>
<p><code>OverlayPlugin</code>은 선택한 레이어에 매 프레임 그리며, 실시간 뷰포트, 데이터, 테마를 전달받습니다.</p>
<pre><code>{`import { overlayScale, registerPlugin } from '@tradecanvas/chart'

registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'high-marks', name: 'High marks', layer: 'main' },
    render(ctx, context) {
      const s = overlayScale(context)
      ctx.fillStyle = '#f2a93b'
      for (let i = s.visible.from; i <= s.visible.to; i++) {
        const bar = context.data[i]
        ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(bar.high) - 1, s.barWidth, 2)
      }
    },
  },
})`}</code></pre>
<p>
  <code>overlayScale(context)</code>는 차트가 그리는 위치 그대로 배치합니다: <code>timeToX</code> / <code>xToTime</code>는 봉 시간 기준
  (봉 사이와 최신 봉 이후는 비례), <code>indexToX</code> / <code>xToIndex</code>, <code>priceToY</code> / <code>yToPrice</code>
  (로그·반전 스케일 포함), <code>barWidth</code>, 그리고 화면에 보이는 봉 범위 <code>visible</code>. 가격 격자로 행을 나누려면
  <code>chart.getPriceStep()</code>을 쓰세요: 종목의 최소 호가 단위(<code>minTick</code>), 분수 단위, 또는 표시 중인 소수 자릿수의 한 단위입니다.
  차트 타입 렌더러는 viewport만, 지표는 viewport와 테마를 받으므로 <code>priceToY</code>, <code>barIndexToX</code>, <code>timeToX</code>와 그 역함수도 export됩니다.
  봉은 화면에 그려진 시리즈의 봉입니다: Renko나 Kagi 차트에서는 그 벽돌입니다(<code>chart.isTimeAligned()</code>로 데이터 봉과 같은지 알 수 있습니다).
  가격 축처럼 가격을 쓰도록 viewport에는 차트 고유의 가격 형식(있을 때 <code>formatPrice</code>), <code>numberLocale</code>,
  시장이나 종목이 정한 소수 자릿수(<code>pricePrecision</code>)가 들어 있습니다. 지표 패널에서는 형식과 소수 자릿수가 비어 있습니다.
</p>
<p>
  자체 설정(표시 방식, 스위치)이 있는 오버레이는 차트를 다시 그릴 틱이 오지 않아도 변경을 바로 보여 줄 수 있습니다.
  플러그인에 <code>enabled: false</code>를 설정하면 등록은 유지한 채 숨겨지고, 둘 중 하나를 바꾼 뒤
  <code>chart.requestRender()</code>를 호출합니다. 다음 프레임 전의 여러 요청은 한 프레임으로 묶입니다.
</p>

<p>플러그인 타입 시그니처 전체는 <a href={href('/docs/api')}>API 레퍼런스</a>를 참고하세요.</p>

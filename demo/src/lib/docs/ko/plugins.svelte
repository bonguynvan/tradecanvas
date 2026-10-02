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

<h2>플러그인 종류</h2>
<table>
  <thead><tr><th>종류</th><th>계약</th><th>렌더링 위치</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render()</code></td><td>오버레이 또는 패널</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>오버레이 레이어</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + 선택적 <code>transform()</code></td><td>메인 시리즈</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>사용자 지정 지표</h2>
<p>그리기 헬퍼를 쓰려면 <code>IndicatorBase</code>를 상속한 다음, 내장 지표처럼 등록하고 추가합니다.</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap, registerPlugin } from '@tradecanvas/chart'

class DoubleSMA extends IndicatorBase {
  descriptor = {
    id: 'double-sma', name: 'Double SMA',
    placement: 'overlay', defaultConfig: { fast: 10, slow: 30 },
  }
  calculate(data, config) { /* values = new IndicatorValueMap(); return { values, series } */ }
  render(ctx, output, viewport, style) { /* draw lines */ }
}

registerPlugin({ kind: 'indicator', plugin: new DoubleSMA() })
chart.addIndicator('double-sma', { fast: 10, slow: 30 })`}</code></pre>
<p>
  <code>values</code>에는 <code>new Map()</code> 대신 <code>new IndicatorValueMap()</code>을 사용하세요.
  <code>Map</code>을 그대로 대체할 수 있으면서, 시간 순서대로 한 봉씩 채울 때 몇 배 더 저렴합니다.
  종목이나 시간 단위를 전환할 때마다 전체 과거 데이터에 대해 바로 이 작업을 합니다.
</p>

<h3>빠른 실시간 업데이트 (선택 사항)</h3>
<p>
  실시간 틱마다 바뀌는 것은 형성 중인 봉뿐입니다. 전체 과거 데이터 대신 <code>from</code> 이후의
  봉만 다시 계산하도록 <code>update()</code>를 구현하세요. 차트는 틱과 새 봉이 들어올 때 이 메서드를 사용하며,
  메서드가 없거나 <code>null</code>을 반환하면 <code>calculate()</code>를 대신 사용합니다.
  결과는 <code>calculate()</code>가 만들 값과 같아야 합니다.
</p>
<pre><code>{`update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null   // IndicatorBase helper
  for (let i = from; i < data.length; i++) {
    this.writePoint(prev, data, i, { value: /* recompute bar i */ 0 })
  }
  return prev
}`}</code></pre>

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
  디스크립터에는 도구를 그리는 방식(<code>creation</code>:
  <code>'clicks'</code>, <code>'freehand'</code> 또는 <code>'path'</code>,
  <code>maxAnchors</code> 포함)과 대화상자에서 채우기(<code>fill</code>)나
  텍스트(<code>text</code>)를 제공할지도 적을 수 있습니다. 도구는
  <code>moveHandle()</code>로 앵커가 아닌 핸들을 옮길 수 있고, 봉을 바탕으로
  그릴 때는 <code>setDataGetter()</code>를 통해 차트의 봉을 받습니다.
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
<pre><code>{`registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'vwap-band', name: 'VWAP Band', layer: 'main' },
    render(ctx, { viewport, data, theme }) {
      // draw onto the main layer with the current viewport + data
    },
  },
})`}</code></pre>

<p>플러그인 타입 시그니처 전체는 <a href={href('/docs/api')}>API 레퍼런스</a>를 참고하세요.</p>

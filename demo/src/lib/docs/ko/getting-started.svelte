<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>시작하기 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas를 설치하고 1분 안에 첫 캔버스 트레이딩 차트를 렌더링합니다." />
</svelte:head>

<h1>시작하기</h1>
<p>TradeCanvas를 설치하고 1분 안에 차트를 렌더링합니다.</p>

<h2>설치</h2>
<p>원하는 패키지 매니저를 사용하면 됩니다.</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>드롭인 위젯</h2>
<p>
  <code>ChartWidget</code>은 동작하는 차트를 가장 빠르게 얻는 방법입니다. 프레임워크 의존성 없이
  어떤 호스트 요소 안에서든 도구 모음, 그리기 사이드바, 설정 대화상자, 상태 표시줄을 갖춘
  완전한 트레이딩 UI를 렌더링합니다.
</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  // Optional features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  위젯은 별도 설정 없이 전문 트레이더용 제스처를 모두 지원합니다.
  마지막 봉 너머의 빈 미래 영역까지 드래그하고, 가격/시간 축을 드래그해 눈금을 조정하고,
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+드래그로 여러 그림을 선택하고, <kbd>Shift</kbd>+드래그로 측정하고,
  <kbd>Alt</kbd>+클릭으로 툴팁을 고정할 수 있습니다. <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>는
  명령 팔레트, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>는 종목 검색을 열고,
  <kbd>?</kbd>를 누르면 전체 단축키 목록을 볼 수 있습니다.
</p>

<h2>헤드리스 Chart</h2>
<p>
  주변 UI를 완전히 제어하려면 하위 수준의 <code>Chart</code> 클래스를
  직접 사용하세요. 도구 모음은 직접 만들고, 모든 기능은 그대로 사용할 수 있습니다.
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>프레임워크 래퍼</h2>
<p>
  React, Vue, Svelte 래퍼는
  <a href={href('/docs/frameworks')}>프레임워크</a> 섹션에서 확인할 수 있습니다.
</p>

<h2>다음 단계</h2>
<ul>
  <li><a href={href('/docs/api')}>API 레퍼런스</a> — <code>Chart</code>와 <code>ChartWidget</code>의 전체 API</li>
  <li><a href={href('/docs/chart-types')}>차트 유형</a> — 내장 차트 유형 18종</li>
  <li><a href={href('/docs/indicators')}>지표</a> — 지표 85종 카탈로그</li>
  <li><a href={href('/docs/realtime')}>실시간 및 리플레이</a> — 스트리밍 어댑터와 리플레이 모드</li>
  <li><a href={href('/docs/analytics')}>분석</a> — 전략 백테스터와 리스크 지표</li>
</ul>

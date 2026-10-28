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
  watchlist: true,         // a watchlist in the dock; widget.openPanel('watchlist') opens it
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

<h2 id="ai">코딩 에이전트와 함께</h2>
<p>코딩 에이전트는 TradeCanvas를 추측하지 않고 배울 수 있습니다. <strong>에이전트 스킬</strong>은 타입 검사를 거친 예제로 API를 알려 주며, Claude Code에서는 명령 두 줄로 설치합니다:</p>
<pre><code>{`/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas`}</code></pre>
<p><strong>MCP 서버</strong> <code>@tradecanvas/mcp</code>는 라이브러리 자체의 카탈로그로 답합니다: 지표 id와 매개변수, 각 선의 키; 드로잉 도구와 각각 필요한 점의 수; <code>ChartWidget</code>, <code>Chart</code>, <code>ChartWidgetGrid</code>의 옵션; 기능 스위치와 스타일 키. <code>validate_options</code> 도구는 옵션 객체를 쓰기 전에 검사하고 원래 의도한 옵션을 알려 줍니다. Claude Code에서는:</p>
<pre><code>{`claude mcp add tradecanvas -- npx -y @tradecanvas/mcp`}</code></pre>
<p>Cursor, Claude Desktop을 비롯한 대부분의 클라이언트는 MCP 설정에 같은 명령을 씁니다:</p>
<pre><code>{`{
  "mcpServers": {
    "tradecanvas": { "command": "npx", "args": ["-y", "@tradecanvas/mcp"] }
  }
}`}</code></pre>
<p>Codex는 <code>codex mcp add tradecanvas -- npx -y @tradecanvas/mcp</code>로 추가하거나 <code>~/.codex/config.toml</code>에서 읽습니다. 키는 <code>mcp_servers</code>입니다:</p>
<pre><code>{`[mcp_servers.tradecanvas]
command = "npx"
args = ["-y", "@tradecanvas/mcp"]`}</code></pre>
<p>WSL 밖의 Windows에서는 npx를 <code>cmd</code>로 실행합니다: <code>claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp</code>, 설정에서는 <code>"command": "cmd", "args": ["/c", "npx", "-y", "@tradecanvas/mcp"]</code>. Git Bash(Windows에서 Claude Code의 <code>!</code> 명령을 실행하는 셸)에서는 <code>//c</code>로 씁니다. Git Bash가 <code>/c</code>를 경로로 바꾸기 때문입니다.</p>
<p>둘 다 쓰지 않을 때는 <a href="https://tradecanvas.dev/llms.txt">llms.txt</a>와 <a href="https://tradecanvas.dev/llms-full.txt">llms-full.txt</a>가 문서를 한 파일로 어시스턴트에게 제공합니다.</p>

<h2>다음 단계</h2>
<ul>
  <li><a href={href('/docs/api')}>API 레퍼런스</a> — <code>Chart</code>와 <code>ChartWidget</code>의 전체 API</li>
  <li><a href={href('/docs/chart-types')}>차트 유형</a> — 내장 차트 유형 18종</li>
  <li><a href={href('/docs/indicators')}>지표</a> — 지표 134종 카탈로그</li>
  <li><a href={href('/docs/realtime')}>실시간 및 리플레이</a> — 스트리밍 어댑터와 리플레이 모드</li>
  <li><a href={href('/docs/analytics')}>분석</a> — 전략 백테스터와 리스크 지표</li>
</ul>

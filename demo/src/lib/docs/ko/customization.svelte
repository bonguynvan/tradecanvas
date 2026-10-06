<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>커스터마이징 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas를 내 것으로 만드는 모든 방법: 색, 위젯의 모양, 키로 지정하는 차트 모양, 위젯 부품을 켜고 끄는 112개 스위치, 직접 만든 버튼·메뉴·상태 항목, 문구, 플러그인, 헤드리스 차트." />
</svelte:head>

<h1>커스터마이징</h1>
<p>
  가장 가벼운 손질부터 가장 깊은 수정까지, 차트를 내 것으로 만드는 모든 방법입니다. 대부분의 앱에는 그중 두세 가지면
  충분합니다: 테마 하나, 스위치 몇 개, 직접 만든 버튼 하나.
</p>

<h2>무엇을 바꾸려면 무엇을 쓰나</h2>
<table>
  <thead><tr><th>바꾸고 싶은 것</th><th>사용할 것</th></tr></thead>
  <tbody>
    <tr><td>색</td><td><code>theme</code>(<code>'dark'</code>, <code>'light'</code> 또는 직접 만든 테마), <code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>위젯의 모서리, 크기, 글꼴, 각 바</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>스타일링</a></td></tr>
    <tr><td>차트 모양의 한 부분: 그리드, 크로스헤어, 차트 유형의 색</td><td>키로 <code>applyOverrides</code> — <a href={href('/docs/styling#overrides')}>스타일링</a></td></tr>
    <tr><td>지표의 선, 패인의 배경</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>, <code>setPaneStyle</code></td></tr>
    <tr><td>위젯의 어떤 부품을 보일지</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">아래</a></td></tr>
    <tr><td>사용자가 차트에서 할 수 있는 일: 그리기, 거래, 확대·축소</td><td>차트 자체의 features: <code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>직접 만든 버튼, 메뉴, 상태 항목</td><td><code>addToolbarButton</code>, <code>addToolbarDropdown</code>, <code>addSidebarButton</code>, <code>addStatusBarItem</code>, <code>getSlot</code>, 메뉴 훅 — <a href="#parts">아래</a></td></tr>
    <tr><td>위젯의 문구</td><td><code>locale</code>, <code>messages</code> — <a href="#words">아래</a></td></tr>
    <tr><td>직접 만든 지표, 그리기 도구, 차트 유형</td><td><a href={href('/docs/plugins')}>플러그인</a></td></tr>
    <tr><td>UI 전체</td><td>헤드리스 <code>Chart</code>와 그 둘레의 직접 만든 UI — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">기능 스위치</h2>
<p>
  위젯의 모든 부품에는 스위치가 있고, 끄기 전까지 모든 스위치는 켜져 있습니다. 점이 없는 이름은 기능 전체로, 그 기능이
  나타나는 모든 곳에서 꺼집니다: <code>alerts</code>는 종 버튼, 메뉴의 알림 항목, 알림 메시지를 모두 없앱니다. 점이 있는
  이름은 한 자리입니다: <code>toolbar.alerts</code>는 종 버튼만 없애고, 메뉴에서는 여전히 알림을 추가할 수 있습니다.
  스위치는 위젯이 실행 중일 때도 바꿀 수 있습니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // 버튼 하나
    'sidebar.patterns': false,        // 그리기 도구 묶음 하나
    'menu.chart.exportData': false,   // 메뉴 항목 하나
    hotkeys: false,                   // 위젯의 모든 단축키
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // 실행 중에 깔끔한 차트로
widget.isFeatureOn('sidebar')        // false
widget.getFeatures()                 // 모든 스위치의 켜짐/꺼짐
grid.setFeatures({ toasts: false })  // ChartWidgetGrid의 모든 차트`}</code></pre>
<p>
  이름은 약속입니다: 새 이름은 추가되지만 이름을 바꾸지는 않습니다. <code>WIDGET_FEATURES</code>에 목록이 있고
  TypeScript가 검사하며, 알 수 없는 이름은 경고와 함께 무시됩니다.
</p>
<p>
  스위치는 위젯 자체의 부품을 보이고 숨깁니다. 차트 자체에서 무언가를 막으려면 — 그리기, 거래, 확대·축소, 특정 시간 단위 —
  차트의 features(<code>chartOptions.features</code>)를 쓰세요. 데이터나 저장소를 함께 가져오는 부품은 옵션으로 남습니다:
  <code>trading</code>, <code>watchlist</code>, <code>depthLadder</code>, <code>layouts</code>가 그 부품의 존재 여부를
  정하고, 스위치는 그 버튼을 숨깁니다.
</p>
<p>예전의 켜기/끄기 옵션이 바로 이 스위치이며, 지금처럼 쓸 수 있습니다:</p>
<table>
  <thead><tr><th>옵션</th><th>스위치</th></tr></thead>
  <tbody>
    <tr><td><code>toolbar: false</code></td><td><code>toolbar</code></td></tr>
    <tr><td><code>drawingTools: false</code></td><td><code>sidebar</code>, <code>drawingSettings</code>, <code>hotkeys.tools</code>, <code>menu.chart.horizontalLine</code></td></tr>
    <tr><td><code>statusBar: false</code></td><td><code>statusBar</code>, <code>goToDate</code></td></tr>
    <tr><td><code>rangeBar: false</code></td><td><code>statusBar.range</code>, <code>goToDate</code></td></tr>
    <tr><td><code>accountPanel: false</code></td><td><code>accountPanel</code>, <code>orderTicket</code></td></tr>
    <tr><td><code>indicatorLegend</code>, <code>settings</code>, <code>alerts</code>, <code>objectTree</code>, <code>indicatorTemplates</code>, <code>intervalTyping</code>, <code>symbolInfo</code>, <code>navigation</code>, <code>dragDropImport</code>, <code>customTimeframes</code>, <code>fullscreen</code></td><td>같은 이름의 스위치</td></tr>
  </tbody>
</table>

<h3>모든 스위치</h3>
<table>
  <thead><tr><th>묶음</th><th>스위치</th></tr></thead>
  <tbody>
    <tr><td>바</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code></td></tr>
    <tr><td>기능</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>intervalTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code>
    </td></tr>
    <tr><td>툴바</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code>
    </td></tr>
    <tr><td>그리기 사이드바</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code>
    </td></tr>
    <tr><td>상태 바</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code>
    </td></tr>
    <tr><td>차트 위</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code>
    </td></tr>
    <tr><td>메뉴</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>단축키</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code>
    </td></tr>
  </tbody>
</table>
<p>
  이름보다 많은 일을 하는 스위치도 있습니다: <code>indicatorLegend</code>를 끄면 패인에 자기 제목이 돌아옵니다.
  <code>menu.chart.*</code>는 오른쪽 클릭 메뉴와 가격 축 옆의 "+" 모두에 적용됩니다. <code>compare</code>는 객체 트리의
  추가 버튼을 없애고, 이미 켜진 비교는 목록에 남습니다. <code>toasts</code>는 위젯 자체의 알림을 끄고(오류는 계속 보입니다),
  <code>widget.toast()</code>로 띄운 알림은 그대로 보입니다.
</p>

<h2 id="parts">직접 만든 부품</h2>
<p>
  직접 만든 버튼, 메뉴, 항목은 위젯의 바 안에 들어가 위젯의 것과 똑같이 보이고, 테마와 모양을 따릅니다. 모두 바꾸거나
  없앨 수 있는 핸들을 돌려주며, 해당 바가 보일 때만 보입니다.
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // 차트 조작 버튼 옆
  items: () => [                             // 열 때마다 새로 가져옴
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')

// 그 밖의 무엇이든: 툴바 조작 버튼 옆, 사이드바 버튼 아래,
// 상태 바 양 끝, 또는 차트 위에
widget.getSlot('chart')?.append(myOverlay)   // 포인터가 통과하는 층; 직접 만든 요소에는 pointer-events: auto`}</code></pre>
<p>슬롯: <code>toolbar.left</code>, <code>toolbar.right</code>, <code>sidebar</code>, <code>statusBar.left</code>, <code>statusBar.right</code>, <code>chart</code>.</p>

<h3>직접 만든 메뉴 항목</h3>
<p>직접 만든 항목은 위젯 메뉴의 끝에 붙고, 메뉴가 열릴 때마다 열린 위치와 함께 새로 가져옵니다.</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="words">문구</h2>
<p>
  위젯은 30개 언어를 지원합니다(<code>locale</code>. 영어와 베트남어는 내장, 나머지는
  <code>@tradecanvas/chart/widget/locales</code>에서 불러옵니다). <code>messages</code>는 언어의 문자열 위에 어떤
  문자열이든 바꿉니다. 지표 이름은 그대로입니다.
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>더 깊이</h2>
<p>
  직접 만든 지표, 그리기 도구, 차트 유형은 <a href={href('/docs/plugins')}>플러그인</a>으로 등록하면 메뉴를 포함해 내장된
  것과 똑같이 동작합니다. UI를 전부 직접 만들고 싶다면 헤드리스 <code>Chart</code>를 쓰세요: 같은 엔진에 위젯만 없습니다.
</p>

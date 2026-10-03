<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>스타일링 — TradeCanvas 문서</title>
  <meta name="description" content="토큰으로 정하는 위젯의 외관: 모서리, 크기, 글꼴, 테두리, 그림자, 바. 세 가지 프리셋(Studio, Terminal, Capsule)과 그 위에 얹는 나만의 테마." />
</svelte:head>

<h1>위젯 스타일링</h1>
<p>
  위젯의 외관은 토큰의 묶음입니다. 부품 종류별 모서리, 컨트롤과 바의 크기, 글꼴, 테두리, 그림자, 선택된 버튼의 표시
  방식, 그리고 도구 모음과 그리기 도구를 가장자리에 붙일지 띄울지까지 정합니다. 프리셋에서 시작해 원하는 부분만
  바꾸세요. 색상은 테마(<code>dark</code> / <code>light</code>, <a href={href('/docs/api')}>API 레퍼런스</a> 참고)가
  맡으며, 어떤 외관이든 두 테마 모두와 함께 쓸 수 있습니다.
</p>

<h2>프리셋</h2>
<table>
  <thead><tr><th>프리셋</th><th>외관</th></tr></thead>
  <tbody>
    <tr><td><code>studio</code> (기본값)</td><td>
      컨트롤은 7 px, 메뉴는 11 px, 대화 상자는 16 px로 모서리가 둥급니다. 그룹은 구분선 대신 여백으로 나뉘고, 메뉴는
      부드러운 그림자 위에 떠 있으며, 시간 단위 버튼은 세그먼트 트랙 안에 놓이고, 선택된 버튼은 옅은 색으로 채워집니다.
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      촘촘하고 각진 모양입니다. 2 px 모서리, 26 px 컨트롤, 그룹 사이의 구분선, 대문자 라벨, 선택된 버튼 아래의 밑줄.
      차트의 가격 라벨도 각지게 그려집니다.
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      가격 라벨을 포함해 모든 곳이 알약 모양입니다. 도구 모음과 그리기 도구는 섬처럼 떠 있고, 메뉴는 반투명 유리
      효과로 표시되며, 선택된 버튼은 색이 꽉 찬 알약입니다.
    </td></tr>
  </tbody>
</table>

<h2>외관 고르기</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2>나만의 외관</h2>
<p>
  테마는 프리셋(지정하지 않으면 Studio)에서 출발해 명시한 항목만 바꿉니다. 스케일에 설정한 모서리는 그 스케일을 따르는
  모든 부품에 적용되며, 부품별로 따로 설정한 값이 있으면 그 값이 쓰입니다.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious
  sizes: { toolbar: 40 },                            // px; wins over density
  font: {
    family: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    size: 13, weight: 500, strongWeight: 600,
    labelCase: 'uppercase', labelTracking: 0.06,      // small labels
  },
  borders: { width: 1, separators: true },           // rules between toolbar groups
  shadows: { menu: '0 12px 30px rgba(0, 0, 0, 0.4)' },
  blur: 12,                                          // frosted floating surfaces, px
  active: 'solid',                                   // tint · solid · underline
  toolbar: 'floating',                               // docked · floating
  sidebar: 'floating',
  intervals: 'segmented',                            // plain · segmented
  tagRadius: 999,                                    // the chart's price tags and pills
})`}</code></pre>

<table>
  <thead><tr><th>필드</th><th>설정 내용</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>모서리 스케일 <code>xs</code>, <code>sm</code>, <code>md</code>, <code>lg</code>, <code>xl</code>, 단위 px(0–999).</td></tr>
    <tr><td><code>components</code></td><td>
      부품별 모서리: <code>control</code>(버튼), <code>input</code>, <code>menu</code>, <code>dialog</code>,
      <code>panel</code>(알림, 데이터 창, 주문 티켓), <code>tooltip</code>, <code>tag</code>, <code>toast</code>,
      <code>toolbar</code>와 <code>sidebar</code>(띄웠을 때 보이는 자체 상자). 기본적으로 컨트롤과 입력란은
      <code>md</code>, 메뉴와 패널은 <code>lg</code>, 대화 상자는 <code>xl</code>, 툴팁과 태그는 <code>sm</code>을 따릅니다.
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      <code>toolbar</code> 높이, <code>control</code>과 <code>controlSmall</code> 높이, <code>icon</code>,
      <code>sidebar</code> 너비, <code>menuItem</code> 높이, 단위 px.
    </td></tr>
    <tr><td><code>font</code></td><td>
      글꼴 패밀리(CSS 목록), 본문 <code>size</code>(11–20 px; 작은 크기는 이를 따름), 굵기, 그리고 섹션 제목 같은 작은 라벨의
      대소문자와 자간(em).
    </td></tr>
    <tr><td><code>borders</code></td><td>테두리 두께, 그리고 도구 모음의 그룹 사이와 그리기 도구 사이에 구분선을 넣을지 여부.</td></tr>
    <tr><td><code>shadows</code></td><td>메뉴, 대화 상자, 툴팁의 CSS 그림자.</td></tr>
    <tr><td><code>blur</code></td><td>반투명 유리 효과의 메뉴, 단위 px: 0보다 크면 메뉴 뒤로 차트가 흐릿하게 비칩니다.</td></tr>
    <tr><td><code>active</code></td><td>선택된 버튼의 표시 방식: 옅은 색 채우기, 꽉 찬 알약, 또는 밑줄.</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>가장자리에 붙이거나, 섬처럼 띄웁니다.</td></tr>
    <tr><td><code>intervals</code></td><td>시간 단위 버튼을 그대로 두거나, 세그먼트 트랙 안에 넣습니다.</td></tr>
    <tr><td><code>tagRadius</code></td><td>차트가 그리는 가격 라벨, 축 알약, 주문 배지의 모서리.</td></tr>
  </tbody>
</table>
<p>쓸 수 없는 값(범위를 벗어나거나, 선언 밖으로 빠져나갈 수 있는 CSS)은 무시되고 프리셋의 값이 유지됩니다.</p>

<h2>글꼴</h2>
<p>
  위젯은 글꼴을 불러오지 않습니다. 이름만 지정하고, 브라우저가 목록 순서대로 대체 글꼴을 찾습니다. Studio는 Manrope
  다음 Inter, Terminal은 IBM Plex Sans Condensed와 IBM Plex Mono, Capsule은 Sora를 지정합니다. 원하는 글꼴은 직접
  불러오세요.
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>CSS 변수</h2>
<p>
  토큰은 위젯 루트(와 그 대화 상자)에 있는 CSS 변수입니다. <code>ui</code> 옵션이 없으면 스타일시트의 값, 즉 Studio의
  값이 그대로 남으므로 직접 작성한 CSS로 설정할 수 있습니다. 위젯은 자신의 스타일시트를 페이지 맨 앞에 두므로,
  <code>.tcw-root</code>에 작성한 규칙이 우선합니다. <code>ui</code>를 주면 위젯이 요소에 직접 값을 쓰고, 그 값이 우선합니다.
</p>
<pre><code>{`.tcw-root {
  --tcw-radius: 4px;            /* the md corner: buttons and fields follow it */
  --tcw-dialog-radius: 12px;
  --tcw-control-h: 28px;
  --tcw-font: 'Inter', system-ui, sans-serif;
}`}</code></pre>
<table>
  <thead><tr><th>변수</th><th>출처</th></tr></thead>
  <tbody>
    <tr><td><code>--tcw-radius-xs</code>, <code>-sm</code>, <code>--tcw-radius</code>, <code>-lg</code>, <code>-xl</code></td><td><code>radius</code></td></tr>
    <tr><td><code>--tcw-control-radius</code>, <code>--tcw-input-radius</code>, <code>--tcw-menu-radius</code>, <code>--tcw-dialog-radius</code>, <code>--tcw-panel-radius</code>, <code>--tcw-tooltip-radius</code>, <code>--tcw-tag-radius</code>, <code>--tcw-toast-radius</code>, <code>--tcw-toolbar-radius</code>, <code>--tcw-sidebar-radius</code></td><td><code>components</code></td></tr>
    <tr><td><code>--tcw-toolbar-h</code>, <code>--tcw-control-h</code>, <code>--tcw-control-h-sm</code>, <code>--tcw-icon</code>, <code>--tcw-sidebar-w</code>, <code>--tcw-menu-item-h</code></td><td><code>sizes</code></td></tr>
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code>(및 <code>-sm</code>, <code>-xs</code>, <code>-lg</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
  </tbody>
</table>
<p>
  레이아웃 스위치는 같은 요소의 data 속성으로 노출되어, 직접 CSS를 작성할 때 쓸 수 있습니다:
  <code>data-tcw-ui</code>(프리셋), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code>, <code>data-tcw-separators</code>(<code>on</code> / <code>off</code>).
</p>

<h2>차트의 라벨</h2>
<p>
  위젯은 <code>tagRadius</code>를 자신의 차트에 넘깁니다(<code>chartOptions.shapes</code>에 지정한 모양은
  <code>setUI</code>를 호출할 때까지 유지됩니다). 위젯 없이 <code>Chart</code>만 쓴다면 모양을 직접 설정하세요. 이 설정은
  테마를 바꿔도 유지됩니다. 가격 라벨, 축과 십자선의 알약 라벨, 주문·포지션·브래킷 주문 라벨, 이전 기간 레벨 라벨이
  이 모양을 따릅니다.
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2>거래량 색</h2>
<p>
  거래량 막대는 테마의 <code>volumeUp</code>과 <code>volumeDown</code>을 씁니다. <code>volumeColor(candleColor)</code>는 캔들 색을 거래량의 투명도로 돌려주므로, 직접 만든 테마에서도 막대가 캔들 뒤의 배경으로 남습니다. widget의 설정에서 캔들 색을 바꾸면 widget이 알아서 이렇게 합니다.
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>

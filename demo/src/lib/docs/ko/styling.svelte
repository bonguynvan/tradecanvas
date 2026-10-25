<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>스타일링 — TradeCanvas 문서</title>
  <meta name="description" content="토큰으로 정하는 위젯의 외관: 모서리, 크기, 글꼴, 테두리, 그림자, 바. 황금비를 따르는 네 가지 프리셋(Print, Studio, Terminal, Capsule)과 그 위에 얹는 나만의 테마." />
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
    <tr><td><code>print</code> (기본값)</td><td>
      종이와 잉크. 흰색에 가까운 바탕이나 검정에 가까운 바탕에, 평범한 것은 모두 회색이고 색은 뜻이 있는 곳에만 씁니다.
      가는 선, 3 px 컨트롤, 5 px 메뉴, 8 px 대화 상자, 대문자 라벨. 모든 숫자는 고정폭 글꼴이라 가격이 열에 맞춰
      정렬됩니다. 선택된 버튼은 잉크색으로 꽉 채워지고, 선택된 도구는 잉크 파랑입니다.
    </td></tr>
    <tr><td><code>studio</code></td><td>
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

<h2>여유로운 외관</h2>
<p>
  <code>density: 'airy'</code>는 화면에 더 많은 봉을 띄우고 그 사이에 여백을 두어 차트를 엽니다. 어떤 확대 수준에서도 캔들 몸통은
  칸의 φ⁻¹(62%)이고, 차트는 칸당 φ⁴ ≈ 6.85 px로 열립니다(<code>barLayout: 'golden'</code>). 컨트롤은 넉넉해지고, 축과 범례의
  숫자는 외관의 산세리프 글꼴을 씁니다. 2.0이 처음 열 외관입니다.
</p>
<pre><code>{`new ChartWidget(host, { ui: { density: 'airy' } })

// The same on a chart of your own
import { Chart, SANS_FONT_FAMILY } from '@tradecanvas/chart'
const chart = new Chart(host, { barLayout: 'golden', font: { family: SANS_FONT_FAMILY } })
chart.setBarLayout('classic')    // a 2 px gap, as before
chart.setFont({ sizeSmall: 12 }) // the axes' and tags' size
chart.setFont(null)              // the theme's own font again`}</code></pre>
<p>
  <code>chartOptions.barLayout</code>와 <code>chartOptions.font</code>의 <code>family</code>가 외관의 설정보다 우선합니다.
  <code>chartOptions.font</code>가 크기만 정하면 글꼴은 외관의 것을 씁니다. 화면에 봉이 있을 때
  레이아웃을 바꾸면 확대 수준은 그대로 두고 칸만 다시 나눕니다.
</p>

<h2>황금비</h2>
<p>
  Print는 비율을 황금비 φ ≈ 1.618에 맞추므로, 나란히 놓이는 크기들은 어디서나 같은 관계를 이룹니다.
</p>
<table>
  <thead><tr><th>대상</th><th>규칙</th><th>값(px)</th></tr></thead>
  <tbody>
    <tr><td>크기</td><td>아이콘에서 시작해 φ의 반 단계씩: 아이콘, 그 작은 버튼, 그 버튼, 메뉴 행, 바.</td><td>16 · 20 · 26 · 33 · 42</td></tr>
    <tr><td>간격</td><td>피보나치 수. 각 수가 앞의 두 수의 합이라, 이웃한 두 수는 거의 φ배 차이가 납니다.</td><td>2 · 3 · 5 · 8 · 13 · 21 · 34</td></tr>
    <tr><td>모서리</td><td>
      역시 피보나치 수. 안쪽 모서리는 바깥 모서리에서 그 사이의 여백을 뺀 값이라 곡선이 나란히 이어집니다. 메뉴의 5는
      그 행의 2에 여백 3을 더한 값입니다.
    </td><td>1 · 2 · 3 · 5 · 8</td></tr>
    <tr><td>글자</td><td>
      φ의 세제곱근 단계라, 세 단계마다 φ배 커집니다. 대화 상자의 제목은 본문의 φ배입니다. 10 px 밑으로는 내려가지
      않습니다. 그보다 작으면 부호가 두 개 붙는 글자(베트남어의 ế, ộ)를 읽기 어렵기 때문입니다.
    </td><td>10 · 11 · 13 · 15 · 18 · 21</td></tr>
  </tbody>
</table>
<p>
  글자 단계는 설정한 본문 크기(<code>font.size</code>)를 따르고, <code>density</code>는 크기를 반 단계 내리거나
  올립니다. 나만의 외관을 만들 때는 <code>@tradecanvas/commons</code>의 <code>PHI</code>, <code>FIBONACCI</code>,
  <code>phiStep(base, steps, perPhi)</code>를 쓸 수 있습니다.
</p>

<h2>나만의 외관</h2>
<p>
  테마는 프리셋(지정하지 않으면 Print)에서 출발해 명시한 항목만 바꿉니다. 스케일에 설정한 모서리는 그 스케일을 따르는
  모든 부품에 적용되며, 부품별로 따로 설정한 값이 있으면 그 값이 쓰입니다.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious · airy
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
      <code>sidebar</code> 너비, <code>menuItem</code> 높이, 단위 px. <code>compact</code>와 <code>spacious</code>는
      Print의 크기를 φ의 반 단계 내리거나 올린 것입니다.
    </td></tr>
    <tr><td><code>font</code></td><td>
      글꼴 패밀리(CSS 목록), 본문 <code>size</code>(11–20 px; 다른 크기는 φ의 3분의 1 단계 간격으로 이를 따름), 굵기, 그리고 섹션 제목 같은 작은 라벨의
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
  위젯은 글꼴을 불러오지 않습니다. 이름만 지정하고, 브라우저가 목록 순서대로 대체 글꼴을 찾습니다. Print는 어느
  시스템에나 있는 글꼴(Segoe UI, San Francisco, Roboto)과, 숫자에는 Cascadia Mono, SF Mono, Menlo 또는 Consolas를
  지정하므로 따로 불러올 것이 없습니다. Studio는 Manrope 다음 Inter, Terminal은 IBM Plex Sans Condensed와
  IBM Plex Mono, Capsule은 Sora를 지정합니다. 원하는 글꼴은 직접 불러오세요.
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>CSS 변수</h2>
<p>
  토큰은 위젯 루트(와 그 대화 상자)에 있는 CSS 변수입니다. <code>ui</code> 옵션이 없으면 스타일시트의 값, 즉 Print의
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
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code>(및 <code>-xs</code>, <code>-sm</code>, <code>-lg</code>, <code>-xl</code>, <code>-display</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
    <tr><td><code>--tcw-space-1</code> … <code>--tcw-space-7</code></td><td>스타일시트: 피보나치 간격, 2에서 34 px까지</td></tr>
    <tr><td><code>--tcw-kind-1</code> … <code>--tcw-kind-5</code></td><td>스타일시트: 종목 검색에서 종류마다 쓰는 색(주식, 선물, 지수, 암호화폐, 외환). 어두운 테마와 밝은 테마에 각각 설정되어 있습니다. 직접 만든 팔레트에서도 함께 설정하세요. 그러지 않으면 배지는 이 색을 그대로 씁니다.</td></tr>
    <tr><td><code>--tcw-font-features</code></td><td>스타일시트: <code>normal</code>, 글꼴의 기본 모양 그대로. <code>ui</code> 옵션은 이 값을 설정하지 않으므로, <code>.tcw-root</code>에 작성한 규칙으로 사용하는 글꼴 자체의 OpenType 기능을 켤 수 있습니다(Inter의 한 층 a와 열린 숫자: <code>'cv11', 'ss01'</code>). 위젯의 글자에 적용되지만, 버튼과 입력란 대부분은 브라우저 자체 설정을 그대로 쓰고, 차트의 글자에는 적용되지 않습니다.</td></tr>
  </tbody>
</table>
<p>
  레이아웃 스위치는 같은 요소의 data 속성으로 노출되어, 직접 CSS를 작성할 때 쓸 수 있습니다:
  <code>data-tcw-ui</code>(프리셋), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code>, <code>data-tcw-separators</code>(<code>on</code> / <code>off</code>).
</p>

<h2 id="controls">입력란, 목록, 달력</h2>
<p>
  위젯의 모든 입력란(알림, 설정, 주문 티켓, 날짜로 이동, 지표 파라미터)은 같은 모양입니다. 옅은 채움과 가는 선, 마우스를 올리면 선이 조금 진해지고, 포커스되면 선이 강조색으로 바뀝니다. 둘레에 링은 생기지 않습니다. 셀렉트는 위젯 자체 목록을 엽니다. 선택된 행에 체크 표시, 그룹은 제목으로 보이며, 화살표 키·Enter·Escape·첫 글자 입력을 지원합니다. 날짜 입력란은 위젯 자체 달력을 엽니다. 주의 시작은 언어를 따르고, 오늘에는 밑줄, 입력란의 <code>min</code>·<code>max</code> 밖의 날은 흐리게 표시됩니다. 체크박스, 라디오, 슬라이더, 스위치도 같은 토큰을 따르고, 스크롤바도 마찬가지로 가늘고 둥글며 트랙 없이 손잡이만 보입니다.
</p>
<p>
  입력란은 브라우저 기본 <code>&lt;select&gt;</code>와 <code>&lt;input&gt;</code> 그대로입니다. 값, 이벤트, 폼은 전과 같이 동작하고, 터치 화면에서는 손가락에 더 잘 맞는 휴대폰 자체의 휠과 달력이 열립니다.
</p>
<p>모양은 다음 변수에서 오며, 다크와 라이트 테마에 각각 값이 있습니다:</p>
<p><code>--tcw-field-bg</code>, <code>--tcw-field-bg-hover</code>, <code>--tcw-field-bg-focus</code>, <code>--tcw-field-line</code>, <code>--tcw-field-line-hover</code>, <code>--tcw-field-line-focus</code>, <code>--tcw-field-placeholder</code>, <code>--tcw-check-line</code>, <code>--tcw-scroll-thumb</code>, <code>--tcw-scroll-thumb-hover</code>.</p>
<pre><code>{`.tcw-root {
  --tcw-field-bg: transparent;            /* fields as lines, no fill */
  --tcw-field-line: rgba(255, 255, 255, 0.12);
  --tcw-field-line-focus: #5b8cff;        /* focus in your brand colour */
}`}</code></pre>

<h2 id="overrides">차트의 모양: 스타일 오버라이드</h2>
<p>
  테마는 차트 전체의 색을 정합니다. 차트가 그리는 어떤 부분이든 키로 따로 정할 수 있습니다: 방향별 격자선,
  크로스헤어, 축, 패널, 범례, 최근 가격, 거래량, 세션 구분선, 그리고 차트 유형별 메인 시리즈. 정하지 않은 키는
  테마를 따르므로, 테마를 바꾸면 정하지 않은 부분도 색이 바뀝니다.
</p>
<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  overrides: { 'grid.vertical.visible': false },       // 처음부터
})

chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',              // 상승/하락이 있는 모든 유형이 이것을 따름
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'crosshair.labelBackground': '#2962ff',
  'lastPrice.style': 'solid',
  'panes.background': '#0d1117',
  'legend.textColor': '#c9d1d9',
})
chart.applyOverrides({ 'legend.textColor': null })      // null 은 키를 뺌
chart.resetOverrides(['grid.horizontal.style'])         // 또는 키를 지정
chart.setOverrides({ 'background.color': '#000' })      // 레이어 전체를 한 번에

chart.getStyleValue('series.bar.upColor')               // '#26a69a': 키의 최종 값
chart.getStyle().grid.vertical                          // { visible: false, color, style, width }
chart.on('styleChange', (e) => e.payload.layer)         // 'host' | 'user'`}</code></pre>

<h3>키</h3>
<table>
  <thead><tr><th>키</th><th>정하는 것</th></tr></thead>
  <tbody>
    <tr><td><code>background.color</code></td><td>차트 배경(패널에 자체 배경이 없으면 패널도).</td></tr>
    <tr><td><code>panes.background</code>, <code>.separatorColor</code>, <code>.titleColor</code></td><td>지표 패널: 배경, 위쪽 막대, 이름.</td></tr>
    <tr><td><code>grid.horizontal.*</code>, <code>grid.vertical.*</code></td><td><code>visible</code>, <code>color</code>, <code>style</code>(<code>solid</code> · <code>dashed</code> · <code>dotted</code>), <code>width</code> — 방향별로 따로.</td></tr>
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>크로스헤어 선에도 같은 네 가지(기본은 가는 실선).</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>축과 패널 눈금의 가격·시간 라벨.</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>각 축의 선과 라벨(패널 눈금은 가격 축을 따름).</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>범례의 값과 라벨(O, H, L, Vol).</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>최근 가격 선과 태그. 정하지 않으면 색은 메인 시리즈를 따름. 봉의 남은 시간(<code>features.barCountdown</code>)은 태그 아래에 붙음.</td></tr>
    <tr><td><code>volume.upColor</code>, <code>.downColor</code></td><td>거래량 막대.</td></tr>
    <tr><td><code>sessionBreaks.color</code>, <code>.style</code>, <code>.width</code></td><td>일·주·월 구분선.</td></tr>
    <tr><td><code>highLow.color</code>, <code>watermark.color</code></td><td>고가·저가 선, 워터마크.</td></tr>
    <tr><td><code>trading.buyColor</code>, <code>.sellColor</code>, <code>.profitColor</code>, <code>.lossColor</code>, <code>.entryColor</code></td><td>주문(매수, 매도)과 포지션(이익, 손실, 진입). 차트와 가격 축 모두에서 트레이딩 설정의 색보다 우선합니다.</td></tr>
    <tr><td><code>markers.longColor</code>, <code>.shortColor</code>, <code>.neutralColor</code></td><td>시그널 표시. 자체 스타일보다 우선합니다.</td></tr>
    <tr><td><code>tradeZones.profitColor</code>, <code>.lossColor</code>, <code>.activeColor</code></td><td>거래 영역: 이익, 손실, 진행 중.</td></tr>
    <tr><td><code>drawings.handleColor</code></td><td>선택한 그림의 핸들(설정하지 않으면 흰색).</td></tr>
    <tr><td><code>series.&lt;type&gt;.*</code></td><td>그 유형으로 그려질 때의 메인 시리즈: <code>upColor</code>, <code>downColor</code>, <code>wickUpColor</code>,
      <code>wickDownColor</code>(캔들, 하이킨아시, 거래량 캔들, 이퀴볼륨), <code>color</code> / <code>lineColor</code>
      와 <code>lineWidth</code>(라인, 스텝 라인, 마커 라인, 영역, HLC 영역, 베이스라인), <code>topColor</code> 와
      <code>bottomColor</code>(영역, HLC 영역).</td></tr>
  </tbody>
</table>
<p>
  <code>CHART_STYLE_KEYS</code> 에 모든 키와 값의 종류가 있고, TypeScript 가 작성하는 즉시 키와 값을 검사합니다.
  상승/하락 색은 <code>series.candlestick.*</code>, 선 색과 두께는 <code>series.line.*</code>, 영역 채우기는
  <code>series.area.*</code>, 그다음 테마를 따릅니다. 몸통 색을 정하면 꼬리도 그 색을 씁니다.
  알 수 없는 키와 값은 경고와 함께 무시됩니다.
</p>

<h3>앱의 것과 사용자의 것</h3>
<p>
  오버라이드는 두 레이어로 나뉩니다. 앱의 것(<code>layer: 'host'</code>, 기본값)은 테마를 바꿔도 남고 저장되지 않습니다.
  사용자의 것(<code>layer: 'user'</code>)은 앱의 것보다 우선하며, 정한 테마별로 유지되고 — 다크 테마에서 고른 색은
  다크 테마로 돌아오면 다시 나타납니다 — <code>saveState()</code> 로 저장됩니다. 위젯의 설정은 사용자 레이어에 씁니다.
  왼쪽에 세로로 놓인 탭이 이 키들로 차트의 모든 부분을 설정합니다: <strong>종목</strong>(지금 보는 차트 유형, 최종가,
  거래량), <strong>상태 표시줄</strong>, <strong>눈금</strong>, <strong>모양</strong>(배경, 격자, 십자선, 세션 구분),
  <strong>레이어</strong>, <strong>거래</strong>(주문, 포지션, 시그널 표시, 거래 영역). 바꾼 내용은 바로 보이고,
  <strong>취소</strong>는 모두 되돌리며 <strong>확인</strong>은 한 번의 실행 취소 단위로 남깁니다. <strong>템플릿</strong>
  메뉴는 모양을 이름으로 저장하고, 저장한 것을 적용하거나 지우며, 어떤 테마든 그 테마의 색으로 되돌립니다. 부품 자체에
  맡긴 색은 자동으로 표시되고, 자동 버튼으로 되돌릴 수 있습니다.
</p>
<pre><code>{`chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' })
chart.getOverrides({ layer: 'user' })                 // 현재 테마에서 사용자의 것
chart.getTheme()                           // 설정한 그대로의 테마: 오버라이드는 따로 둠`}</code></pre>
<p>
  격자와 크로스헤어 옵션(<code>grid.hLineColor</code>, <code>crosshair.vLine.style</code>…)은 해당 키의 줄임말입니다.
  여러 차트 그리드는 모든 차트에 오버라이드를 적용합니다: <code>grid.applyOverrides(patch)</code>.
  React, Vue, Svelte 컴포넌트는 <code>overrides</code> prop 으로 받습니다.
</p>

<h3>지표 플롯과 패널</h3>
<pre><code>{`// 플롯별 선 종류와 표시 여부, 키로 지정(색과 두께는 colors / lineWidths 그대로)
chart.updateIndicatorStyle(macdId, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } })

// 앞으로 추가할 같은 종류 지표의 시작 스타일
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] })

// 패널 자체의 배경과 구분선, 지표와 함께 저장
chart.setPaneStyle(rsiId, { background: '#101418', separator: '#f5a623' })`}</code></pre>
<p>
  숨긴 플롯은 값 태그도 범례 값도 없습니다. 모든 지표가 숨긴 플롯을 그리지 않고, 거의 모든 지표가 플롯의
  선 종류도 따릅니다. 자체 도형을 그리는 일부(파라볼릭 SAR 점, Supertrend, 지그재그, 거래량 프로파일)는
  자기 선을 유지합니다.
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

<h2 id="legend">OHLCV 범례</h2>
<p>
  차트 위쪽의 범례는 제목 줄로 시작합니다: 종목, 시간 단위, 거래소에 이어 같은 줄에 포인터 아래의 봉(없으면 마지막 봉)의 시가, 고가, 저가, 종가, 변동이 나옵니다. 거래량은 따로 한 줄에 표시됩니다. 휴대폰처럼 플롯 영역이 제목 줄을 담기에 좁으면 줄이 바뀝니다. 차트는 종목과 시간 단위를 스트림에서, 거래소를 종목 상세 정보에서 가져옵니다. <code>setSymbolName('Bitcoin')</code>은 종목이 바뀔 때까지 이름을 직접 정하고, <code>showSymbol: false</code>는 제목을 뺍니다. 각 값은 자릿수가 바뀌어도 자리를 지키므로 실시간 틱에 흔들리지 않습니다. 아예 끄거나 원하는 줄만 남길 수 있습니다. 위젯에서는 룩의 숫자용 글꼴을 그 아래 지표 줄과 같은 크기로 씁니다. <code>setUI</code>는 직접 호출한 <code>setLegend</code> 뒤에도 이를 다시 설정합니다.
</p>
<pre><code>{`new Chart(host, { features: { legend: false } })   // no legend at all
chart.setLegend({ visible: false })                  // or at any time
chart.setLegend({
  showSymbol: false, showOHLC: true, showChange: true, showVolume: false,
  position: 'top-right',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',                   // null: the theme's font
})

// The widget: start with it off (the user can still turn it on in Settings)
new ChartWidget(host, { chartOptions: { features: { legend: false } } })`}</code></pre>

<h2 id="volume">가격 눈금과 거래량 띠</h2>
<p>
  거래량 막대는 플롯 영역 아래쪽을 따라 놓인 띠 안에 머물며, 그 높이는 플롯 영역의 φ^-4.5(약 11.5%)입니다. 자동으로 맞춘
  가격 눈금은 캔들을 이 띠 위에 φ^-7(3%) 간격을 두고 놓습니다. 최고가 위로는 φ^-5(9%)를 남깁니다. 화면에 거래량이 없으면
  (꺼 두었거나 거래량이 없는 봉이면) 캔들이 이 띠까지 차지합니다. 눈금은 화면에 보이는 오버레이 지표와 비교선에도 맞춥니다.
</p>

<h2>거래량 색</h2>
<p>
  거래량 막대는 테마의 <code>volumeUp</code>과 <code>volumeDown</code> (또는 <code>volume.*</code> 키)을 씁니다. 내장 테마는 중립적인 잉크 한 가지 색으로 그리고, 하락 막대는 더 옅게 그립니다. 위의 캔들이 이미 가격이 어느 쪽으로 움직였는지 보여 주므로 막대는 배경으로 남습니다. 직접 바꾸든 widget의 설정에서 바꾸든, 캔들 색이 바뀌어도 막대는 중립적인 색 그대로입니다. 캔들 색의 막대를 원하면 <code>volumeColor(candleColor)</code>가 캔들 색을 거래량의 투명도로 돌려줍니다:
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>

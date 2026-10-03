<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>样式 — TradeCanvas 文档</title>
  <meta name="description" content="用 token 描述组件的外观：圆角、尺寸、字体、边框、阴影和工具栏。三套预设——Studio、Terminal、Capsule——以及在其基础上定制的你自己的主题。" />
</svelte:head>

<h1>组件样式</h1>
<p>
  组件的外观由一组 token 构成：各类部件的圆角、控件与工具栏的尺寸、字体、边框、阴影、选中按钮的样式，
  以及工具栏和画线工具是沿边停靠还是悬浮。从一套预设出发，想改哪里就改哪里。颜色仍由主题决定
  （<code>dark</code> / <code>light</code>，参见 <a href={href('/docs/api')}>API 参考</a>）；任何外观都能与这两种主题搭配。
</p>

<h2>预设</h2>
<table>
  <thead><tr><th>预设</th><th>外观</th></tr></thead>
  <tbody>
    <tr><td><code>studio</code>（默认）</td><td>
      控件圆角 7 px，菜单 11 px，对话框 16 px。分组之间用间距而非分隔线隔开，菜单浮在柔和的阴影之上，
      周期按钮位于分段式轨道中，选中的按钮以浅色调填充。
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      紧凑方正：2 px 圆角、26 px 高的控件、分组之间有分隔线、标签大写，选中的按钮下方有一条下划线。
      图表上的价格标签为直角。
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      处处都是胶囊形，价格标签也不例外。工具栏和画线工具像小岛一样悬浮，菜单是磨砂玻璃效果，选中的按钮是实心胶囊。
    </td></tr>
  </tbody>
</table>

<h2>选择外观</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2>自定义外观</h2>
<p>
  自定义主题从一套预设开始（未指定时为 Studio），只修改其中写明的部分。在圆角刻度上设置的值会作用于所有跟随该刻度的部件，
  除非你单独设置了该部件自己的圆角。
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
  <thead><tr><th>字段</th><th>设置内容</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>圆角刻度 <code>xs</code>、<code>sm</code>、<code>md</code>、<code>lg</code>、<code>xl</code>，单位 px（0–999）。</td></tr>
    <tr><td><code>components</code></td><td>
      单个部件自己的圆角：<code>control</code>（按钮）、<code>input</code>、<code>menu</code>、<code>dialog</code>、
      <code>panel</code>（提醒、数据窗口、下单面板）、<code>tooltip</code>、<code>tag</code>、<code>toast</code>，
      以及 <code>toolbar</code> 和 <code>sidebar</code>（它们自身的外框，悬浮时可见）。默认情况下，控件和输入框取
      <code>md</code>，菜单和面板取 <code>lg</code>，对话框取 <code>xl</code>，提示框和标签取 <code>sm</code>。
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      <code>toolbar</code> 高度、<code>control</code> 与 <code>controlSmall</code> 高度、<code>icon</code>、
      <code>sidebar</code> 宽度以及 <code>menuItem</code> 高度，单位 px。
    </td></tr>
    <tr><td><code>font</code></td><td>
      字体族（CSS 字体列表）、正文 <code>size</code>（11–20 px；较小的字号随之变化）、字重，以及小标签（如分区标题）的大小写和字间距（em）。
    </td></tr>
    <tr><td><code>borders</code></td><td>边框宽度，以及工具栏的分组之间、画线工具之间是否用分隔线隔开。</td></tr>
    <tr><td><code>shadows</code></td><td>菜单、对话框和提示框的 CSS 阴影。</td></tr>
    <tr><td><code>blur</code></td><td>磨砂菜单，单位 px：大于 0 时，菜单会透出部分经过模糊的图表。</td></tr>
    <tr><td><code>active</code></td><td>选中按钮的样式：浅色调填充、实心胶囊或下划线。</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>沿边停靠，或像小岛一样悬浮。</td></tr>
    <tr><td><code>intervals</code></td><td>周期按钮保持原样，或放入分段式轨道中。</td></tr>
    <tr><td><code>tagRadius</code></td><td>图表绘制的价格标签、坐标轴胶囊标签和订单徽标的圆角。</td></tr>
  </tbody>
</table>
<p>无法使用的值（超出范围，或可能跳出其声明的 CSS）会被忽略，并沿用预设中的值。</p>

<h2>字体</h2>
<p>
  组件不会加载任何字体：它只写出字体名称，由浏览器按列表依次回退。Studio 指定 Manrope，其次是 Inter；
  Terminal 指定 IBM Plex Sans Condensed 和 IBM Plex Mono；Capsule 指定 Sora。请自行加载需要的字体：
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>CSS 变量</h2>
<p>
  这些 token 是组件根元素（以及其对话框）上的 CSS 变量。不设置 <code>ui</code> 选项时，它们沿用样式表中的值（即 Studio 的值），
  因此你自己的 CSS 可以设置它们：组件会把自己的样式表放在页面最前面，所以你写在 <code>.tcw-root</code> 上的规则会生效。
  设置 <code>ui</code> 后，组件会把它们直接写到元素上，并以这些值为准。
</p>
<pre><code>{`.tcw-root {
  --tcw-radius: 4px;            /* the md corner: buttons and fields follow it */
  --tcw-dialog-radius: 12px;
  --tcw-control-h: 28px;
  --tcw-font: 'Inter', system-ui, sans-serif;
}`}</code></pre>
<table>
  <thead><tr><th>变量</th><th>来源</th></tr></thead>
  <tbody>
    <tr><td><code>--tcw-radius-xs</code>、<code>-sm</code>、<code>--tcw-radius</code>、<code>-lg</code>、<code>-xl</code></td><td><code>radius</code></td></tr>
    <tr><td><code>--tcw-control-radius</code>、<code>--tcw-input-radius</code>、<code>--tcw-menu-radius</code>、<code>--tcw-dialog-radius</code>、<code>--tcw-panel-radius</code>、<code>--tcw-tooltip-radius</code>、<code>--tcw-tag-radius</code>、<code>--tcw-toast-radius</code>、<code>--tcw-toolbar-radius</code>、<code>--tcw-sidebar-radius</code></td><td><code>components</code></td></tr>
    <tr><td><code>--tcw-toolbar-h</code>、<code>--tcw-control-h</code>、<code>--tcw-control-h-sm</code>、<code>--tcw-icon</code>、<code>--tcw-sidebar-w</code>、<code>--tcw-menu-item-h</code></td><td><code>sizes</code></td></tr>
    <tr><td><code>--tcw-font</code>、<code>--tcw-font-mono</code>、<code>--tcw-font-size</code>（以及 <code>-sm</code>、<code>-xs</code>、<code>-lg</code>）、<code>--tcw-weight</code>、<code>--tcw-weight-strong</code>、<code>--tcw-label-case</code>、<code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>、<code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>、<code>--tcw-dialog-shadow</code>、<code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>、<code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
  </tbody>
</table>
<p>
  布局开关是同一批元素上的 data 属性，可供你编写自己的 CSS：
  <code>data-tcw-ui</code>（预设）、<code>data-tcw-active</code>、<code>data-tcw-toolbar</code>、
  <code>data-tcw-sidebar</code>、<code>data-tcw-intervals</code> 和 <code>data-tcw-separators</code>（<code>on</code> / <code>off</code>）。
</p>

<h2>图表上的标签</h2>
<p>
  组件会把 <code>tagRadius</code> 传给它的图表（写在 <code>chartOptions.shapes</code> 中的形状会一直保留，直到你调用
  <code>setUI</code>）。直接使用 <code>Chart</code> 时，请自行设置形状；切换主题后该设置依然保留。价格标签、坐标轴和十字光标的胶囊标签、
  委托、持仓和括号单的标签，以及前一周期高低点的标签都会采用这一形状。
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2>成交量颜色</h2>
<p>
  成交量柱使用主题的 <code>volumeUp</code> 和 <code>volumeDown</code>。<code>volumeColor(candleColor)</code> 返回带成交量透明度的K线颜色，这样在你自己的主题里，成交量柱依然只是K线背后的衬底。在 widget 的设置里修改K线颜色时，它会自动这样处理；基于预设、只改了 <code>candleUp</code> / <code>candleDown</code> 的主题，成交量也会跟随这些颜色。
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>

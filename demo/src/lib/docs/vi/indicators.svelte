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
  <title>Chỉ báo — Tài liệu TradeCanvas</title>
  <meta name="description" content="{catalog.length} chỉ báo kỹ thuật có sẵn: đường trung bình, dải, dao động, khối lượng và biến động, cùng nguồn dữ liệu, chỉ báo tính trên chỉ báo và các mức chỉnh được." />
</svelte:head>

<h1>Chỉ báo</h1>
<p>
  {catalog.length} chỉ báo có sẵn. Thêm một chỉ báo bằng id của nó; tham số bỏ trống nhận
  giá trị mặc định, tham số không hợp lệ cũng quay về giá trị mặc định.
</p>

<h2>Thêm chỉ báo</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> trả về id của instance: cùng một chỉ báo có thể thêm nhiều lần,
  mỗi instance có tham số, màu và các mức riêng.
</p>

<p>
  Trong TypeScript, id và tham số của các chỉ báo có sẵn đều có kiểu: <code>BuiltInIndicators</code> liệt kê từng chỉ báo
  cùng tham số, giá trị mặc định và key của các đường, nên editor gợi ý chúng khi gõ, và tham số viết sai
  sẽ không qua bước kiểm tra kiểu. Chỉ báo do plugin đăng ký nhận id và tham số bất kỳ.
</p>

<h2>Nguồn dữ liệu và chỉ báo tính trên chỉ báo</h2>
<p>
  Các chỉ báo đánh dấu <em>source</em> ở dưới có thể tính trên giá khác ngoài giá đóng cửa
  (<code>open</code>, <code>high</code>, <code>low</code>, <code>hl2</code>, <code>hlc3</code>,
  <code>ohlc4</code>, <code>hlcc4</code>) hoặc trên một đường của chỉ báo khác. Đường trung bình của RSI
  được vẽ trong pane của RSI, theo thang của RSI, và bị xoá khi RSI bị xoá.
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  Các chỉ báo trong pane riêng cũng có thể dùng chung một pane:
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>.
</p>

<h2>Mức, màu và giá trị</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  Legend hiện giá trị mới nhất của từng đường. Để gắn thêm nhãn giá trị trên trục, theo màu của đường, bật
  <code>features.indicatorValueLabels: true</code> hoặc gọi <code>setIndicatorValueLabelsVisible(true)</code> (mặc định tắt).
  Các đường, mức, trục và crosshair của một pane dùng chung một thang.
</p>

<h2>Chỉ hiện ở một số khung thời gian</h2>
<p>
  Một chỉ báo có thể chỉ hiện ở một số khung thời gian: đường trung bình 200 ngày từ biểu đồ ngày
  trở lên, một chỉ báo dao động nhanh chỉ ở biểu đồ phút. Mỗi loại khung thời gian (tick, giây,
  phút, giờ, ngày, tuần, tháng) được để bật, tắt, hoặc giới hạn trong một khoảng số đơn vị;
  loại nào không nêu thì chỉ báo hiện ở mọi khung thuộc loại đó. Biểu đồ đối chiếu các quy tắc với khung thời gian
  của stream đang kết nối, theo từng lần khung thời gian đổi; với nến nạp bằng <code>setData</code>,
  <code>chart.setDataTimeframe('1h')</code> cho biểu đồ biết khung thời gian của chúng (ChartWidget tự làm việc này); nếu không có cả hai,
  chỉ báo luôn hiện. Các quy tắc được lưu cùng layout và hoàn tác được như mọi chỉnh sửa khác.
</p>
<pre><code>{`chart.setIndicatorIntervals(ema, { seconds: false, minutes: false, hours: [1, 4] })
chart.getIndicatorIntervals(ema)    // { seconds: false, minutes: false, hours: [1, 4] }
chart.setIndicatorIntervals(ema, null)  // all of them again`}</code></pre>
<p>
  <code>getActiveIndicators()</code> cho biết với từng chỉ báo: <code>visible</code> (đang bật) và
  <code>shown</code> (được vẽ ở khung thời gian hiện tại). Trong ChartWidget, dòng legend của chỉ báo chuyển màu xám khi nó không được vẽ.
</p>

<h2>Trong ChartWidget</h2>
<p>
  Nút <strong>Chỉ báo</strong> trên toolbar mở một dialog. Gõ để tìm mọi chỉ báo theo
  tên hoặc tên viết tắt (<kbd>Enter</kbd> thêm kết quả khớp nhất); hoặc chọn một nhóm ở cột bên:
  <strong>Yêu thích</strong>, <strong>Mẫu</strong>, <strong>Tất cả</strong>, rồi đến từng loại
  (đường trung bình, xu hướng, dao động, biến động, khối lượng, dải và kênh, giá và
  mẫu hình). Bấm một dòng để thêm chỉ báo đó, dialog vẫn mở để thêm chỉ báo tiếp theo; một con số cho biết
  bao nhiêu instance đang có trên biểu đồ, và ngôi sao bên cạnh đưa chỉ báo vào mục yêu thích. Trên điện thoại, các nhóm
  là một hàng chip phía trên danh sách.
</p>
<p>
  Phần cài đặt của một chỉ báo (bấm tên trên dòng legend, hoặc biểu tượng bánh răng) có ba tab:
  <strong>Tham số</strong>; <strong>Kiểu</strong>, mỗi đường một dòng (hiện hay ẩn, màu, kiểu
  nét đứt), độ dày đường, thang giá của overlay và các mức; và <strong>Hiển thị</strong>,
  các khung thời gian mà chỉ báo hiện. Mọi chỉnh sửa hiện ngay. <strong>Huỷ</strong> hoặc <kbd>Esc</kbd>
  trả lại tất cả như cũ, <strong>OK</strong> giữ thay đổi. <strong>Mặc định</strong> đặt lại về mặc định, hoặc lưu thiết lập hiện tại làm
  mặc định: các chỉ báo cùng loại thêm sau đó bắt đầu với các tham số và kiểu hiển thị này, trong trình duyệt
  này.
</p>

<h2>Trên pane giá ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>Tên</th><th>Tham số mặc định</th><th>Đường</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· source</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> vẽ đường trung bình của khung thời gian lớn hơn lên biểu đồ hiện tại, ví dụ
  MA50 ngày trên nến 1h. Nó chỉ tính trung bình trên các giá đóng cửa <em>đã hoàn tất</em> của khung lớn hơn, nên
  đường đi theo bậc ở mỗi ranh giới và không bao giờ repaint.
</p>

<p>
  <code>vwap</code> tính lại từ đầu tại <code>anchor</code> của nó: <code>'session'</code>, giá trị mặc định, mỗi ngày
  giao dịch, từ nửa đêm theo múi giờ của sàn (<code>timeZone</code> của mã, nếu không có thì của thị trường, nếu không có nữa thì
  UTC); <code>'week'</code> mỗi thứ Hai; <code>'month'</code> vào ngày 1; <code>'all'</code> không bao giờ: nó tính trung bình
  trên mọi nến đã nạp, nên giá trị thay đổi khi nạp thêm nến cũ. Trên nến ngày, VWAP theo phiên bằng
  giá điển hình (typical price) của từng nến: khi đó hãy chọn <code>'week'</code> hoặc <code>'month'</code>. <code>svwap</code> là VWAP theo phiên
  kèm các dải σ, còn <code>avwap</code> bắt đầu từ nến được neo. <code>svwap</code>, <code>mtfma</code>,
  các đường của ngày trước và các phiên của market profile đếm ngày theo cùng múi giờ đó.
  Các khung 2h đến 12h của <code>mtfma</code> cũng bắt đầu từ nửa đêm của sàn, trong khi nến 4h do feed cung cấp
  vẫn theo lưới UTC, và trên nến ngày <code>svwap</code> chỉ có đường chính, không có dải. Trong ChartWidget, VWAP với anchor khác được đặt tên theo anchor đó ('VWAP Week') trong legend, các chip và panel Đối tượng, còn anchor và các lựa chọn của nó hiển thị theo ngôn ngữ của widget; cột CSV vẫn là <code>VWAP</code>.
</p>
<pre><code>{`chart.addIndicator('vwap')                      // starts again each trading day
chart.addIndicator('vwap', { anchor: 'week' })  // each Monday: for daily bars
chart.addIndicator('vwap', { anchor: 'all' })   // every bar loaded, as it was before`}</code></pre>

<p>
  <code>volumeProfile</code> vẽ mỗi vùng giá một hàng, tính từ mép trái của vùng vẽ; độ dài mỗi hàng
  theo khối lượng khớp trong vùng giá đó. Các hàng có độ trong suốt, nên legend phía trên và nến
  phía dưới vẫn đọc được; đặt <code>opacity</code> thấp hơn bằng <code>updateIndicatorStyle</code>
  để làm mờ thêm.
</p>

<h2>Trong pane riêng ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>Tên</th><th>Tham số mặc định</th><th>Đường</th><th>Mức</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· source</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code> (Volume Delta) là phần khối lượng bên mua chủ động lấy trong mỗi nến trừ đi phần bên bán
  chủ động lấy. Nến có ghi bên nào chủ động khớp (<code>buyVolume</code> của nến) cho delta thật. Nến không ghi
  thì được đọc theo cách nó đóng cửa: toàn bộ khối lượng tính là tăng khi nến đóng cửa bằng hoặc trên giá mở,
  ngược lại tính là giảm; đây là mức gần nhất mà một nến OHLCV cho được. <code>mode: 0</code> là histogram
  theo từng nến, <code>mode: 1</code> là delta tích luỹ, bắt đầu lại ở mỗi kỳ <code>anchor</code>
  (<code>'session'</code>, <code>'week'</code> hoặc <code>'month'</code>; với <code>'all'</code>, giá trị mặc
  định, thì không bao giờ bắt đầu lại).
</p>

<h2>Chỉ báo từ bảng giá châu Á</h2>
<p>
  Các chỉ báo mà nhà giao dịch ở Hàn Quốc, Nhật Bản và Việt Nam thường thấy trên bảng giá: Psychological Line (<code>psy</code>) và New Psychological Line (<code>newpsy</code>), Volume Ratio (<code>vr</code>), AB Ratio (<code>abratio</code>), <code>sonar</code>, <code>sigma</code>, Binary Wave (<code>binarywave</code>), Trade Value (<code>tradevalue</code>) cùng Volume Change (<code>volchange</code>), vùng giá dự phóng DeMark (<code>demark</code>) và <code>rainbow</code> gồm tối đa 20 đường trung bình. Trade Value là giá trị ước lượng, bằng giá đóng cửa × khối lượng của từng nến; số liệu chính thức của sàn lấy từ feed của sàn.
</p>
<pre><code>{`chart.addIndicator('psy', { period: 10 }, 'bottom')              // share of up closes; 25 and 75 marked
chart.addIndicator('vr', { period: 20 }, 'bottom')                // volume of up days against down days
chart.addIndicator('tradevalue', {}, 'bottom')                    // close × volume, each bar
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 }) // ten averages, 10 to 100 bars`}</code></pre>

<h2>Mẫu nến</h2>
<p>
  64 mẫu nến từ một đến năm nến: doji, hammer và shooting star, marubozu và belt hold; engulfing, harami, piercing line và dark cloud, tweezer, kicking; morning star và evening star, abandoned baby, three soldiers và three crows, three inside và three outside, tasuki gap; three-line strike, three methods, mat hold, breakaway và ladder bottom. Một mẫu đảo chiều chỉ được tính khi có xu hướng trước đó để đảo (giá đóng cửa ngay trước mẫu vượt qua cả đường trung bình 10 nến và giá đóng cửa 10 nến trước, <code>trendPeriod</code>), và thân nến dài hay ngắn được so với thân nến trung bình của các nến trước đó. Chỉ báo vẽ mũi tên dưới mẫu tăng và trên mẫu giảm, kèm tên viết tắt khi nến đủ rộng; nến kết thúc nhiều mẫu cùng lúc hiện mẫu dài nhất. <code>reversal</code>, <code>continuation</code> và <code>indecision</code> (1 hoặc 0) chọn các loại mẫu.
</p>
<pre><code>{`chart.addIndicator('candlepatterns')                  // an arrow and the name on each bar that ends one
chart.addIndicator('candlepatterns', { indecision: 1 }) // dojis and spinning tops too

import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/chart'

const found = detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer'] })
// [{ index, time, pattern: { id, name, short, direction, kind, bars } }]
CANDLE_PATTERNS.length                                 // 64`}</code></pre>
<p>
  Trang chỉ tìm mẫu nến mà không vẽ biểu đồ (scanner, screener) import hai thứ này từ
  <code>@tradecanvas/core/patterns</code>: chỉ riêng bộ nhận diện, khoảng 4 kB sau gzip, trong một chunk
  riêng, nên trang đó không tải engine của biểu đồ kể cả khi các trang khác của ứng dụng có tải. Khai báo
  <code>@tradecanvas/core</code> trong dependencies của ứng dụng để import.
</p>
<pre><code>{`import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/core/patterns'`}</code></pre>

<h2 id="fair-value-gaps">Fair value gap</h2>
<p>
  Ba bar tạo ra một fair value gap khi đáy của bar thứ ba nằm trên đỉnh của bar thứ nhất (hoặc, theo chiều giảm, đỉnh của nó nằm dưới đáy của bar thứ nhất): giữa hai mức đó chỉ có bar ở giữa giao dịch. Biểu đồ vẽ một hộp phủ vùng giá ấy, từ bar ở giữa đến mép phải khi gap còn mở, màu xanh ngọc với gap đi lên và màu hồng với gap đi xuống (màu của các dấu mẫu hình nến, tách khỏi xanh và đỏ của nến; đổi được trong style của chỉ báo). Một gap được lấp bởi bar đầu tiên về sau giao dịch qua hết vùng đó, và khi ấy không còn vẽ nữa trừ khi <code>showFilled</code> là 1. <code>detectFairValueGaps</code> trả về tất cả mà không cần biểu đồ, kèm bar đã lấp từng gap.
</p>
<pre><code>{`chart.addIndicator('fvg')                              // một hộp trên mỗi gap còn mở
chart.addIndicator('fvg', { minPercent: 0.1 })         // bỏ các gap nhỏ hơn 0,1% giá
chart.addIndicator('fvg', { showFilled: 1 })           // giữ các gap đã lấp, mờ hơn, đến bar đã lấp

import { detectFairValueGaps } from '@tradecanvas/chart'

detectFairValueGaps(bars, { minPercent: 0.1 })
// [{ index, formed, direction: 'up' | 'down', top, bottom, filledAt }]`}</code></pre>

<h2 id="divergences">Divergence</h2>
<p>
  Divergence là khi giá và một oscillator cùng đảo chiều hai lần nhưng không theo cùng một hướng. Bullish, ở hai đáy: giá tạo đáy thấp hơn còn oscillator tạo đáy cao hơn. Bearish, ở hai đỉnh: giá tạo đỉnh cao hơn còn oscillator tạo đỉnh thấp hơn. <code>rsidiv</code> là RSI kèm một đường nối hai điểm đảo chiều ở mỗi divergence và một dấu ở điểm thứ hai; <code>hidden: 1</code> thêm các hidden divergence (giá giữ được, RSI thì không), vẽ nét đứt. Một điểm đảo chiều phải nổi lên so với <code>left</code> bar trước nó và <code>right</code> bar sau nó, nên divergence được biết trễ <code>right</code> bar và khi bar xác nhận nó đã đóng thì không đổi nữa (trên bar đó, lúc còn đang chạy, nó có thể hiện rồi mất); hai điểm cách nhau từ <code>minBars</code> đến <code>maxBars</code>. <code>detectDivergences(bars, line, options)</code> đọc bất kỳ đường nào có một giá trị mỗi bar (null ở chỗ không có) và không cần biểu đồ.
</p>
<pre><code>{`chart.addIndicator('rsidiv', {}, 'bottom')                    // RSI, có đánh dấu divergence
chart.addIndicator('rsidiv', { hidden: 1 }, 'bottom')         // thêm hidden divergence, nét đứt
chart.addIndicator('rsidiv', { left: 3, right: 3 }, 'bottom') // điểm đảo chiều gần hơn: biết trễ 3 bar, và nhiều hơn

import { detectDivergences } from '@tradecanvas/chart'

detectDivergences(bars, macdHistogram, { left: 5, right: 5, minBars: 5, maxBars: 60, hidden: true })
// [{ kind: 'bullish' | 'bearish', hidden, from, to, confirmed, valueFrom, valueTo, priceFrom, priceTo }]`}</code></pre>

<h2 id="session-volume-profile">Volume profile theo phiên</h2>
<p>
  <code>svp</code> vẽ khối lượng theo giá của từng ngày giao dịch: biên độ của ngày được chia thành <code>rows</code> hàng, khối lượng của mỗi bar chia đều cho các hàng mà biên độ của nó phủ qua, vẽ thành các hàng kéo sang phải từ bar đầu tiên của ngày. Phía trên là point of control của ngày (hàng nhiều khối lượng nhất) và value area (các hàng quanh nó chứa <code>valueArea</code> phần trăm khối lượng của ngày, mặc định 70), vẽ thành các đường ngang qua ngày. Một ngày bắt đầu lúc nửa đêm theo giờ của sàn (<code>setExchangeTimeZone</code>), giống Session VWAP. <code>poc</code>, <code>vah</code> và <code>val</code> của mỗi bar là của cả ngày chứa nó, tính cả các bar sau nó: ở một ngày đã qua, bar buổi sáng mang profile lúc đóng cửa của ngày, còn với ngày đang giao dịch chúng dịch chuyển theo giao dịch. Chúng dùng để đọc một ngày, không dùng làm tín hiệu hay backtest tại bar đó. <code>volumeProfile</code> là một profile cho mọi bar đã tải; <code>sessionVolumeProfiles</code> trả về các hàng của từng ngày mà không cần biểu đồ.
</p>
<pre><code>{`chart.addIndicator('svp')                           // mỗi ngày một profile, kèm POC và value area
chart.addIndicator('svp', { rows: 40, valueArea: 68 }) // hàng mịn hơn, value area hẹp hơn

import { sessionVolumeProfiles } from '@tradecanvas/chart'

sessionVolumeProfiles(bars, { rows: 24, valueArea: 70, timeZone: 'America/New_York' })
// [{ start, end, time, low, high, rowHeight, volumes, total, poc, valueAreaLow, valueAreaHigh, valueAreaRows }]`}</code></pre>

<h2>Chỉ báo tự viết</h2>
<p>
  Cách ngắn là <code>defineIndicator</code>: các tham số của chỉ báo, và một hàm trả về các đường của nó từ
  các nến, với <code>ta</code> cho các phép tính (<code>ta.ema</code>, <code>ta.rsi</code>, <code>ta.crossover</code>…).
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
  Với chỉ báo phải theo kịp tick trên một lịch sử dài, hoặc vẽ thứ gì đó của riêng nó, hãy kế thừa
  <code>IndicatorBase</code> và khai báo những gì chỉ báo vẽ (<code>plots</code>), thang của pane,
  các mức và tham số; biểu đồ tự vẽ chỉ báo, co giãn pane, gắn nhãn giá trị và liệt kê chỉ báo trong
  legend và phần cài đặt của widget mà không cần code render riêng. <code>category</code> của chỉ báo
  (<code>'oscillators'</code>, <code>'volume'</code>…) đặt nó vào nhóm tương ứng trong dialog Chỉ báo;
  không có category thì nó nằm trong nhóm Khác. Một nhóm của riêng bạn, <code>{`{ id: 'my-app', label: 'My App' }`}</code>,
  liệt kê các chỉ báo của app cùng nhau dưới tên của nhóm, trước các loại có sẵn. Xem
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">recipe chỉ báo tự viết</a>.
  Chỉ báo gom nến theo ngày, tuần hoặc tháng đọc múi giờ của sàn qua
  <code>config.exchangeTimeZone</code> (do biểu đồ đặt; không đặt thì là UTC). Khi đổi múi giờ, biểu đồ chỉ tính lại
  các chỉ báo đọc múi giờ và các chỉ báo đọc đường của chúng: chỉ báo tự viết không đọc múi giờ có thể khai báo
  <code>readsExchangeTimeZone: false</code> trong descriptor để không bị tính lại.
</p>
<p>
  <code>kind</code> của mỗi tham số (<code>'int'</code>, <code>'number'</code>, <code>'boolean'</code>,
  <code>'choice'</code>, <code>'source'</code>, <code>'color'</code>, <code>'text'</code>) cùng
  <code>min</code>, <code>max</code> và <code>step</code> quyết định ô nhập trong phần cài đặt: một
  <code>'int'</code> được làm tròn khi gõ, giống cách đọc một chu kỳ. Không khai báo kind thì kind được suy ra từ
  giá trị mặc định (số là <code>'number'</code>: chỉ <code>'int'</code> được khai báo mới làm tròn). <code>describeInputs(descriptor)</code> liệt kê
  các tham số theo đúng cách dialog cài đặt, tài liệu này và MCP server đọc chúng.
</p>
<pre><code>{`inputs: {
  period: { kind: 'int', min: 2, max: 500 },
  mult: { kind: 'number', min: 0.1, step: 0.1 },
  source: { source: true },
  type: { kind: 'choice', options: [{ value: 'ema', label: 'Exponential' }, { value: 'sma', label: 'Simple' }] },
}`}</code></pre>
<p>
  <code>options</code> của một choice là các giá trị, hoặc giá trị kèm nhãn hiển thị trong phần cài đặt
  (<code>{'{ value, label }'}</code>), theo ngôn ngữ của ứng dụng; chỉ báo nhận giá trị.
</p>
<p>
  Descriptor cũng khai báo cách các plot hiển thị, và biểu đồ vẽ đúng như vậy: <code>fills</code> tô màu giữa hai
  plot ở những chỗ cả hai có giá trị, nằm dưới các đường; <code>width</code> của một plot giữ nó ở độ dày đó bất kể độ dày
  của chỉ báo (một đường giữa mảnh); <code>lineStyle</code> vẽ nét đứt cho đến khi style của nó đặt khác, và
  phần cài đặt hiện và khôi phục được kiểu nét đứt đó; <code>opacity</code> làm mờ plot; <code>breakOn</code> chỉ định một trường
  đánh số các giai đoạn, và đường bị ngắt ở chỗ trường đó đổi giá trị. Các kênh, dải, Supertrend và
  Parabolic SAR có sẵn được vẽ theo cách này.
</p>
<pre><code>{`plots: [
  { key: 'upper', title: 'Upper', color: 0 },
  { key: 'middle', title: 'Basis', color: 1, width: 1, lineStyle: 'dashed' },
  { key: 'lower', title: 'Lower', color: 0 },
],
fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }],`}</code></pre>
<p>
  Plot có <code>kind: 'markers'</code> đánh dấu các nến mà trường của nó có giá trị (điểm đảo chiều, tín hiệu) bằng một
  <code>shape</code> (<code>'triangleUp'</code>, <code>'triangleDown'</code>, <code>'arrowUp'</code>, <code>'arrowDown'</code>,
  <code>'dot'</code>, <code>'square'</code> hoặc <code>'diamond'</code>), đặt tại giá trị đó hoặc, trên
  pane giá, phía trên giá cao hay phía dưới giá thấp của nến (<code>position: 'aboveBar'</code>, <code>'belowBar'</code>). Đây
  không phải giá trị để đọc: nó không có trong legend, không có nhãn trên trục, không có cột khi export, và không được đưa ra
  làm đường cho chỉ báo khác đọc. Trong pane riêng, các điểm đánh dấu nằm tại giá trị của chúng. Để trống trường đó ở các nến không đánh dấu.
</p>
<p>
  Các điểm đánh dấu rộng theo mức mà nến cho phép, từ 4 đến 8 px. Người xem chọn hình khác và kích thước trong tab
  Kiểu của chỉ báo, còn code đặt chúng trong style của plot: <code>shape</code>, và <code>size</code> tính bằng pixel theo chiều ngang (2 đến
  40) hoặc <code>'auto'</code>. Williams Fractals được vẽ theo cách này: một tam giác phía trên một đỉnh và một tam giác phía dưới một đáy.
</p>
<pre><code>{`chart.updateIndicatorStyle(fractals, { plots: { up: { shape: 'arrowUp', size: 14 }, down: { size: 'auto' } } });`}</code></pre>
<pre><code>{`plots: [
  { key: 'value', title: 'MACD', color: 0 },
  { key: 'turn', title: 'Turn', color: 1, kind: 'markers', shape: 'triangleUp', position: 'belowBar' },
],`}</code></pre>

<h2>Pane: đổi kích thước, thu gọn, phóng to, sắp xếp</h2>
<p>
  <strong>Kéo đường phân cách</strong> phía trên một pane để đổi kích thước. Trong ChartWidget, mỗi pane
  có các nút ở góc trên bên phải: chuyển lên hoặc xuống, thu gọn còn phần tiêu đề, phóng to
  (các pane khác thu gọn, pane giá còn lại một dải). Layout đã lưu giữ kích thước, thứ tự, trạng thái thu gọn và phóng to
  của từng pane. Làm tương tự từ code:
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  Trong ChartWidget, click chuột phải vào một pane để đặt thang log, thang đảo ngược hoặc thang phần trăm riêng cho pane đó.
</p>

<h2>Chuyển chỉ báo sang pane khác</h2>
<p>
  Một chỉ báo có thể vào pane của chỉ báo khác (khi đó dùng chung thang của pane đó),
  sang một pane riêng, hoặc quay về pane giá. Khi rời một pane nó sở hữu,
  các chỉ báo khác trong pane vẫn ở lại (chỉ báo pane tiếp theo nhận quyền sở hữu pane), và các chỉ báo đọc
  đường của nó đi theo nó. Trong ChartWidget, nút <strong>⋯</strong> trên dòng legend
  đưa ra các lựa chọn: pane phía trên, pane phía dưới, pane mới và pane giá.
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>Hoàn tác và template</h2>
<p>
  Thêm, xoá, chỉnh sửa và di chuyển chỉ báo là các bước hoàn tác trong cùng lịch sử
  với hình vẽ (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>); chỉ báo được hoàn tác
  quay lại với đúng id cũ, nên cảnh báo trên các đường của nó vẫn khớp. Một loạt chỉnh sửa liên tiếp trên
  một chỉ báo (kéo chọn màu, gõ chu kỳ) tính là một bước. Nạp một layout sẽ bắt đầu
  lịch sử mới.
</p>
<p>
  Toàn bộ chỉ báo có thể lấy ra và đặt lại cùng lúc, đó là cách template chỉ báo của ChartWidget
  hoạt động: <strong>Lưu chỉ báo thành mẫu…</strong> trong tab Mẫu
  của dialog Chỉ báo lưu chúng (tham số, style, mức, pane) dưới một tên, và chọn một template
  sẽ thay các chỉ báo hiện có trên biểu đồ bằng chúng, trong một bước hoàn tác.
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>Tính toán bên ngoài biểu đồ</h2>
<p>
  <code>IndicatorWorkerHost</code> tính một chỉ báo từ nến trong worker đi kèm package
  (<code>createIndicatorWorker()</code>), cũng là worker mà biểu đồ dùng khi đặt <code>indicatorWorker: 'auto'</code>.
  Truyền <code>null</code> thay vào đó và đăng ký các plugin để tính ngay tại chỗ (SSR, test, script):
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator, createIndicatorWorker } from '@tradecanvas/core'

const config = { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }

const inWorker = new IndicatorWorkerHost(await createIndicatorWorker())
const output = await inWorker.calculate('rsi', config, bars)

const inPlace = new IndicatorWorkerHost(null)
inPlace.registerFallbackPlugin(new RSIIndicator())
const same = await inPlace.calculate('rsi', config, bars)`}</code></pre>

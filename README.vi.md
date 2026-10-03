# @tradecanvas/chart

[English](README.md) · **Tiếng Việt** · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

Biểu đồ giao dịch canvas hiệu năng cao, có sẵn chỉ báo, công cụ vẽ và dữ liệu thời gian thực. Không phụ thuộc thư viện ngoài nào.

**[Demo trực tiếp](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## Vì sao chọn TradeCanvas?

Phần lớn thư viện biểu đồ bắt bạn phải chọn: biểu đồ đẹp nhưng không có tính năng giao dịch, hoặc có tính năng giao dịch nhưng API xấu xí. TradeCanvas cho bạn cả hai.

- **85 chỉ báo có sẵn** — SMA, EMA, TEMA, VWMA, Hull MA, RSI, MACD, Bollinger, Envelope, Ichimoku, Pivot Points, Anchored VWAP, ZigZag, Linear Regression Channel, Awesome / Chaikin Oscillator và nhiều nữa. Mọi chỉ báo đều đọc được đường của một chỉ báo khác (SMA của RSI). Không cần thêm thư viện tính toán riêng.
- **69 công cụ vẽ** — Đường xu hướng (đường thông tin, góc xu hướng, đường chữ thập), Fibonacci (thoái lui, mở rộng, kênh, vùng thời gian, quạt và cung tốc độ, vòng tròn, xoắn ốc, nêm), đường ngang/dọc, kênh, pitchfork và quạt pitchfork, quạt / hộp / hình vuông Gann, chu kỳ, mô hình harmonic (XABCD, cypher, ABCD, ba nhịp, vai đầu vai), sóng Elliott, ghi chú, chú thích và dấu đánh dấu, bút vẽ và đường nhiều điểm, dự báo và phóng chiếu, vị thế Long/Short có tính khối lượng, hồ sơ khối lượng theo khoảng. Mỗi công cụ có cài đặt riêng, cảnh báo theo đường xu hướng, nhóm và thứ tự lớp, hoàn tác/làm lại và tuần tự hoá đầy đủ.
- **18 loại biểu đồ** — Nến, đường, vùng, thanh, nến rỗng, đường cơ sở, Cao-Thấp, Heikin-Ashi, Renko, Kagi, Line Break, Point & Figure, Range Bars, nến khối lượng, **Equivolume**, vùng HLC, đường bậc thang, đường + điểm đánh dấu. Kích thước ô Renko, mức đảo chiều Kagi và các thông số tương tự đều chỉnh được.
- **Tương tác chuyên nghiệp** — kéo tự do qua nến cuối cùng vào vùng tương lai còn trống (hình vẽ cũng đặt được ở đó), kéo trục giá/thời gian để co giãn, bấm đúp để tự vừa khít, `Ctrl/⌘+drag` để chọn nhiều hình vẽ (rồi di chuyển, đổi kiểu hoặc xoá cùng lúc), `Shift+drag` để đo (số nến × Δ giá × %), `Alt+click` để ghim chú thích so sánh, con trỏ theo ngữ cảnh (chữ thập, bàn tay nắm, mũi tên đổi kích thước), nhãn giá/thời gian bám theo trục dưới con trỏ, làm nổi nến khi rê chuột.
- **Lớp phủ giao dịch** — Hiển thị vị thế đang mở với đường giá vào lệnh, vùng lãi/lỗ và điểm SL/TP. Lệnh hiện bằng đường nét đứt. Kéo SL/TP để sửa, huỷ / đóng / đảo chiều bằng các nút trên từng đường, và xem mỗi lần khớp lệnh được đánh dấu trên nến của nó. ChartWidget có thêm phiếu đặt lệnh kiểm tra lệnh ngay khi bạn điền, cùng bảng tài khoản với vị thế, lệnh chờ và lịch sử. Tắt gọn gàng bằng `features.trading: false` cho dự án không cần giao dịch.
- **Dữ liệu thời gian thực** — Có sẵn adapter Binance, Coinbase, Bybit và Kraken, cùng các lớp cơ sở chung `WebSocketAdapter` / `PollingAdapter` để cắm bất kỳ nguồn dữ liệu nào chỉ với khoảng 20 dòng code. Nến cũ hơn tải dần khi bạn cuộn về quá khứ, mọi khung thời gian (`7m`, `90m`, `2d`) đều dựng được từ các khung mà nguồn có sẵn, và tìm mã lấy trực tiếp từ nguồn.
- **Múi giờ** — mọi múi giờ IANA, kể cả giờ mùa hè (`'America/New_York'`), một độ lệch cố định, hoặc múi giờ riêng của sàn, áp dụng cho trục, con trỏ chữ thập, đường ngắt ngày và giờ phiên.
- **14 ngôn ngữ** — `ChartWidget` bằng tiếng Anh, tiếng Việt, tiếng Trung giản thể và phồn thể, tiếng Nhật, tiếng Hàn, tiếng Tây Ban Nha, tiếng Bồ Đào Nha, tiếng Pháp, tiếng Đức, tiếng Nga, tiếng Thổ Nhĩ Kỳ, tiếng Indonesia và tiếng Thái.
- **Khớp lệnh thực** — kết nối một `ExecutionAdapter` để biến lớp phủ giao dịch thành bề mặt giao dịch thật, kéo trên biểu đồ để tạo lệnh, và đối chiếu các lệnh đã khớp. Đi kèm sandbox `PaperExecutionAdapter`.
- **Plugin SDK** — đăng ký chỉ báo, công cụ vẽ, loại biểu đồ và lớp phủ tuỳ chỉnh — cho mọi biểu đồ hoặc cho từng biểu đồ.
- **Backtest chiến lược** — `@tradecanvas/analytics` có sẵn `Backtester` chạy theo từng nến với khớp lệnh ảo, mô hình phí giao dịch/trượt giá, theo dõi danh mục và các chỉ số rủi ro (Sharpe, Sortino, Calmar, sụt giảm tối đa). **Nay có thêm 4 chiến lược tham khảo dùng ngay + phân tích Monte Carlo về sự phụ thuộc đường đi (path-dependence).**
- **Chế độ phát lại** — phát lại chính các nến của biểu đồ từ bất kỳ điểm nào, theo bước nhỏ hơn nếu muốn (biểu đồ giờ hình thành từ nến 5 phút), có phát / tạm dừng / bước / tua / tốc độ, và giao dịch giấy trên giá phát lại. Widget có thanh phát lại cho việc này; `ReplayController` cũng chạy nến không cần giao diện.
- **Cảnh báo** — theo mức giá, theo đường chỉ báo, theo hình vẽ, hoặc khi một đường cắt đường khác; khi giá biến động một số phần trăm trong một số nến; chỉ khi nến đóng; có hạn dùng. Bảng cảnh báo của widget đặt được tất cả.
- **So sánh và chênh lệch** — mã khác theo phần trăm trên thang giá, trên thang hoặc pane riêng, hoặc thành chênh lệch hay tỷ lệ, khớp với biểu đồ theo thời gian.
- **Định dạng giá** — giá theo định dạng của bạn hoặc theo phân số (trái phiếu theo 1/32: 110'165) trên mọi nhãn; thời gian theo cách của bạn; bật/tắt giờ giao dịch mở rộng; xuất dữ liệu kèm các đường chỉ báo.
- **Hồ sơ khối lượng (Volume Profile)** — biểu đồ cột ngang tuỳ chọn, thể hiện khối lượng giao dịch gom theo mức giá trong khoảng đang hiện, có làm nổi điểm kiểm soát (point of control).
- **Danh mục theo dõi** — bảng dọc tuỳ chọn liệt kê các mã với giá gần nhất, % thay đổi và sparkline nhỏ. Bấm vào một dòng để chuyển biểu đồ.
- **Kéo-thả CSV / JSON** — thả một tệp vào biểu đồ, tệp được đọc và nạp ngay. Tự nhận dạng bố cục dòng tiêu đề, dấu thời gian ISO/unix-s/unix-ms, và JSON dạng mảng hay đối tượng.
- **Bố cục có tên** — lưu biểu đồ dưới một cái tên (mã, khung thời gian, thang giá, chỉ báo, hình vẽ, cảnh báo), mở, đổi tên, xoá, tự động lưu bố cục đang mở, `Ctrl/⌘+S`. Lưu trong trình duyệt, hoặc trên máy chủ của bạn qua một `LayoutStorage` chỉ gồm bốn hàm. Vẫn có tự động lưu theo từng mã (`persistLayouts`).
- **Nhiều biểu đồ** — `ChartWidgetGrid` đặt tối đa sáu widget đầy đủ cạnh nhau, liên kết theo mã, khung thời gian, con trỏ chữ thập, thời gian hoặc hình vẽ tuỳ bạn chọn, và lưu tất cả thành một bố cục. `ChartGrid` làm điều tương tự cho biểu đồ không có widget.
- **Điểm tín hiệu & vùng giao dịch** — hiển thị kết quả từ bot/thuật toán (mũi tên theo hướng, hình chữ nhật vào→ra lệnh) như một lớp chính thức của biểu đồ.
- **Bảng phím tắt** — nhấn `?` trong widget để mở bảng tra cứu phím tắt theo nhóm.
- **Widget mở rộng được** — thêm nút riêng vào thanh công cụ và mục riêng vào menu chuột phải (`addToolbarButton`, `chartMenuItems`).
- **Lưu/nạp trạng thái biểu đồ** — Lưu hình vẽ, chỉ báo, giao diện và loại biểu đồ ra JSON. Khôi phục bằng một lệnh gọi.
- **Không phụ thuộc** — Toàn bộ thư viện tự chứa. Không `d3`, không `chart.js`, không `fancy-canvas`.

## Cài đặt

```bash
npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart
```

## Bắt đầu nhanh

Cách nhanh nhất là `ChartWidget` — component gắn vào là chạy, với giao diện giao dịch đầy đủ (thanh công cụ, thanh công cụ vẽ bên trái, hộp thoại cài đặt, thanh trạng thái). Không phụ thuộc framework nào.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  trading: true,
})
```

Vậy là xong. Dữ liệu trực tiếp, đủ 85 chỉ báo, đủ 69 công cụ vẽ, bảng lệnh (`Ctrl+K`), tìm mã (`Ctrl+P`), bảng phím tắt (`?`), đo bằng Shift + kéo, ghim chú thích bằng Alt + bấm, và nạp CSV/JSON bằng kéo-thả.

## Chart headless

Với dự án muốn tự làm phần giao diện xung quanh (thanh công cụ riêng, điều khiển theo framework), hãy dùng trực tiếp lớp `Chart` ở tầng thấp hơn:

```typescript
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,           // set false to disable orders/positions entirely
    tradingContextMenu: true, // opt-in right-click order menu (off by default)
    volume: true,
  },
})

const adapter = new BinanceAdapter()
chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m', historyLimit: 300 })
```

### Tuỳ chọn của widget

| Tuỳ chọn | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `symbol` | `string` | `'BTCUSDT'` | Mã giao dịch ban đầu |
| `timeframe` | `TimeFrame` | `'5m'` | Khung thời gian ban đầu |
| `theme` | `'dark' \| 'light' \| Theme` | `'dark'` | Giao diện biểu đồ |
| `adapter` | `DataAdapter` | — | Adapter nguồn dữ liệu |
| `toolbar` | `boolean` | `true` | Hiện thanh công cụ phía trên |
| `drawingTools` | `boolean` | `true` | Hiện thanh công cụ vẽ bên trái |
| `settings` | `boolean` | `true` | Hiện nút cài đặt |
| `trading` | `boolean` | `true` | Bật lớp phủ giao dịch |
| `statusBar` | `boolean` | `true` | Hiện thanh trạng thái phía dưới |
| `rangeBar` | `boolean` | `true` | Các khoảng có sẵn (1D … All) và đi tới ngày (Alt+G) trên thanh trạng thái |
| `indicatorLegend` | `boolean` | `true` | Liệt kê chỉ báo trên biểu đồ (dưới chú thích OHLCV và ở đầu bảng của chúng) với các nút hiện / cài đặt / xoá |
| `fullscreen` | `boolean` | `true` | Nút toàn màn hình trên thanh công cụ |
| `symbols` | `string[]` | BTC/ETH/SOL/BNB | Danh mục mã có thể tìm kiếm |
| `timeframes` | `TimeFrame[]` | 1m đến 1M | Các khung thời gian có sẵn; ghim khung yêu thích từ menu ▾ |
| `chartTypes` | `ChartType[]` | 18 loại | Các loại biểu đồ có sẵn |
| `watchlist` | `boolean` | `false` | Thanh danh mục theo dõi bên phải |
| `dragDropImport` | `boolean` | `true` | Thả tệp CSV / JSON vào biểu đồ để nạp dữ liệu |
| `persistLayouts` | `boolean \| { keyPrefix, debounceMs }` | `false` | Lưu chỉ báo / hình vẽ / loại biểu đồ theo từng mã vào localStorage |
| `onSymbolChange` | `(symbol) => void` | — | Callback khi đổi mã |
| `onTimeframeChange` | `(tf) => void` | — | Callback khi đổi khung thời gian |
| `onReady` | `(chart) => void` | — | Gọi khi biểu đồ đã sẵn sàng |
| `locale` | `string` | `'en'` | Ngôn ngữ giao diện — có sẵn `'en'` và `'vi'`, thêm 12 ngôn ngữ từ entry locales, xem **i18n cho widget** bên dưới |
| `messages` | `Partial<Record<MessageKey, string>>` | — | Ghi đè hoặc thêm từng chuỗi giao diện trên nền `locale` |

### Biểu tượng

Bộ biểu tượng của widget được export để bạn dùng trong giao diện riêng:
`createIcon(name)`, `createToolIcon(drawingTool)`, `createChartTypeIcon(chartType)`
trả về chuỗi SVG inline vẽ bằng `currentColor` (lưới 24 px, nét 1.75 px).

```ts
import { createToolIcon } from '@tradecanvas/chart/widget'
button.innerHTML = createToolIcon('fibRetracement', 16)
```

### i18n cho widget

`ChartWidget` hỗ trợ 14 ngôn ngữ: tiếng Anh, tiếng Việt, tiếng Trung giản thể và phồn thể, tiếng Nhật, tiếng Hàn, tiếng Tây Ban Nha, tiếng Bồ Đào Nha, tiếng Pháp, tiếng Đức, tiếng Nga, tiếng Thổ Nhĩ Kỳ, tiếng Indonesia và tiếng Thái. Mọi chuỗi hiển thị đều được dịch: thanh công cụ, cài đặt, công cụ vẽ, cảnh báo, hộp thoại, bảng lệnh, bảng phím tắt và thông báo. Tên chỉ báo (SMA, RSI…) giữ nguyên. Đặt khi khởi tạo.

Tiếng Anh và tiếng Việt có sẵn. Các ngôn ngữ khác nạp từ `@tradecanvas/chart/widget/locales`, nên mỗi trang chỉ mang theo những ngôn ngữ mà nó import:

```ts
import { ja } from '@tradecanvas/chart/widget/locales'

new ChartWidget(el, {
  locale: 'ja',
  messages: ja,                               // or registerWidgetLocales() for all of them
  chartOptions: { numberLocale: 'ja-JP' },    // separate: number/date formatting (see below)
});
```

`messages` cũng ghi đè từng khoá riêng lẻ trên nền `locale` (`{ 'watchlist.title': 'Theo dõi' }`). Locale có vùng sẽ lùi về ngôn ngữ gốc (`ja-JP` → `ja`; `zh-TW` → tiếng Trung phồn thể).

`locale`/`messages` lo phần **chữ**; `chartOptions.numberLocale` điều khiển **định dạng** số và ngày (trục giá, chú thích, giá trong danh mục theo dõi, nhãn giá hiện tại, ngày ở đường ngắt phiên) qua `Intl`.

Xem `packages/library/src/widget/locales/en.ts` để có danh sách khoá đầy đủ (`MessageKey`).

### Widget hay headless

| | `Chart` (headless) | `ChartWidget` |
|---|---|---|
| Import | `@tradecanvas/chart` | `@tradecanvas/chart/widget` |
| Giao diện đi kèm | Không có — tự xây | Đủ thanh công cụ, thanh bên, cài đặt |
| Dung lượng bundle | ~50 KB gzip | ~65 KB gzip (gồm giao diện) |
| Framework | Bất kỳ (React, Vue, Svelte, vanilla) | DOM bằng JS thuần (chạy ở mọi nơi) |
| Tuỳ biến | Toàn quyền kiểm soát | Bật/tắt từng phần |
| Truy cập nâng cao | API trực tiếp | `widget.getChart()` để dùng API trực tiếp |

### Tuỳ biến giao diện widget

Phần khung giao diện của `ChartWidget` (thanh công cụ, thanh bên, bảng cài đặt, danh mục theo dõi — mọi thứ *bên ngoài* canvas) được tạo kiểu hoàn toàn qua CSS custom properties trên `.tcw-root`, phần tử gốc của widget. Đây là một **hợp đồng ổn định, có tài liệu**: qua các bản minor/patch chỉ thêm, không bớt — một thuộc tính không bao giờ bị đổi tên hay xoá nếu không tăng phiên bản major. Ghi đè chúng từ trang chứa widget; không cần bước build hay đối tượng theme.

```css
/* Dark is the default (no attribute needed); light sets data-tcw-theme="light" */
.my-app .tcw-root:not([data-tcw-theme="light"]) {
  --tcw-bg: #0a0a0f;
  --tcw-accent: #7c5cff;
  --tcw-radius: 0px;
  --tcw-radius-lg: 0px;
}
```

| Biến | Mặc định (tối) | Mục đích |
|---|---|---|
| `--tcw-bg` | `#080b10` | Nền gốc |
| `--tcw-bg-surface` | `#0c1016` | Bề mặt bảng / thanh công cụ |
| `--tcw-bg-elevated` | `#141922` | Popover, dropdown, hộp thoại modal |
| `--tcw-bg-overlay` | `rgba(20,25,34,.5)` | Nền mờ phía sau lớp phủ |
| `--tcw-border` | `#1f2630` | Viền mặc định |
| `--tcw-border-strong` | `#2a323e` | Viền nhấn mạnh (vòng focus, đường phân cách) |
| `--tcw-text` | `#e7e9ee` | Chữ chính |
| `--tcw-text-dim` | `#aab1bd` | Chữ phụ |
| `--tcw-text-muted` | `#758091` | Chữ cấp ba / placeholder |
| `--tcw-accent` | `#f2a93b` | Màu nhấn chính (tab đang chọn, focus, liên kết) |
| `--tcw-accent-ink` | `#1a1204` | Chữ và biểu tượng trên nền màu nhấn |
| `--tcw-accent-hover` | `#f5b95c` | Màu nhấn khi hover |
| `--tcw-accent-soft` | `rgba(242,169,59,.14)` | Sắc nhạt của màu nhấn (nền dòng đang chọn) |
| `--tcw-accent-glow` | `rgba(242,169,59,.22)` | Quầng sáng màu nhấn (quầng focus) |
| `--tcw-accent-line` | `rgba(242,169,59,.55)` | Viền/gạch chân màu nhấn |
| `--tcw-red` / `--tcw-red-soft` | `#e8505b` / sắc nhạt | Giảm/bán/âm |
| `--tcw-green` / `--tcw-green-soft` | `#1fa874` / sắc nhạt | Tăng/mua/dương |
| `--tcw-amber` | `#ff9f43` | Cảnh báo |
| `--tcw-hover-bg` | `rgba(255,255,255,.05)` | Nền dòng/nút khi hover |
| `--tcw-active-bg` | `rgba(255,255,255,.08)` | Nền dòng/nút khi nhấn |
| `--tcw-divider` | `rgba(255,255,255,.06)` | Đường phân cách mảnh |
| `--tcw-ease` / `--tcw-ease-out` | cubic-bezier | Đường cong chuyển động |
| `--tcw-dur-fast` / `-normal` / `-slow` | `120ms` / `180ms` / `260ms` | Thời lượng chuyển động |
| `--tcw-radius-sm` / `-base` / `-lg` / `-xl` | `4px` / `6px` / `10px` / `14px` | Bo góc — đặt `0` để có góc vuông |
| `--tcw-shadow-sm` / `-md` / `-lg` / `-xl` | giá trị box-shadow | Độ nổi |
| `--tcw-ring` | `0 0 0 2px rgba(242,169,59,.45)` | Vòng focus |
| `--tcw-font-mono` | `'JetBrains Mono', …` | Bộ font monospace (sổ lệnh, mã) |

Giao diện sáng (`[data-tcw-theme="light"]`) định nghĩa lại nhóm màu (`--tcw-bg*`, `--tcw-border*`, `--tcw-text*`, `--tcw-accent*`, `--tcw-hover-bg`, `--tcw-active-bg`, `--tcw-divider`, `--tcw-shadow*`) với giá trị mặc định riêng — hãy ghi đè cả hai selector nếu bạn hỗ trợ cả hai giao diện.

## Tính năng

### Loại biểu đồ

| Loại | Mô tả |
|---|---|
| Nến | Nến OHLC tiêu chuẩn |
| Nến rỗng | Giá mở/đóng cửa quyết định phần tô màu |
| Thanh (OHLC) | Thanh mở-cao-thấp-đóng cửa cổ điển |
| Đường | Đường giá đóng cửa |
| Vùng | Vùng tô bên dưới giá đóng cửa |
| Đường cơ sở | Vùng hai màu, chia tại một mức giá tham chiếu |
| Heikin-Ashi | Nến làm mượt để nhận diện xu hướng |
| Renko | Các viên gạch kích thước cố định, bỏ qua thời gian |
| Kagi | Biểu đồ đường dựa trên đảo chiều |
| Point & Figure | Các cột X/O để phân tích cung/cầu |
| Line Break | Biểu đồ phá vỡ ba đường (three-line break) |
| Range Bars | Thanh theo biên độ giá cố định — cao − thấp của mỗi thanh bằng một biên độ đã cấu hình |
| Nến khối lượng | Nến có độ rộng tỉ lệ với khối lượng |
| Equivolume | Hộp trọn biên độ, độ rộng tỉ lệ với tỉ trọng khối lượng (kiểu Richard Arms) |
| Vùng HLC | Dải vùng cao-thấp-đóng cửa kèm đường giá đóng cửa |
| Đường bậc thang | Dạng bậc thang từ giá đóng cửa |
| Đường + điểm đánh dấu | Đường giá đóng cửa với điểm tròn tại mỗi điểm dữ liệu |

### Lưới nhiều biểu đồ

Hiển thị nhiều biểu đồ đồng bộ cạnh nhau, với con trỏ chữ thập và trục thời gian liên kết:

```typescript
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart'

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
})

// An adapter keeps one stream: give each chart its own
grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m')
```

Với widget đầy đủ trên mỗi biểu đồ, một thanh để chọn cách sắp xếp và đồng bộ, và cả lưới được lưu thành một bố cục có tên:

```typescript
import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const workspace = new ChartWidgetGrid(document.getElementById('grid')!, {
  layout: '1x2',
  adapter: () => new BinanceAdapter(),
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT', timeframe: '1h' }],
  sync: { crosshair: true, interval: false, symbol: false, time: false, drawings: false },
})
workspace.setSync({ time: true })
```

Các bố cục được hỗ trợ: `'1x1'`, `'1x2'`, `'2x1'`, `'2x2'`, `'1x3'`, `'3x1'`, `'2x3'`, `'3x2'`.

### Bảng lệnh

Nhấn `Ctrl+K` (hoặc `Cmd+K`) trong ChartWidget để mở bảng lệnh có ô tìm kiếm. Nhanh chóng tìm và bật/tắt chỉ báo, đổi loại biểu đồ, chọn công cụ vẽ, chuyển khung thời gian hoặc chạy thao tác (chụp màn hình, đổi giao diện, cài đặt).

### Biểu đồ tài chính

| Biểu đồ | Mô tả |
|---|---|
| SparklineChart | Biểu đồ đường/vùng nhỏ gọn từ một mảng số — cho dashboard và thẻ KPI |
| DepthChart | Trực quan hoá sổ lệnh mua/bán với các vùng khối lượng cộng dồn |
| EquityCurveChart | Đường cong vốn của danh mục, tô vùng sụt giảm và so sánh với chuẩn (benchmark) |
| HeatmapChart | Lưới ô màu theo bố cục treemap — cho hiệu suất ngành/thị trường |
| WaterfallChart | Các thanh cộng dồn — phân bổ lãi/lỗ, cầu nối doanh thu, dòng tiền |
| GaugeChart | Đồng hồ đo kiểu đồng hồ tốc độ — KPI, điểm rủi ro, chỉ số Sợ hãi & Tham lam |

```typescript
import {
  SparklineChart, DepthChart, EquityCurveChart, HeatmapChart,
  WaterfallChart, GaugeChart,
} from '@tradecanvas/chart'

// Sparkline in a 120x48 container
new SparklineChart(el, { data: [100, 102, 98, 105, 103], mode: 'area', color: '#1fa874' })

// Equity curve with drawdown
new EquityCurveChart(el, { data: equityPoints, drawdown: true, benchmark: spyData })

// Order book depth
new DepthChart(el, { data: { bids, asks }, crosshair: true })

// Market heatmap (treemap weighted by market cap)
new HeatmapChart(el, { data: cells, weighted: true })

// P&L waterfall
new WaterfallChart(el, {
  data: [
    { label: 'Start', value: 10000, type: 'total' },
    { label: 'Gain', value: 1850 },
    { label: 'Loss', value: -620 },
    { label: 'End', value: 11230, type: 'total' },
  ],
})

// Fear & Greed gauge: zones light up to the value, the label shows the current zone
const gauge = new GaugeChart(el, {
  value: 72,
  label: 'Fear & Greed',
  zones: [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 25, to: 45, color: '#f2a93b', label: 'Fear' },
    { from: 45, to: 55, color: '#8a93a3', label: 'Neutral' },
    { from: 55, to: 75, color: '#62c895', label: 'Greed' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ],
  // pointer: 'needle',  // classic needle instead of the ring marker
})
gauge.setValue(85) // animates smoothly
```

### Chỉ báo (có sẵn)

85 chỉ báo — đường trung bình động (SMA, EMA, WMA, Hull, DEMA, TEMA, ALMA, KAMA,
LSMA, McGinley, SMMA, MA Cross, MTF MA), dải và kênh (Bollinger,
Keltner, Donchian, Envelope, Linear Regression), xu hướng và điểm dừng (Ichimoku,
Supertrend, Parabolic SAR, Chandelier, Chande Kroll Stop, Alligator, ZigZag,
Fractals, Pivot Points), các VWAP và Volume Profile trên bảng giá; RSI, MACD,
Stochastic, ATR, ADX, CCI, OBV, MFI, Bollinger %B và BandWidth, Historical
Volatility, Ulcer Index cùng 40 chỉ báo dao động, khối lượng và biến động
khác ở các bảng riêng. [Danh mục chỉ báo](https://bonguynvan.github.io/tradecanvas/docs/indicators)
liệt kê mọi id cùng thông số, đường và mức của chúng.

```typescript
import { indicatorSource } from '@tradecanvas/chart'

const rsi = chart.addIndicator('rsi', { period: 14 })!
chart.addIndicator('ema', { period: 21, source: 'hlc3' })                     // another price
chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') }) // RSI's own average, in RSI's pane
chart.setIndicatorLevels(rsi, [20, 50, 80])
```

- **Nguồn**: close, open, high, low, hl2, hlc3, ohlc4, hlcc4, hoặc đường của một chỉ báo khác.
- **Bảng**: mỗi bảng có một thang giá trị cho đường, mức, trục và con trỏ chữ thập; chuyển một chỉ báo sang bảng khác, sang bảng mới hoặc về lại bảng giá; thu gọn, phóng to và sắp xếp lại các bảng (`moveIndicatorToPane`, `setPaneCollapsed`, `setMaximizedPane`, `movePane`).
- **Hoàn tác và mẫu**: Ctrl/Cmd+Z hoàn tác thay đổi chỉ báo, trong cùng lịch sử với hình vẽ; ChartWidget lưu các chỉ báo thành mẫu có tên (`getIndicatorSetup` / `applyIndicatorSetup`).
- **Mức**: chỉnh được theo từng chỉ báo đã thêm (RSI 30/70, CCI ±100 …), được giữ trong bố cục đã lưu.
- **Nhãn giá trị**: giá trị mới nhất của mỗi đường trên trục của nó, theo màu của đường.
- **Chỉ báo tuỳ chỉnh** khai báo các đường (`plots`), thang, mức và thông số của chúng; biểu đồ tự vẽ và gắn nhãn.

Thông số không hợp lệ (NaN, Infinity, chuỗi không phải số, thiếu khoá) sẽ lùi
về giá trị mặc định thay vì đi vào phần tính toán.

### Công cụ vẽ

Đường xu hướng, Đường ngang, Đường dọc, Tia, Đường kéo dài, Kênh song song, Fibonacci thoái lui, Fibonacci mở rộng, **Vùng thời gian Fibonacci**, Hình chữ nhật, Hình elip, Tam giác, Mũi tên, Pitchfork, Quạt Gann, Hộp Gann, Sóng Elliott, Kênh hồi quy, Khoảng thời gian, Khoảng giá, Đo, VWAP neo, Hồ sơ khối lượng theo khoảng, Chú thích chữ

Mọi công cụ vẽ đều hỗ trợ:
- Bấm để đặt, có hút vào các giá OHLC
- Hoàn tác / làm lại (Ctrl+Z / Ctrl+Y)
- Tuần tự hoá để lưu/nạp
- Kiểu tuỳ chỉnh (màu, độ dày, kiểu nét đứt)

### Lớp phủ giao dịch

Hiển thị vị thế đang mở và lệnh chờ ngay trên biểu đồ, như MT4/MT5.

```typescript
import type { TradingPosition, TradingOrder } from '@tradecanvas/chart'

chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 3500,
  quantity: 1.5,
  closedQuantity: 0.5,   // partial close — visualized as a left-edge dim band
  stopLoss: 3400,
  takeProfit: 3700,
}])

chart.setOrders([{
  id: 'order-1',
  side: 'sell',
  type: 'limit',
  price: 3800,
  quantity: 0.5,
  label: 'TP',
  draggable: true,
}])

// Customize the position zone color via P&L thresholds
chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#b91c1c' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 50,        color: '#16a34a' },
    { pnl: 200,       color: '#15803d' },
  ],
  // Custom label template — tokens: {side} {qty} {openQty} {closedQty} {entry} {price} {pnl} {pnlPct} {pnlSign}
  positionLabel: '{side} {openQty}/{qty} @ {entry} | {pnlSign}{pnl} ({pnlPct})',
})

// Listen for user drag-to-modify
chart.on('positionModify', (e) => console.log('SL/TP moved:', e.payload))
chart.on('orderModify', (e) => console.log('Order moved:', e.payload))

// The × and ⇅ buttons on the lines raise these; so can your own UI
chart.cancelOrderIntent('order-1')
chart.reversePositionIntent('pos-1')
chart.on('executionFill', (e) => console.log(e.payload.reason, e.payload.pnl))
```

### Điểm tín hiệu

Trực quan hoá tín hiệu mua/bán từ bot, chỉ báo hoặc phân tích thủ công.

```typescript
chart.addSignalMarker({
  time: 1715692800000,
  price: 62500,
  direction: 'long',
  confidence: 0.85,
  source: 'ema-crossover',
  label: 'EMA Cross',
})

// Color-code by source
chart.setSignalMarkerStyle({
  sourceColors: {
    'ema-crossover': '#4c8dff',
    'rsi-divergence': '#f2a93b',
    'whale-flow': '#9C27B0',
  },
})
```

### Vùng giao dịch

Vẽ hình chữ nhật vào→ra lệnh, tô màu theo lãi/lỗ, cho các giao dịch đã thực hiện.

```typescript
const zoneId = chart.addTradeZone({
  entryTime: 1715692800000,
  entryPrice: 62500,
  exitTime: 1715700000000,
  exitPrice: 63200,
  direction: 'long',
  pnl: 140,
  pnlPercent: 1.12,
})

// Update a live trade when it closes
chart.updateTradeZone(zoneId, {
  exitTime: Date.now(),
  exitPrice: 63500,
  pnl: 200,
})
```

### Dữ liệu thời gian thực

```typescript
// Built-in Binance adapter (free, no API key)
chart.connect({
  adapter: new BinanceAdapter(),
  symbol: 'ETHUSDT',
  timeframe: '1m',
  historyLimit: 500,
})

// Or manual data feed
chart.setData(historicalBars)
chart.appendBar(newBar)
chart.updateLastBar(updatedBar)
chart.setCurrentPrice(3500.42)
```

**Adapter có sẵn** (đều miễn phí, không cần API key): `BinanceAdapter`, `CoinbaseAdapter`, `BybitAdapter`, `KrakenAdapter`, cùng `MockAdapter` để chạy offline/kiểm thử.

```typescript
import { BybitAdapter, KrakenAdapter, CoinbaseAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
```

**Mọi nguồn dữ liệu trong khoảng 20 dòng.** Kế thừa `WebSocketAdapter` (trực tiếp + lịch sử qua REST) hoặc `PollingAdapter` (nguồn chỉ có REST) — lớp cơ sở lo vòng đời kết nối, kết nối lại, giải mã và phát sự kiện. Bạn chỉ cần cung cấp một URL và một hàm phân tích dữ liệu:

```typescript
import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => `wss://api.myexchange.com/ws/${c.symbol}@kline_${c.timeframe}`,
  fetchHistory: (symbol, tf, limit) => fetch(`/candles?...`).then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})
```

### Khớp lệnh thực

Kết nối một `ExecutionAdapter` để biến lớp phủ giao dịch vốn chỉ để hiển thị thành bề mặt giao dịch thật. Biểu đồ chuyển các yêu cầu về lệnh/vị thế vào adapter, và vẽ các `orders` / `positions` chính thức mà adapter phát lại — **adapter là nguồn dữ liệu chuẩn duy nhất**. Khi không kết nối adapter, các yêu cầu đó vẫn chỉ là sự kiện thông thường (tương thích ngược).

```typescript
import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64000 }))

// Drag-to-create an order, then confirm:
chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace → adapter fills → chart renders the position
// chart.cancelOrderDraft()

// One channel for failures (adapter-reported or a failed command):
chart.on('executionError', (e) => toast(e.payload.message))
```

Hiện thực `ExecutionAdapter` (có cấu trúc tương tự `DataAdapter`) để nối với broker / OMS thật: `placeOrder`, `modifyOrder`, `cancelOrder`, `modifyPosition`, `closePosition`, cùng các sự kiện `orders` / `positions` / `fill` / `error`. `PaperExecutionAdapter` là sandbox khớp lệnh ảo cho demo và kiểm thử. Loại của lệnh tạo bằng cách kéo (limit hay stop) được suy ra từ vị trí bạn thả đường so với giá hiện tại.

### Plugin — mở rộng biểu đồ

Đăng ký **chỉ báo**, **công cụ vẽ**, **loại biểu đồ** và **lớp phủ** tuỳ chỉnh — toàn cục (mọi biểu đồ tạo sau đó đều kế thừa) hoặc cho từng biểu đồ.

```typescript
import { Chart, registerPlugin, IndicatorBase } from '@tradecanvas/chart'

class MyIndicator extends IndicatorBase { /* descriptor, calculate(), render() */ }

// 1) Global — available to every chart created afterward:
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction:
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance:
chart.plugins.register({ kind: 'chartType', plugin: myCustomCandles })
chart.setChartType('my-custom-candles')   // custom chart types render via the plugin
```

| Loại plugin | Hợp đồng |
|---|---|
| `indicator` | `IndicatorPlugin` — `calculate()` + `render()` |
| `drawing` | `DrawingPlugin` — `render()` + `hitTest()` |
| `chartType` | `ChartTypePlugin` — `createRenderer()` + `transform()` tuỳ chọn |
| `overlay` | `OverlayPlugin` — `render(ctx, { viewport, data, theme })` trên lớp `main` / `overlay` / `ui` |

### Chỉ báo bên ngoài biểu đồ

`IndicatorWorkerHost` tính một chỉ báo từ dữ liệu nến bằng chính các thông điệp
mà một Web Worker sẽ dùng. Script worker chưa nằm trong các gói đã phát hành;
hãy truyền `null` và đăng ký các plugin để tính ngay tại chỗ (SSR, kiểm thử,
script):

```typescript
import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)
```

### Lưu / Nạp

```typescript
const json = chart.saveState()
localStorage.setItem('my-chart', json!)

chart.loadState(localStorage.getItem('my-chart')!)

// Download / upload files
chart.downloadState('my-chart.json')
await chart.loadStateFromFile()

// Or keep a layout saved as it changes (debounced)
chart.setAutoSave('my-chart', 1500)
```

Một bố cục đã lưu chứa loại biểu đồ, giao diện, hình vẽ, chỉ báo (thông số, bảng,
màu sắc, trạng thái hiện/ẩn) và cảnh báo, kể cả cảnh báo trên đường chỉ báo.

### Giao diện

```typescript
import { DARK_THEME, LIGHT_THEME, DARK_TERMINAL } from '@tradecanvas/chart'

// Built-in presets: DARK_THEME, LIGHT_THEME, DARK_TERMINAL
chart.setTheme(DARK_TERMINAL)  // fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace

// Or customize any preset
chart.setTheme({
  ...DARK_THEME,
  candleUp: '#1fa874',
  candleDown: '#e8505b',
  background: '#0a0a0f',
})
```

### Sự kiện

```typescript
chart.on('crosshairMove', (e) => { /* { point, bar, barIndex, indicatorValues } — also over indicator panes */ })
chart.on('crosshairLeave', () => { /* the pointer left the plot */ })
chart.on('drawingToolChange', (e) => { /* { tool } — null once a drawing is finished or cancelled */ })
chart.on('indicatorUpdate', (e) => { /* { from } — indicator values recomputed from this bar on */ })
chart.on('paneResize', (e) => { /* { instanceId, size } — an indicator pane was resized */ })
chart.on('indicatorChange', (e) => { /* { instanceId, change } — shown/hidden, restyled, levels, inputs or pane changed */ })
chart.on('barClick', (e) => { /* { bar, barIndex, point } */ })
chart.on('visibleRangeChange', (e) => { /* { from, to } — bar indices, not timestamps */ })
chart.on('priceRangeChange', (e) => { /* { min, max } — visible price bounds */ })
chart.on('zoomChange', (e) => { /* { barWidth } — pixels per bar */ })
chart.on('drawingCreate', (e) => { /* ... */ })
chart.on('orderModify', (e) => { /* ... */ })
chart.on('positionModify', (e) => { /* ... */ })
```

`visibleRangeChange`, `priceRangeChange` và `zoomChange` được phát mỗi lần kéo,
phóng to, đổi kích thước và cập nhật dữ liệu — nhưng chỉ khi phần trạng thái
khung nhìn tương ứng thực sự thay đổi. Đổi chỉ số của `visibleRangeChange` sang
thời gian bằng `chart.getData()[e.payload.from].time`.

### Chế độ phát lại

`ReplayController` phát một `DataSeries` lịch sử tiến lên với tốc độ kiểm soát được. Tách biệt khỏi `Chart` — nối nó vào bất kỳ nơi nhận dữ liệu nào (biểu đồ để phát lại trên giao diện, hoặc một hàm chiến lược cho backtest headless).

```typescript
import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,        // bars per second
  startIndex: 0,
})

// Seed the chart with the prefix before replay starts
chart.setData(replay.getPrefix())

// Each emitted bar drives the chart forward
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
```

### Tương tác với biểu đồ

Mọi thao tác bạn mong đợi ở một biểu đồ giao dịch trên máy tính đều có sẵn:

| Thao tác | Kết quả |
|---|---|
| Kéo thân biểu đồ sang trái/phải | Di chuyển theo thời gian |
| Kéo thân biểu đồ lên/xuống | Di chuyển thang giá (tạm khoá tự co giãn; bấm đúp trục giá để khôi phục) |
| Kéo trục giá lên/xuống | Nén / giãn thang dọc (tạm khoá tự co giãn) |
| Kéo trục thời gian sang trái/phải | Phóng to trục thời gian |
| Bấm đúp trục giá | Bật lại tự co giãn |
| Bấm đúp trục thời gian | Vừa khít toàn bộ dữ liệu vào khung nhìn |
| Con lăn chuột | Phóng to quanh con trỏ |
| Kéo đường phân cách bảng | Đổi kích thước bảng chỉ báo (con trỏ `ns-resize` khi rê chuột) |
| `Shift` + kéo | Thước đo (số nến × thời gian × Δ giá × %) |
| `Alt` + bấm | Ghim chú thích OHLC; con trỏ chữ thập hiện Δ so với nến đã ghim |
| Rê chuột | Nhãn giá + thời gian chạy theo trên cả hai trục |
| `Esc` | Bỏ ghim chú thích / huỷ hình đang vẽ |
| `?` | Hiện bảng phím tắt *(widget)* |
| `Ctrl/⌘ + K` | Bảng lệnh *(widget)* |
| `Ctrl/⌘ + P` | Tìm mã *(widget)* |
| `Ctrl/⌘ + Z` / `Shift + Z` | Hoàn tác / làm lại hình vẽ |

### Nhập dữ liệu — kéo-thả hoặc bằng code

```typescript
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)
```

Thả một tệp CSV hoặc JSON vào widget, dữ liệu được nạp ngay. Tự nhận dạng
dấu phân cách (`,` / `;` / tab / `|`), có hay không có dòng tiêu đề, dấu thời gian ISO 8601,
và JSON dạng mảng các mảng hay mảng các đối tượng.

### Backtest (`@tradecanvas/analytics`)

Công cụ backtest chiến lược theo từng nến, với khớp lệnh ảo, mô hình phí giao dịch/trượt giá và báo cáo đầy đủ các chỉ số rủi ro.

```typescript
import { Backtester, PercentCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new PercentCommission(0.0005),
  slippage: new PercentSlippage(0.0003),
})

const result = bt.run(historicalBars, (ctx) => {
  // Strategy fn runs at close of each bar; orders fill on the NEXT bar.
  if (!ctx.position && smaFast > smaSlow) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.position && smaFast < smaSlow) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe)         // 1.42
console.log(result.metrics.maxDrawdownPct) // 0.087
console.log(result.equityCurve)            // → feed into the chart via EquityCurveRenderer
```

Kết quả trả về: `fills`, các `trades` đã đóng, `equityCurve`, `metrics` (Sharpe, Sortino, Calmar, CAGR, sụt giảm tối đa, tỉ lệ thắng, hệ số lợi nhuận, kỳ vọng). Xem [demo backtest trực tiếp](https://bonguynvan.github.io/tradecanvas/docs/analytics/).

#### Thư viện chiến lược
Bốn chiến lược tham khảo dùng ngay — mỗi chiến lược trả về một `StrategyFn` sẵn sàng
đưa vào `Backtester.run()`:

```typescript
import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))
bt.run(bars, donchianBreakoutStrategy({ entryPeriod: 20, exitPeriod: 10 }))
```

#### Monte Carlo: phụ thuộc đường đi
Xáo trộn thứ tự các giao dịch đã thực hiện N lần để thấy chiến lược có phụ thuộc vào
một chuỗi thứ tự may mắn hay không. Dải P5/P95 hẹp = lợi thế bền vững; dải rộng = phụ thuộc đường đi.

```typescript
import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, { simulations: 1000, seed: 42 })

mc.equityBands              // [{ step, p5, p25, p50, p75, p95 }, …]
mc.finalEquityPercentiles   // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable    // 0..1
mc.worstMaxDrawdownPct
```

## So sánh

| Tính năng | @tradecanvas/chart | lightweight-charts | chart.js | Highcharts Stock |
|---|---|---|---|---|
| Loại biểu đồ | 18 + 6 tài chính | 4 | 8 (phi tài chính) | 10+ |
| Biểu đồ tài chính | Sparkline, Depth, Equity, Heatmap, Waterfall, Gauge | Không có | Không có | Một số |
| Chỉ báo có sẵn | 85 | 0 | 0 | ~30 |
| Công cụ vẽ | 69 | 0 | 0 | Một số |
| Lớp phủ giao dịch | Đầy đủ (vị thế + lệnh + kéo) | Không có | Không có | Không có |
| Dữ liệu thời gian thực | Có sẵn (Binance) | Thủ công | Thủ công | Có sẵn |
| Lưu/nạp trạng thái | Có | Không | Không | Có |
| Chế độ phát lại | Có (`ReplayController`) | Không | Không | Không |
| Backtester | Có (`@tradecanvas/analytics`) | Không | Không | Không |
| Lưới nhiều biểu đồ | Có (`ChartGrid`) | Không | Không | Có |
| Bundle (gzip) | ~100 KB lõi | ~45 KB | ~70 KB | ~200 KB |
| Phụ thuộc | 0 | 1 | 0 | 0 |
| Widget (giao diện đầy đủ) | Có (`ChartWidget`) | Không | Không | Không |
| Giấy phép | MIT | Apache 2.0 | MIT | Thương mại |

## Tổng quan API

### `new Chart(container, options)`

```typescript
const chart = new Chart(element, {
  chartType: 'candlestick',
  theme: DARK_THEME,
  autoScale: true,
  rightMargin: 5,
  numberLocale: 'en-US',  // or 'de-DE', 'vi-VN', etc. — BCP 47 locale
  crosshair: { mode: 'magnet' },
  features: { drawings: true, indicators: true, trading: true, volume: true },
})

// Change locale at runtime
chart.setNumberLocale('de-DE')  // 65.234,00
```

### Các phương thức chính

| Phương thức | Mô tả |
|---|---|
| `setData(bars)` | Nạp dữ liệu OHLCV lịch sử |
| `appendBar(bar)` | Thêm một nến mới |
| `appendBars(bars)` | Thêm hàng loạt (bù dữ liệu khi kết nối lại) |
| `updateLastBar(bar)` | Cập nhật nến đang hình thành |
| `setCurrentPrice(price, pulseColor?)` | Hiện đường giá trực tiếp |
| `connect(config)` | Kết nối tới nguồn dữ liệu thời gian thực |
| `setTimeframe(tf)` | Đổi khung thời gian trên luồng dữ liệu đang chạy |
| `setChartType(type)` | Đổi loại biểu đồ |
| `setTheme(theme)` | Áp dụng giao diện (DARK_THEME, LIGHT_THEME, DARK_TERMINAL) |
| `setNumberLocale(locale)` | Đặt locale định dạng số (en-US, de-DE, vi-VN) |
| `setStatusText(text)` | Hiện trạng thái ở vùng chú thích ("LIVE · 8ms") |
| `addIndicator(id, params?)` | Thêm một chỉ báo kỹ thuật |
| `removeIndicator(instanceId)` | Xoá một chỉ báo |
| `setDrawingTool(tool)` | Chọn một công cụ vẽ |
| `setPositions(positions)` | Hiển thị các vị thế giao dịch |
| `setOrders(orders)` | Hiển thị các lệnh chờ |
| `setVolumeProfileVisible(v)` | Bật/tắt lớp phủ hồ sơ khối lượng nằm ngang |
| `setVolumeProfileConfig({ buckets, widthRatio, opacity, highlightPoC })` | Tinh chỉnh hồ sơ khối lượng |
| `setAutoScale(v)` / `setLogScale(v)` | Khoá hoặc đổi chế độ thang giá |
| `setInvertScale(v)` | Lật ngược thang giá |
| `fitContent()` / `scrollToEnd()` | Vừa khít toàn bộ dữ liệu / nhảy tới mép dữ liệu trực tiếp |
| `setVisibleRangePreset(p)` | Hiện `1D`, `5D`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `5Y` hoặc `All` |
| `goToTime(time)` | Đưa nến tại một thời điểm vào giữa màn hình |
| `setCrosshairTime(time)` | Phản chiếu con trỏ chữ thập của biểu đồ khác (chỉ đường dọc) |
| `copyDrawings()` / `pasteDrawings()` | Sao chép vùng chọn, dán vào biểu đồ này hoặc biểu đồ khác |
| `setStayInDrawingMode(v)` | Giữ công cụ vẽ sau mỗi hình vẽ |
| `saveState(key?)` | Tuần tự hoá trạng thái biểu đồ |
| `loadState(json)` | Khôi phục trạng thái biểu đồ |
| `screenshot()` | Tải biểu đồ về dưới dạng ảnh |
| `on(event, handler)` | Đăng ký nhận sự kiện |
| `destroy()` | Giải phóng mọi tài nguyên |

### Định dạng dữ liệu

```typescript
interface OHLCBar {
  time: number    // Unix time in ms or seconds (up to 1e12 is read as seconds); ascending
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

## Ví dụ

| Ví dụ | Mô tả |
|---|---|
| [Demo trực tiếp](https://bonguynvan.github.io/tradecanvas/) | Feature Lab: công cụ vẽ, chỉ báo, giao dịch, khoảng hiển thị, lịch sử theo trang, phát lại, 14 ngôn ngữ với giá dưới một xu, 200k nến, chuyển đổi khi mạng chậm — mỗi thứ trên một biểu đồ trực tiếp. Trang web và tài liệu cũng có bằng tiếng Việt, tiếng Trung, tiếng Nhật, tiếng Hàn và tiếng Tây Ban Nha |
| [Sandbox StackBlitz](https://bonguynvan.github.io/tradecanvas/examples/) | Một cú bấm, fork được: `Chart` thuần (vanilla), `ChartWidget`, wrapper React / Vue / Svelte, biểu đồ tài chính |
| [`@tradecanvas/react`](./packages/react/) · [`/vue`](./packages/vue/) · [`/svelte`](./packages/svelte/) | Component cho framework — props reactive, có kiểu, không cần code khởi tạo rườm rà |

## Công cụ lập trình AI

- [`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) và
  [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) đưa
  toàn bộ tài liệu cho các trợ lý AI ở cùng một chỗ.
- Một agent skill, [`skills/tradecanvas`](skills/tradecanvas/SKILL.md), dạy
  các coding agent cách xây dựng với TradeCanvas: các điểm vào, những quy tắc giúp
  tránh phần lớn lỗi, và các ví dụ hoàn chỉnh được CI kiểm tra kiểu với thư viện.
  Sao chép thư mục này vào `.claude/skills/` của dự án (hoặc thư mục skills của
  agent bạn dùng) để sử dụng.

## Trình duyệt hỗ trợ

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+

## Tích hợp framework

Component wrapper chính thức — props reactive, ref, không cần code rườm rà. Phát hành ở `1.x` cùng với lõi:

```bash
npm install @tradecanvas/react    # or @tradecanvas/vue · @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" theme="dark" indicators={['rsi', 'macd']} />
```

Cả ba dùng chung một bộ props và trao cho bạn `Chart` bên dưới (cho hình vẽ, giao dịch, khớp lệnh, plugin) qua `onReady` / ref / `bind:chart`. Xem [tài liệu về framework](https://bonguynvan.github.io/tradecanvas/docs/frameworks).

### Headless (tự quản lý vòng đời)

Lớp `Chart` cũng nhận trực tiếp một phần tử DOM — không phụ thuộc framework:

**React:**

```tsx
import { useEffect, useRef } from 'react'
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

function TradingChart() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = new Chart(ref.current!, {
      theme: 'dark',
      features: { indicators: true, drawings: true },
    })
    chart.connect({
      adapter: new BinanceAdapter(),
      symbol: 'BTCUSDT',
      timeframe: '5m',
    })
    return () => chart.destroy()
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 500 }} />
}
```

**Svelte:**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'
  import type { TimeFrame } from '@tradecanvas/chart'

  interface Props { symbol?: string; timeframe?: TimeFrame }
  let { symbol = 'BTCUSDT', timeframe = '5m' }: Props = $props()

  let container: HTMLDivElement
  let chart: Chart | null = null

  onMount(() => {
    chart = new Chart(container, {
      chartType: 'candlestick',
      theme: DARK_THEME,
      autoScale: true,
      features: { indicators: true, drawings: true, volume: true },
    })
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })

  onDestroy(() => chart?.destroy())

  $effect(() => {
    if (!chart) return
    chart.disconnectStream()
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })
</script>

<div bind:this={container} style="width: 100%; height: 600px" />
```

**Vue:**

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 600px" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'

const chartContainer = ref<HTMLDivElement>()
let chart: Chart | null = null

onMounted(() => {
  if (!chartContainer.value) return
  chart = new Chart(chartContainer.value, {
    chartType: 'candlestick',
    theme: DARK_THEME,
    autoScale: true,
    features: { indicators: true, drawings: true, volume: true },
  })
  chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
})

onUnmounted(() => chart?.destroy())
</script>
```

## Hiệu năng

Quy trình Canvas2D hai lớp canvas: rê chuột chỉ vẽ lại lớp canvas mỏng phía trên, không bao giờ vẽ lại cả cảnh. Bốn điều giữ cho dữ liệu lớn vẫn nhanh:

- **Giảm mẫu LTTB** — biểu đồ đường / vùng tự động giảm mẫu khoảng đang hiện xuống khoảng 2 điểm mỗi pixel bằng thuật toán Largest-Triangle-Three-Buckets khi số nến nhiều hơn hẳn số pixel. Đường vẫn trông y hệt trong khi số điểm cần vẽ ít hơn hàng chục lần; ở mức phóng bình thường thì không làm gì cả. Tiện ích `lttbDownsample` được export để bạn tự dùng.
- **Chỉ vẽ khoảng đang hiện** — mọi bộ vẽ chỉ duyệt các nến trong khung nhìn, không bao giờ duyệt cả chuỗi. Chi phí mỗi khung hình khi rê chuột và kéo giữ nguyên từ 500 đến 100,000 nến đã tải.
- **Chỉ báo tính tăng dần trên tick trực tiếp** — một tick chỉ thay đổi nến đang hình thành, nên các chỉ báo có sẵn hiện thực `update()` (SMA, EMA, WMA, VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic) chỉ tính lại nến đó thay vì toàn bộ lịch sử. Các chỉ báo khác quay về tính lại toàn bộ. Plugin tuỳ chỉnh có thể tham gia qua `IndicatorPlugin.update`.
- **Nạp toàn bộ nhẹ nhàng** — một lần đổi mã/khung thời gian chỉ tính lại mỗi chỉ báo một lần. Bảng tra `values` theo từng nến của chúng là một `IndicatorValueMap` (dùng mảng khi nến đến theo thứ tự thời gian, dựng rẻ hơn khoảng 3 lần so với một `Map` có khoá là dấu thời gian), và `setData` dùng lại các nến đã đúng định dạng thay vì sao chép từng nến.

BB + EMA + RSI + MACD (`pnpm bench`, một nhân):

| Lịch sử | Tính lại toàn bộ (đổi mã / `setData`) | `update()` tăng dần (tick trực tiếp) |
|---|---|---|
| 20,000 nến | ~5 ms | ~0.0005 ms |
| 100,000 nến | ~27 ms | ~0.001 ms |

Thông lượng giảm mẫu (`pnpm bench`, một nhân):

| Điểm đang hiện → 1600 | Thời gian / khung hình | Thông lượng |
|---|---|---|
| 10,000 | ~0.025 ms | 39,600 / s |
| 100,000 | ~0.32 ms | 3,100 / s |
| 1,000,000 | ~2.6 ms | 380 / s |

Một biểu đồ đường 100k nến giảm mẫu trong ~0.3 ms — nằm gọn trong ngân sách 16.6 ms của một khung hình — rồi vẽ ít hơn ~62× số điểm (100k → 1600).

## Kiến trúc

Hai lớp canvas chồng lên nhau — rê chuột chỉ vẽ lại lớp mỏng phía trên:

```
  Top canvas    (crosshair + axis pills, legend, countdown, measure)   z=1
  Scene canvas  (grid, candles, indicators, drawings, orders, axes)    z=0
```

## Dự án liên quan

- **[bo-grid](https://github.com/bonguynvan/bo-grid)** — bảng dữ liệu **Svelte 5** nhỏ gọn, nhanh cho giao diện fintech: sparkline trên canvas, cập nhật ô thời gian thực theo lô, cuộn ảo, nhóm / pivot / dữ liệu dạng cây, và xuất Excel, với phần lõi gzip còn ~32 KB. Nửa bảng biểu của cùng bộ công cụ — kết hợp với TradeCanvas để có một bàn giao dịch hoàn chỉnh. **[Demo trực tiếp](https://bonguynvan.github.io/bo-grid/)**

## Giấy phép

[MIT](./LICENSE)

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/vi/"><img src=".github/assets/banner.png" alt="TradeCanvas, bộ máy biểu đồ cho ứng dụng giao dịch" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/v/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=f2a93b&label=npm" alt="Phiên bản npm"></a>
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/dm/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=3ccf91" alt="Lượt tải npm"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/bonguynvan/tradecanvas/ci.yml?branch=main&style=flat-square&labelColor=0b0e13&label=CI" alt="Trạng thái CI"></a>
  <a href="https://pkg.pr.new/~/bonguynvan/tradecanvas"><img src="https://pkg.pr.new/badge/bonguynvan/tradecanvas" alt="Bản xem trước pkg.pr.new"></a>
  <img src="https://img.shields.io/badge/third--party%20deps-0-3ccf91?style=flat-square&labelColor=0b0e13" alt="Không phụ thuộc thư viện bên thứ ba">
  <img src="https://img.shields.io/badge/TypeScript-strict-4c8dff?style=flat-square&labelColor=0b0e13" alt="TypeScript">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=a9b0bd" alt="Giấy phép MIT"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/stargazers"><img src="https://img.shields.io/github/stars/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=f2a93b" alt="Sao GitHub"></a>
  <a href="https://github.com/sponsors/bonguynvan"><img src="https://img.shields.io/github/sponsors/bonguynvan?style=flat-square&labelColor=0b0e13&color=db61a2&label=sponsors&logo=githubsponsors&logoColor=db61a2" alt="GitHub Sponsors"></a>
</p>

<p align="center">
  <b><a href="https://bonguynvan.github.io/tradecanvas/vi/">Demo trực tiếp</a></b> ·
  <a href="https://bonguynvan.github.io/tradecanvas/vi/docs/getting-started/">Tài liệu</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/vi/examples/">Ví dụ</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/vi/playground/">Playground</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/vi/audit/">Audit hệ thống</a> ·
  <a href="./CHANGELOG.md">Nhật ký thay đổi</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Tiếng Việt</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**Một biểu đồ giao dịch hoàn chỉnh cho web.** Từ nến Nhật đến Renko, 111 chỉ báo, 69 công cụ vẽ, dữ liệu sàn trực tiếp và lệnh ngay trên biểu đồ, vẽ bằng Canvas 2D hoặc WebGL, không phụ thuộc thư viện bên thứ ba nào. Dùng ngay `ChartWidget` đầy đủ, hoặc tự dựng giao diện trên `Chart` headless, bằng TypeScript, React, Vue hay Svelte.

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/vi/"><img src=".github/assets/hero.png" alt="ChartWidget với giá BTCUSDT trực tiếp từ Binance: EMA 21 và 55, RSI, một đường xu hướng, một vị thế mua và watchlist có giá trực tiếp" width="100%"></a>
</p>

## Điểm nổi bật

- **18 loại biểu đồ**, từ nến và Heikin-Ashi tới Renko, Kagi, point & figure và Equivolume, cùng sáu biểu đồ tài chính (sparkline, độ sâu, equity, heatmap, waterfall, gauge).
- **111 chỉ báo và 69 công cụ vẽ**: chỉ báo chồng chỉ báo, cảnh báo theo đường xu hướng, template, nhóm, hoàn tác và làm lại.
- **Giao dịch ngay trên biểu đồ**: vị thế có lãi/lỗ trực tiếp, kéo để sửa lệnh, cắt lỗ và chốt lời, phiếu đặt lệnh, bảng tài khoản, sàn giấy có sẵn hoặc adapter khớp lệnh của riêng bạn.
- **Dữ liệu trực tiếp**: có sẵn Binance, Bybit, Coinbase và Kraken, nguồn khác chỉ cần khoảng hai mươi dòng; tải lịch sử cũ khi kéo về trái, khung thời gian bất kỳ, biểu đồ tick.
- **Canvas 2D hoặc WebGL**: một triệu nến kéo ở 60 khung hình/giây, sắc nét ở mọi tỉ lệ màn hình.
- **Không gian làm việc đầy đủ**: lưới nhiều biểu đồ, layout có tên, replay kèm giao dịch giấy, và bộ backtest trong `@tradecanvas/analytics`.
- **Tuỳ biến theo ý bạn**: 101 khoá style, 112 công tắc tính năng, ba kiểu giao diện, và plugin cho chỉ báo, công cụ vẽ, loại biểu đồ và overlay.
- **Cho mọi người**: widget bằng 30 ngôn ngữ, có cả viết phải sang trái, hỗ trợ trình đọc màn hình và bàn phím.

## Cài đặt

```bash
npm install @tradecanvas/chart
```

## Bắt đầu nhanh

`ChartWidget` là cả giao diện giao dịch chỉ trong một lệnh gọi: thanh công cụ, thanh công cụ vẽ, cài đặt, thanh trạng thái.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(), // dữ liệu trực tiếp, không cần API key
  trading: true,
})
```

Muốn tự làm giao diện, dùng `Chart` headless và API của nó:

```typescript
import { Chart } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
chart.setData(bars) // [{ time, open, high, low, close, volume }, …]
chart.addIndicator('ema', { period: 50 })
chart.addIndicator('rsi')
```

Nguồn dữ liệu của bạn nối vào qua `WebSocketAdapter` hoặc `PollingAdapter`; xem [Dữ liệu trực tiếp](https://bonguynvan.github.io/tradecanvas/vi/docs/realtime/).

## Framework

```bash
npm install @tradecanvas/react    # hoặc @tradecanvas/vue, @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['rsi', { id: 'ema', params: { period: 50 } }]} />
```

Ba component dùng chung một bộ prop và trao cho bạn `Chart` bên dưới. Xem [Framework](https://bonguynvan.github.io/tradecanvas/vi/docs/frameworks/).

## Một vòng xem thử

<table>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/drawings.png"><img src=".github/assets/drawings.png" alt="Công cụ vẽ: Fibonacci thoái lui kèm ghi chú, đường xu hướng, sóng đẩy Elliott và một vị thế mua"></a>
      <br><b>69 công cụ vẽ</b><br>
      Fibonacci, Gann, pitchfork, sóng Elliott, mô hình harmonic, ghi chú, và vị thế mua/bán tự tính khối lượng.
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/trading.png"><img src=".github/assets/trading.png" alt="Giao dịch trên biểu đồ: vị thế mua có cắt lỗ và chốt lời, lệnh buy stop và sell limit, và bảng tài khoản"></a>
      <br><b>Giao dịch trên biểu đồ</b><br>
      Vị thế có lãi/lỗ trực tiếp, kéo lệnh tới giá mới, phiếu đặt lệnh và bảng tài khoản.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/grid.png"><img src=".github/assets/grid.png" alt="Không gian 2×2 gồm biểu đồ BTC, ETH, SOL và BNB với các khung thời gian khác nhau"></a>
      <br><b>Nhiều biểu đồ cùng lúc</b><br>
      Tối đa sáu biểu đồ cạnh nhau, liên kết theo mã, khung thời gian, crosshair, thời gian hay hình vẽ.
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/looks.png"><img src=".github/assets/looks.png" alt="Một biểu đồ ở ba kiểu giao diện: studio, terminal và capsule trên theme sáng"></a>
      <br><b>Giao diện của riêng bạn</b><br>
      Ba kiểu có sẵn hoặc tự chỉnh góc bo, mật độ, font và nhãn giá, trên cả theme sáng lẫn tối.
    </td>
  </tr>
</table>

## Tài liệu

| Chủ đề | |
|---|---|
| [Bắt đầu](https://bonguynvan.github.io/tradecanvas/vi/docs/getting-started/) | Cài đặt, widget, biểu đồ headless |
| [Loại biểu đồ](https://bonguynvan.github.io/tradecanvas/vi/docs/chart-types/) · [Chỉ báo](https://bonguynvan.github.io/tradecanvas/vi/docs/indicators/) · [Công cụ vẽ](https://bonguynvan.github.io/tradecanvas/vi/docs/drawing-tools/) | Biểu đồ vẽ được gì, và cài đặt của từng thứ |
| [Dữ liệu trực tiếp](https://bonguynvan.github.io/tradecanvas/vi/docs/realtime/) | Nguồn có sẵn, adapter của bạn, lịch sử, biểu đồ tick |
| [Giao dịch](https://bonguynvan.github.io/tradecanvas/vi/docs/trading/) | Lệnh, vị thế, adapter khớp lệnh, replay |
| [Giao diện](https://bonguynvan.github.io/tradecanvas/vi/docs/styling/) · [Tuỳ biến](https://bonguynvan.github.io/tradecanvas/vi/docs/customization/) | Theme, khoá style, kiểu giao diện, công tắc tính năng, thành phần của riêng bạn |
| [Plugin](https://bonguynvan.github.io/tradecanvas/vi/docs/plugins/) | Chỉ báo, công cụ vẽ, loại biểu đồ và overlay của riêng bạn |
| [Phân tích](https://bonguynvan.github.io/tradecanvas/vi/docs/analytics/) · [Biểu đồ tài chính](https://bonguynvan.github.io/tradecanvas/vi/docs/finance/) | Backtest và chỉ số rủi ro; biểu đồ độ sâu, equity và các loại khác |
| [Hiệu năng](https://bonguynvan.github.io/tradecanvas/vi/docs/performance/) · [Tham chiếu API](https://bonguynvan.github.io/tradecanvas/vi/docs/api/) | Số đo và toàn bộ API |

Tài liệu còn có bằng English, 简体中文, 日本語, 한국어 và Español.

## Hiệu năng

Đo trên Chrome với GPU tích hợp (Intel UHD); [audit hệ thống](https://bonguynvan.github.io/tradecanvas/vi/audit/) có bảng đầy đủ.

| | |
|---|---|
| 1.000.000 nến + 4 chỉ báo, thu nhỏ hết cỡ, WebGL | 16,7 ms mỗi khung hình (60 fps) |
| Một tick trực tiếp trên 100.000 nến với bốn chỉ báo | ~0,001 ms |
| `Chart` / `ChartWidget`, đã minify và gzip | 176 KB / 315 KB |

## Các gói

| Gói | |
|---|---|
| [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) | Biểu đồ và `ChartWidget` (`/widget`) |
| [`@tradecanvas/react`](https://www.npmjs.com/package/@tradecanvas/react) · [`/vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`/svelte`](https://www.npmjs.com/package/@tradecanvas/svelte) | Component cho framework |
| [`@tradecanvas/analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) | Backtest và chỉ số rủi ro |
| `@tradecanvas/core` · `@tradecanvas/commons` | Bộ máy và kiểu dữ liệu chung, tự cài cùng biểu đồ |

## Bản xem trước

Mọi pull request và mọi commit trên `main` đều được đăng lên [pkg.pr.new](https://pkg.pr.new), nên có thể thử một bản sửa hay tính năng trước khi phát hành. Cài bản xem trước theo số pull request hoặc commit:

```bash
npm install https://pkg.pr.new/@tradecanvas/chart@123      # pull request #123
npm install https://pkg.pr.new/@tradecanvas/chart@a1b2c3d  # một commit trên main
```

Mỗi pull request có một bình luận ghi sẵn lệnh cài cho từng gói.

## Trình duyệt hỗ trợ

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+.

## Công cụ lập trình AI

[`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) và [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) gom tài liệu vào một file cho trợ lý AI, và agent skill trong [`skills/tradecanvas`](skills/tradecanvas/SKILL.md) dạy coding agent dùng API qua các ví dụ được CI kiểm kiểu.

## Dự án liên quan

- **[bo-grid](https://github.com/bonguynvan/bo-grid)**: bảng dữ liệu Svelte 5 nhỏ và nhanh cho giao diện fintech, nửa còn lại của một bàn giao dịch. [Demo trực tiếp](https://bonguynvan.github.io/bo-grid/)

## Cho doanh nghiệp

Đưa TradeCanvas đến khách hàng của bạn? Không có logo phải hiển thị, không có gì phải xin phép. Trang [Cho doanh nghiệp](https://bonguynvan.github.io/tradecanvas/vi/business/) trả lời những gì bộ phận IT hay hỏi, kèm nguồn kiểm chứng, và giới thiệu chương trình đối tác đầu tiên. Liên hệ business@tradingdek.com.

## Đóng góp

Báo lỗi, ý tưởng và pull request đều được hoan nghênh. [CONTRIBUTING.md](./CONTRIBUTING.md) hướng dẫn cài đặt (`pnpm install && pnpm build && pnpm test`) và những gì một pull request cần có. Phát hiện lỗi bảo mật? Hãy làm theo [SECURITY.md](./SECURITY.md) thay vì mở issue.

## Tài trợ

TradeCanvas miễn phí, giấy phép MIT, được xây dựng và duy trì công khai. Nếu thư viện giúp ích cho sản phẩm của bạn, bạn có thể ủng hộ việc phát triển qua [GitHub Sponsors](https://github.com/sponsors/bonguynvan).

## Giấy phép

[MIT](./LICENSE)

<p align="center">
  <a href="https://tradecanvas.dev/vi/"><img src=".github/assets/banner.png" alt="TradeCanvas, bộ máy biểu đồ cho ứng dụng giao dịch" width="100%"></a>
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
  <b><a href="https://tradecanvas.dev/vi/chart/">Demo trực tiếp</a></b> ·
  <a href="https://tradecanvas.dev/vi/docs/getting-started/">Tài liệu</a> ·
  <a href="https://tradecanvas.dev/vi/examples/">Ví dụ</a> ·
  <a href="https://tradecanvas.dev/vi/audit/">Audit hệ thống</a> ·
  <a href="./CHANGELOG.md">Nhật ký thay đổi</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Tiếng Việt</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**Một biểu đồ giao dịch hoàn chỉnh cho web.** Từ nến Nhật đến Renko, 134 chỉ báo, 69 công cụ vẽ, dữ liệu sàn trực tiếp và lệnh ngay trên biểu đồ, vẽ bằng Canvas 2D hoặc WebGL, không phụ thuộc thư viện bên thứ ba nào. Dùng ngay `ChartWidget` đầy đủ, hoặc tự dựng giao diện trên `Chart` headless, bằng TypeScript, React, Vue hay Svelte.

<p align="center">
  <a href="https://tradecanvas.dev/vi/chart/"><img src=".github/assets/clips/hero.webp" alt="ChartWidget trên thị trường trực tiếp: EMA 21 và 55, RSI, crosshair và một đường xu hướng vẽ bằng chuột" width="100%"></a>
</p>

## Điểm nổi bật

- **18 loại biểu đồ, 134 chỉ báo, 69 công cụ vẽ**, chỉ báo trên chỉ báo, cảnh báo trên đường vẽ, hoàn tác và làm lại.
- **Giao dịch trên biểu đồ**: vị thế với lãi lỗ trực tiếp, lệnh và điểm dừng kéo được, broker giấy hoặc broker của bạn.
- **Dữ liệu trực tiếp** từ Binance, Bybit, Coinbase và Kraken, hoặc nguồn của bạn trong khoảng hai mươi dòng.
- **Nhanh**: một triệu nến kéo mượt 60 fps với WebGL; một tick trực tiếp trong khoảng một micro giây.
- **Không gian làm việc**: lưới nhiều biểu đồ, bố cục, tua lại nến, backtest.
- **Tùy biến theo ý bạn**: theme, ba phong cách, 114 công tắc, plugin; 30 ngôn ngữ; điện thoại và ứng dụng.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/trading.webp" alt="Kéo take-profit và stop-loss của một vị thế mua; lãi lỗ cập nhật theo giá">
      <br><b>Lệnh kéo được</b>: điểm dừng, mục tiêu và lệnh giới hạn di chuyển theo chuột.
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/replay.webp" alt="Tua lại nến phát lại thị trường với Bollinger Bands">
      <br><b>Tua lại nến</b>: phát lại thị trường, rồi giao dịch giấy trên đó.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/grid.webp" alt="Bốn biểu đồ trong lưới hai nhân hai với khung thời gian khác nhau, crosshair chạy theo trên cả bốn">
      <br><b>Lưới</b>: tới sáu biểu đồ, liên kết theo mã, khung thời gian, crosshair hoặc thời gian.
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/looks.webp" alt="Một biểu đồ chuyển giữa các phong cách Terminal, Capsule và Studio, tối và sáng">
      <br><b>Phong cách của bạn</b>: Studio, Terminal, Capsule, sáng hoặc tối, hoặc token của riêng bạn.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/clips/phone.webp" alt="Widget trên điện thoại: ngón tay kéo biểu đồ và vẽ một đường xu hướng" width="46%">
    </td>
    <td width="50%" valign="top">
      <br><b>Trên điện thoại</b>: ngón tay kéo, phóng to, vẽ và kéo lệnh, widget tự sắp xếp cho màn hình nhỏ. Nó cũng chạy trong WebView, React Native, Capacitor hoặc Tauri.
    </td>
  </tr>
</table>

## Bắt đầu nhanh

```bash
npm install @tradecanvas/chart
```

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

`Chart` không giao diện nhận dữ liệu nến của bạn (`chart.setData(bars)`) và để giao diện cho bạn tự làm. Với React, Vue và Svelte, `@tradecanvas/react`, `/vue` và `/svelte` bọc nó trong một component có cùng props.

## Tài liệu

[Bắt đầu](https://tradecanvas.dev/vi/docs/getting-started/) · [API](https://tradecanvas.dev/vi/docs/api/) · [Chỉ báo](https://tradecanvas.dev/vi/docs/indicators/) · [Công cụ vẽ](https://tradecanvas.dev/vi/docs/drawing-tools/) · [Thời gian thực](https://tradecanvas.dev/vi/docs/realtime/) · [Giao dịch](https://tradecanvas.dev/vi/docs/trading/) · [Giao diện](https://tradecanvas.dev/vi/docs/styling/) · [Framework](https://tradecanvas.dev/vi/docs/frameworks/) · [Plugin](https://tradecanvas.dev/vi/docs/plugins/) · [Điện thoại và ứng dụng](https://tradecanvas.dev/vi/docs/embed/#mobile-app) · [Hiệu năng](https://tradecanvas.dev/vi/docs/performance/)

Tài liệu có bằng English, Tiếng Việt, 简体中文, 日本語, 한국어 và Español. Số đo, giới hạn và cách kiểm thử nằm ở [audit hệ thống](https://tradecanvas.dev/vi/audit/).

## Công cụ lập trình AI

Agent skill trong [`skills/tradecanvas`](skills/tradecanvas/SKILL.md) dạy coding agent dùng API, với các ví dụ được CI kiểm kiểu. Trong Claude Code:

```text
/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas
```

Agent khác (Cursor, Codex, Copilot…): `npx skills add bonguynvan/tradecanvas`. Không dùng skill thì [`llms.txt`](https://tradecanvas.dev/llms.txt) và [`llms-full.txt`](https://tradecanvas.dev/llms-full.txt) gom tài liệu vào một file cho trợ lý AI. Sửa chính TradeCanvas bằng agent? Quy tắc của repo nằm trong [AGENTS.md](AGENTS.md).

MCP server `@tradecanvas/mcp` tra chỉ báo, công cụ vẽ, tùy chọn, công tắc tính năng và style key trong chính catalog của thư viện, và kiểm tra một object tùy chọn trước khi dùng ([cài cho các client khác](https://tradecanvas.dev/vi/docs/getting-started/#ai)):

```bash
claude mcp add tradecanvas -- npx -y @tradecanvas/mcp
```

Trên Windows (không qua WSL): `claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp`.

## Thêm

- **Các gói**: [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) (biểu đồ và widget), [`react`](https://www.npmjs.com/package/@tradecanvas/react) · [`vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`svelte`](https://www.npmjs.com/package/@tradecanvas/svelte), và [`analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) cho backtest.
- **Bản xem trước**: mỗi pull request và mỗi commit trên `main` có trên [pkg.pr.new](https://pkg.pr.new/~/bonguynvan/tradecanvas), cài được trước khi phát hành.
- **Trình duyệt**: Chrome 80+, Edge 80+, Firefox 80+, Safari 14+.
- **Cho doanh nghiệp**: không có logo phải hiển thị, không cần xin phép; trang [Cho doanh nghiệp](https://tradecanvas.dev/vi/business/) trả lời những gì một buổi thẩm định IT hỏi. business@tradecanvas.dev
- **Dự án liên quan**: [bo-grid](https://github.com/bonguynvan/bo-grid), một data grid Svelte nhanh cho nửa bảng của một bàn giao dịch.
- **Đóng góp**: câu hỏi ở [Discussions](https://github.com/bonguynvan/tradecanvas/discussions), lỗi ở mục issues, và [CONTRIBUTING.md](./CONTRIBUTING.md) cho pull request. Lỗi bảo mật: [SECURITY.md](./SECURITY.md).
- **Tài trợ**: TradeCanvas miễn phí và phát triển công khai; [GitHub Sponsors](https://github.com/sponsors/bonguynvan) giúp nó tiếp tục.

[MIT](./LICENSE)

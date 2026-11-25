<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Bắt đầu — Tài liệu TradeCanvas</title>
  <meta name="description" content="Cài TradeCanvas, biểu đồ giao dịch MIT với 137 chỉ báo, 76 công cụ vẽ, không logo trên biểu đồ, và render biểu đồ trong một phút." />
</svelte:head>

<h1>Bắt đầu</h1>
<p>Cài TradeCanvas và render một biểu đồ trong chưa đến một phút.</p>
<p>
  TradeCanvas theo giấy phép MIT và không vẽ logo nào lên biểu đồ. Thư viện có
  sẵn 25 loại biểu đồ, 137 chỉ báo và 76 công cụ vẽ.
</p>

<h2>Cài đặt</h2>
<p>Dùng trình quản lý package bất kỳ:</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>Widget dùng ngay</h2>
<p>
  <code>ChartWidget</code> là cách nhanh nhất để có một biểu đồ chạy được. Nó render toàn bộ
  giao diện giao dịch trong một phần tử chứa bất kỳ — toolbar, sidebar công cụ vẽ, dialog cài đặt,
  thanh trạng thái — và không phụ thuộc framework nào.
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
  Mặc định, widget có đủ các thao tác mà trader chuyên nghiệp dùng:
  kéo qua nến cuối vào vùng tương lai còn trống, kéo trục giá/trục thời gian để co giãn,
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+kéo để chọn nhiều hình vẽ, <kbd>Shift</kbd>+kéo để đo,
  <kbd>Alt</kbd>+click để ghim tooltip, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>
  để mở command palette, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> để tìm mã,
  và <kbd>?</kbd> để xem toàn bộ danh sách phím tắt.
</p>

<h2>Chart headless</h2>
<p>
  Để tự kiểm soát toàn bộ giao diện xung quanh, dùng trực tiếp lớp <code>Chart</code>
  ở tầng thấp hơn. Bạn tự làm toolbar, các tính năng vẫn giữ nguyên:
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>Wrapper cho framework</h2>
<p>
  Wrapper cho React, Vue và Svelte nằm ở mục
  <a href={href('/docs/frameworks')}>framework</a>.
</p>

<h2 id="ai">Dùng với coding agent</h2>
<p>Cách nhanh nhất: nhờ agent, trong công cụ bất kỳ, cài đặt toàn bộ. Agent đọc các bước cài trong <code>llms.txt</code>, cho biết mỗi lệnh chạy gì, hỏi skill được cài cho dự án này hay cho mọi dự án, rồi thêm package, skill và, nếu cần, MCP server, mà không sửa code của bạn:</p>
<pre><code>{`Install TradeCanvas for me by reading https://tradecanvas.dev/llms.txt`}</code></pre>
<p>Coding agent có thể học TradeCanvas thay vì đoán. <strong>Agent skill</strong> mô tả API bằng các ví dụ đã được kiểm tra kiểu; trong Claude Code, cài bằng hai lệnh:</p>
<pre><code>{`/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas`}</code></pre>
<p><strong>MCP server</strong> <code>@tradecanvas/mcp</code> trả lời từ danh mục của chính thư viện: id của chỉ báo, tham số và key của các đường; công cụ vẽ và các điểm mỗi công cụ nhận; tuỳ chọn của <code>ChartWidget</code>, <code>Chart</code> và <code>ChartWidgetGrid</code>, và của các finance chart; công tắc tính năng và style key. Tool <code>validate_options</code> kiểm tra một object tuỳ chọn trước khi dùng và chỉ ra tuỳ chọn mà code định viết. Trong Claude Code:</p>
<pre><code>{`claude mcp add tradecanvas -- npx -y @tradecanvas/mcp`}</code></pre>
<p>Cursor, Claude Desktop và phần lớn các client khác nhận cùng lệnh đó trong phần cài đặt MCP:</p>
<pre><code>{`{
  "mcpServers": {
    "tradecanvas": { "command": "npx", "args": ["-y", "@tradecanvas/mcp"] }
  }
}`}</code></pre>
<p>Codex thêm server bằng <code>codex mcp add tradecanvas -- npx -y @tradecanvas/mcp</code>, hoặc đọc từ <code>~/.codex/config.toml</code>, với key là <code>mcp_servers</code>:</p>
<pre><code>{`[mcp_servers.tradecanvas]
command = "npx"
args = ["-y", "@tradecanvas/mcp"]`}</code></pre>
<p>Trên Windows ngoài WSL, npx chạy qua <code>cmd</code>: <code>claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp</code>, hoặc trong phần cài đặt <code>"command": "cmd", "args": ["/c", "npx", "-y", "@tradecanvas/mcp"]</code>. Trong Git Bash, nơi chạy các lệnh <code>!</code> của Claude Code trên Windows, viết <code>//c</code>: Git Bash đổi <code>/c</code> thành một đường dẫn.</p>
<p>Hoặc không cần cài gì: tradecanvas.dev chạy cùng server đó tại <code>https://tradecanvas.dev/mcp</code>, theo phiên bản mới nhất của thư viện. Trong Claude Code:</p>
<pre><code>{`claude mcp add --transport http tradecanvas https://tradecanvas.dev/mcp`}</code></pre>
<p>Client kết nối bằng URL dùng nguyên địa chỉ này: một custom connector trong claude.ai, hoặc <code>"url": "https://tradecanvas.dev/mcp"</code> thay cho <code>"command"</code> trong phần cài đặt của Cursor. Package ở trên trả lời theo phiên bản đã cài; URL trả lời theo phiên bản mới nhất.</p>
<p>Không dùng cả hai thì <a href="https://tradecanvas.dev/llms.txt">llms.txt</a> và <a href="https://tradecanvas.dev/llms-full.txt">llms-full.txt</a> cung cấp tài liệu cho trợ lý trong một file.</p>

<h2>Bước tiếp theo</h2>
<ul>
  <li><a href={href('/docs/api')}>Tham chiếu API</a> — toàn bộ API của <code>Chart</code> và <code>ChartWidget</code></li>
  <li><a href={href('/docs/chart-types')}>Loại biểu đồ</a> — 25 loại biểu đồ có sẵn</li>
  <li><a href={href('/docs/indicators')}>Chỉ báo</a> — danh mục 137 chỉ báo</li>
  <li><a href={href('/docs/realtime')}>Thời gian thực &amp; replay</a> — adapter stream và chế độ replay</li>
  <li><a href={href('/docs/analytics')}>Phân tích</a> — backtest chiến lược và chỉ số rủi ro</li>
</ul>

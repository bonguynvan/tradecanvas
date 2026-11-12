<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram, { type DiagramWords } from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: 'Nến đi vào', text: 'DataFeed được gọi để lấy lịch sử (getBars) và được đăng ký để nhận nến trực tiếp; DataAdapter, như BinanceAdapter, đẩy mọi thứ ra dưới dạng sự kiện. StreamManager biến một feed thành adapter, gộp lại theo khung thời gian của biểu đồ và dựng nến từ tick.' },
    { nodes: ['chart', 'stream', 'code'], title: 'Biểu đồ nhận nến', text: 'chart.connect() lắng nghe các sự kiện snapshot, barUpdate, barClose và barCorrection. Code của bạn ghi cùng những cây nến đó bằng setData, appendBar, updateLastBar hoặc updateBar, không cần feed nào.' },
    { nodes: ['store', 'chart'], title: 'Một kho duy nhất', text: 'Mọi lần ghi đều đi qua SeriesStore. Nó giữ các nến đang hiển thị, toàn bộ chuỗi khi nến ngoài giờ bị ẩn, và chuỗi trực tiếp được cất sang bên trong lúc replay, rồi báo cho biểu đồ biết mỗi lần ghi đã làm gì.' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: 'Tính ra thứ cần vẽ', text: 'DisplaySeries dựng chuỗi mà kiểu biểu đồ vẽ (Heikin Ashi, Renko, Kagi…), giữ trong bộ nhớ đệm tới khi nến đổi. IndicatorEngine chỉ tính lại từ cây nến đầu tiên thay đổi. PriceFit khớp thang giá và PaneLayout chia kích thước các pane.' },
    { nodes: ['viewport', 'input', 'fit'], title: 'Khung nhìn', text: 'Viewport giữ những nến nào đang thấy, mỗi nến rộng bao nhiêu và đã cuộn tới đâu. Kéo chuột, con lăn và phím cuộn và phóng to nó qua InteractionManager.' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: 'Một khung hình', text: 'RenderEngine đánh dấu các lớp đã thay đổi và vẽ chúng ở khung hình kế tiếp; tick trực tiếp được gom trước, nên một loạt tick chỉ thành một khung hình. Canvas scene giữ lưới, chuỗi giá, chỉ báo, hình vẽ và các trục; canvas top giữ crosshair và legend, nên di chuột chỉ vẽ lại canvas đó. Với renderer: \'webgl\', một canvas GPU vẽ nến và khối lượng ở bên dưới.' },
    { nodes: ['events', 'chart'], title: 'Trở về ứng dụng của bạn', text: 'Biểu đồ báo lại qua sự kiện: crosshairMove, dataUpdate, visibleRangeChange, symbolChange và các sự kiện khác, liệt kê trong tham chiếu API.' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: 'Một lớp công khai', text: 'ChartWidget giữ các phương thức công khai và phần khởi tạo. Hàm khởi tạo là một danh sách bước theo thứ tự các phần cần nhau: readOptions, buildRoot, buildToolbar, buildBody, buildChart … finishSetup.' },
    { nodes: ['areas', 'hosts', 'widget'], title: 'Mỗi vùng qua một host', text: 'Replay, giao dịch, cảnh báo, so sánh, watchlist, legend, menu, lệnh, bố cục, dock, Chart Settings, chỉnh sửa hình vẽ và khung thời gian đều là lớp riêng. Mỗi lớp nhận một host interface liệt kê đúng những gì nó dùng từ widget, và một phương thức công khai trên ChartWidget chuyển tiếp sang vùng của nó.' },
    { nodes: ['chart', 'areas'], title: 'Một biểu đồ', text: 'buildChart tạo ra Chart duy nhất mà widget bao lấy. Mọi vùng tới được nó qua host của mình; không vùng nào có biểu đồ riêng. Widget lắng nghe sự kiện của biểu đồ để giữ thanh công cụ và legend khớp theo.' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signal', text: 'Trạng thái mà nhiều phần cùng hiển thị là một signal: giao diện (look), những nút nào trên thanh công cụ đang mở (openRoles) và Chart Settings. Một effect cập nhật mọi chỗ hiển thị nó, nên nơi ghi không phải tự gọi từng lần cập nhật.' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: 'Hộp thoại tải khi mở lần đầu', text: 'Các hộp thoại lớn, hộp thoại chỉ báo, bảng lệnh và ô tìm mã nằm trong DIALOGS và chỉ tải code ở lần mở đầu tiên. Chúng mở trong overlayHost, lớp này chuyển vào bên trong widget khi toàn màn hình.' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: 'Chọn một nến', text: 'Nút replay mở thanh replay; nhấp vào một nến, hoặc gọi replayFrom(), chọn chỗ bắt đầu.' },
    { nodes: ['chart', 'store', 'manager'], title: 'Bắt đầu', text: 'chart.replayStart() bảo SeriesStore cất các nến trực tiếp sang bên, rồi nạp các nến cần phát vào ReplayManager, nó chờ ở trạng thái tạm dừng tại điểm bắt đầu.' },
    { nodes: ['manager', 'chart', 'store'], title: 'Từng bước', text: 'Phát, tạm dừng, tiến hoặc lùi một bước và tốc độ đều đi tới ReplayManager. Mỗi bước gửi một sự kiện bar; biểu đồ hiển thị các nến tới đó (showReplayed, hoặc appendReplayed khi tiến tới).' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: 'Những gì đi theo replay', text: 'Chỉ báo tính lại từ cây nến thay đổi, đường giá hiển thị giá đóng cửa đang replay, và tài khoản paper trading giao dịch ở giá replay. Lệnh và cảnh báo của tài khoản thật vẫn chạy theo giá trực tiếp.' },
    { nodes: ['stop', 'store', 'ui'], title: 'Kết thúc', text: 'Tới nến cuối thì replay tạm dừng. Thoát ra sẽ gọi replayStop(): SeriesStore đặt chuỗi trực tiếp trở lại và biểu đồ chạy trực tiếp như trước.' },
  ];

  const dataWords: DiagramWords = {
    code: { title: 'code của bạn' },
    stream: { note: 'gộp khung · TickAggregator' },
    store: { note: 'đang hiện · toàn bộ · cất riêng' },
    display: { note: 'theo kiểu biểu đồ' },
    engine: { note: 'lớp đã đổi · rAF' },
    scene: { title: 'canvas scene', note: 'chuỗi giá · trục · hình vẽ' },
    top: { title: 'canvas top', note: 'crosshair · legend' },
    input: { title: 'chuột · cuộn · phím' },
  };

  const widgetWords: DiagramWords = {
    widget: { note: 'API công khai · khởi tạo' },
    hosts: { note: 'mỗi vùng một interface' },
    dialogs: { note: 'LazyPart · lần mở đầu' },
    ui: { title: 'toolbar · giao diện', note: 'mỗi thứ một effect' },
    areas: { title: 'các vùng Widget…', note: 'Replay · Trading · Alerts…' },
    overlay: { note: 'portal · toàn màn hình' },
    chart: { note: 'một cho mỗi widget' },
  };

  const replayWords: DiagramWords = {
    ui: { note: 'toggleReplay · nhấp nến' },
    store: { note: 'chuỗi trực tiếp cất riêng' },
    paper: { title: 'tài khoản paper' },
  };
</script>

<svelte:head>
  <title>Cách hoạt động — Tài liệu TradeCanvas</title>
  <meta name="description" content="TradeCanvas hoạt động bên trong ra sao: nến đi từ nguồn dữ liệu tới màn hình, ChartWidget được ghép từ những phần nào, và một lần replay chạy thế nào. Ba sơ đồ dùng đúng tên trong code." />
</svelte:head>

<h1>Cách hoạt động</h1>
<p>Ba sơ đồ nhìn thư viện từ bên trong, dùng đúng tên trong code để bạn tìm được từng phần trong mã
  nguồn. Trỏ chuột vào một bước, hoặc dùng Tab để tới nó, để thấy các ô mà bước đó nói tới. Bạn không cần
  những điều này để dùng biểu đồ; chúng có ích khi bạn viết một nguồn dữ liệu, một plugin, hoặc sửa chính
  thư viện.</p>

<h2 id="data-flow">Từ nguồn dữ liệu tới màn hình</h2>
<p>Một cây nến đi cùng một đường dù nó đến từ sàn hay từ code của bạn, và một kho duy nhất giữ nó.
  Mọi thứ được vẽ đều tính ra từ kho đó và khung nhìn.</p>
<Diagram {...DATA_FLOW} label="Nến đi từ nguồn dữ liệu tới hai canvas, qua SeriesStore" steps={dataSteps} words={dataWords} />
<p>Cách viết nguồn dữ liệu của riêng bạn ở <a href={href('/docs/realtime')}>Thời gian thực &amp; Replay</a>;
  chi phí mỗi khung hình ở <a href={href('/docs/performance')}>Hiệu năng</a>.</p>

<h2 id="widget">ChartWidget được ghép từ những gì</h2>
<p><code>ChartWidget</code> là cả màn hình giao dịch bao quanh một <code>Chart</code>. Các phần của nó
  là những lớp nhỏ, mỗi lớp chỉ thấy những gì được trao cho nó.</p>
<Diagram {...WIDGET_PARTS} label="ChartWidget, các vùng, signal và hộp thoại của nó, quanh một Chart" steps={widgetSteps} words={widgetWords} />

<h2 id="replay">Một lần replay</h2>
<p>Replay chạy lại quá khứ từng nến một trên chính biểu đồ đó, còn nến trực tiếp được cất sang bên tới khi kết thúc.</p>
<Diagram {...REPLAY} label="Một lần replay, từ cú nhấp đầu tiên tới khi biểu đồ trực tiếp trở lại" steps={replaySteps} words={replayWords} />
<p>Tuỳ chọn và sự kiện ở <a href={href('/docs/realtime')}>Thời gian thực &amp; Replay</a>.</p>

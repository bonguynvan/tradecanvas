<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram, { type DiagramWords } from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: 'Nến đi vào', text: 'DataFeed được gọi để lấy dữ liệu lịch sử (getBars) và được subscribe để nhận nến trực tiếp; DataAdapter, ví dụ BinanceAdapter, đẩy mọi thứ ra dưới dạng event. StreamManager chuyển một feed thành adapter, resample về khung thời gian của biểu đồ và dựng nến từ tick.' },
    { nodes: ['chart', 'stream', 'code'], title: 'Biểu đồ nhận nến', text: 'chart.connect() lắng nghe các event snapshot, barUpdate, barClose và barCorrection. Code của bạn ghi cùng các nến đó bằng setData, appendBar, updateLastBar hoặc updateBar, và không cần feed nào.' },
    { nodes: ['store', 'chart'], title: 'Một store', text: 'Mọi lần ghi đều đi qua SeriesStore. Store giữ các nến đang hiển thị, toàn bộ series khi nến ngoài giờ bị ẩn, và series trực tiếp được cất riêng trong lúc replay, rồi báo cho biểu đồ biết mỗi lần ghi đã thay đổi gì.' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: 'Tính ra phần cần vẽ', text: 'DisplaySeries dựng series mà loại biểu đồ vẽ (Heikin Ashi, Renko, Kagi…), cache lại tới khi nến thay đổi. IndicatorEngine chỉ tính lại từ nến đầu tiên bị thay đổi. PriceFit căn thang giá và PaneLayout tính kích thước các pane.' },
    { nodes: ['viewport', 'input', 'fit'], title: 'View', text: 'Viewport giữ thông tin nến nào đang hiển thị, mỗi nến rộng bao nhiêu và đã cuộn tới đâu. Kéo, cuộn chuột và phím bấm cuộn và zoom viewport qua InteractionManager.' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: 'Một frame', text: 'RenderEngine đánh dấu các layer đã thay đổi và vẽ chúng ở animation frame kế tiếp; tick trực tiếp được gom lại trước, nên một loạt tick chỉ tốn một frame. Canvas scene chứa lưới, series, chỉ báo, hình vẽ và các trục; canvas top chứa crosshair và legend, nên di chuyển con trỏ chỉ vẽ lại canvas này. Với renderer: \'webgl\', một canvas GPU vẽ nến và khối lượng ở bên dưới.' },
    { nodes: ['events', 'chart'], title: 'Trả về ứng dụng', text: 'Biểu đồ thông báo qua event: crosshairMove, dataUpdate, visibleRangeChange, symbolChange và các event khác, liệt kê trong tham chiếu API.' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: 'Một lớp public', text: 'ChartWidget giữ các phương thức public và phần khởi tạo. Constructor là một danh sách bước theo thứ tự phụ thuộc giữa các phần: readOptions, buildRoot, buildToolbar, buildBody, buildChart … finishSetup.' },
    { nodes: ['areas', 'hosts', 'widget'], title: 'Các vùng, mỗi vùng qua một host', text: 'Replay, giao dịch, cảnh báo, mã so sánh, watchlist, legend, menu, command, layout, dock, Chart Settings, chỉnh sửa hình vẽ và khung thời gian là các lớp riêng. Mỗi lớp nhận một host interface liệt kê đúng những gì nó dùng từ widget, và phương thức public tương ứng trên ChartWidget chuyển lời gọi sang vùng đó.' },
    { nodes: ['chart', 'areas'], title: 'Một biểu đồ', text: 'buildChart tạo Chart duy nhất mà widget bọc. Mọi vùng truy cập nó qua host của mình; không vùng nào có biểu đồ riêng. Widget lắng nghe event của biểu đồ để giữ toolbar và legend đồng bộ.' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signal', text: 'State mà nhiều phần cùng hiển thị là một signal: theme (look), các nút toolbar đang mở (openRoles) và Chart Settings. Một effect cập nhật mọi nơi hiển thị state đó, nên nơi ghi không phải tự gọi từng hàm cập nhật.' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: 'Dialog tải khi mở lần đầu', text: 'Các dialog lớn, dialog chỉ báo, command palette và tìm mã nằm trong DIALOGS và chỉ tải code ở lần mở đầu tiên. Chúng mở trong overlayHost, phần tử này chuyển vào bên trong widget khi ở chế độ toàn màn hình.' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: 'Chọn một nến', text: 'Nút replay mở thanh replay; click vào một nến, hoặc gọi replayFrom(), để chọn điểm bắt đầu replay.' },
    { nodes: ['chart', 'store', 'manager'], title: 'Bắt đầu', text: 'chart.replayStart() yêu cầu SeriesStore cất riêng các nến trực tiếp, rồi nạp các nến cần phát vào ReplayManager; ReplayManager dừng sẵn ở điểm bắt đầu.' },
    { nodes: ['manager', 'chart', 'store'], title: 'Từng bước', text: 'Phát, tạm dừng, tiến hoặc lùi một bước và tốc độ đều do ReplayManager xử lý. Mỗi bước gửi một event bar; biểu đồ hiển thị các nến tới bước đó (showReplayed, hoặc appendReplayed khi đi tới).' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: 'Những gì chạy theo replay', text: 'Chỉ báo tính lại từ nến bị thay đổi, đường giá hiển thị giá đóng cửa đang replay, và tài khoản paper trading giao dịch ở giá replay. Lệnh và cảnh báo trên tài khoản thật vẫn chạy theo dữ liệu trực tiếp.' },
    { nodes: ['stop', 'store', 'ui'], title: 'Kết thúc', text: 'Đến nến cuối, replay tạm dừng. Thoát replay sẽ gọi replayStop(): SeriesStore đưa series trực tiếp trở lại và biểu đồ chạy trực tiếp như trước.' },
  ];

  const dataWords: DiagramWords = {
    code: { title: 'code của bạn' },
    stream: { note: 'resample · TickAggregator' },
    store: { note: 'đang hiển thị · toàn bộ · cất riêng' },
    display: { note: 'theo loại biểu đồ' },
    engine: { note: 'layer đã đổi · rAF' },
    scene: { title: 'canvas scene', note: 'series · trục · hình vẽ' },
    top: { title: 'canvas top', note: 'crosshair · legend' },
    input: { title: 'con trỏ · cuộn chuột · phím' },
  };

  const widgetWords: DiagramWords = {
    widget: { note: 'API public · khởi tạo' },
    hosts: { note: 'mỗi vùng một interface' },
    dialogs: { note: 'LazyPart · lần mở đầu' },
    ui: { title: 'toolbar · theme', note: 'mỗi phần một effect' },
    areas: { title: 'các vùng Widget…', note: 'Replay · Trading · Alerts…' },
    overlay: { note: 'portal · toàn màn hình' },
    chart: { note: 'một Chart mỗi widget' },
  };

  const replayWords: DiagramWords = {
    ui: { note: 'toggleReplay · click nến' },
    store: { note: 'series trực tiếp cất riêng' },
    paper: { title: 'tài khoản paper' },
  };
</script>

<svelte:head>
  <title>Cách hoạt động — Tài liệu TradeCanvas</title>
  <meta name="description" content="Bên trong TradeCanvas: nến đi từ feed tới màn hình, ChartWidget gồm những phần nào, và một lần bar replay chạy ra sao. Ba sơ đồ dùng đúng tên trong code." />
</svelte:head>

<h1>Cách hoạt động</h1>
<p>Ba sơ đồ mô tả thư viện từ bên trong, dùng đúng tên trong code để tìm được từng phần trong mã
  nguồn. Trỏ vào một bước, hoặc dùng Tab để tới bước đó, để thấy các ô liên quan. Không cần
  phần này để dùng biểu đồ; nó hữu ích khi viết một feed, một plugin hoặc sửa chính
  thư viện.</p>

<h2 id="data-flow">Từ feed tới màn hình</h2>
<p>Một nến đi cùng một đường dù đến từ sàn hay từ code của bạn, và chỉ một store giữ nó.
  Mọi thứ được vẽ đều tính từ store đó và view.</p>
<Diagram {...DATA_FLOW} label="Nến đi từ nguồn dữ liệu tới hai canvas, qua SeriesStore" steps={dataSteps} words={dataWords} />
<p>Cách viết nguồn dữ liệu riêng ở <a href={href('/docs/realtime')}>Thời gian thực &amp; Replay</a>; chi phí
  mỗi frame ở <a href={href('/docs/performance')}>Hiệu năng</a>.</p>

<h2 id="widget">ChartWidget gồm những gì</h2>
<p><code>ChartWidget</code> là toàn bộ màn hình giao dịch bao quanh một <code>Chart</code>. Các phần của nó
  là những lớp nhỏ, mỗi lớp chỉ thấy những gì được truyền vào.</p>
<Diagram {...WIDGET_PARTS} label="ChartWidget, các vùng, signal và dialog của nó, quanh một Chart" steps={widgetSteps} words={widgetWords} />

<h2 id="replay">Một lần bar replay</h2>
<p>Replay phát lại dữ liệu quá khứ từng nến trên chính biểu đồ đó, các nến trực tiếp được cất riêng tới khi replay kết thúc.</p>
<Diagram {...REPLAY} label="Một lần bar replay, từ click đầu tiên tới khi biểu đồ chạy trực tiếp trở lại" steps={replaySteps} words={replayWords} />
<p>Tuỳ chọn và event ở <a href={href('/docs/realtime')}>Thời gian thực &amp; Replay</a>.</p>

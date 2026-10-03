import type { SiteMessages } from '../messages';

const vi: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Biểu đồ giao dịch Canvas cho web',
    description:
      'TradeCanvas là thư viện biểu đồ giao dịch Canvas2D: 17 loại biểu đồ, 85 chỉ báo, 69 công cụ vẽ, dữ liệu trực tiếp từ sàn, đặt lệnh ngay trên biểu đồ, phát lại và backtest. Không phụ thuộc thư viện nào, giấy phép MIT.',
  },

  nav: {
    main: 'Điều hướng chính',
    docs: 'Tài liệu',
    examples: 'Ví dụ',
    playground: 'Playground',
    changelog: 'Nhật ký thay đổi',
    toLight: 'Chuyển sang giao diện sáng',
    toDark: 'Chuyển sang giao diện tối',
    github: 'TradeCanvas trên GitHub',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
    menu: 'Menu',
    language: 'Ngôn ngữ',
  },

  footer: {
    tagline: 'Biểu đồ giao dịch Canvas2D cho web. Không phụ thuộc thư viện nào, giấy phép MIT.',
    library: 'Thư viện',
    packages: 'Gói',
    project: 'Dự án',
    gettingStarted: 'Bắt đầu',
    apiReference: 'Tham chiếu API',
    examples: 'Ví dụ',
    changelog: 'Nhật ký thay đổi',
    issues: 'Báo lỗi',
    boGrid: 'bo-grid (bảng dữ liệu)',
    builtWith: 'Xây dựng bằng TradeCanvas',
  },

  home: {
    release: 'bộ vẽ hai lớp canvas, kéo tự do',
    title: 'Bộ máy biểu đồ cho ứng dụng giao dịch.',
    ledeHtml:
      'Từ nến Nhật đến Renko, 85 chỉ báo, 69 công cụ vẽ, dữ liệu trực tiếp từ sàn và đặt lệnh ngay trên biểu đồ. Vẽ bằng Canvas2D, không phụ thuộc thư viện nào. Gắn nguyên <code>ChartWidget</code> đầy đủ, hoặc tự dựng giao diện riêng trên <code>Chart</code> headless.',
    getStarted: 'Bắt đầu',
    browseExamples: 'Xem ví dụ',
    specsLabel: 'Các con số chính',
    specs: [
      'loại biểu đồ',
      'chỉ báo',
      'công cụ vẽ',
      'phụ thuộc khi chạy',
      'gzip, lõi headless',
      'khung hình khi rê chuột, 100k nến',
    ],
    hood: {
      eyebrow: 'Bên trong',
      title: 'Có số đo, có tài liệu, tuỳ bạn mở rộng',
      subtitleHtml: 'Bộ máy đứng sau Feature Lab. Mọi con số bên dưới đều đo lại được bằng <code>pnpm bench</code>.',
      frameBudget: 'Thời gian mỗi khung hình',
      perf: [
        'một tick trực tiếp, 4 chỉ báo trên 100k nến',
        'tính lại toàn bộ sau khi đổi mã, 100k nến',
        'giảm mẫu LTTB, 100k → 1.600 điểm',
        'khung hình khi rê chuột, không đổi từ 500 đến 100k nến',
      ],
      perfFoot: 'Hai lớp canvas chồng lên nhau: rê chuột chỉ vẽ lại lớp mỏng phía trên. Mọi bộ vẽ chỉ duyệt các nến đang hiện trên màn hình.',
      gestures: 'Thao tác',
      gestureList: [
        ['Kéo', 'di chuyển, qua cả nến cuối cùng'],
        ['Cuộn', 'phóng to quanh con trỏ'],
        ['Chụm', 'phóng to trên màn hình cảm ứng'],
        ['Kéo sang phải', 'nến cũ hơn tải dần khi kéo'],
        ['Kéo trục', 'co giãn trục đó'],
        ['Ctrl + kéo', 'chọn hình vẽ'],
        ['Shift + kéo', 'đo'],
        ['Alt + bấm', 'ghim chú thích'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Một lệnh gọi, đủ giao diện giao dịch',
        text: 'ChartWidget có sẵn thanh công cụ, thanh công cụ vẽ, danh mục theo dõi, cảnh báo, danh sách đối tượng, cửa sổ dữ liệu, phát lại và bảng lệnh (Ctrl+K), bằng 14 ngôn ngữ, từ tiếng Anh, tiếng Việt đến tiếng Trung, tiếng Nhật và tiếng Hàn.',
      },
      {
        label: 'Dữ liệu',
        title: 'Mọi nguồn dữ liệu thị trường',
        text: 'Có sẵn adapter cho Binance, Coinbase, Bybit và Kraken; WebSocketAdapter và PollingAdapter cho mọi nguồn khác. Nến cũ hơn tải dần khi bạn cuộn về quá khứ; tự kết nối lại và bỏ qua lần đổi mã cũ khi đã có lần đổi mới hơn.',
      },
      {
        label: 'Giao dịch',
        title: 'Đặt lệnh ngay trên biểu đồ',
        text: 'ExecutionAdapter kèm sàn giả lập, kéo để tạo lệnh, lệnh kèm SL/TP, đường dừng lỗ và chốt lời kéo được, cảnh báo gửi tới webhook và thông báo trên máy tính.',
      },
      {
        label: 'Framework',
        title: 'React, Vue và Svelte',
        text: '@tradecanvas/react, /vue và /svelte bọc cùng một bộ máy, với props reactive và có kiểu. Đối tượng Chart đầy đủ luôn sẵn qua một ref.',
      },
      {
        label: 'Plugin',
        title: 'Mở rộng mọi lớp',
        text: 'Đăng ký chỉ báo tuỳ chỉnh với update() tính tăng dần, công cụ vẽ, loại biểu đồ và lớp phủ, cho mọi biểu đồ hoặc cho từng biểu đồ.',
      },
      {
        label: 'Phân tích',
        title: 'Backtest ngay cạnh biểu đồ',
        text: 'Backtester chạy theo từng nến, kèm dải Monte Carlo, và quy trình tính chỉ báo trong Web Worker để luồng chính luôn rảnh.',
      },
    ],
    quickstart: {
      eyebrow: 'Bắt đầu nhanh',
      title: 'Cùng một biểu đồ, năm cách bắt đầu',
      subtitle: 'Widget đầy đủ, component cho framework hoặc bộ máy headless. Tất cả dùng chung một bộ vẽ.',
      tabs: 'Kiểu bắt đầu nhanh',
    },
    closing: {
      title: 'Đưa biểu đồ trực tiếp vào ứng dụng của bạn ngay hôm nay.',
      readDocs: 'Đọc tài liệu',
      star: 'Gắn sao trên GitHub',
    },
  },

  lab: {
    eyebrow: 'Feature Lab',
    title: 'Mọi tính năng, trên một biểu đồ trực tiếp.',
    subtitleHtml:
      'Chọn một cảnh. Mỗi cảnh khởi động <code>ChartWidget</code> đầy đủ ở trạng thái làm nổi bật một mảng tính năng — sau đó tuỳ bạn kéo, vẽ và chuyển đổi.',
    scenes: 'Các cảnh tính năng',
    widgetLanguage: 'Ngôn ngữ của widget',
    idle: 'Cuộn tới đây để chạy biểu đồ trực tiếp',
    metricHint: 'Đổi mã hoặc khung thời gian để đo tốc độ chuyển',
    metricSwitch: '→ {label}: {ms} · {bars} nến',
    metricSetData: 'setData({bars} nến): {ms}',
    tryThis: 'Thử ngay',
  },

  scenes: {
    drawings: {
      title: 'Công cụ vẽ',
      stat: '69 công cụ',
      blurb:
        'Công cụ Fibonacci và Gann với mức tự chọn, sóng Elliott, mô hình harmonic, ghi chú và bút vẽ. Nhấp đúp vào hình vẽ để mở cài đặt, nhấp chuột phải để mở menu; cảnh báo bám theo đường xu hướng, và Long/Short tự tính khối lượng.',
      tryThis: [
        'Nhấp đúp vào Fibonacci thoái lui và sửa các mức',
        'Nhấp chuột phải vào hình vẽ: đưa lên trên, nhóm lại hoặc thêm cảnh báo',
        'Chọn bút vẽ hoặc công cụ đường nhiều điểm; Enter để kết thúc',
      ],
    },
    indicators: {
      title: 'Chỉ báo',
      stat: '85 có sẵn',
      blurb:
        'Chỉ báo phủ lên giá và chỉ báo ở bảng riêng, đều tự tính trong thư viện, không phụ thuộc thư viện toán nào. Tick trực tiếp chỉ tính lại nến đang hình thành — 0.001 ms mỗi tick với bốn chỉ báo trên 100k nến.',
      tryThis: [
        'Bấm nút Chỉ báo (hoặc Ctrl+K) và tìm bất kỳ chỉ báo nào trong 85 chỉ báo',
        'Bấm vào tên chỉ báo trên chú thích: thông số, màu sắc và các mức',
        'Đặt Nguồn của một đường trung bình động là đường của một chỉ báo khác',
        'Kéo đường phân cách giữa các bảng để đổi kích thước; các nút ở góc phải trên của bảng để di chuyển, thu gọn hoặc phóng to',
        'Nút ⋯ trên dòng chú thích chuyển chỉ báo lên bảng trên, xuống bảng dưới hoặc sang bảng riêng',
        'Menu Chỉ báo → Lưu indicator thành mẫu…; Ctrl+Z cũng hoàn tác thay đổi chỉ báo',
        'Gõ số trên biểu đồ (4, rồi h, Enter) để đổi khung thời gian; Alt+T chọn đường xu hướng',
      ],
    },
    trading: {
      title: 'Giao dịch',
      stat: 'sàn giả lập',
      blurb:
        'Lệnh và vị thế thao tác ngay trên biểu đồ: kéo dừng lỗ và chốt lời, huỷ, đóng hoặc đảo chiều từ chính đường lệnh, mỗi lần khớp được đánh dấu trên nến của nó. Phiếu đặt lệnh và bảng tài khoản nằm dưới biểu đồ; mọi thứ đi qua một ExecutionAdapter — ở đây là sàn giả lập đi kèm.',
      tryThis: [
        'Bấm ⇅ trên vị thế Long đang mở để đảo chiều, hoặc × để đóng — lần khớp hiện thành dấu trên nến',
        'Chuột phải dưới giá hiện tại: mua giới hạn, bán dừng hoặc phiếu đặt lệnh tại mức giá đó',
        'Bảng tài khoản dưới biểu đồ liệt kê vị thế kèm lãi/lỗ, lệnh chờ và lịch sử',
        'Kéo đường SL / TP của vị thế Long đang mở — sàn giả lập cập nhật theo',
        'Dấu + cạnh trục giá cho đặt cảnh báo, lệnh hoặc đường ngang tại mức giá đó',
      ],
    },
    workspace: {
      title: 'Không gian làm việc',
      stat: 'nhiều biểu đồ',
      blurb:
        'Hai biểu đồ cạnh nhau, liên kết theo con trỏ — hoặc theo mã, khung, thời gian và hình vẽ tuỳ bạn chọn. Lưu cả không gian làm việc thành một bố cục có tên và mở lại khi cần.',
      tryThis: [
        'Rê chuột trên một biểu đồ: biểu đồ kia hiện cùng thời điểm',
        'Bật Khung trên thanh Đồng bộ, rồi đổi khung thời gian của một biểu đồ',
        'Chọn bốn biểu đồ trên thanh; khi đồng bộ Mã, biểu đồ mới mở theo mã của biểu đồ đang chọn',
        'Bố cục ▾ → Lưu thành…, thay đổi gì đó, rồi mở lại bố cục (Ctrl+S để lưu)',
      ],
    },
    navigation: {
      title: 'Khoảng hiển thị & bố cục',
      stat: '1D … Tất cả',
      blurb:
        'Nhảy tới một khoảng thời gian hoặc một ngày, lật ngược thang giá, ghim các khung thời gian hay dùng, thêm cùng một chỉ báo nhiều lần — và lấy lại tất cả từ bố cục đã lưu.',
      tryThis: [
        'Bấm 1M, 3M hoặc 6M dưới biểu đồ; Alt+G để đi tới một ngày',
        'Alt+I lật ngược thang giá; thang logarit nằm trong Cài đặt',
        'Cài đặt → Múi giờ: chọn New York hoặc Tokyo — trục, đường ngắt ngày và YTD đều theo đó, kể cả giờ mùa hè',
        'Cài đặt → Thang giá → Thang giá bên trái; tab Kiểu của EMA có thể chuyển nó sang thang đó',
        'Đánh dấu sao một khung thời gian trong menu ▾ cạnh các nút khung thời gian',
        'Bật nút ↻ ở thanh công cụ bên trái để vẽ liên tiếp nhiều đường; Ctrl+C / Ctrl+V để sao chép chúng',
      ],
    },
    history: {
      title: 'Cuộn ngược thời gian',
      stat: 'lịch sử theo trang',
      blurb:
        'Nến cũ hơn tải dần khi bạn kéo về phía nến sớm nhất, mỗi lần một trang, còn những gì đang hiện trên màn hình vẫn giữ nguyên. Thu nhỏ tới khi mọi nến đã tải vừa màn hình: dưới một pixel mỗi nến, các nến được gộp theo từng cột pixel, nên hàng nghìn nến vẫn dễ đọc.',
      tryThis: [
        'Kéo biểu đồ sang phải: một nhãn nhỏ bên trái báo nến cũ đang tải',
        'Cuộn để thu nhỏ, qua vài trăm nến, tới mức một phần tư pixel mỗi nến',
        'Bấm Tất cả dưới biểu đồ để hiện vừa mọi dữ liệu đã tải',
        'Gõ 7 hoặc 90 trong menu khung thời gian ▾: Binance không có hai khung này, nên biểu đồ tự dựng chúng từ nến 1m và 30m',
      ],
    },
    replay: {
      title: 'Phát lại nến',
      stat: 'thanh tua',
      blurb:
        'Đi qua lịch sử từng nến một để luyện đọc biểu đồ mà không biết trước diễn biến. Dữ liệu trực tiếp được giữ riêng trong lúc phát lại; thang giá tự vừa theo từng bước.',
      tryThis: [
        'Bấm phát, hoặc đi từng nến với Shift+→ / Shift+←',
        'Bấm vào bất kỳ nến nào đã hiện để đưa điểm phát lại tới đó',
        '“Về thời gian thực” quay lại chuỗi dữ liệu trực tiếp',
        'Chọn Bước nhỏ hơn trên thanh phát lại (15m) để xem từng nến hình thành',
      ],
    },
    subcent: {
      title: '14 ngôn ngữ, giá dưới một xu',
      stat: 'i18n',
      blurb:
        'Toàn bộ widget bằng 14 ngôn ngữ — menu, cài đặt, công cụ vẽ, hộp thoại — với số theo định dạng riêng của từng ngôn ngữ. PEPE giao dịch quanh 0.000004: mọi nhãn đều theo độ chính xác của thang giá, và trục tự nới rộng cho vừa.',
      tryThis: [
        'Chọn ngôn ngữ phía trên biểu đồ: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P tìm mọi mã trên Binance, kèm tên, ngay khi bạn gõ',
        'Mở Cài đặt hoặc công cụ vẽ để xem bản dịch',
        'Rê chuột: nhãn của con trỏ chữ thập giữ đủ độ chính xác theo định dạng số của ngôn ngữ đó',
      ],
    },
    bigdata: {
      title: '200.000 nến',
      stat: 'hiệu năng',
      blurb:
        'Hai trăm nghìn nến 1 phút với bốn chỉ báo. Chỉ các nến đang hiện mới được vẽ; khung thời gian lớn hơn được dựng lại ngay trên máy, sau một lớp che báo đang tải khi việc đó mất hơn vài khung hình.',
      tryThis: [
        'Chuyển sang 1H, 4H rồi về lại 1m — thời gian đo hiện dưới biểu đồ',
        'Thu nhỏ hết cỡ rồi kéo: thời gian mỗi khung hình vẫn không đổi',
        'Thêm một chỉ báo nữa và xem thời gian chuyển đổi',
      ],
    },
    switching: {
      title: 'Chuyển đổi khi mạng chậm',
      stat: '+1.2 s độ trễ',
      blurb:
        'Mỗi yêu cầu dữ liệu lịch sử ở đây bị trễ 1.2 s. Biểu đồ trước vẫn ở trên màn hình và chỉ bị che khi một lần chuyển đổi mất hơn 200 ms; bấm liên tục cũng không bao giờ để phản hồi cũ hiển thị đè lên.',
      tryThis: [
        'Bấm nhanh nhiều mã liên tiếp — chỉ mã cuối cùng được hiển thị',
        'Đổi khung thời gian và xem lớp che hiện dần rồi mờ đi',
        'So với cảnh Chỉ báo: chuyển đổi nhanh không bao giờ bị nháy',
      ],
    },
  },

  gallery: {
    eyebrow: 'Loại biểu đồ',
    title: 'Mọi loại biểu đồ, chạy trực tiếp trên trang',
    subtitleHtml:
      'Mỗi ô là một đối tượng <code>Chart</code> thật, không phải ảnh. Kéo để di chuyển, cuộn để phóng to và rê chuột để xem con trỏ chữ thập; mỗi ô tự phản hồi riêng.',
    tiles: {
      candlestick: { name: 'Nến', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Xu hướng' },
      area: { name: 'Vùng', tag: 'Giá đóng cửa' },
      baseline: { name: 'Đường cơ sở', tag: 'Trên / dưới' },
      bar: { name: 'Thanh OHLC', tag: 'Cổ điển' },
      stepLine: { name: 'Đường bậc thang', tag: 'Rời rạc' },
    },
  },

  finance: {
    eyebrow: 'Biểu đồ tài chính',
    title: 'Không chỉ có nến',
    subtitle: 'Sparkline, đường cong vốn, độ sâu sổ lệnh, bản đồ nhiệt theo ngành, biểu đồ thác nước và đồng hồ đo cho danh mục đầu tư và KPI.',
    portfolio: 'Hiệu suất danh mục',
    depth: 'Độ sâu sổ lệnh',
    heatmap: 'Bản đồ nhiệt thị trường crypto',
    pnl: 'Phân bổ lãi/lỗ',
    fearGreed: 'Chỉ số Sợ hãi & Tham lam',
    waterfall: {
      start: 'Đầu kỳ',
      btcLong: 'Long BTC',
      ethShort: 'Short ETH',
      solLong: 'Long SOL',
      fees: 'Phí',
      end: 'Cuối kỳ',
    },
    zones: {
      extremeFear: 'Cực kỳ sợ hãi',
      fear: 'Sợ hãi',
      neutral: 'Trung lập',
      greed: 'Tham lam',
      extremeGreed: 'Cực kỳ tham lam',
    },
  },

  terminal: {
    symbol: 'Mã',
    timeframe: 'Khung thời gian',
    chartType: 'Loại biểu đồ',
    types: {
      candlestick: 'Nến',
      heikinAshi: 'Heikin-Ashi',
      area: 'Vùng',
      bar: 'Thanh',
      baseline: 'Đường cơ sở',
    },
    unavailable: 'Không kết nối được dữ liệu trực tiếp: {error}',
    live: 'TRỰC TIẾP',
    offline: 'NGOẠI TUYẾN',
    connecting: 'ĐANG KẾT NỐI',
    hints: [
      ['Kéo', 'di chuyển'],
      ['Cuộn', 'phóng to'],
      ['Kéo trục', 'co giãn'],
    ],
  },

  copy: {
    copy: 'SAO CHÉP',
    copied: 'ĐÃ CHÉP',
    copiedAnnouncement: 'Đã sao chép vào bộ nhớ tạm',
    copyLabel: 'Sao chép {label}',
    copyCode: 'Sao chép mã nguồn',
    codeSample: 'Mã mẫu',
    packageManager: 'Trình quản lý gói',
    copyInstall: 'Sao chép lệnh cài đặt',
  },

  examples: {
    metaTitle: 'Ví dụ · TradeCanvas',
    description: 'Ví dụ chạy trực tiếp trên StackBlitz cho JS thuần, React, Vue, Svelte, ChartWidget và bảng điều khiển tài chính.',
    eyebrow: 'Ví dụ · StackBlitz',
    title: 'Ví dụ',
    subtitleHtml:
      'Sandbox chạy trực tiếp, fork chỉ với một cú bấm. Mỗi ví dụ mở trong StackBlitz, đã cài sẵn các gói 1.x mới nhất. Muốn thử tính năng mà không cần cài đặt gì, hãy dùng <a href="{lab}">Feature Lab</a> trên trang chủ.',
    open: 'Mở {title} trong StackBlitz',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'Chart headless: luồng dữ liệu Binance trực tiếp, Bollinger + RSI và các công cụ vẽ trên giao diện của riêng bạn.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'Toàn bộ giao diện giao dịch trong một lệnh gọi: thanh công cụ, 69 công cụ vẽ, danh mục theo dõi, giao dịch, phát lại, bằng 14 ngôn ngữ.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — props reactive, có kiểu, truy cập Chart bên dưới qua ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, props reactive, nhận Chart từ @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — runes, props reactive, bind:chart.',
      },
      finance: {
        title: 'Bảng điều khiển tài chính',
        blurb: 'Các bộ vẽ sparkline, đồng hồ đo, bản đồ nhiệt, độ sâu sổ lệnh và đường cong vốn trong cùng một bố cục.',
      },
    },
  },

  playground: {
    metaTitle: 'Playground · TradeCanvas',
    description: 'Fork một sandbox TradeCanvas tương tác trên StackBlitz và bắt tay vào code.',
    eyebrow: 'Playground · StackBlitz',
    title: 'Playground',
    subtitle: 'Một sandbox chỉnh sửa được trên StackBlitz, với ChartWidget đã kết nối sẵn dữ liệu Binance trực tiếp.',
    launch: 'Mở playground',
    more: 'Thêm ví dụ',
    insideTitle: 'Bên trong có gì',
    insideHtml:
      'Một dự án Vite + TypeScript tối giản với đúng một tệp, <code>src/main.ts</code>, gắn <code>ChartWidget</code> và kết nối một <code>BinanceAdapter</code>.',
  },

  changelog: {
    metaTitle: 'Nhật ký thay đổi — TradeCanvas',
    description: 'Ghi chú phát hành của mọi phiên bản TradeCanvas.',
    englishOnly: 'Ghi chú phát hành được viết bằng tiếng Anh.',
  },

  backtest: {
    title: 'Backtest trực tiếp — giao cắt SMA(10/30)',
    subtitle: '365 ngày dữ liệu giá tổng hợp, vốn ban đầu $10k, phí 0,05%, trượt giá 0,03%.',
    play: 'Phát',
    pause: 'Tạm dừng',
    replay: 'Phát lại',
    end: 'Cuối',
    running: 'Đang chạy backtest…',
    failed: 'Lỗi: {error}',
    bar: 'Nến {index}/{total}',
    totalReturn: 'Tổng lợi nhuận',
    maxDrawdown: 'Sụt giảm tối đa',
    winRate: 'Tỷ lệ thắng',
    profitFactor: 'Hệ số lợi nhuận',
    trades: 'Số giao dịch',
  },

  error: {
    notFound: 'Không tìm thấy trang',
    notFoundText: 'Trang này không tồn tại hoặc đã được chuyển đi.',
    other: 'Đã có lỗi xảy ra',
    otherText: 'Không hiển thị được trang này. Hãy thử lại, hoặc quay về trang chủ.',
    home: 'Về trang chủ',
    docs: 'Mở tài liệu',
  },

  docs: {
    titleSuffix: 'Tài liệu TradeCanvas',
    navLabel: 'Điều hướng tài liệu',
    groups: {
      start: 'Bắt đầu',
      chart: 'Biểu đồ',
      trading: 'Giao dịch',
    },
    pages: {
      'getting-started': 'Bắt đầu',
      frameworks: 'Framework',
      embed: 'Widget nhúng',
      api: 'Tham chiếu API',
      'chart-types': 'Loại biểu đồ',
      indicators: 'Chỉ báo',
      'drawing-tools': 'Công cụ vẽ',
      plugins: 'Plugin',
      performance: 'Hiệu năng',
      trading: 'Lớp phủ giao dịch',
      finance: 'Biểu đồ tài chính',
      realtime: 'Thời gian thực & Phát lại',
      analytics: 'Phân tích',
    },
    notTranslated: 'Trang này chưa được dịch, nên đang hiển thị bằng tiếng Anh.',
  },
};

export default vi;

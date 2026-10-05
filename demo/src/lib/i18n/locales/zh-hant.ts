import type { SiteMessages } from '../messages';

const zhHant: SiteMessages = {
  meta: {
    title: 'TradeCanvas · 網頁用的 Canvas 交易圖表',
    description:
      'TradeCanvas 是以 Canvas2D 繪製的交易圖表函式庫：17 種圖表類型、95 個指標、69 種繪圖工具、交易所即時行情、圖上下單、K線回放與回測。零相依套件，MIT 授權。',
  },

  nav: {
    main: '主導覽',
    docs: '文件',
    examples: '範例',
    playground: '線上沙盒',
    changelog: '更新紀錄',
    toLight: '切換為淺色主題',
    toDark: '切換為深色主題',
    github: 'TradeCanvas 的 GitHub',
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
    menu: '選單',
    language: '語言',
  },

  footer: {
    tagline: '網頁用的 Canvas2D 交易圖表。零相依套件，MIT 授權。',
    library: '函式庫',
    packages: '套件',
    project: '專案',
    gettingStarted: '快速入門',
    apiReference: 'API 參考',
    examples: '範例',
    changelog: '更新紀錄',
    issues: '問題回報',
    boGrid: 'bo-grid（資料表格）',
    builtWith: '以 TradeCanvas 打造',
  },

  home: {
    release: '雙層 Canvas 渲染，自由平移',
    title: '為交易應用打造的圖表引擎。',
    ledeHtml:
      '從蠟燭圖到 Renko，95 個指標、69 種繪圖工具、交易所即時行情，還能直接在圖上下單。以 Canvas2D 繪製，零相依套件。可直接放入完整的 <code>ChartWidget</code>，或在 headless 的 <code>Chart</code> 上打造自己的介面。',
    getStarted: '開始使用',
    browseExamples: '瀏覽範例',
    specsLabel: '關鍵數字',
    specs: [
      '圖表類型',
      '指標',
      '繪圖工具',
      '執行期相依套件',
      'gzip 後的 headless 核心',
      '10 萬根K線下的懸停重繪',
    ],
    hood: {
      eyebrow: '深入底層',
      title: '經過量測、文件齊全，並可自由擴充',
      subtitleHtml: '功能實驗室背後的引擎。以下每個數字都能用 <code>pnpm bench</code> 重現。',
      frameBudget: '影格預算',
      perf: [
        '10 萬根K線、4 個指標下的即時 tick',
        '切換商品後完整重算，10 萬根K線',
        'LTTB 降採樣，10 萬 → 1,600 個點',
        '懸停重繪，從 500 到 10 萬根K線都一樣快',
      ],
      perfFoot: '兩層疊放的 Canvas：滑鼠懸停時只重繪上方輕量的那一層。每個渲染器都只走訪畫面上的K線。',
      gestures: '手勢',
      gestureList: [
        ['拖曳', '平移，可越過最後一根K線'],
        ['滾輪', '以游標為中心縮放'],
        ['雙指縮放', '在觸控螢幕上縮放'],
        ['向右拖曳', '邊拖邊載入更早的K線'],
        ['拖曳座標軸', '縮放該軸'],
        ['Ctrl + 拖曳', '選取繪圖'],
        ['Shift + 拖曳', '測量'],
        ['Alt + 點擊', '固定提示框'],
      ],
    },
    capabilities: [
      {
        label: '元件',
        title: '一次呼叫，完整交易介面',
        text: 'ChartWidget 內建工具列、繪圖側欄、自選清單、價格警示、物件樹、資料視窗、K線回放與命令面板（Ctrl+K），支援 16 種語言，從英文、越南文到中文、日文、韓文與阿拉伯文。',
      },
      {
        label: '資料',
        title: '任何市場行情來源',
        text: '內建 Binance、Coinbase、Bybit 與 Kraken 轉接器；其他來源可用 WebSocketAdapter 與 PollingAdapter。往回捲動時會自動載入更早的K線；斷線會自動重連，並捨棄已被取代的商品切換。',
      },
      {
        label: '交易',
        title: '直接在圖上下單',
        text: 'ExecutionAdapter 搭配模擬券商，可拖曳建立委託、下括號單、拖曳停損與停利線，警示可發送到 webhook 與桌面通知。',
      },
      {
        label: '框架',
        title: 'React、Vue 與 Svelte',
        text: '@tradecanvas/react、/vue 與 /svelte 以具型別的響應式 props 包裝同一個引擎。完整的 Chart 實例只需一個 ref 就能取得。',
      },
      {
        label: '外掛',
        title: '每一層都能擴充',
        text: '可註冊支援增量 update() 的自訂指標、繪圖工具、圖表類型與疊加層，全域或單一圖表皆可。',
      },
      {
        label: '分析',
        title: '回測就在圖表旁',
        text: '逐根K線執行的 Backtester，附蒙地卡羅區間帶；指標在 Web Worker 管線中運算，讓主執行緒保持空閒。',
      },
    ],
    quickstart: {
      eyebrow: '快速開始',
      title: '同一個圖表，五種上手方式',
      subtitle: '完整的 widget、框架元件或 headless 引擎，全部共用同一個渲染器。',
      tabs: '快速開始的方式',
    },
    closing: {
      title: '今天就在你的應用中放上即時圖表。',
      readDocs: '閱讀文件',
      star: '在 GitHub 上給星',
    },
  },

  lab: {
    eyebrow: '功能實驗室',
    title: '每項功能，都在即時圖表上。',
    subtitleHtml:
      '選擇一個場景。每個場景都會啟動完整的 <code>ChartWidget</code>，並設定成展示某項功能的狀態——之後就交給你拖曳、繪圖與切換。',
    scenes: '功能場景',
    widgetLanguage: '元件語言',
    widgetLook: '元件外觀',
    widgetRenderer: '渲染器',
    idle: '捲動到此處即可啟動即時圖表',
    metricHint: '切換商品或週期即可計時',
    metricSwitch: '→ {label}：{ms} · {bars} 根K線',
    metricSetData: 'setData({bars} 根K線)：{ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}：平移時每幀 {ms}',
    metricRendererMissing: '此處沒有 WebGL 2：改用 Canvas 2D 繪製',
    tryThis: '試試看',
  },

  scenes: {
    drawings: {
      title: '繪圖工具',
      stat: '69 種工具',
      blurb:
        '斐波那契與江恩工具可自訂級別，另有艾略特波浪、諧波型態、筆記與筆刷。雙擊繪圖開啟設定，右擊開啟選單；警示會跟隨趨勢線，多/空部位工具會算出部位大小。',
      tryThis: [
        '雙擊斐波那契回撤，編輯它的級別',
        '右擊一個繪圖：上移一層、群組或新增警示',
        '選擇筆刷或路徑工具；按 Enter 結束一條路徑',
      ],
    },
    indicators: {
      title: '指標',
      stat: '內建 95 個',
      blurb:
        '疊加與副圖指標皆自行計算，不依賴任何數學套件。即時 tick 只重算正在形成的那根K線——10 萬根K線、四個指標下，每個 tick 僅需 0.001 ms。',
      tryThis: [
        '按下「指標」按鈕（或 Ctrl+K），從 95 個指標中搜尋',
        '點擊圖例中的指標名稱：參數、顏色與水平線',
        '把移動平均線的「Source」設為另一個指標的線',
        '拖曳副圖之間的分隔線來調整大小；副圖右上角的按鈕可以移動、收合或最大化副圖',
        '圖例列上的 ⋯ 可以把指標移到上方或下方的副圖，或獨立的新副圖',
        '「指標」選單 →「將指標儲存為範本…」；Ctrl+Z 也能復原對指標的變更',
        '在圖表上直接輸入數字（先輸 4，再輸 h，按 Enter）切換週期；Alt+T 選取趨勢線',
      ],
    },
    trading: {
      title: '交易',
      stat: '模擬券商',
      blurb:
        '直接在圖表上操作委託與部位：拖曳停損與停利，從線上取消、平倉或反手，每筆成交都會標記在所在的K線上。圖表下方有下單面板與帳戶面板；全部透過 ExecutionAdapter 傳送——這裡用的是內附的模擬券商。',
      tryThis: [
        '在多單部位上按 ⇅ 反手，或按 × 平倉——成交會以標記顯示在所在的K線上',
        '在價格下方右擊：可在該價格限價買進、停損賣出，或新增委託',
        '圖表下方的帳戶面板列出部位及其損益、委託與歷史',
        '拖曳多單部位的 SL / TP 線——券商會同步更新',
        '價格軸旁的 + 可在該價格新增警示、委託或水平線',
      ],
    },
    workspace: {
      title: '工作區',
      stat: '多圖表',
      blurb:
        '兩個圖表並排，透過十字游標連動——也可依需要以代碼、週期、時間與繪圖連動。將整個工作區儲存為具名的版面配置，隨時回來繼續。',
      tryThis: [
        '在其中一個圖表上移動滑鼠：另一個圖表會顯示同一時間',
        '在「同步」列中開啟「週期」，再變更其中一個圖表的週期',
        '在列中選擇四個圖表；同步「代碼」時，新圖表會以目前作用中圖表的代碼開啟',
        '版面配置 ▾ → 另存為…，做些變更，再重新開啟該版面配置（Ctrl+S 可儲存）',
      ],
    },
    navigation: {
      title: '範圍與版面',
      stat: '1D … 全部',
      blurb:
        '跳到某個區間或日期、翻轉價格座標、固定常用的週期、同一個指標加上多次——再從已儲存的版面一次還原。',
      tryThis: [
        '點擊圖表下方的 1M、3M 或 6M；Alt+G 可跳至日期',
        'Alt+I 可上下反轉價格座標；對數座標在「設定」中',
        '設定 → 時區：選擇紐約或東京——座標軸、日界線與 YTD 都會跟著調整，夏令時間也包含在內',
        '設定 → 座標 → 左側價格座標；EMA 的「樣式」分頁可將它移到該座標上',
        '在週期按鈕旁的 ▾ 選單中，為週期加上星號',
        '開啟左側工具列的 ↻ 按鈕即可連續畫多條線；Ctrl+C / Ctrl+V 可複製這些線',
      ],
    },
    history: {
      title: '往回捲動歷史',
      stat: '分頁載入歷史',
      blurb:
        '往最舊的K線拖曳時，更早的K線會一頁一頁載入，畫面上的內容保持不動。縮小到所有已載入的K線都放得下：每根K線不到一個像素時，K線會依像素欄合併，即使數千根K線也清晰可讀。',
      tryThis: [
        '把圖表向右拖曳：左側的提示會顯示正在載入更早的K線',
        '用滾輪縮小，越過數百根K線，一直到每根K線只佔四分之一像素',
        '點擊圖表下方的「全部」，顯示目前已載入的所有K線',
        '在 ▾ 週期選單輸入 7 或 90：Binance 沒有這兩種週期，因此圖表會用 1m 與 30m 的K線組成',
      ],
    },
    replay: {
      title: 'K線回放',
      stat: '進度條',
      blurb:
        '逐根K線走過歷史，在不知道後續走勢的情況下練習判讀。回放期間即時資料會先擱置；價格座標會隨每一步自動調整。',
      tryThis: [
        '按下播放，或用 Shift+→ / Shift+← 一次前進或後退一根',
        '點擊任一已顯示的K線，游標就會跳到那裡',
        '「返回即時」會回到即時序列',
        '在回放列的「步長」中選擇更小的週期（15m），看每根K線逐步形成',
      ],
    },
    compare: {
      title: '比較、價差、比值',
      stat: '多商品',
      blurb:
        'ETH 顯示在 BTC 旁邊的獨立價格座標上，BTC ÷ ETH 顯示在副圖中。其他商品依時間與圖表對齊；價差或比值和任何指標一樣有圖例、數值標籤與警示。畫面上的最高價與最低價會標示出來。',
      tryThis: [
        '開啟物件樹，按下「比較」旁的 +：先選商品，再選比較方式',
        '在比值副圖上右擊，可切換為百分比座標',
        '在圖表上右擊：「匯出資料 (CSV)」會一併帶上每條指標線',
        '切換週期：另一個商品的K線會重新取得',
      ],
    },
    bonds: {
      title: '以 1/32 報價的債券',
      stat: '格式',
      blurb:
        '一檔以 1/32 及半個 1/32 報價的債券（110’165 即 110 又 16½/32），以高低圖顯示。圖表上的每個價格——座標軸、十字游標、圖例、委託、繪圖——都採用相同格式，座標軸刻度也剛好落在整數分數上。',
      tryThis: [
        '滑鼠懸停：十字游標與圖例以 1/32 顯示',
        '設定 → 顯示 → 關閉「延長交易時段」，只看正常交易時段',
        '切換到磚形圖或卡吉圖，並在「設定」中設定方塊大小或反轉幅度',
        '畫一條水平線：它的標籤同樣以 1/32 顯示',
      ],
    },
    subcent: {
      title: '16 種語言，不到一美分的價格',
      stat: 'i18n',
      blurb:
        '整個元件支援 16 種語言——選單、設定、繪圖工具、對話框，阿拉伯文與希伯來文由右至左顯示——數字也採用各語言自己的格式。PEPE 的價格約在 0.000004 附近：每個標籤都遵循價格座標的精度，座標軸也會自動加寬以容納。',
      tryThis: [
        '在圖表上方選擇語言：日本語、한국어、简体中文、Deutsch…',
        'Ctrl+P 邊打字邊搜尋所有 Binance 商品，並顯示名稱',
        '開啟「設定」或繪圖工具，查看翻譯後的介面',
        '滑鼠懸停：十字游標的標籤會以該語言的數字格式保留完整精度',
      ],
    },
    looks: {
      title: '專屬於你的外觀',
      stat: '3 套預設',
      blurb:
        '元件的形狀與尺寸都由 token 決定：圓角、控制項高度、字型、邊框、陰影、選取中按鈕的樣式，以及工具列是停靠還是浮動。從 Studio、Terminal 或 Capsule 出發，想改哪裡就改哪裡；圖表上的價格標籤也會套用相同的圓角。',
      tryThis: [
        '在圖表上方切換外觀：就地生效，不會重建任何東西',
        '在每種外觀下開啟「設定」、選單或繪圖工具看看',
        'Capsule 讓工具列與繪圖工具像小島一樣浮動，價格標籤也變成膠囊形',
        'Terminal 緊湊方正：標籤全為大寫，選取中的週期下方有一條底線',
      ],
    },
    markets: {
      title: '自選清單與行情',
      stat: '即時報價',
      blurb:
        '附帶資料來源即時報價的商品清單，一個顯示商品價格、市場狀態與當日數據的面板，還有 Tick 圖：每 100 筆成交一根K線。',
      tryThis: [
        '打開自選清單的選單：切換到 Memes，建立你自己的清單，再重新命名',
        '用 + 新增商品，拖曳列來重新排序，或在某一列上按 Delete',
        '在圖表上輸入 100T，每 100 筆成交畫一根K線，再輸入 1m 回到原樣',
        '將滑鼠移到圖表上，底部會出現縮放與捲動按鈕',
      ],
    },
    bigdata: {
      title: '20 萬根K線',
      stat: '效能',
      blurb:
        '二十萬根 1 分鐘K線，加上四個指標。渲染只處理可見的K線；較大的週期會在本機重新取樣，若耗時超過幾個影格，就會先蓋上載入遮罩。',
      tryThis: [
        '在圖表上方切換 Canvas 2D 與 WebGL：每次切換都會測一次短暫平移',
        '切換到 1H、4H，再回到 1m——耗時會顯示在圖表下方',
        '縮小到底再平移：每個影格的成本維持不變',
        '再加一個指標，觀察切換所需的時間',
      ],
    },
    heatmap: {
      title: '流動性熱力圖',
      stat: '240 × 80 格',
      blurb:
        '240 個委託簿快照，每個 80 檔價位，在K線後方組成熱力圖：掛單量依價位亮起，買盤綠色、賣盤紅色，長時間停留的掛單牆一目了然。使用 WebGL 時，這 19,200 個格子在 GPU 上繪製於K線之下。',
      tryThis: [
        '在圖表上方切換 Canvas 2D 與 WebGL：每次切換都會測一次短暫平移',
        '尋找明亮的橫列：長時間停在同一價位的掛單牆',
        '放大某一道掛單牆後來回平移：格子與K線同步移動',
      ],
    },
    switching: {
      title: '慢速網路下的切換',
      stat: '+1.2 s 延遲',
      blurb:
        '這裡的每個歷史資料請求都會延遲 1.2 s。切換時前一張圖表會留在畫面上，只有在切換超過 200 ms 時才會蓋上遮罩；快速連點也不會讓過期的回應勝出。',
      tryThis: [
        '快速點擊多個商品——只有最後一個會生效',
        '切換週期，觀察遮罩淡入再淡出',
        '與「指標」場景比較：快速切換時完全不會閃爍',
      ],
    },
  },

  gallery: {
    eyebrow: '圖表類型',
    title: '所有圖表類型，都在頁面上即時運作',
    subtitleHtml:
      '每個區塊都是真正的 <code>Chart</code> 實例，而不是圖片。拖曳可平移、滾輪可縮放、懸停可顯示十字游標；每個區塊都各自獨立回應。',
    tiles: {
      candlestick: { name: '蠟燭圖', tag: 'OHLC' },
      heikinAshi: { name: '平均K線', tag: '趨勢' },
      area: { name: '面積圖', tag: '收盤價' },
      baseline: { name: '基準線', tag: '高於 / 低於' },
      bar: { name: 'OHLC 美國線', tag: '經典' },
      stepLine: { name: '階梯線', tag: '離散' },
    },
  },

  finance: {
    eyebrow: '金融圖表',
    title: '不只是蠟燭圖',
    subtitle: '迷你走勢圖、權益曲線、委託簿深度、類股熱力圖、瀑布圖與儀表圖，適用於投資組合與 KPI。',
    portfolio: '投資組合績效',
    depth: '委託簿深度',
    heatmap: '加密貨幣市場熱力圖',
    pnl: '損益歸因',
    fearGreed: '恐懼與貪婪指數',
    waterfall: {
      start: '期初',
      btcLong: 'BTC 多單',
      ethShort: 'ETH 空單',
      solLong: 'SOL 多單',
      fees: '手續費',
      end: '期末',
    },
    zones: {
      extremeFear: '極度恐懼',
      fear: '恐懼',
      neutral: '中立',
      greed: '貪婪',
      extremeGreed: '極度貪婪',
    },
  },

  terminal: {
    symbol: '商品',
    timeframe: '週期',
    chartType: '圖表類型',
    types: {
      candlestick: '蠟燭圖',
      heikinAshi: '平均K線',
      area: '面積圖',
      bar: '美國線',
      baseline: '基準線',
    },
    unavailable: '無法取得即時行情：{error}',
    live: '即時',
    offline: '離線',
    connecting: '連線中',
    hints: [
      ['拖曳', '平移'],
      ['滾輪', '縮放'],
      ['拖曳座標軸', '調整刻度'],
    ],
  },

  copy: {
    copy: '複製',
    copied: '已複製',
    copiedAnnouncement: '已複製到剪貼簿',
    copyLabel: '複製 {label}',
    copyCode: '複製程式碼',
    codeSample: '程式碼範例',
    packageManager: '套件管理工具',
    copyInstall: '複製安裝指令',
  },

  examples: {
    metaTitle: '範例 · TradeCanvas',
    description: '在 StackBlitz 上即時執行的範例，涵蓋原生 JS、React、Vue、Svelte、ChartWidget 與金融儀表板。',
    eyebrow: '範例 · StackBlitz',
    title: '範例',
    subtitleHtml:
      '一鍵即可 fork 的線上沙盒。每個範例都會在 StackBlitz 中開啟，並已接好最新的 1.x 套件。想免設定直接試用功能，請使用首頁的<a href="{lab}">功能實驗室</a>。',
    open: '在 StackBlitz 中開啟 {title}',
    items: {
      vanilla: {
        title: '原生 JS',
        blurb: 'headless 的 Chart：Binance 即時串流、Bollinger + RSI，以及在你自己介面上的繪圖工具。',
      },
      widget: {
        title: 'ChartWidget',
        blurb: '一次呼叫就有完整的交易介面：工具列、69 種繪圖工具、自選清單、交易、K線回放，支援 16 種語言。',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react——具型別的響應式 props，並可透過 ref 取得底層的 Chart。',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue——script setup、響應式 props，從 @ready 取得 Chart。',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte——runes、響應式 props、bind:chart。',
      },
      finance: {
        title: '金融儀表板',
        blurb: '迷你走勢圖、儀表圖、熱力圖、深度圖與權益曲線渲染器，集中在同一個版面。',
      },
    },
  },

  playground: {
    metaTitle: '線上沙盒 · TradeCanvas',
    description: '在 StackBlitz 中 fork 一個可互動的 TradeCanvas 沙盒，馬上動手寫程式。',
    eyebrow: '線上沙盒 · StackBlitz',
    title: '線上沙盒',
    subtitle: 'StackBlitz 上可直接編輯的沙盒，ChartWidget 已連上 Binance 即時資料。',
    launch: '啟動線上沙盒',
    more: '更多範例',
    insideTitle: '裡面有什麼',
    insideHtml:
      '一個精簡的 Vite + TypeScript 專案，只有一個檔案 <code>src/main.ts</code>，負責掛載 <code>ChartWidget</code> 並連接 <code>BinanceAdapter</code>。',
  },

  changelog: {
    metaTitle: '更新紀錄 — TradeCanvas',
    description: 'TradeCanvas 每個版本的發行說明。',
    englishOnly: '發行說明以英文撰寫。',
  },

  backtest: {
    title: '即時回測 — SMA(10/30) 交叉',
    subtitle: '365 天合成價格資料，初始資金 $10k，手續費 0.05%，滑價 0.03%。',
    play: '播放',
    pause: '暫停',
    replay: '重播',
    end: '末端',
    running: '正在回測…',
    failed: '失敗：{error}',
    bar: 'K線 {index}/{total}',
    totalReturn: '總報酬',
    maxDrawdown: '最大回撤',
    winRate: '勝率',
    profitFactor: '獲利因子',
    trades: '交易次數',
  },

  error: {
    notFound: '找不到頁面',
    notFoundText: '此頁面不存在，或已被移動。',
    other: '發生錯誤',
    otherText: '無法顯示此頁面。請重試，或從首頁開始。',
    home: '返回首頁',
    docs: '查看文件',
  },

  docs: {
    titleSuffix: 'TradeCanvas 文件',
    navLabel: '文件導覽',
    groups: {
      start: '快速入門',
      chart: '圖表',
      trading: '交易',
    },
    pages: {
      'getting-started': '快速入門',
      frameworks: '框架整合',
      embed: '可嵌入的元件',
      api: 'API 參考',
      styling: '樣式',
      'chart-types': '圖表類型',
      indicators: '指標',
      'drawing-tools': '繪圖工具',
      plugins: '外掛',
      performance: '效能',
      trading: '交易圖層',
      finance: '金融圖表',
      realtime: '即時與回放',
      analytics: '分析',
    },
    notTranslated: '此頁面尚未翻譯為{language}，因此以英文顯示。',
  },
};

export default zhHant;

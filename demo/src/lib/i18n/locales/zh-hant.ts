import type { SiteMessages } from '../messages';

const zhHant: SiteMessages = {
  meta: {
    title: 'TradeCanvas · 網頁用的 Canvas 交易圖表',
    description:
      'TradeCanvas 是一套網頁用的交易圖表函式庫，可用 Canvas 2D 或 WebGL 繪製：18 種圖表類型、111 個指標、69 種繪圖工具、交易所即時行情、直接在圖上下單、回放與回測，支援 30 種語言。零相依套件，MIT 授權。',
  },

  nav: {
    main: '主導覽',
    docs: '文件',
    examples: '範例',
    playground: '線上沙盒',
    changelog: '更新紀錄',
    audit: '稽核',
    business: '企業',
    toLight: '切換為淺色主題',
    toDark: '切換為深色主題',
    github: 'TradeCanvas 的 GitHub',
    sponsor: '贊助',
    sponsorLabel: '在 GitHub 上贊助 TradeCanvas',
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
    menu: '選單',
    language: '語言',
  },

  footer: {
    tagline: '網頁用的交易圖表，以 Canvas 2D 或 WebGL 繪製。零相依套件，MIT 授權。',
    library: '函式庫',
    packages: '套件',
    project: '專案',
    gettingStarted: '快速入門',
    apiReference: 'API 參考',
    examples: '範例',
    changelog: '更新紀錄',
    audit: '系統稽核',
    business: '企業專區',
    issues: '問題回報',
    boGrid: 'bo-grid（資料表格）',
    builtWith: '以 TradeCanvas 打造',
  },

  home: {
    release: 'WebGL 渲染器，30 種語言',
    title: '為交易應用打造的圖表引擎。',
    ledeHtml:
      '從蠟燭圖到 Renko，111 個指標、69 種繪圖工具、交易所即時行情，還能直接在圖上下單。以 Canvas 2D 或 WebGL 繪製，零相依套件。可直接放入完整的 <code>ChartWidget</code>，或在 headless 的 <code>Chart</code> 上打造自己的介面。',
    getStarted: '開始使用',
    browseExamples: '瀏覽範例',
    specsLabel: '關鍵數字',
    specs: [
      '指標',
      '繪圖工具',
      '圖表類型',
      '元件語言',
      '根K線，WebGL 下 60 fps',
      '第三方執行期相依套件',
    ],
    tape: '來自 Binance 的即時價格',
    tapePause: '暫停行情',
    tapePlay: '播放行情',
    story: {
      eyebrow: '從第一眼到成交',
      title: '一張圖表，走完整筆交易',
      subtitle: '四張即時圖表，各自示範一部分。可以拖曳、縮放，也能在上面畫線。',
      chapters: [
        {
          title: '解讀行情',
          text: 'K線上疊加通道、均線與震盪指標，再在上面畫斐波那契與趨勢線，每一項都有自己的設定與警示。',
          points: [
            '111 個指標，可以互相疊加，例如 RSI 的均線',
            '69 種繪圖工具，具備磁吸、群組與復原',
            '價格、線條與指標交叉都能警示',
          ],
        },
        {
          title: '在圖上交易',
          text: '委託、部位及其停利停損都顯示在價格軸上。拖曳停損即可移動；模擬券商負責成交，所以接上真實券商前就能先做出來。',
          points: [
            '拖曳下單，拖曳停損線與停利線來調整',
            '成交標記與損益直接顯示在圖上',
            '你的券商透過一個轉接器接入',
          ],
        },
        {
          title: '回放歷史',
          text: '逐根K線翻看歷史，或讓它自動播放：指標、繪圖與模擬委託都跟著回放的價格走。',
          points: [
            '任意起始K線，任意速度',
            '每根K線可由更細的K線逐步形成',
            '回放時用模擬券商交易',
          ],
        },
        {
          title: '資料再多也順暢',
          text: '這裡有 200,000 根K線與四個指標，正在自動平移。切換渲染器，看看每格畫面的耗時：使用 WebGL 時，K線與線條都由 GPU 繪製。',
          points: [
            'WebGL 下 1,000,000 根K線全部縮小顯示也有 60 fps',
            '沒有 WebGL 時改用 Canvas 2D，外觀一致',
            '只繪製螢幕上的K線',
          ],
        },
      ],
      frameTime: '每格畫面 {ms} ms',
      panning: '自動平移，直到你接手',
      renderer: '渲染器',
      replaying: '回放中',
    },
    trust: {
      label: '開放原始碼',
      downloads: '每月 npm 下載 {n} 次',
      license: '{n} 授權',
      dependencies: '{n} 個執行期相依套件',
      typescript: '所有 API 皆提供 {n} 型別',
    },
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
        text: 'ChartWidget 內建工具列、繪圖側欄、自選清單、價格警示、物件樹、資料視窗、K線回放與命令面板（Ctrl+K），支援 30 種語言，從英文、越南文到中文、日文、韓文與阿拉伯文。',
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
      stat: '內建 111 個',
      blurb:
        '疊加與副圖指標皆自行計算，不依賴任何數學套件。即時 tick 只重算正在形成的那根K線——10 萬根K線、四個指標下，每個 tick 僅需 0.001 ms。',
      tryThis: [
        '按下「指標」按鈕（或 Ctrl+K），從 111 個指標中搜尋',
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
        '買賣標記和交易只在重播到達時才出現',
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
      title: '30 種語言，不到一美分的價格',
      stat: 'i18n',
      blurb:
        '整個元件支援 30 種語言——選單、設定、繪圖工具、對話框，阿拉伯文、希伯來文與波斯文由右至左顯示——數字也採用各語言自己的格式。PEPE 的價格約在 0.000004 附近：每個標籤都遵循價格座標的精度，座標軸也會自動加寬以容納。',
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
    overrides: {
      title: '樣式覆寫',
      stat: '101 個鍵',
      blurb:
        '依鍵單獨設定圖表外觀的任何部分，不受主題限制：每個方向的格線、十字游標、座標軸、窗格、圖例、最新價、成交量以及每種圖表類型的顏色。這裡關閉了直向格線，橫向格線為點線，十字游標為實線，MACD 的訊號線在擁有自己分隔線的窗格中顯示為虛線。',
      tryThis: [
        '切換圖表類型：美國線和 Heikin-Ashi 若沒有自己的顏色，就沿用 K 線的顏色',
        '切換網站主題：沒有覆寫的部分會跟隨主題',
        '打開設定：「樣式」頁可設定每個鍵，包括目前圖表類型的顏色；「交易」頁設定訂單、標記與區域的顏色，選取前為「自動」',
      ],
    },
    parts: {
      title: '你的元件，部件由你決定',
      stat: '112 個開關',
      blurb:
        '元件的每個部分都有開關，預設開啟，執行時可隨時切換：可以是整項功能（警示、設定、快捷鍵），也可以是一個位置（工具列上的某個按鈕、某個選單項目、某組繪圖工具）。你自己的按鈕、選單和狀態項目就放在元件的各個列中。這裡關閉了重播、兩組繪圖工具和資料下載，工具列上多了一個開關選單。',
      tryThis: [
        '開啟工具列上的「features」，逐一開關各部分',
        '繪圖列底部的眼睛按鈕會隱藏工具列和狀態列，再按一次即可恢復 (Alt+X)',
        '在繪圖上按右鍵：最後一項是頁面自己的',
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
        '開啟 WebGL 後，把圖表類型切換為基準線、卡吉圖或點數圖：它們同樣在 GPU 上繪製',
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

  engage: {
    click: '點擊以操作圖表',
    tap: '輕觸以操作圖表',
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
    drawnWith: '以 {renderer} 繪製',
    live: '即時',
    offline: '離線',
    connecting: '連線中',
    hints: [
      ['拖曳', '平移'],
      ['點擊後滾輪', '縮放'],
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
        blurb: '一次呼叫就有完整的交易介面：工具列、69 種繪圖工具、自選清單、交易、K線回放，支援 30 種語言。',
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

  audit: {
    metaTitle: '系統稽核 — TradeCanvas',
    description:
      'TradeCanvas 能做什麼、有多快：依領域列出的所有功能、內建顯示晶片上的畫面時間、資料路徑、下載大小、測試方式，以及已知的限制。',
    eyebrow: '系統稽核',
    title: '它能做什麼，又做得多快。',
    ledeHtml:
      '本頁所列的一切都包含在 <code>@tradecanvas/chart</code> {version} 中。畫面時間是在一台內建顯示晶片（Intel UHD）的筆電上以 Chrome 量測；在儲存庫中執行 <code>node scripts/bench-render.mjs</code>，就能在你自己的電腦上跑相同的場景。',
    numbersTitle: '數字一覽',
    numbers: [
      '圖表類型',
      '內建指標',
      '繪圖工具',
      '元件語言',
      '樣式鍵',
      '元件功能開關',
      '第三方執行期相依套件',
      '單元測試',
    ],

    perfTitle: '畫面時間',
    perfLede: '平移時繪製一格畫面所需的時間。16.7 ms 即每秒 60 格。',
    perfChart: '圖表',
    perfRatio: '像素比',
    perf: [
      '1600×900，500 根K線 + 4 個指標',
      '1600×900，縮小顯示 200,000 根K線 + 4 個指標',
      '1600×900，縮小顯示 1,000,000 根K線 + 4 個指標',
      '1600×900，深度熱力圖，240 個快照 × 80 檔',
      '六張圖表，各有 500 根K線與 2 個指標',
      '2560×1400，2,000 根K線 + 4 個指標',
      '2560×1400，2,000 根K線 + 4 個指標',
      '2560×1400，2,000 根K線 + 4 個指標',
    ],
    perfNoteHtml:
      '預設使用 Canvas 2D。<code>renderer: \'webgl\'</code>（或 <code>\'auto\'</code>）以 WebGL 2 繪製繪圖區；沒有 WebGL 2 或其內容遺失時，會退回 Canvas 2D。',

    dataTitle: '資料路徑',
    data: [
      '在 100,000 根K線上帶布林通道、EMA、RSI 與 MACD 時處理一筆即時 tick',
      '在 100,000 根K線上完整重算這四個指標',
      '一條 1,000,000 個可見點的折線，為一格畫面降取樣',
      '一次懸停重繪（十字游標、圖例）',
      '切換商品或週期時，超過此時間才顯示載入遮罩',
    ],

    sizeTitle: '下載大小',
    sizeLede: '經壓縮與 gzip 後的大小，含其匯入的所有內容。',
    size: ['Chart，headless API', 'ChartWidget，完整介面', 'WebGL 渲染器，首次使用時載入'],

    qualityTitle: '如何檢驗',
    quality: [
      '七個套件共 3,000 多個單元測試，每個拉取請求都會在 CI 中執行。',
      'WebGL 渲染器把K線畫在與 Canvas 2D 相同的裝置像素上；線條與填色只在少數反鋸齒邊緣像素上有差異。',
      'WebGL 渲染器已在 Chromium、Firefox 與 WebKit 中檢驗。沒有 WebGL 2 或其內容遺失時，圖表會繼續以 Canvas 2D 繪製。',
      '文件與代理技能中的程式碼範例，都會對照真實 API 進行型別檢查。',
      '圖表可由螢幕閱讀器朗讀，也能完全以鍵盤操作；元件在阿拉伯文、希伯來文與波斯文下由右至左顯示。',
    ],

    catalogTitle: '功能',
    catalogLede: '依領域篩選，或以名稱或 API 搜尋。',
    search: '搜尋功能',
    searchPlaceholder: 'replay、webgl、警示…',
    all: '全部',
    count: '{shown} / {total}',
    colCapability: '功能',
    colArea: '領域',
    colDetail: '細節與 API',
    areas: {
      chartTypes: '圖表類型',
      rendering: '渲染',
      indicators: '指標',
      drawings: '繪圖工具',
      scales: '座標與時間',
      data: '資料與即時行情',
      trading: '交易',
      alerts: '警示與回放',
      workspace: '工作區',
      customization: '自訂',
      access: '語言與無障礙',
      developers: '開發者',
    },
    catalog: {
      chartTypes: [
        { name: '蠟燭圖、美國線、折線、面積圖、基準線、平均K線、空心蠟燭圖', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko、新價線、Kagi、點數圖、區間K線', detail: '磚塊大小或 ATR、突破所需的線數、以百分比或價格計的反轉幅度、每根K線的區間' },
        { name: '成交量蠟燭圖、等量圖、HLC 面積圖、階梯線、帶標記的折線、高低圖', detail: '共 18 種圖表類型' },
        { name: '隱藏主序列', detail: '只保留指標與繪圖' },
      ],
      rendering: [
        { name: 'Canvas 2D 或 WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto'、setRenderer、rendererChange 事件" },
        { name: '縮小時每個像素欄只畫一段', detail: '每根K線不足一個像素時的指標線、通道帶與柱狀圖' },
        { name: '流暢平移一百萬根K線', detail: '帶四個指標，像素比為 2' },
        { name: '以 GPU 繪製深度熱力圖、成交量分佈與市場輪廓', detail: 'pushDepthSnapshot(book, time)' },
        { name: '同一頁面上的多張 WebGL 圖表', detail: '最多 8 張（setMaxWebGLCharts）；其餘以 Canvas 2D 繪製；內容恢復後切回 WebGL' },
        { name: '任何螢幕縮放比例下都清晰', detail: '在 100%、125% 與 200% 下，K線、成交量與繪圖都對齊裝置像素' },
        { name: '無第三方執行期相依套件', detail: '不必另外安裝或稽核任何東西' },
      ],
      indicators: [
        { name: '111 個內建指標', detail: '六種樞紐點、MA Cross、與另一商品的相關性' },
        { name: '價格來源', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: '以指標為基礎的指標', detail: '例如 RSI 的移動平均，每筆 tick 都會更新' },
        { name: '一個副圖中放多個指標，並可在副圖間移動', detail: 'moveIndicatorToPane' },
        { name: '同一指標加入多次', detail: 'EMA 20 與 EMA 50 並排顯示' },
        { name: '水平線與門檻', detail: 'RSI 30/70、CCI ±100，隨版面配置一起儲存' },
        { name: '座標軸上的最新值', detail: '顯示在價格軸與各副圖的座標軸上，顏色與線條一致' },
        { name: '副圖的收合、最大化與重新排序', detail: '隨版面配置一起儲存' },
        { name: '指標範本', detail: '輸入參數、樣式、水平線與副圖一併儲存、一併套用' },
        { name: '每條線的樣式與顯示', detail: '隱藏的線不會撐開座標；setIndicatorDefaults' },
        { name: '成交量差與 CVD', detail: '根據K線估算' },
        { name: '匯出指標數值', detail: 'CSV 或 JSON，每條線一欄' },
        { name: '即時 tick 的增量更新', detail: 'update() 只重新計算正在形成的K線' },
      ],
      drawings: [
        { name: '69 種繪圖工具', detail: '直線、通道、費波那契、江恩、叉形線、艾略特波浪、型態、週期、投影' },
        { name: '每種工具各自的設定', detail: '樣式、屬性，以及落在市場價格網格上的座標' },
        { name: '多方與空方部位', detail: '風險報酬比，依風險百分比或金額計算數量' },
        { name: '繪圖上的警示', detail: '價格穿越所畫的趨勢線或通道時觸發，對數座標同樣適用' },
        { name: '層級、群組與範本', detail: '上移、下移、群組、鎖定、隱藏' },
        { name: '註記、標註、箭頭、旗標、筆刷、路徑、曲線', detail: '手繪與多點繪製' },
        { name: '錨定 VWAP 與固定區間成交量分佈', detail: '讀取圖表本身的K線' },
        { name: '橡皮擦、縮放框、強力磁吸、鍵盤快速鍵', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: '跳至日期；從 1D 到 All 的時間範圍', detail: '縮小不設上限' },
        { name: '支援日光節約時間的 IANA 時區', detail: '或使用交易所自己的時區' },
        { name: '任意週期，以及 tick K線', detail: '7m、90m、2d 由行情來源提供的資料組成；100T 由其成交組成' },
        { name: '左右兩側座標；每個副圖可設對數、反轉與百分比', detail: '左側座標可用於疊加圖層，或作為價格座標的副本' },
        { name: '商品比較、價差與比值', detail: '使用獨立的座標或副圖，依時間對齊' },
        { name: '延長交易時段', detail: '依據商品的交易時段' },
        { name: '價格與時間格式', detail: 'priceFormat 可以是函式，或 1/32 這類分數；timeFormatter' },
        { name: '依商品的小數位數與最小跳動點顯示座標', detail: 'pricePrecision、minTick：以 10 為單位跳動的股票絕不會顯示 21,705' },
        { name: '最高價與最低價線、買價與賣價', detail: '買賣價來自行情來源的 tick' },
        { name: '圖表上的事件標記', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: '現成的行情來源，也能接上你自己的', detail: 'Binance、Bybit、Coinbase、Kraken、mock；WebSocketAdapter、PollingAdapter' },
        { name: '向左捲動時載入更早的歷史', detail: 'fetchHistoryBefore' },
        { name: '附詳細資訊的商品搜尋', detail: 'searchSymbols、resolveSymbol：小數位數、最小跳動點、交易時段、時區' },
        { name: '連線後才取得的商品資訊', detail: '轉接器的 symbolInfo 事件' },
        { name: '深度報價階梯', detail: '依價格顯示買賣掛單量；點擊即可交易' },
        { name: '自選清單的即時報價', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: '新聞與市場狀態', detail: 'fetchNews；距離開盤或收盤的倒數' },
      ],
      trading: [
        { name: '圖表上的委託與部位', detail: '拖曳即可修改；直接在線上刪單、平倉與反手' },
        { name: '成交標記', detail: 'executionFill 中附有原因與損益' },
        { name: '下單面板', detail: '數量、類型、停損與停利、有效期限，輸入時即時檢查' },
        { name: '帳戶面板', detail: '附即時損益的部位、未成交委託、成交紀錄' },
        { name: '訊號與交易區域', detail: 'markers.*、tradeZones.* 樣式鍵' },
        { name: '回測與風險指標', detail: '@tradecanvas/analytics：手續費、滑價、Sharpe、Sortino、Calmar、回撤' },
      ],
      alerts: [
        { name: '不只價格水準的警示', detail: '線與線交叉、N 根K線內漲跌 N%、K線收盤時觸發、可設到期時間' },
        { name: '更細步長的K線回放', detail: '以更小週期的K線回放較大的週期' },
        { name: '在回放中模擬交易', detail: '委託以回放的價格成交' },
        { name: '在圖表網格中同步回放', detail: '各圖表保持同步' },
        { name: '供應用程式使用的回放', detail: 'startTime、hideHistory、duration，隨播放逐步顯示的標記，replayComplete' },
      ],
      workspace: [
        { name: '同步連動的元件網格', detail: '最多 6 個，共用商品、週期、十字游標、時間與繪圖' },
        { name: '存放在你自己儲存空間的具名版面配置', detail: '儲存、開啟、重新命名、自動儲存；以 LayoutStorage 接上伺服器' },
        { name: '一切都能復原與重做', detail: '繪圖、指標、設定與圖表類型；recordUndo' },
        { name: '依區域區分的右鍵選單', detail: '繪圖、繪圖區、副圖、價格軸、時間軸' },
        { name: '自選清單', detail: '可建立多個清單，拖曳即可排序' },
        { name: '供宿主應用程式使用的事件', detail: 'symbolChange、timeframeChange、ordersChange、executionFill、styleChange 等' },
      ],
      customization: [
        { name: '元件的三種外觀', detail: 'Studio、Terminal、Capsule；ui 與 setUI；--tcw-* CSS 變數' },
        { name: '依鍵自訂圖表外觀', detail: 'applyOverrides 涵蓋 101 個具型別的鍵，分為宿主層與使用者層' },
        { name: '涵蓋每個鍵的設定', detail: '目前圖表類型的樣式分頁，以及交易分頁' },
        { name: '112 個功能開關', detail: 'features、setFeatures、isFeatureOn；執行中即可變更' },
        { name: '在元件中加入你自己的部件', detail: '工具列按鈕與下拉選單、側邊欄按鈕、狀態列項目、插槽、選單項目' },
        { name: '自訂快速鍵', detail: 'addHotkey，依鍵盤配置辨識' },
      ],
      access: [
        { name: '元件支援 30 種語言', detail: '阿拉伯文、希伯來文與波斯文由右至左顯示' },
        { name: '螢幕閱讀器與鍵盤', detail: '圖表摘要、逐根朗讀K線、對話框可用鍵盤操作' },
        { name: '文件提供六種語言，本站提供十四種', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'React、Vue 與 Svelte 元件', detail: '響應式 props：overrides、indicators、features' },
        { name: '外掛', detail: '指標、繪圖工具、圖表類型與疊加圖層；以 overlayScale 與 getPriceStep 在價格網格上繪製' },
        { name: '給程式設計代理的文件', detail: 'llms.txt、llms-full.txt，以及一個代理技能' },
      ],
    },

    limitsTitle: '已知限制',
    limits: [
      '在 WebGL 經過更多裝置試用之前，Canvas 2D 仍是預設渲染器；WebGL 在 Safari 與 5K 螢幕上的影格率尚未量測。',
      '在 2560×1400 的圖表上、像素比為 2 時，光是瀏覽器的合成在內建顯示晶片上就要約 23 ms，因此該情境下 WebGL 畫面平均為 29 ms。',
      'tick 週期由行情來源回傳的近期成交組成；無法載入更早的 tick 歷史。',
      '成交量差與 CVD 是根據K線估算，而非依據每筆成交的買賣方向。',
      '同一頁面上最多 8 張圖表同時以 WebGL 繪製；其餘以 Canvas 2D 繪製。',
    ],
  },

  business: {
    metaTitle: '企業專區 — TradeCanvas',
    description:
      '在商業產品中使用 TradeCanvas：MIT 授權，圖表上沒有標誌，免註冊，不向任何地方傳送資料。IT 審查會問的問題與出處，以及首批合作夥伴計畫。',
    eyebrow: '企業專區',
    title: '你的交易圖表，掛上你自己的品牌。',
    lede: 'TradeCanvas 採用 MIT 授權。可以放進商業產品、自行修改、自行架設：你的客戶看到的是你的品牌，你的資料留在你自己的伺服器上。',
    ctaContact: '聯絡我們',
    ctaAudit: '閱讀系統稽核',

    freeTitle: '免費，任何用途皆可',
    free: [
      {
        title: '圖表上沒有標誌',
        body: 'TradeCanvas 不會在圖表或元件中繪製任何自己的東西。MIT 授權只要求授權條文隨程式碼一同保留。',
      },
      {
        title: '不向任何地方傳送資料',
        body: '函式庫沒有任何遙測。它只透過你啟動的資料轉接器建立連線：內建的交易所資料源之一，或你自己的。',
      },
      {
        title: '免申請，免審核',
        body: '執行 npm install，系統稽核中的每項功能都歸你使用，包括深度報價階梯、深度圖與熱力圖。',
      },
      {
        title: '完整原始碼',
        body: '閱讀、修改、fork 都可以。MIT 對你自己的程式碼沒有任何要求：程式碼仍屬於你，你想要的話也能保持封閉。',
      },
    ],

    reviewTitle: '為 IT 審查做好準備',
    reviewLede: '資安審查或供應商審查通常會問的問題，以及每個答案可在哪裡查證。',
    reviewHtml: [
      '無第三方執行期相依套件：圖表套件只相依 TradeCanvas 自己的 core 與 commons。',
      '不使用 <code>eval</code> 與 <code>new Function</code>，因此能在不含 <code>unsafe-eval</code> 的 Content Security Policy 下執行。',
      "元件會加入一個 <code>&lt;style&gt;</code> 元素，因此其所在頁面需要 <code>style-src 'unsafe-inline'</code>；headless 的 <code>Chart</code> 不會加入任何元素。",
      '資安問題以私下管道回報，並在一週內回覆。',
      '每個拉取請求都會在 CI 中建置、型別檢查並測試：超過 3,000 個單元測試。',
      '版本由 GitHub Actions 從儲存庫發布，而不是從開發者的電腦發布。',
      'Chrome 80+、Firefox 80+、Safari 14+ 與 Edge 80+。',
      '授權：MIT，一頁。',
    ],
    source: '出處',

    dataTitle: '你的資料，你的伺服器',
    dataHtml:
      '圖表只繪製你交給它的 K 棒、tick 與委託單。用 <code>DataAdapter</code> 串接你自己的後端，或用 <code>WebSocketAdapter</code>，只需提供 URL、歷史資料函式與訊息解析函式；委託單透過你自己的執行轉接器送出。Realtime 與 Trading 文件說明了做法。',
    dataDocs: 'Realtime 文件',
    tradingDocs: 'Trading 文件',

    partnerTitle: '首批合作夥伴',
    partnerLede:
      '我們正在尋找首批將 TradeCanvas 提供給客戶的券商、交易平台與金融科技團隊。',
    partnerGetTitle: '你將獲得',
    partnerGet: [
      '協助串接你的資料源與委託單',
      '你遇到的問題優先修正',
      '參與決定接下來開發什麼',
    ],
    partnerGiveTitle: '我們希望你',
    partnerGive: ['在開發過程中提供意見回饋', '上線後允許我們將你列為使用者'],
    partnerNote:
      '付費支援（合約明訂回應時間、主要版本長期支援、為你量身打造的模組）會在之後推出。如果你現在就需要，請告訴我們。',

    contactTitle: '聯絡我們',
    contactLede: '告訴我們你是誰、正在打造什麼、面向哪些市場。',
    contactPublic: '關於程式碼的問題，最好在 GitHub issues 中公開提問。',

    faqTitle: '常見問題',
    faq: [
      {
        q: '我們必須顯示 TradeCanvas 的名稱或標誌嗎？',
        a: '不必。只要讓授權條文隨程式碼保留，它原本就在 node_modules 裡；螢幕上不必顯示任何內容。',
      },
      {
        q: '我們必須公開自己的程式碼嗎？',
        a: '不必。MIT 對周圍的程式碼沒有任何條件。',
      },
      {
        q: '授權會不會突然改變？',
        a: '每個已發布的版本都是 MIT，並且始終是 MIT：已發布版本的授權無法收回。',
      },
    ],
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
      customization: '自訂',
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

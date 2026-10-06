/**
 * The site's English strings: the source every translation follows.
 *
 * - `{name}` is a placeholder, filled in at runtime; keep it as is.
 * - Keys ending in `Html` may hold `<code>`, `<kbd>`, `<strong>` and `<a>`;
 *   keep the tags and translate the text around them.
 * - Code, package names, API names and keyboard keys stay in English.
 */
const en = {
  meta: {
    title: 'TradeCanvas · Canvas trading charts for the web',
    description:
      'TradeCanvas is a trading chart library for the web, drawn with Canvas 2D or WebGL: 18 chart types, 111 indicators, 69 drawing tools, live exchange feeds, orders on the chart, replay and backtesting, in 30 languages. Zero dependencies, MIT.',
  },

  nav: {
    main: 'Main',
    docs: 'Docs',
    examples: 'Examples',
    playground: 'Playground',
    changelog: 'Changelog',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    github: 'TradeCanvas on GitHub',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menu: 'Menu',
    language: 'Language',
  },

  footer: {
    tagline: 'Trading charts for the web, drawn with Canvas 2D or WebGL. Zero dependencies, MIT licensed.',
    library: 'Library',
    packages: 'Packages',
    project: 'Project',
    gettingStarted: 'Getting started',
    apiReference: 'API reference',
    examples: 'Examples',
    changelog: 'Changelog',
    issues: 'Issues',
    boGrid: 'bo-grid (data grid)',
    builtWith: 'Built with TradeCanvas',
  },

  home: {
    release: 'WebGL renderer, 30 languages',
    title: 'The chart engine for trading apps.',
    ledeHtml:
      'Candlesticks to Renko, 111 indicators, 69 drawing tools, live exchange feeds and orders on the chart. Drawn with Canvas 2D or WebGL, with zero dependencies. Drop in the full <code>ChartWidget</code> or build your own UI on the headless <code>Chart</code>.',
    getStarted: 'Get started',
    browseExamples: 'Browse examples',
    specsLabel: 'Key numbers',
    specs: [
      'indicators',
      'drawing tools',
      'chart types',
      'widget languages',
      'bars at 60 fps with WebGL',
      'runtime dependencies',
    ],
    tape: 'Live prices from Binance',
    tapePause: 'Pause the prices',
    tapePlay: 'Play the prices',
    story: {
      eyebrow: 'From first look to filled order',
      title: 'One chart for the whole trade',
      subtitle: 'Four live charts, each at work on its part of it. Drag them, zoom them, draw on them.',
      chapters: [
        {
          title: 'Read the market',
          text: 'Bands, averages and oscillators over the bars, Fibonacci levels and trend lines on top, each with its own settings and alerts.',
          points: [
            '111 indicators, any one on another, such as an average of the RSI',
            '69 drawing tools with magnet, groups and undo',
            'Alerts on prices, lines and indicator crossings',
          ],
        },
        {
          title: 'Trade on the chart',
          text: 'Orders, positions and their brackets live on the price scale. Drag a stop to move it; the paper broker fills them, so you can build before you connect.',
          points: [
            'Drag to place an order, drag its stop-loss and take-profit to move them',
            'Fill marks and profit and loss on the chart',
            'Your broker plugs in through one adapter',
          ],
        },
        {
          title: 'Replay the past',
          text: 'Step through history bar by bar or let it run: indicators, drawings and paper orders all follow the replayed price.',
          points: [
            'Any start bar, any speed',
            'Each bar can form from finer ones, step by step',
            'Trade the replay with the paper broker',
          ],
        },
        {
          title: 'Scale without stutter',
          text: '200,000 bars here with four indicators, panning on their own. Switch the renderer and watch the frame time: with WebGL the GPU draws the bars and the lines.',
          points: [
            '1,000,000 bars zoomed out at 60 fps with WebGL',
            'Canvas 2D where WebGL isn’t available, with the same look',
            'Only the bars on screen are drawn',
          ],
        },
      ],
      frameTime: '{ms} ms a frame',
      panning: 'Panning on its own until you take over',
      renderer: 'Renderer',
      replaying: 'Replaying',
    },
    /** `{n}` is the figure, set in bold: a count, "MIT", "0" or ".d.ts". */
    trust: {
      label: 'Open source',
      downloads: '{n} npm downloads a month',
      license: '{n} licensed',
      dependencies: '{n} runtime dependencies',
      typescript: '{n} types for every API',
    },
    hood: {
      eyebrow: 'Under the hood',
      title: 'Measured, documented, yours to extend',
      subtitleHtml: 'The engine behind the Feature Lab. Every number below is reproducible with <code>pnpm bench</code>.',
      frameBudget: 'Frame budget',
      perf: [
        'live tick with 4 indicators on 100k bars',
        'full recalculation after a symbol switch, 100k bars',
        'LTTB downsample, 100k → 1,600 points',
        'hover frame, flat from 500 to 100k bars',
      ],
      perfFoot: 'Two stacked canvases: a hover repaints only the thin top one. Every renderer walks only the bars on screen.',
      gestures: 'Gestures',
      gestureList: [
        ['Drag', 'pan, also past the last bar'],
        ['Scroll', 'zoom around the pointer'],
        ['Pinch', 'zoom on a touch screen'],
        ['Drag right', 'older bars load as you go'],
        ['Drag an axis', 'scale it'],
        ['Ctrl + drag', 'select drawings'],
        ['Shift + drag', 'measure'],
        ['Alt + click', 'pin a tooltip'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'One call, full trading UI',
        text: 'ChartWidget brings the toolbar, drawing sidebar, watchlist, alerts, object tree, data window, replay and a command palette (Ctrl+K), in 30 languages from English and Vietnamese to Chinese, Japanese, Korean and Arabic.',
      },
      {
        label: 'Data',
        title: 'Any market feed',
        text: 'Binance, Coinbase, Bybit and Kraken adapters built in; WebSocketAdapter and PollingAdapter for everything else. Older bars load as you scroll back; reconnects on its own and drops superseded symbol switches.',
      },
      {
        label: 'Trading',
        title: 'Orders on the chart',
        text: 'ExecutionAdapter with a paper broker, drag-to-create orders, brackets, draggable stop-loss and take-profit lines, alerts to webhooks and desktop notifications.',
      },
      {
        label: 'Frameworks',
        title: 'React, Vue and Svelte',
        text: '@tradecanvas/react, /vue and /svelte wrap the same engine with reactive, typed props. The full Chart instance stays one ref away.',
      },
      {
        label: 'Plugins',
        title: 'Extend every layer',
        text: 'Register custom indicators with incremental update(), drawing tools, chart types and overlays, globally or per chart.',
      },
      {
        label: 'Analytics',
        title: 'Backtests next to the chart',
        text: 'A bar-by-bar Backtester with Monte Carlo bands and a Web Worker indicator pipeline that keeps the main thread free.',
      },
    ],
    quickstart: {
      eyebrow: 'Quick start',
      title: 'Same chart, five ways in',
      subtitle: 'The full widget, a framework component or the headless engine. They share one renderer.',
      tabs: 'Quick start flavour',
    },
    closing: {
      title: 'Put a live chart in your app today.',
      readDocs: 'Read the docs',
      star: 'Star on GitHub',
    },
  },

  lab: {
    eyebrow: 'Feature lab',
    title: 'Every feature, on a live chart.',
    subtitleHtml:
      'Pick a scene. Each one boots the full <code>ChartWidget</code> into a state that shows one area at work — then it is yours to drag, draw and switch.',
    scenes: 'Feature scenes',
    widgetLanguage: 'Widget language',
    widgetLook: 'Widget look',
    widgetRenderer: 'Renderer',
    idle: 'Scroll into view to start the live chart',
    metricHint: 'Switch a symbol or timeframe to time it',
    metricSwitch: '→ {label}: {ms} · {bars} bars',
    metricSetData: 'setData({bars} bars): {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}: {ms} a frame while panning',
    metricRendererMissing: 'No WebGL 2 here: drawing with Canvas 2D',
    tryThis: 'Try this',
  },

  scenes: {
    drawings: {
      title: 'Drawing tools',
      stat: '69 tools',
      blurb:
        'Fibonacci and Gann tools with your own levels, Elliott waves, harmonic patterns, notes and brushes. Double-click a drawing for its settings, right-click for its menu; alerts follow trend lines, and Long/Short works out the position size.',
      tryThis: [
        'Double-click the Fibonacci retracement and edit its levels',
        'Right-click a drawing: bring it forward, group it, or add an alert',
        'Pick the brush or the path tool; Enter ends a path',
      ],
    },
    indicators: {
      title: 'Indicators',
      stat: '111 built-in',
      blurb:
        'Overlays and panes computed in-house, zero math dependencies. Live ticks recompute only the forming bar — 0.001 ms per tick with four indicators on 100k bars.',
      tryThis: [
        'Press the Indicators button (or Ctrl+K) and search any of the 111',
        'Click an indicator name in the legend: inputs, colours and levels',
        'Set a moving average’s Source to another indicator’s line',
        'Drag the line between panes to resize them; the buttons at a pane’s top right move, fold or maximise it',
        'The ⋯ on a legend row moves the indicator into the pane above or below, or a pane of its own',
        'Indicators menu → Save indicators as template…; Ctrl+Z undoes indicator changes too',
        'Type a number on the chart (4, then h, Enter) to change the interval; Alt+T picks the trend line',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'paper broker',
      blurb:
        'Orders and positions you act on from the chart: drag stops and targets, cancel, close or reverse from the line, and see each fill marked on its bar. An order ticket and an account panel sit under the chart; it all goes through an ExecutionAdapter — here the bundled paper broker.',
      tryThis: [
        'Press ⇅ on the open long to reverse it, or × to close it — the fill shows as a mark on its bar',
        'Right-click below the price: a buy limit, a sell stop or an order ticket at that price',
        'The account panel under the chart lists positions with their P&L, orders and history',
        'Drag the SL / TP lines of the open long — the broker updates them',
        'The + by the price axis offers an alert, an order or a line at its price',
      ],
    },
    workspace: {
      title: 'Workspace',
      stat: 'multi-chart',
      blurb:
        'Two charts side by side, linked by the crosshair — or by symbol, interval, time and drawings as you choose. Save the whole workspace as a named layout and come back to it.',
      tryThis: [
        'Move over one chart: the other shows the same time',
        'Turn on Interval in the Sync bar, then change one chart’s timeframe',
        'Pick four charts in the bar; with Symbol synced the new ones open on the active chart’s symbol',
        'Layout ▾ → Save as…, change something, then open the layout again (Ctrl+S saves)',
      ],
    },
    navigation: {
      title: 'Ranges & layouts',
      stat: '1D … All',
      blurb:
        'Jump to a span or a date, flip the price scale, pin the timeframes you use, run the same indicator several times — and get it all back from a saved layout.',
      tryThis: [
        'Click 1M, 3M or 6M under the chart; Alt+G goes to a date',
        'Alt+I turns the price scale upside down; the log scale is in Settings',
        'Settings → Timezone: pick New York or Tokyo — axis, day breaks and YTD follow it, daylight saving included',
        'Settings → Scale → Left price scale; an EMA’s Style tab can move it onto that scale',
        'Star a timeframe in the ▾ menu next to the timeframe buttons',
        'Turn on the ↻ button in the left toolbar to draw several lines in a row; Ctrl+C / Ctrl+V copies them',
      ],
    },
    history: {
      title: 'Scroll back in time',
      stat: 'paged history',
      blurb:
        'Older bars load as you drag toward the oldest one, a page at a time, and what is on screen stays put. Zoom out until every loaded bar fits: below a pixel per bar the candles merge per pixel column, so thousands of bars stay readable.',
      tryThis: [
        'Drag the chart to the right: a pill on the left shows older bars loading',
        'Scroll to zoom out, past a few hundred bars down to a quarter pixel per bar',
        'Click All under the chart to fit everything loaded so far',
        'Type 7 or 90 in the ▾ timeframe menu: Binance has neither, so the chart builds them from 1m and 30m bars',
      ],
    },
    replay: {
      title: 'Bar replay',
      stat: 'scrubber',
      blurb:
        'Step through history bar by bar to practice reads without hindsight. Live data is held aside while you replay; the price scale fits every step.',
      tryThis: [
        'Press play, or step one bar at a time with Shift+→ / Shift+←',
        'Click any revealed bar to jump the cursor there',
        '“Back to realtime” returns to the live series',
        'Pick a finer Step in the replay bar (15m) to watch each bar form',
      ],
    },
    compare: {
      title: 'Compare, spread, ratio',
      stat: 'symbols',
      blurb:
        'ETH on a price scale of its own beside BTC, and BTC ÷ ETH in a pane. Other symbols line up with the chart by time; the spread or ratio gets a legend, value tags and alerts like any indicator. The highest high and lowest low on screen are marked.',
      tryThis: [
        'Open the object tree and press + by Compare: pick a symbol, then how',
        'Right-click the ratio pane for a percent scale',
        'Right-click the chart: Export data (CSV) takes every indicator line along',
        'Change the interval: the other symbol’s bars are fetched again',
      ],
    },
    bonds: {
      title: 'Bonds in 32nds',
      stat: 'formats',
      blurb:
        'A note quoted in 32nds and half 32nds (110’165 is 110 and 16½ 32nds) on High-Low bars. Every price on the chart — axis, crosshair, legend, orders, drawings — reads the same way, and the axis ticks fall on whole fractions.',
      tryThis: [
        'Hover: the crosshair and the legend read in 32nds',
        'Settings → Display → turn Extended hours off for the regular session only',
        'Switch to Renko or Kagi and set the box or reversal in Settings',
        'Draw a horizontal line: its label reads in 32nds too',
      ],
    },
    subcent: {
      title: '30 languages, sub-cent prices',
      stat: 'i18n',
      blurb:
        'The whole widget in 30 languages — menus, settings, drawing tools, dialogs, Arabic, Hebrew and Persian right to left — with numbers in each one’s own format. PEPE trades around 0.000004: every label follows the price scale’s precision, and the axis widens to fit.',
      tryThis: [
        'Pick a language above the chart: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P searches every Binance symbol, with names, as you type',
        'Open Settings or the drawing tools to see them translated',
        'Hover: the crosshair pill keeps full precision in the language’s number format',
      ],
    },
    looks: {
      title: 'Your own look',
      stat: '3 presets',
      blurb:
        'The widget’s shapes and sizes are tokens: corners, control heights, type, borders, shadows, how a chosen button shows, bars docked or floating. Start from Studio, Terminal or Capsule and change what you like; the chart’s price tags take the same corners.',
      tryThis: [
        'Switch the look above the chart: it changes in place, nothing is rebuilt',
        'Open Settings, a menu or the drawing tools in each look',
        'Capsule floats the toolbar and the drawing tools as islands, with pill price tags',
        'Terminal is dense and square: capital labels, and a line under the chosen interval',
      ],
    },
    overrides: {
      title: 'Style overrides',
      stat: '89 keys',
      blurb:
        'Any part of the chart’s look by key, apart from the theme: the grid each way, the crosshair, the axes, the panes, the legend, the last price, the volume and each chart type’s colours. Here the vertical grid is off, the horizontal one dotted, the crosshair solid, and MACD’s signal line dashed in a pane with a separator of its own.',
      tryThis: [
        'Switch the chart type: bars and Heikin-Ashi take the candles’ colours unless they have their own',
        'Switch the site’s theme: what isn’t overridden follows it',
        'Open Settings and pick a colour: it goes on the user’s layer, kept with the theme',
      ],
    },
    parts: {
      title: 'Your widget, your parts',
      stat: '112 switches',
      blurb:
        'Every part of the widget has a switch, on until you turn it off and changeable while running: a whole capability (alerts, settings, the keys) or one place (a toolbar button, a menu entry, a section of drawing tools). Your own buttons, menus and status items sit in the widget’s bars. Here replay, two sections of drawing tools and the data download are off, and the toolbar carries a menu of switches.',
      tryThis: [
        'Open “features” on the toolbar and switch parts off and on',
        'The eye at the foot of the drawing bar hides the toolbar and the status bar, and brings them back',
        'Right-click a drawing: the last entry is the page’s own',
      ],
    },
    markets: {
      title: 'Watchlists and the market',
      stat: 'live quotes',
      blurb:
        'Lists of symbols with live quotes from the feed, a panel with the symbol’s price, the market’s status and the day, and tick charts: a bar per 100 trades.',
      tryThis: [
        'Open the watchlist’s menu: switch to Memes, make a list of your own, rename it',
        'Add a symbol with +, drag rows to reorder them, or press Delete on one',
        'Type 100T on the chart for a bar per 100 trades, then 1m to go back',
        'Hover the chart for the zoom and scroll buttons at its bottom',
      ],
    },
    bigdata: {
      title: '200,000 bars',
      stat: 'performance',
      blurb:
        'Two hundred thousand 1-minute bars with four indicators. Rendering touches only the visible bars; coarser timeframes are resampled locally, behind a loading veil when that takes more than a few frames.',
      tryThis: [
        'Switch between Canvas 2D and WebGL above the chart: each switch times a short pan',
        'With WebGL on, switch the chart type to Baseline, Kagi or Point & Figure: they draw on the GPU too',
        'Switch to 1H, 4H and back to 1m — timings appear under the chart',
        'Zoom all the way out and pan: frame cost stays flat',
        'Add another indicator and watch the switch time',
      ],
    },
    heatmap: {
      title: 'Liquidity heatmap',
      stat: '240 × 80 cells',
      blurb:
        'Two hundred forty order-book snapshots, 80 price levels each, as a heatmap behind the candles: resting size lights up level by level, bids green and asks red, and walls that persist stand out. With WebGL, the 19,200 cells draw on the GPU under the bars.',
      tryThis: [
        'Switch between Canvas 2D and WebGL above the chart: each switch times a short pan',
        'Look for the bright rows: walls of size that stay at one price over time',
        'Zoom in on a wall, then pan back and forth: the cells keep pace with the bars',
      ],
    },
    switching: {
      title: 'Slow-network switching',
      stat: '+1.2 s latency',
      blurb:
        'Each history request here is delayed by 1.2 s. The previous chart stays on screen and is veiled only once a switch takes longer than 200 ms; rapid clicks never let a stale response win.',
      tryThis: [
        'Click several symbols quickly — only the last one lands',
        'Switch timeframe and watch the veil fade in, then out',
        'Compare with the Indicators scene: fast switches never flash',
      ],
    },
  },

  gallery: {
    eyebrow: 'Chart types',
    title: 'Every chart type, live in the page',
    subtitleHtml:
      'Each tile is a real <code>Chart</code> instance, not an image. Drag to pan, scroll to zoom and hover for the crosshair; every tile responds on its own.',
    tiles: {
      candlestick: { name: 'Candlestick', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Trend' },
      area: { name: 'Area', tag: 'Close' },
      baseline: { name: 'Baseline', tag: 'Above / below' },
      bar: { name: 'OHLC Bars', tag: 'Classic' },
      stepLine: { name: 'Step Line', tag: 'Discrete' },
    },
  },

  finance: {
    eyebrow: 'Finance charts',
    title: 'Beyond candlesticks',
    subtitle: 'Sparklines, equity curves, order-book depth, sector heatmaps, waterfalls and gauges for portfolios and KPIs.',
    portfolio: 'Portfolio performance',
    depth: 'Order book depth',
    heatmap: 'Crypto market heatmap',
    pnl: 'P&L attribution',
    fearGreed: 'Fear & Greed index',
    waterfall: {
      start: 'Start',
      btcLong: 'BTC long',
      ethShort: 'ETH short',
      solLong: 'SOL long',
      fees: 'Fees',
      end: 'End',
    },
    zones: {
      extremeFear: 'Extreme fear',
      fear: 'Fear',
      neutral: 'Neutral',
      greed: 'Greed',
      extremeGreed: 'Extreme greed',
    },
  },

  /** Over a chart on a scrolling page, which takes the pointer only once clicked. */
  engage: {
    click: 'Click to use the chart',
    tap: 'Tap to use the chart',
  },

  terminal: {
    symbol: 'Symbol',
    timeframe: 'Timeframe',
    chartType: 'Chart type',
    types: {
      candlestick: 'Candles',
      heikinAshi: 'Heikin-Ashi',
      area: 'Area',
      bar: 'Bars',
      baseline: 'Baseline',
    },
    unavailable: 'Live feed unavailable: {error}',
    drawnWith: 'Drawn with {renderer}',
    live: 'LIVE',
    offline: 'OFFLINE',
    connecting: 'CONNECTING',
    hints: [
      ['Drag', 'pan'],
      ['Click + scroll', 'zoom'],
      ['Drag axis', 'scale'],
    ],
  },

  copy: {
    copy: 'COPY',
    copied: 'COPIED',
    copiedAnnouncement: 'Copied to clipboard',
    copyLabel: 'Copy {label}',
    copyCode: 'Copy code',
    codeSample: 'Code sample',
    packageManager: 'Package manager',
    copyInstall: 'Copy install command',
  },

  examples: {
    metaTitle: 'Examples · TradeCanvas',
    description: 'Live StackBlitz examples for vanilla JS, React, Vue, Svelte, the ChartWidget, and finance dashboards.',
    eyebrow: 'Examples · StackBlitz',
    title: 'Examples',
    subtitleHtml:
      'Live sandboxes you can fork in one click. Each opens in StackBlitz with the latest 1.x packages wired up. To try features without any setup, use the <a href="{lab}">Feature Lab</a> on the home page.',
    open: 'Open {title} in StackBlitz',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'The headless Chart: live Binance stream, Bollinger + RSI, and the drawing tools on your own UI.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'The full trading UI in one call: toolbar, 69 drawing tools, watchlist, trading, replay, in 30 languages.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — reactive props, typed, the underlying Chart through a ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, reactive props, the Chart from @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — runes, reactive props, bind:chart.',
      },
      finance: {
        title: 'Finance dashboard',
        blurb: 'Sparkline, gauge, heatmap, depth, and equity-curve renderers in one layout.',
      },
    },
  },

  playground: {
    metaTitle: 'Playground · TradeCanvas',
    description: 'Fork an interactive TradeCanvas sandbox in StackBlitz and start hacking.',
    eyebrow: 'Playground · StackBlitz',
    title: 'Playground',
    subtitle: 'An editable sandbox in StackBlitz with the ChartWidget already connected to live Binance data.',
    launch: 'Launch playground',
    more: 'More examples',
    insideTitle: 'What’s inside',
    insideHtml:
      'A minimal Vite + TypeScript project with one file, <code>src/main.ts</code>, that mounts <code>ChartWidget</code> and connects a <code>BinanceAdapter</code>.',
  },

  changelog: {
    metaTitle: 'Changelog — TradeCanvas',
    description: 'Release notes for every TradeCanvas version.',
    englishOnly: 'Release notes are written in English.',
  },

  backtest: {
    title: 'Live backtest — SMA(10/30) cross',
    subtitle: '365 days of synthetic price data, $10k initial cash, 0.05% commission, 0.03% slippage.',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    end: 'End',
    running: 'Running backtest…',
    failed: 'Failed: {error}',
    bar: 'Bar {index}/{total}',
    totalReturn: 'Total return',
    maxDrawdown: 'Max DD',
    winRate: 'Win rate',
    profitFactor: 'Profit factor',
    trades: 'Trades',
  },

  error: {
    notFound: 'Page not found',
    notFoundText: 'This page does not exist, or it has moved.',
    other: 'Something went wrong',
    otherText: 'The page could not be shown. Try again, or start from the home page.',
    home: 'Back to the home page',
    docs: 'Open the docs',
  },

  docs: {
    titleSuffix: 'TradeCanvas docs',
    navLabel: 'Documentation navigation',
    groups: {
      start: 'Get started',
      chart: 'Chart',
      trading: 'Trading',
    },
    pages: {
      'getting-started': 'Getting Started',
      frameworks: 'Frameworks',
      embed: 'Embeddable Widget',
      api: 'API Reference',
      styling: 'Styling',
      customization: 'Customization',
      'chart-types': 'Chart Types',
      indicators: 'Indicators',
      'drawing-tools': 'Drawing Tools',
      plugins: 'Plugins',
      performance: 'Performance',
      trading: 'Trading Overlay',
      finance: 'Finance Charts',
      realtime: 'Realtime & Replay',
      analytics: 'Analytics',
    },
    notTranslated: 'This page is not translated yet, so it is shown in English.',
  },
};

export default en;

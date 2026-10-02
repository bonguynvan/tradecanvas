import type { SiteMessages } from '../messages';

const de: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Canvas-Trading-Charts fürs Web',
    description:
      'TradeCanvas ist eine Canvas2D-Bibliothek für Trading-Charts: 17 Charttypen, 85 Indikatoren, 69 Zeichenwerkzeuge, Live-Daten von Börsen, Orders im Chart, Replay und Backtesting. Keine Abhängigkeiten, MIT.',
  },

  nav: {
    main: 'Hauptnavigation',
    docs: 'Doku',
    examples: 'Beispiele',
    playground: 'Playground',
    changelog: 'Changelog',
    toLight: 'Zum hellen Design wechseln',
    toDark: 'Zum dunklen Design wechseln',
    github: 'TradeCanvas auf GitHub',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    menu: 'Menü',
    language: 'Sprache',
  },

  footer: {
    tagline: 'Canvas2D-Trading-Charts fürs Web. Keine Abhängigkeiten, MIT-lizenziert.',
    library: 'Bibliothek',
    packages: 'Pakete',
    project: 'Projekt',
    gettingStarted: 'Erste Schritte',
    apiReference: 'API-Referenz',
    examples: 'Beispiele',
    changelog: 'Changelog',
    issues: 'Issues',
    boGrid: 'bo-grid (Datentabelle)',
    builtWith: 'Erstellt mit TradeCanvas',
  },

  home: {
    release: 'Zwei-Canvas-Renderer, freies Verschieben',
    title: 'Die Chart-Engine für Trading-Apps.',
    ledeHtml:
      'Von Kerzen bis Renko, 85 Indikatoren, 69 Zeichenwerkzeuge, Live-Daten von Börsen und Orders direkt im Chart. Gezeichnet auf Canvas2D, ohne Abhängigkeiten. Binden Sie das komplette <code>ChartWidget</code> ein oder bauen Sie Ihre eigene Oberfläche auf dem Headless-<code>Chart</code>.',
    getStarted: 'Loslegen',
    browseExamples: 'Beispiele ansehen',
    specsLabel: 'Kennzahlen',
    specs: [
      'Charttypen',
      'Indikatoren',
      'Zeichenwerkzeuge',
      'Laufzeitabhängigkeiten',
      'gzip, Headless-Kern',
      'Hover-Frame bei 100k Kerzen',
    ],
    hood: {
      eyebrow: 'Unter der Haube',
      title: 'Gemessen, dokumentiert, frei erweiterbar',
      subtitleHtml: 'Die Engine hinter dem Feature-Lab. Jede Zahl unten lässt sich mit <code>pnpm bench</code> nachmessen.',
      frameBudget: 'Frame-Budget',
      perf: [
        'Live-Tick mit 4 Indikatoren auf 100k Kerzen',
        'komplette Neuberechnung nach einem Symbolwechsel, 100k Kerzen',
        'LTTB-Downsampling, 100k → 1.600 Punkte',
        'Hover-Frame, konstant von 500 bis 100k Kerzen',
      ],
      perfFoot: 'Zwei übereinanderliegende Canvas: Beim Hovern wird nur die schlanke obere neu gezeichnet. Jeder Renderer durchläuft nur die sichtbaren Kerzen.',
      gestures: 'Gesten',
      gestureList: [
        ['Ziehen', 'verschieben, auch über die letzte Kerze hinaus'],
        ['Mausrad', 'um den Zeiger herum zoomen'],
        ['Zusammenziehen', 'auf dem Touchscreen zoomen'],
        ['Nach rechts ziehen', 'ältere Kerzen werden laufend nachgeladen'],
        ['Achse ziehen', 'sie skalieren'],
        ['Ctrl + Ziehen', 'Zeichnungen auswählen'],
        ['Shift + Ziehen', 'messen'],
        ['Alt + Klick', 'Tooltip anheften'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Ein Aufruf, die komplette Trading-Oberfläche',
        text: 'ChartWidget bringt Symbolleiste, Zeichenleiste, Beobachtungsliste, Alarme, Objektbaum, Datenfenster, Replay und eine Befehlspalette (Ctrl+K) mit – in 14 Sprachen, von Englisch und Vietnamesisch bis Chinesisch, Japanisch und Koreanisch.',
      },
      {
        label: 'Daten',
        title: 'Beliebige Marktdaten',
        text: 'Adapter für Binance, Coinbase, Bybit und Kraken sind eingebaut; WebSocketAdapter und PollingAdapter decken alles andere ab. Ältere Kerzen werden beim Zurückscrollen nachgeladen; die Verbindung stellt sich selbst wieder her, und überholte Symbolwechsel werden verworfen.',
      },
      {
        label: 'Trading',
        title: 'Orders im Chart',
        text: 'ExecutionAdapter mit Paper-Trading-Broker, Orders per Ziehen anlegen, Bracket-Orders, verschiebbare Stop-Loss- und Take-Profit-Linien, Alarme an Webhooks und als Desktop-Benachrichtigung.',
      },
      {
        label: 'Frameworks',
        title: 'React, Vue und Svelte',
        text: '@tradecanvas/react, /vue und /svelte kapseln dieselbe Engine mit reaktiven, typisierten Props. Die vollständige Chart-Instanz ist nur eine Ref entfernt.',
      },
      {
        label: 'Plugins',
        title: 'Jede Ebene erweiterbar',
        text: 'Registrieren Sie eigene Indikatoren mit inkrementellem update(), Zeichenwerkzeuge, Charttypen und Overlays – global oder pro Chart.',
      },
      {
        label: 'Analyse',
        title: 'Backtests direkt neben dem Chart',
        text: 'Ein Backtester, der Kerze für Kerze rechnet, mit Monte-Carlo-Bändern, dazu eine Indikator-Pipeline im Web Worker, die den Hauptthread frei hält.',
      },
    ],
    quickstart: {
      eyebrow: 'Schnellstart',
      title: 'Ein Chart, fünf Einstiege',
      subtitle: 'Das komplette Widget, eine Framework-Komponente oder die Headless-Engine. Alle nutzen denselben Renderer.',
      tabs: 'Schnellstart-Variante',
    },
    closing: {
      title: 'Bringen Sie noch heute einen Live-Chart in Ihre App.',
      readDocs: 'Doku lesen',
      star: 'Auf GitHub einen Stern geben',
    },
  },

  lab: {
    eyebrow: 'Feature-Lab',
    title: 'Jede Funktion in einem Live-Chart.',
    subtitleHtml:
      'Wählen Sie eine Szene. Jede startet das komplette <code>ChartWidget</code> in einem Zustand, der einen Bereich in Aktion zeigt – danach können Sie frei ziehen, zeichnen und wechseln.',
    scenes: 'Feature-Szenen',
    widgetLanguage: 'Sprache des Widgets',
    idle: 'Scrollen Sie hierher, um den Live-Chart zu starten',
    metricHint: 'Wechseln Sie Symbol oder Zeiteinheit, um die Zeit zu messen',
    metricSwitch: '→ {label}: {ms} · {bars} Kerzen',
    metricSetData: 'setData({bars} Kerzen): {ms}',
    tryThis: 'Zum Ausprobieren',
  },

  scenes: {
    drawings: {
      title: 'Zeichenwerkzeuge',
      stat: '69 Werkzeuge',
      blurb:
        'Fibonacci- und Gann-Werkzeuge mit eigenen Niveaus, Elliott-Wellen, harmonische Muster, Notizen und Pinsel. Doppelklick auf eine Zeichnung öffnet ihre Einstellungen, Rechtsklick ihr Menü; Alarme folgen Trendlinien, und das Long-/Short-Werkzeug berechnet die Positionsgröße.',
      tryThis: [
        'Doppelklicken Sie auf das Fibonacci-Retracement und bearbeiten Sie seine Niveaus',
        'Klicken Sie eine Zeichnung mit der rechten Maustaste an: eine Ebene nach vorne holen, gruppieren oder einen Alarm hinzufügen',
        'Wählen Sie den Pinsel oder das Pfad-Werkzeug; Enter beendet einen Pfad',
      ],
    },
    indicators: {
      title: 'Indikatoren',
      stat: '85 integriert',
      blurb:
        'Overlays und eigene Bereiche, selbst berechnet, ohne Mathe-Abhängigkeiten. Live-Ticks berechnen nur die laufende Kerze neu – 0,001 ms pro Tick mit vier Indikatoren auf 100k Kerzen.',
      tryThis: [
        'Klicken Sie auf „Indikatoren“ (oder Ctrl+K) und durchsuchen Sie alle 85',
        'Klicken Sie in der Legende auf einen Indikatornamen: Parameter, Farben und Niveaus',
        'Setzen Sie bei einem gleitenden Durchschnitt das Feld „Source“ auf die Linie eines anderen Indikators',
        'Ziehen Sie die Trennlinie zwischen zwei Bereichen, um ihre Größe zu ändern',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'Paper-Broker',
      blurb:
        'Orders und Positionen, die Sie direkt im Chart steuern: Stops und Ziele verschieben, über die Linie stornieren, schließen oder umkehren – und jede Ausführung ist an ihrer Kerze markiert. Eine Ordermaske und ein Kontopanel liegen unter dem Chart; alles läuft über einen ExecutionAdapter – hier den mitgelieferten Paper-Broker.',
      tryThis: [
        'Klicken Sie an der offenen Long-Position auf ⇅, um sie umzukehren, oder auf ×, um sie zu schließen – die Ausführung erscheint als Markierung an ihrer Kerze',
        'Klicken Sie unterhalb des Kurses mit der rechten Maustaste: Kauf-Limit, Verkauf-Stop oder neue Order zu diesem Preis',
        'Das Kontopanel unter dem Chart listet Positionen mit G&V, Orders und Historie auf',
        'Ziehen Sie die Linien SL / TP der offenen Long-Position – der Broker aktualisiert sie',
        'Das + an der Preisachse bietet einen Alarm, eine Order oder eine Linie zu diesem Preis an',
      ],
    },
    workspace: {
      title: 'Arbeitsbereich',
      stat: 'Multi-Chart',
      blurb:
        'Zwei Charts nebeneinander, verbunden über das Fadenkreuz – oder nach Wahl über Symbol, Zeiteinheit, Zeit und Zeichnungen. Speichern Sie den ganzen Arbeitsbereich als benanntes Layout und kehren Sie jederzeit dorthin zurück.',
      tryThis: [
        'Fahren Sie über einen Chart: Der andere zeigt dieselbe Zeit',
        'Aktivieren Sie „Zeiteinheit“ in der Sync-Leiste und ändern Sie dann die Zeiteinheit eines Charts',
        'Wählen Sie in der Leiste vier Charts; ist „Symbol“ synchronisiert, öffnen sich die neuen mit dem Symbol des aktiven Charts',
        'Layout ▾ → Speichern unter…, etwas ändern, dann das Layout wieder öffnen (Ctrl+S speichert)',
      ],
    },
    navigation: {
      title: 'Zeiträume & Layouts',
      stat: '1D … Alle',
      blurb:
        'Springen Sie zu einem Zeitraum oder Datum, kehren Sie die Preisskala um, heften Sie Ihre Zeiteinheiten an, nutzen Sie denselben Indikator mehrfach – und holen Sie alles aus einem gespeicherten Layout zurück.',
      tryThis: [
        'Klicken Sie unter dem Chart auf 1M, 3M oder 6M; Alt+G springt zu einem Datum',
        'Alt+I stellt die Preisskala auf den Kopf; die logarithmische Skala finden Sie in den Einstellungen',
        'Einstellungen → Zeitzone: Wählen Sie New York oder Tokio – Achse, Tageswechsel und YTD folgen, inklusive Sommerzeit',
        'Einstellungen → Skala → Linke Preisskala; über den Tab „Stil“ eines EMA lässt er sich auf diese Skala legen',
        'Markieren Sie eine Zeiteinheit im ▾-Menü neben den Zeiteinheit-Buttons mit einem Stern',
        'Aktivieren Sie den ↻-Button in der linken Leiste, um mehrere Linien nacheinander zu zeichnen; Ctrl+C / Ctrl+V kopiert sie',
      ],
    },
    history: {
      title: 'Zurück in die Vergangenheit scrollen',
      stat: 'seitenweise Historie',
      blurb:
        'Ältere Kerzen werden seitenweise nachgeladen, während Sie zur ältesten ziehen, und was auf dem Bildschirm ist, bleibt an seinem Platz. Zoomen Sie heraus, bis alle geladenen Kerzen passen: Unter einem Pixel pro Kerze werden die Kerzen je Pixelspalte zusammengefasst, sodass auch Tausende Kerzen lesbar bleiben.',
      tryThis: [
        'Ziehen Sie den Chart nach rechts: Eine Anzeige links meldet, dass ältere Kerzen geladen werden',
        'Zoomen Sie mit dem Mausrad heraus, über einige hundert Kerzen hinaus bis zu einem Viertelpixel pro Kerze',
        'Klicken Sie unter dem Chart auf Alle, um alles bisher Geladene einzupassen',
        'Geben Sie im ▾-Menü der Zeiteinheiten 7 oder 90 ein: Binance bietet beides nicht, also baut der Chart sie aus 1m- und 30m-Kerzen',
      ],
    },
    replay: {
      title: 'Bar-Replay',
      stat: 'Zeitleiste',
      blurb:
        'Gehen Sie die Historie Kerze für Kerze durch und üben Sie Analysen, ohne zu wissen, wie es weitergeht. Live-Daten werden während des Replays zurückgehalten; die Preisskala passt sich jedem Schritt an.',
      tryThis: [
        'Drücken Sie auf Abspielen oder gehen Sie mit Shift+→ / Shift+← jeweils eine Kerze weiter',
        'Klicken Sie auf eine bereits aufgedeckte Kerze, um den Cursor dorthin zu setzen',
        '„Zurück zur Echtzeit“ kehrt zur Live-Serie zurück',
      ],
    },
    subcent: {
      title: '14 Sprachen, Preise unter einem Cent',
      stat: 'i18n',
      blurb:
        'Das ganze Widget in 14 Sprachen – Menüs, Einstellungen, Zeichenwerkzeuge, Dialoge – mit Zahlen im jeweils eigenen Format. PEPE notiert um 0,000004: Jede Beschriftung folgt der Genauigkeit der Preisskala, und die Achse wird breiter, damit alles passt.',
      tryThis: [
        'Wählen Sie über dem Chart eine Sprache: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P durchsucht schon beim Tippen alle Binance-Symbole, mit Namen',
        'Öffnen Sie die Einstellungen oder die Zeichenwerkzeuge, um die Übersetzung zu sehen',
        'Fahren Sie mit der Maus über den Chart: Das Fadenkreuz-Label behält die volle Genauigkeit im Zahlenformat der Sprache',
      ],
    },
    bigdata: {
      title: '200.000 Kerzen',
      stat: 'Leistung',
      blurb:
        'Zweihunderttausend 1-Minuten-Kerzen mit vier Indikatoren. Gerendert werden nur die sichtbaren Kerzen; gröbere Zeiteinheiten werden lokal umgerechnet, hinter einem Ladeschleier, wenn das länger als ein paar Frames dauert.',
      tryThis: [
        'Wechseln Sie zu 1H, 4H und zurück zu 1m – die Zeiten erscheinen unter dem Chart',
        'Zoomen Sie ganz heraus und verschieben Sie: Die Kosten pro Frame bleiben konstant',
        'Fügen Sie einen weiteren Indikator hinzu und beobachten Sie die Wechselzeit',
      ],
    },
    switching: {
      title: 'Wechsel bei langsamem Netz',
      stat: '+1,2 s Latenz',
      blurb:
        'Jede Historienanfrage wird hier um 1,2 s verzögert. Der vorherige Chart bleibt sichtbar und wird erst abgedeckt, wenn ein Wechsel länger als 200 ms dauert; schnelle Klicks lassen nie eine veraltete Antwort gewinnen.',
      tryThis: [
        'Klicken Sie schnell auf mehrere Symbole – nur das letzte kommt an',
        'Wechseln Sie die Zeiteinheit und sehen Sie zu, wie der Schleier ein- und wieder ausblendet',
        'Vergleichen Sie mit der Szene „Indikatoren“: Schnelle Wechsel flackern nie',
      ],
    },
  },

  gallery: {
    eyebrow: 'Charttypen',
    title: 'Jeder Charttyp, live auf der Seite',
    subtitleHtml:
      'Jede Kachel ist eine echte <code>Chart</code>-Instanz, kein Bild. Ziehen zum Verschieben, Mausrad zum Zoomen, Hovern für das Fadenkreuz; jede Kachel reagiert für sich.',
    tiles: {
      candlestick: { name: 'Kerzen', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Trend' },
      area: { name: 'Fläche', tag: 'Schlusskurs' },
      baseline: { name: 'Basislinie', tag: 'Darüber / darunter' },
      bar: { name: 'OHLC-Balken', tag: 'Klassisch' },
      stepLine: { name: 'Stufenlinie', tag: 'Diskret' },
    },
  },

  finance: {
    eyebrow: 'Finanzcharts',
    title: 'Mehr als Kerzen',
    subtitle: 'Sparklines, Equity-Kurven, Orderbuchtiefe, Sektor-Heatmaps, Wasserfall- und Tachodiagramme für Portfolios und KPIs.',
    portfolio: 'Portfolio-Performance',
    depth: 'Orderbuchtiefe',
    heatmap: 'Krypto-Markt-Heatmap',
    pnl: 'GuV-Attribution',
    fearGreed: 'Angst-und-Gier-Index',
    waterfall: {
      start: 'Start',
      btcLong: 'BTC Long',
      ethShort: 'ETH Short',
      solLong: 'SOL Long',
      fees: 'Gebühren',
      end: 'Ende',
    },
    zones: {
      extremeFear: 'Extreme Angst',
      fear: 'Angst',
      neutral: 'Neutral',
      greed: 'Gier',
      extremeGreed: 'Extreme Gier',
    },
  },

  terminal: {
    symbol: 'Symbol',
    timeframe: 'Zeiteinheit',
    chartType: 'Charttyp',
    types: {
      candlestick: 'Kerzen',
      heikinAshi: 'Heikin-Ashi',
      area: 'Fläche',
      bar: 'Balken',
      baseline: 'Basislinie',
    },
    unavailable: 'Live-Daten nicht verfügbar: {error}',
    live: 'LIVE',
    offline: 'OFFLINE',
    connecting: 'VERBINDE',
    hints: [
      ['Ziehen', 'verschieben'],
      ['Mausrad', 'zoomen'],
      ['Achse ziehen', 'skalieren'],
    ],
  },

  copy: {
    copy: 'KOPIEREN',
    copied: 'KOPIERT',
    copiedAnnouncement: 'In die Zwischenablage kopiert',
    copyLabel: '{label} kopieren',
    copyCode: 'Code kopieren',
    codeSample: 'Codebeispiel',
    packageManager: 'Paketmanager',
    copyInstall: 'Installationsbefehl kopieren',
  },

  examples: {
    metaTitle: 'Beispiele · TradeCanvas',
    description: 'Live-Beispiele auf StackBlitz für Vanilla JS, React, Vue, Svelte, das ChartWidget und Finanz-Dashboards.',
    eyebrow: 'Beispiele · StackBlitz',
    title: 'Beispiele',
    subtitleHtml:
      'Live-Sandboxes, die Sie mit einem Klick forken können. Jede öffnet sich in StackBlitz mit den neuesten 1.x-Paketen, fertig eingebunden. Um Funktionen ganz ohne Setup auszuprobieren, nutzen Sie das <a href="{lab}">Feature-Lab</a> auf der Startseite.',
    open: '{title} in StackBlitz öffnen',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'Der Headless-Chart: Live-Stream von Binance, Bollinger + RSI und die Zeichenwerkzeuge auf Ihrer eigenen Oberfläche.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'Die komplette Trading-Oberfläche mit einem Aufruf: Symbolleiste, 69 Zeichenwerkzeuge, Beobachtungsliste, Trading, Replay, in 14 Sprachen.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react – reaktive, typisierte Props, der zugrunde liegende Chart über eine Ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue – script setup, reaktive Props, der Chart aus @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte – Runes, reaktive Props, bind:chart.',
      },
      finance: {
        title: 'Finanz-Dashboard',
        blurb: 'Renderer für Sparkline, Tacho, Heatmap, Markttiefe und Equity-Kurve in einem Layout.',
      },
    },
  },

  playground: {
    metaTitle: 'Playground · TradeCanvas',
    description: 'Forken Sie eine interaktive TradeCanvas-Sandbox in StackBlitz und legen Sie los.',
    eyebrow: 'Playground · StackBlitz',
    title: 'Playground',
    subtitle: 'Eine bearbeitbare Sandbox in StackBlitz, in der das ChartWidget schon mit Live-Daten von Binance verbunden ist.',
    launch: 'Playground starten',
    more: 'Weitere Beispiele',
    insideTitle: 'Was drinsteckt',
    insideHtml:
      'Ein minimales Vite- und TypeScript-Projekt mit einer einzigen Datei, <code>src/main.ts</code>, die das <code>ChartWidget</code> einbindet und einen <code>BinanceAdapter</code> verbindet.',
  },

  changelog: {
    metaTitle: 'Changelog — TradeCanvas',
    description: 'Versionshinweise zu jeder TradeCanvas-Version.',
    englishOnly: 'Die Versionshinweise sind auf Englisch verfasst.',
  },

  backtest: {
    title: 'Live-Backtest — SMA(10/30)-Kreuzung',
    subtitle: '365 Tage synthetische Kurse, 10.000 $ Startkapital, 0,05 % Kommission, 0,03 % Slippage.',
    play: 'Abspielen',
    pause: 'Pause',
    replay: 'Erneut',
    end: 'Ende',
    running: 'Backtest läuft…',
    failed: 'Fehler: {error}',
    bar: 'Kerze {index}/{total}',
    totalReturn: 'Gesamtrendite',
    maxDrawdown: 'Max. DD',
    winRate: 'Trefferquote',
    profitFactor: 'Profitfaktor',
    trades: 'Trades',
  },

  error: {
    notFound: 'Seite nicht gefunden',
    notFoundText: 'Diese Seite gibt es nicht, oder sie wurde verschoben.',
    other: 'Etwas ist schiefgelaufen',
    otherText: 'Die Seite konnte nicht angezeigt werden. Versuchen Sie es erneut oder starten Sie auf der Startseite.',
    home: 'Zur Startseite',
    docs: 'Zur Doku',
  },

  docs: {
    titleSuffix: 'TradeCanvas-Doku',
    navLabel: 'Navigation der Dokumentation',
    groups: {
      start: 'Erste Schritte',
      chart: 'Chart',
      trading: 'Trading',
    },
    pages: {
      'getting-started': 'Erste Schritte',
      frameworks: 'Frameworks',
      embed: 'Einbettbares Widget',
      api: 'API-Referenz',
      'chart-types': 'Charttypen',
      indicators: 'Indikatoren',
      'drawing-tools': 'Zeichenwerkzeuge',
      plugins: 'Plugins',
      performance: 'Leistung',
      trading: 'Trading-Overlay',
      finance: 'Finanzcharts',
      realtime: 'Echtzeit & Replay',
      analytics: 'Analyse',
    },
    notTranslated: 'Diese Seite gibt es noch nicht auf {language}, daher wird sie auf Englisch angezeigt.',
  },
};

export default de;

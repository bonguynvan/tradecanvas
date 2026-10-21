import type { SiteMessages } from '../messages';

const de: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Canvas-Trading-Charts fürs Web',
    description:
      'TradeCanvas ist eine Trading-Chart-Bibliothek für das Web, gezeichnet mit Canvas 2D oder WebGL: 18 Charttypen, 134 Indikatoren, 69 Zeichenwerkzeuge, Live-Daten von Börsen, Orders im Chart, Replay und Backtesting, in 30 Sprachen. Keine Abhängigkeiten, MIT.',
  },

  nav: {
    main: 'Hauptnavigation',
    docs: 'Doku',
    examples: 'Beispiele',
    playground: 'Playground',
    changelog: 'Changelog',
    audit: 'Audit',
    business: 'Unternehmen',
    toLight: 'Zum hellen Design wechseln',
    toDark: 'Zum dunklen Design wechseln',
    github: 'TradeCanvas auf GitHub',
    sponsor: 'Sponsern',
    sponsorLabel: 'TradeCanvas auf GitHub sponsern',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    menu: 'Menü',
    language: 'Sprache',
  },

  footer: {
    tagline: 'Trading-Charts für das Web, gezeichnet mit Canvas 2D oder WebGL. Keine Abhängigkeiten, MIT-lizenziert.',
    library: 'Bibliothek',
    packages: 'Pakete',
    project: 'Projekt',
    gettingStarted: 'Erste Schritte',
    apiReference: 'API-Referenz',
    examples: 'Beispiele',
    changelog: 'Changelog',
    audit: 'Systemaudit',
    business: 'Für Unternehmen',
    issues: 'Issues',
    discussions: 'Diskussionen',
    boGrid: 'bo-grid (Datentabelle)',
    builtWith: 'Erstellt mit TradeCanvas',
  },

  home: {
    release: 'WebGL-Renderer, 30 Sprachen',
    title: 'Die Chart-Engine für Trading-Apps.',
    ledeHtml:
      'Von Kerzen bis Renko, 134 Indikatoren, 69 Zeichenwerkzeuge, Live-Daten von Börsen und Orders direkt im Chart. Gezeichnet mit Canvas 2D oder WebGL, ohne Abhängigkeiten. Binden Sie das komplette <code>ChartWidget</code> ein oder bauen Sie Ihre eigene Oberfläche auf dem Headless-<code>Chart</code>.',
    getStarted: 'Loslegen',
    browseExamples: 'Beispiele ansehen',
    specsLabel: 'Kennzahlen',
    specs: [
      'Indikatoren',
      'Zeichenwerkzeuge',
      'Charttypen',
      'Widget-Sprachen',
      'Kerzen bei 60 fps mit WebGL',
      'Laufzeitabhängigkeiten von Drittanbietern',
    ],
    tape: 'Live-Kurse von Binance',
    tapePause: 'Kurse anhalten',
    tapePlay: 'Kurse abspielen',
    story: {
      eyebrow: 'Vom ersten Blick bis zur ausgeführten Order',
      title: 'Ein Chart für den ganzen Trade',
      subtitle: 'Vier Live-Charts, jeder bei seinem Teil der Arbeit. Ziehen, zoomen, darauf zeichnen.',
      chapters: [
        {
          title: 'Den Markt lesen',
          text: 'Bänder, Durchschnitte und Oszillatoren über den Kerzen, Fibonacci-Niveaus und Trendlinien darüber, jedes mit eigenen Einstellungen und Alarmen.',
          points: [
            '134 Indikatoren, jeder auf jedem anderen, etwa ein Durchschnitt des RSI',
            '69 Zeichenwerkzeuge mit Magnet, Gruppen und Rückgängig',
            'Alarme auf Kurse, Linien und Indikator-Kreuzungen',
          ],
        },
        {
          title: 'Direkt im Chart handeln',
          text: 'Orders, Positionen und ihre Brackets liegen auf der Preisskala. Ziehen Sie einen Stop, um ihn zu verschieben; der Paper-Broker führt sie aus, so bauen Sie, bevor Sie sich verbinden.',
          points: [
            'Order per Ziehen platzieren, Stop-Loss und Take-Profit per Ziehen verschieben',
            'Ausführungsmarken sowie Gewinn und Verlust im Chart',
            'Ihr Broker wird über einen einzigen Adapter angebunden',
          ],
        },
        {
          title: 'Die Vergangenheit abspielen',
          text: 'Gehen Sie Kerze für Kerze durch die Historie oder lassen Sie sie laufen: Indikatoren, Zeichnungen und Paper-Orders folgen dem abgespielten Kurs.',
          points: [
            'Jede Startkerze, jedes Tempo',
            'Jede Kerze kann sich Schritt für Schritt aus feineren bilden',
            'Im Replay mit dem Paper-Broker handeln',
          ],
        },
        {
          title: 'Skalieren ohne Ruckeln',
          text: 'Hier 200.000 Kerzen mit vier Indikatoren, die von selbst schwenken. Wechseln Sie den Renderer und beobachten Sie die Bildzeit: Mit WebGL zeichnet die GPU Kerzen und Linien.',
          points: [
            '1.000.000 Kerzen herausgezoomt mit 60 fps dank WebGL',
            'Canvas 2D, wo WebGL fehlt, mit demselben Aussehen',
            'Gezeichnet werden nur die Kerzen auf dem Bildschirm',
          ],
        },
      ],
      frameTime: '{ms} ms pro Bild',
      panning: 'Schwenkt von selbst, bis Sie übernehmen',
      renderer: 'Renderer',
      replaying: 'Replay läuft',
    },
    trust: {
      label: 'Open Source',
      downloads: '{n} npm-Downloads im Monat',
      license: '{n}-Lizenz',
      dependencies: '{n} Laufzeitabhängigkeiten',
      typescript: '{n}-Typen für jede API',
    },
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
        text: 'ChartWidget bringt Symbolleiste, Zeichenleiste, Beobachtungsliste, Alarme, Objektbaum, Datenfenster, Replay und eine Befehlspalette (Ctrl+K) mit – in 30 Sprachen, von Englisch und Vietnamesisch bis Chinesisch, Japanisch, Koreanisch und Arabisch.',
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
    widgetLook: 'Erscheinungsbild des Widgets',
    widgetRenderer: 'Renderer',
    idle: 'Scrollen Sie hierher, um den Live-Chart zu starten',
    metricHint: 'Wechseln Sie Symbol oder Zeiteinheit, um die Zeit zu messen',
    metricSwitch: '→ {label}: {ms} · {bars} Kerzen',
    metricSetData: 'setData({bars} Kerzen): {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}: {ms} pro Frame beim Verschieben',
    metricRendererMissing: 'Kein WebGL 2 verfügbar: Zeichnen mit Canvas 2D',
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
      stat: '134 integriert',
      blurb:
        'Overlays und eigene Bereiche, selbst berechnet, ohne Mathe-Abhängigkeiten. Live-Ticks berechnen nur die laufende Kerze neu – 0,001 ms pro Tick mit vier Indikatoren auf 100k Kerzen.',
      tryThis: [
        'Klicken Sie auf „Indikatoren“ (oder Ctrl+K) und durchsuchen Sie alle 134',
        'Klicken Sie in der Legende auf einen Indikatornamen: Parameter, Farben und Niveaus',
        'Setzen Sie bei einem gleitenden Durchschnitt das Feld „Source“ auf die Linie eines anderen Indikators',
        'Ziehen Sie die Trennlinie zwischen zwei Bereichen, um ihre Größe zu ändern; mit den Schaltflächen oben rechts in einem Bereich können Sie ihn verschieben, einklappen oder maximieren',
        'Das ⋯ in einer Legendenzeile verschiebt den Indikator in den Bereich darüber oder darunter oder in einen eigenen Bereich',
        'Menü „Indikatoren“ → „Indikatoren als Vorlage speichern…“; Ctrl+Z macht auch Änderungen an Indikatoren rückgängig',
        'Geben Sie im Chart eine Zahl ein (4, dann h, Enter), um die Zeiteinheit zu wechseln; Alt+T wählt die Trendlinie',
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
        'Wählen Sie in der Replay-Leiste einen feineren Schritt (15m), um jede Kerze entstehen zu sehen',
        'Kauf- und Verkaufsmarken und der Trade erscheinen erst, wenn das Replay sie erreicht',
      ],
    },
    compare: {
      title: 'Vergleich, Spread, Verhältnis',
      stat: 'Symbole',
      blurb:
        'ETH auf einer eigenen Preisskala neben BTC und BTC ÷ ETH in einem eigenen Bereich. Andere Symbole werden zeitlich am Chart ausgerichtet; Spread oder Verhältnis erhalten Legende, Wertmarken und Alarme wie jeder Indikator. Das höchste Hoch und das tiefste Tief auf dem Bildschirm sind markiert.',
      tryThis: [
        'Öffnen Sie den Objektbaum und klicken Sie auf das + neben „Vergleichen“: erst ein Symbol wählen, dann die Darstellung',
        'Klicken Sie mit der rechten Maustaste in den Verhältnis-Bereich für eine prozentuale Skala',
        'Klicken Sie mit der rechten Maustaste auf den Chart: „Daten exportieren (CSV)“ nimmt jede Indikatorlinie mit',
        'Wechseln Sie die Zeiteinheit: Die Kerzen des anderen Symbols werden neu abgerufen',
      ],
    },
    bonds: {
      title: 'Anleihen in 32steln',
      stat: 'Formate',
      blurb:
        'Eine Anleihe, notiert in 32steln und halben 32steln (110’165 ist 110 und 16½ 32stel), auf Hoch-Tief-Balken. Jeder Preis im Chart – Achse, Fadenkreuz, Legende, Orders, Zeichnungen – erscheint im selben Format, und die Achsenstriche liegen auf ganzen Brüchen.',
      tryThis: [
        'Fahren Sie mit der Maus über den Chart: Fadenkreuz und Legende zeigen 32stel',
        'Einstellungen → Anzeige → „Erweiterte Handelszeiten“ ausschalten, um nur die reguläre Sitzung zu sehen',
        'Wechseln Sie zu Renko oder Kagi und stellen Sie Box oder Umkehr in den Einstellungen ein',
        'Zeichnen Sie eine horizontale Linie: Auch ihre Beschriftung zeigt 32stel',
      ],
    },
    vnmarket: {
      title: 'Vietnamesische Märkte',
      stat: 'HOSE · VN30F',
      blurb:
        'HOSE und VN30-Futures so, wie ihre Börsen sie führen: Preise in Schritten von 10, 50 oder 100 Dong je nach Preisband, Tagesobergrenze, Tagesuntergrenze und Referenzkurs, Lots zu 100 Stück, die Handelssitzungen in vietnamesischer Zeit und die Farben der Kurstafel.',
      tryThis: [
        'Rechtsklick auf den Chart: Die angebotenen Preise liegen auf der Tick-Größe, bei HPG 50 Dong',
        'Öffnen Sie im Kontopanel eine neue Order: Sie beginnt bei 100 Stück, und ein Preis über der Obergrenze wird abgelehnt',
        'Wechseln Sie zu FPT (Schritte von 100 Dong) oder zum VN30F-Kontrakt (ab 8:45 Uhr)',
        'Die violette, die cyanfarbene und die gelbe Linie sind Obergrenze, Untergrenze und Referenzkurs',
      ],
    },
    priceboard: {
      title: 'Indikatoren der Kursanzeigen',
      stat: '64 Formationen',
      blurb:
        'Kerzenformationen, markiert an der Kerze, mit der sie enden, mit Namen: Engulfing, Hammer, Sterne, drei Soldaten, drei Krähen, 64 insgesamt; Umkehrformationen zählen nur nach dem Trend, den sie umkehren. Unter dem Chart Psychological Line und Volume Ratio, wie asiatische Kursanzeigen sie zeigen.',
      tryThis: [
        'Hineinzoomen: Jeder Pfeil bekommt den Kurznamen der Formation',
        'In den Einstellungen des Indikators lassen sich auch Dojis und Kreisel zeigen',
        'Zu HPG oder dem VN30F-Kontrakt wechseln',
      ],
    },
    subcent: {
      title: '30 Sprachen, Preise unter einem Cent',
      stat: 'i18n',
      blurb:
        'Das ganze Widget in 30 Sprachen – Menüs, Einstellungen, Zeichenwerkzeuge, Dialoge, Arabisch, Hebräisch und Persisch von rechts nach links – mit Zahlen im jeweils eigenen Format. PEPE notiert um 0,000004: Jede Beschriftung folgt der Genauigkeit der Preisskala, und die Achse wird breiter, damit alles passt.',
      tryThis: [
        'Wählen Sie über dem Chart eine Sprache: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P durchsucht schon beim Tippen alle Binance-Symbole, mit Namen',
        'Öffnen Sie die Einstellungen oder die Zeichenwerkzeuge, um die Übersetzung zu sehen',
        'Fahren Sie mit der Maus über den Chart: Das Fadenkreuz-Label behält die volle Genauigkeit im Zahlenformat der Sprache',
      ],
    },
    looks: {
      title: 'Ihr eigenes Erscheinungsbild',
      stat: '3 Presets',
      blurb:
        'Formen und Größen des Widgets sind Tokens: Ecken, Höhe der Bedienelemente, Schrift, Rahmen, Schatten, wie ein gewählter Button aussieht, Leisten angedockt oder schwebend. Starten Sie mit Studio, Terminal oder Capsule und ändern Sie, was Sie möchten; die Preismarken im Chart übernehmen dieselben Ecken.',
      tryThis: [
        'Wechseln Sie das Erscheinungsbild über dem Chart: Es ändert sich an Ort und Stelle, nichts wird neu aufgebaut',
        'Öffnen Sie in jedem Erscheinungsbild die Einstellungen, ein Menü oder die Zeichenwerkzeuge',
        'Capsule lässt die Werkzeugleiste und die Zeichenwerkzeuge als Inseln schweben, mit pillenförmigen Preismarken',
        'Terminal ist dicht und eckig: Beschriftungen in Großbuchstaben und eine Linie unter der gewählten Zeiteinheit',
      ],
    },
    overrides: {
      title: 'Style-Overrides',
      stat: '101 Schlüssel',
      blurb:
        'Jeder Teil des Chart-Aussehens per Schlüssel, unabhängig vom Theme: das Raster je Richtung, das Fadenkreuz, die Achsen, die Panes, die Legende, der letzte Kurs, das Volumen und die Farben jedes Charttyps. Hier ist das vertikale Raster aus, das horizontale gepunktet, das Fadenkreuz durchgezogen und die Signallinie des MACD gestrichelt in einem Pane mit eigenem Trenner.',
      tryThis: [
        'Wechseln Sie den Charttyp: Balken und Heikin-Ashi nehmen die Farben der Kerzen, solange sie keine eigenen haben',
        'Wechseln Sie das Theme der Seite: Was nicht überschrieben ist, folgt ihm',
        'Öffnen Sie die Einstellungen: Der Tab „Stil“ setzt jeden Schlüssel, auch die Farben des gezeigten Charttyps; der Tab „Handel“ die Farben von Orders, Markern und Zonen, „Auto“, bis Sie eine wählen',
      ],
    },
    parts: {
      title: 'Dein Widget, deine Teile',
      stat: '112 Schalter',
      blurb:
        'Jeder Teil des Widgets hat einen Schalter, an, bis du ihn ausschaltest, und im Betrieb änderbar: eine ganze Funktion (Alarme, Einstellungen, Tastenkürzel) oder eine Stelle (ein Knopf der Werkzeugleiste, ein Menüeintrag, eine Gruppe von Zeichenwerkzeugen). Eigene Knöpfe, Menüs und Statuseinträge sitzen in den Leisten des Widgets. Hier sind Replay, zwei Zeichengruppen und der Datendownload aus, und die Werkzeugleiste trägt ein Menü der Schalter.',
      tryThis: [
        'Öffne „features“ in der Werkzeugleiste und schalte Teile aus und an',
        'Das Auge unten in der Zeichenleiste blendet Werkzeug- und Statusleiste aus und wieder ein (Alt+X)',
        'Rechtsklick auf eine Zeichnung: Der letzte Eintrag gehört der Seite',
      ],
    },
    markets: {
      title: 'Beobachtungslisten und Markt',
      stat: 'Live-Kurse',
      blurb:
        'Symbollisten mit Live-Kursen aus dem Datenfeed, ein Panel mit dem Kurs des Symbols, dem Marktstatus und den Tageswerten, dazu Tick-Charts: eine Kerze je 100 Trades.',
      tryThis: [
        'Öffnen Sie das Menü der Beobachtungsliste: wechseln Sie zu Memes, legen Sie eine eigene Liste an und benennen Sie sie um',
        'Fügen Sie mit + ein Symbol hinzu, ziehen Sie Zeilen zum Umsortieren oder drücken Sie Entf auf einer Zeile',
        'Tippen Sie 100T in den Chart für eine Kerze je 100 Trades, dann 1m, um zurückzukehren',
        'Fahren Sie mit der Maus über den Chart: Unten erscheinen die Buttons zum Zoomen und Scrollen',
      ],
    },
    bigdata: {
      title: '200.000 Kerzen',
      stat: 'Leistung',
      blurb:
        'Zweihunderttausend 1-Minuten-Kerzen mit vier Indikatoren. Gerendert werden nur die sichtbaren Kerzen; gröbere Zeiteinheiten werden lokal umgerechnet, hinter einem Ladeschleier, wenn das länger als ein paar Frames dauert.',
      tryThis: [
        'Über dem Chart zwischen Canvas 2D und WebGL wechseln: jeder Wechsel misst ein kurzes Verschieben',
        'Bei aktivem WebGL den Charttyp auf Basislinie, Kagi oder Point & Figure umstellen: auch sie zeichnet die GPU',
        'Wechseln Sie zu 1H, 4H und zurück zu 1m – die Zeiten erscheinen unter dem Chart',
        'Zoomen Sie ganz heraus und verschieben Sie: Die Kosten pro Frame bleiben konstant',
        'Fügen Sie einen weiteren Indikator hinzu und beobachten Sie die Wechselzeit',
      ],
    },
    heatmap: {
      title: 'Liquiditäts-Heatmap',
      stat: '240 × 80 Zellen',
      blurb:
        'Zweihundertvierzig Orderbuch-Schnappschüsse mit je 80 Preisstufen als Heatmap hinter den Kerzen: Ruhende Größe leuchtet Stufe für Stufe auf, Gebote grün, Angebote rot, und Wände, die lange stehen bleiben, fallen auf. Mit WebGL zeichnet die GPU die 19.200 Zellen unter den Kerzen.',
      tryThis: [
        'Über dem Chart zwischen Canvas 2D und WebGL wechseln: jeder Wechsel misst ein kurzes Verschieben',
        'Suchen Sie die hellen Zeilen: Wände, die über die Zeit auf einem Preis stehen bleiben',
        'Zoomen Sie auf eine Wand und verschieben Sie hin und her: Die Zellen halten mit den Kerzen Schritt',
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
    subtitle: 'Sparklines, Equity-Kurven, Orderbuchtiefe, Marktkarten nach Sektor, Wasserfall- und Tachodiagramme, Balken- und Donutdiagramme, Streudiagramme, Histogramme, Kalender und Korrelationsmatrizen für Portfolios und KPIs.',
    portfolio: 'Portfolio-Performance',
    depth: 'Orderbuchtiefe',
    heatmap: 'Krypto-Markt-Heatmap',
    pnl: 'GuV-Attribution',
    fearGreed: 'Angst-und-Gier-Index',
    flows: 'Nettokäufe ausländischer Investoren, Mrd. Dong',
    flowSeries: 'Netto',
    allocation: 'Portfolio-Aufteilung',
    allocationTotal: 'Gesamt',
    assets: { stocks: 'Aktien', bonds: 'Anleihen', cash: 'Liquidität', gold: 'Gold' },
    riskReturn: 'Banken: Risiko und Rendite',
    banks: 'Banken',
    volatility: 'Volatilität',
    yearReturn: 'Jahresrendite',
    returns: 'Tagesrenditen',
    mean: 'Mittelwert',
    var: 'VaR 95 %',
    calendar: 'Tagesveränderung je Handelstag',
    sectorMap: 'Marktkarte nach Sektor',
    sectors: { banks: 'Banken', realEstate: 'Immobilien', steel: 'Stahl', retail: 'Einzelhandel', energy: 'Energie', tech: 'Technologie' },
    correlation: 'Bankaktien: Korrelation der Tagesrenditen',
    counterClock: 'Gegenuhrzeigerkurve: Kurs gegen Volumen, 25-Tage-Durchschnitte',
    avgVolume: 'Volumen, Durchschnitt',
    avgPrice: 'Kurs, Durchschnitt',
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

  engage: {
    click: 'Klicken, um den Chart zu bedienen',
    tap: 'Tippen, um den Chart zu bedienen',
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
    drawnWith: 'Gezeichnet mit {renderer}',
    live: 'LIVE',
    offline: 'OFFLINE',
    connecting: 'VERBINDE',
    hints: [
      ['Ziehen', 'verschieben'],
      ['Klick + Mausrad', 'zoomen'],
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
        blurb: 'Die komplette Trading-Oberfläche mit einem Aufruf: Symbolleiste, 69 Zeichenwerkzeuge, Beobachtungsliste, Trading, Replay, in 30 Sprachen.',
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

  audit: {
    metaTitle: 'Systemaudit — TradeCanvas',
    description:
      'Was TradeCanvas kann und wie schnell: jede Funktion nach Bereich, Bildzeiten auf integrierter Grafik, der Datenpfad, die Downloadgröße, wie getestet wird und die Grenzen, die wir kennen.',
    eyebrow: 'Systemaudit',
    title: 'Was es kann – und wie schnell.',
    ledeHtml:
      'Alles auf dieser Seite steckt in <code>@tradecanvas/chart</code> {version}. Die Bildzeiten wurden in Chrome auf einem Laptop mit integrierter Grafik (Intel UHD) gemessen; <code>node scripts/bench-render.mjs</code> im Repository spielt dieselben Szenen auf Ihrem Rechner ab.',
    numbersTitle: 'In Zahlen',
    numbers: [
      'Charttypen',
      'eingebaute Indikatoren',
      'Zeichenwerkzeuge',
      'Widget-Sprachen',
      'Style-Schlüssel',
      'Feature-Schalter des Widgets',
      'Laufzeitabhängigkeiten von Drittanbietern',
      'Unit-Tests',
    ],

    perfTitle: 'Bildzeit',
    perfLede: 'Die Zeit für ein Bild beim Verschieben. 16,7 ms entsprechen 60 Bildern pro Sekunde.',
    perfChart: 'Chart',
    perfRatio: 'Pixelverhältnis',
    perf: [
      '1600×900, 500 Kerzen + 4 Indikatoren',
      '1600×900, herausgezoomt auf 200.000 Kerzen + 4 Indikatoren',
      '1600×900, herausgezoomt auf 1.000.000 Kerzen + 4 Indikatoren',
      '1600×900, Tiefen-Heatmap, 240 Schnappschüsse × 80 Stufen',
      'Sechs Charts mit je 500 Kerzen und 2 Indikatoren',
      '2560×1400, 2.000 Kerzen + 4 Indikatoren',
      '2560×1400, 2.000 Kerzen + 4 Indikatoren',
      '2560×1400, 2.000 Kerzen + 4 Indikatoren',
    ],
    perfNoteHtml:
      'Canvas 2D ist der Standard. <code>renderer: \'webgl\'</code> (oder <code>\'auto\'</code>) zeichnet den Chartbereich mit WebGL 2 und fällt auf Canvas 2D zurück, wo WebGL 2 fehlt oder sein Kontext verloren geht.',

    dataTitle: 'Datenpfad',
    data: [
      'Ein Live-Tick mit Bollinger-Bändern, EMA, RSI und MACD auf 100.000 Kerzen',
      'Dieselben vier Indikatoren vollständig neu berechnet auf 100.000 Kerzen',
      'Eine Linie mit 1.000.000 sichtbaren Punkten, für ein Bild ausgedünnt',
      'Ein Neuzeichnen beim Überfahren (Fadenkreuz, Legende)',
      'Ein Symbol- oder Zeiteinheitenwechsel zeigt einen Ladeschleier erst nach',
    ],

    sizeTitle: 'Downloadgröße',
    sizeLede: 'Minifiziert und mit gzip komprimiert, inklusive allem, was importiert wird.',
    size: ['Chart, die Headless-API', 'ChartWidget, die komplette Oberfläche', 'Der WebGL-Renderer, beim ersten Einsatz geladen'],

    qualityTitle: 'Wie geprüft wird',
    quality: [
      'Mehr als 3.000 Unit-Tests in den sieben Paketen laufen bei jedem Pull Request in der CI.',
      'Der WebGL-Renderer zeichnet Kerzen auf dieselben Gerätepixel wie Canvas 2D; Linien und Flächen weichen nur an wenigen geglätteten Kantenpixeln ab.',
      'Der WebGL-Renderer wurde in Chromium, Firefox und WebKit geprüft. Ohne WebGL 2 oder wenn sein Kontext verloren geht, zeichnet der Chart mit Canvas 2D weiter.',
      'Die Codebeispiele in der Doku und im Agent-Skill werden gegen die echte API typgeprüft.',
      'Charts lassen sich per Screenreader vorlesen und mit der Tastatur bedienen; das Widget läuft auf Arabisch, Hebräisch und Persisch von rechts nach links.',
    ],

    catalogTitle: 'Funktionen',
    catalogLede: 'Nach Bereich filtern oder nach Name oder API suchen.',
    search: 'Funktionen durchsuchen',
    searchPlaceholder: 'replay, webgl, alarm…',
    all: 'Alle',
    count: '{shown} von {total}',
    colCapability: 'Funktion',
    colArea: 'Bereich',
    colDetail: 'Details und API',
    areas: {
      chartTypes: 'Charttypen',
      rendering: 'Rendering',
      indicators: 'Indikatoren',
      drawings: 'Zeichenwerkzeuge',
      scales: 'Skalen und Zeit',
      data: 'Daten und Echtzeit',
      trading: 'Trading',
      alerts: 'Alarme und Replay',
      workspace: 'Arbeitsbereich',
      customization: 'Anpassung',
      access: 'Sprachen und Barrierefreiheit',
      developers: 'Entwickler',
    },
    catalog: {
      chartTypes: [
        { name: 'Kerzen, OHLC-Balken, Linie, Fläche, Basislinie, Heikin-Ashi, hohle Kerzen', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko, Line Break, Kagi, Point & Figure, Range-Balken', detail: 'Boxgröße oder ATR, Linien bis zum Durchbruch, Umkehr in Prozent oder Preis, Spanne pro Balken' },
        { name: 'Volumenkerzen, Equivolume, HLC-Fläche, Stufenlinie, Linie mit Markern, Hoch-Tief', detail: '18 Charttypen insgesamt' },
        { name: 'Hauptserie ausgeblendet', detail: 'Nur Indikatoren und Zeichnungen bleiben' },
        { name: 'Charts für Dashboards', detail: 'Balken (gruppiert, gestapelt, waagerecht), Donut- und Kreisdiagramme, Streu- und Blasendiagramme, Histogramme, Kalender, Korrelationsmatrizen, Sektorkarten, Gegenuhrzeigerkurven, Sparklines, Tachos, Heatmaps und Treemaps, Wasserfälle, Orderbuchtiefe, Equity-Kurven' },
      ],
      rendering: [
        { name: 'Canvas 2D oder WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto', setRenderer, das Event rendererChange" },
        { name: 'Ein Strich pro Pixelspalte beim Herauszoomen', detail: 'Indikatorlinien, Bänder und Histogramme unter einem Pixel pro Kerze' },
        { name: 'Eine Million Kerzen flüssig verschoben', detail: 'Mit vier Indikatoren, bei einem Pixelverhältnis von 2' },
        { name: 'Tiefen-Heatmap, Volumenprofil und Marktprofil auf der GPU', detail: 'pushDepthSnapshot(book, time)' },
        { name: 'Mehrere WebGL-Charts auf einer Seite', detail: 'Bis zu 8 (setMaxWebGLCharts); die übrigen zeichnen mit Canvas 2D; zurück zu WebGL, sobald der Kontext wiederkommt' },
        { name: 'Scharf bei jeder Bildschirmskalierung', detail: 'Kerzen, Volumen und Zeichnungen auf Gerätepixeln bei 100 %, 125 % und 200 %' },
        { name: 'Keine Laufzeitabhängigkeiten von Drittanbietern', detail: 'Nichts weiter zu installieren oder zu prüfen' },
      ],
      indicators: [
        { name: '134 eingebaute Indikatoren', detail: 'Pivot-Punkte in sechs Varianten, MA Cross, Korrelation mit einem anderen Symbol' },
        { name: 'Preisquelle', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: 'Ein Indikator auf einem Indikator', detail: 'Etwa ein gleitender Durchschnitt des RSI, bei jedem Tick aktualisiert' },
        { name: 'Mehrere Indikatoren in einem Bereich, zwischen Bereichen verschoben', detail: 'moveIndicatorToPane' },
        { name: 'Derselbe Indikator mehrfach', detail: 'EMA 20 und EMA 50 nebeneinander' },
        { name: 'Niveaus und Schwellen', detail: 'RSI 30/70, CCI ±100, mit dem Layout gespeichert' },
        { name: 'Letzter Wert an der Achse', detail: 'An der Preisachse und der Achse jedes Bereichs, in der Farbe der Linie' },
        { name: 'Bereiche eingeklappt, maximiert und umsortiert', detail: 'Mit dem Layout gespeichert' },
        { name: 'Indikatorvorlagen', detail: 'Eingaben, Stil, Niveaus und Bereich, zusammen gespeichert und angewendet' },
        { name: 'Stil und Sichtbarkeit jeder Linie', detail: 'Eine ausgeblendete Linie dehnt die Skala nicht; setIndicatorDefaults' },
        { name: 'Volumen-Delta und CVD', detail: 'Aus den Kerzen geschätzt' },
        { name: 'Export der Indikatorwerte', detail: 'CSV oder JSON, eine Spalte pro Linie' },
        { name: 'Inkrementelle Updates bei Live-Ticks', detail: 'update() berechnet nur die entstehende Kerze neu' },
      ],
      drawings: [
        { name: '69 Zeichenwerkzeuge', detail: 'Linien, Kanäle, Fibonacci, Gann, Pitchforks, Elliott-Wellen, Muster, Zyklen, Projektionen' },
        { name: 'Eigene Einstellungen je Werkzeug', detail: 'Stil, Eigenschaften und Koordinaten auf dem Preisraster des Marktes' },
        { name: 'Long- und Short-Positionen', detail: 'Chance-Risiko-Verhältnis, Menge aus dem Risiko in Prozent oder Geld' },
        { name: 'Alarme an einer Zeichnung', detail: 'Wenn der Kurs eine Trendlinie oder einen Kanal so kreuzt, wie gezeichnet, auch bei logarithmischer Skala' },
        { name: 'Reihenfolge, Gruppen und Vorlagen', detail: 'Nach vorne, nach hinten, gruppieren, sperren, ausblenden' },
        { name: 'Notizen, Callouts, Pfeile, Flaggen, Pinsel, Pfad, Kurve', detail: 'Freihand- und Mehrpunktzeichnungen' },
        { name: 'Verankerter VWAP und Volumenprofil über einen festen Bereich', detail: 'Lesen die Kerzen des Charts' },
        { name: 'Radierer, Zoom-Rahmen, starker Magnet, Tastenkürzel', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: 'Zu einem Datum springen; Zeiträume von 1D bis Alle', detail: 'Kein Limit beim Herauszoomen' },
        { name: 'IANA-Zeitzonen mit Sommerzeit', detail: 'Oder die eigene Zeitzone der Börse' },
        { name: 'Jede Zeiteinheit und Tick-Kerzen', detail: '7m, 90m, 2d aus dem gebaut, was der Feed liefert; 100T aus seinen Trades' },
        { name: 'Linke und rechte Skala; logarithmisch, invertiert und prozentual je Bereich', detail: 'Die linke Skala für ein Overlay oder eine Kopie der Preisskala' },
        { name: 'Symbole vergleichen, Spread und Verhältnis', detail: 'Auf eigener Skala oder in eigenem Bereich, zeitlich abgeglichen' },
        { name: 'Erweiterte Handelszeiten', detail: 'Aus den Sitzungszeiten des Symbols' },
        { name: 'Preis- und Zeitformate', detail: 'priceFormat als Funktion oder Brüche wie 1/32; timeFormatter' },
        { name: 'Die Skala in den Dezimalstellen und dem Preisschritt des Symbols', detail: 'pricePrecision, minTick: Eine Aktie, die sich in Zehnerschritten bewegt, zeigt nie 21.705' },
        { name: 'Hoch- und Tieflinien, Bid und Ask', detail: 'Bid und Ask aus den Ticks des Feeds' },
        { name: 'Ereignismarken im Chart', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: 'Fertige Feeds und eigene', detail: 'Binance, Bybit, Coinbase, Kraken, mock; WebSocketAdapter, PollingAdapter' },
        { name: 'Ältere Historie beim Scrollen nach links nachgeladen', detail: 'fetchHistoryBefore' },
        { name: 'Symbolsuche mit Details', detail: 'searchSymbols, resolveSymbol: Dezimalstellen, Preisschritt, Sitzungen, Zeitzone' },
        { name: 'Symboldetails, die erst nach dem Verbinden bekannt werden', detail: 'Das Event symbolInfo des Adapters' },
        { name: 'Markttiefe-Leiter', detail: 'Bid- und Ask-Größe je Preis; Klick zum Handeln' },
        { name: 'Live-Kurse für Beobachtungslisten', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: 'News und Marktstatus', detail: 'fetchNews; ein Countdown bis zur Eröffnung oder zum Handelsschluss' },
        { name: 'Börsenregeln', detail: 'setMarket: Tick-Größen nach Preisband, tägliche Ober- und Untergrenze, Lots, Handelssitzungen; HOSE, HNX, UPCoM und VN30-Futures' },
      ],
      trading: [
        { name: 'Orders und Positionen im Chart', detail: 'Zum Ändern ziehen; über die Linie stornieren, schließen und umkehren' },
        { name: 'Ausführungsmarken', detail: 'Grund und Gewinn oder Verlust in executionFill' },
        { name: 'Ordermaske', detail: 'Menge, Typ, Stop-Loss und Take-Profit, Gültigkeit, schon beim Tippen geprüft; Tick-Größe, Ober- und Untergrenze und Lots der Börse' },
        { name: 'Kontopanel', detail: 'Positionen mit Live-Gewinn und -Verlust, offene Orders, Ausführungen' },
        { name: 'Signale und Trade-Zonen', detail: 'Style-Schlüssel markers.*, tradeZones.*' },
        { name: 'Backtesting und Risikokennzahlen', detail: '@tradecanvas/analytics: Kommission, Slippage, Sharpe, Sortino, Calmar, Drawdown' },
      ],
      alerts: [
        { name: 'Alarme über ein Preisniveau hinaus', detail: 'Linie kreuzt Linie, eine Bewegung von N % in N Kerzen, bei Kerzenschluss, mit Ablaufdatum' },
        { name: 'Bar-Replay in feineren Schritten', detail: 'Eine größere Zeiteinheit, aus kleineren Kerzen abgespielt' },
        { name: 'Paper-Trading im Replay', detail: 'Orders werden zu den abgespielten Kursen ausgeführt' },
        { name: 'Replay über ein Raster von Charts', detail: 'Im Gleichschritt' },
        { name: 'Replay für Anwendungen', detail: 'startTime, hideHistory, duration, Marken, die beim Abspielen erscheinen, replayComplete' },
      ],
      workspace: [
        { name: 'Ein Raster synchronisierter Widgets', detail: 'Bis zu 6, mit gemeinsamem Symbol, Zeiteinheit, Fadenkreuz, Zeit und Zeichnungen' },
        { name: 'Benannte Layouts in Ihrem eigenen Speicher', detail: 'Speichern, öffnen, umbenennen, automatisch speichern; LayoutStorage für einen Server' },
        { name: 'Rückgängig und Wiederholen für alles', detail: 'Zeichnungen, Indikatoren, Einstellungen und Charttyp; recordUndo' },
        { name: 'Kontextmenüs je Bereich', detail: 'Zeichnungen, Chartbereich, Panes, Preisachse, Zeitachse' },
        { name: 'Beobachtungslisten', detail: 'Mehrere Listen, per Ziehen umsortiert' },
        { name: 'Events für die Host-Anwendung', detail: 'symbolChange, timeframeChange, ordersChange, executionFill, styleChange und mehr' },
      ],
      customization: [
        { name: 'Drei Erscheinungsbilder für das Widget', detail: 'Studio, Terminal, Capsule; ui und setUI; CSS-Variablen --tcw-*' },
        { name: 'Das Aussehen des Charts per Schlüssel', detail: 'applyOverrides über 101 typisierte Schlüssel, auf einer Host- und einer Nutzerebene' },
        { name: 'Einstellungen, die jeden Schlüssel erreichen', detail: 'Ein Stil-Tab für den gezeigten Charttyp, ein Trading-Tab' },
        { name: '112 Feature-Schalter', detail: 'features, setFeatures, isFeatureOn; im laufenden Betrieb änderbar' },
        { name: 'Eigene Teile im Widget', detail: 'Buttons und Dropdowns in der Werkzeugleiste, Buttons in der Seitenleiste, Statuseinträge, Slots, Menüeinträge' },
        { name: 'Eigene Tastenkürzel', detail: 'addHotkey nach Tastaturbelegung' },
      ],
      access: [
        { name: 'Das Widget in 30 Sprachen', detail: 'Arabisch, Hebräisch und Persisch von rechts nach links' },
        { name: 'Screenreader und Tastatur', detail: 'Eine Chart-Zusammenfassung, Kerzen einzeln vorgelesen, Dialoge per Tastatur' },
        { name: 'Doku in sechs Sprachen, diese Website in vierzehn', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'Komponenten für React, Vue und Svelte', detail: 'Reaktive Props: overrides, indicators, features' },
        { name: 'Plugins', detail: 'Indikatoren, Zeichenwerkzeuge, Charttypen und Overlays; overlayScale und getPriceStep, um auf dem Preisraster zu zeichnen' },
        { name: 'Doku für Coding-Agenten', detail: 'llms.txt, llms-full.txt und ein Agent-Skill' },
      ],
    },

    limitsTitle: 'Bekannte Grenzen',
    limits: [
      'Canvas 2D bleibt der Standard-Renderer, bis WebGL auf mehr Geräten erprobt ist; die Bildrate von WebGL unter Safari und auf 5K-Bildschirmen ist noch nicht gemessen.',
      'Bei einem Pixelverhältnis von 2 auf einem 2560×1400-Chart braucht allein das Compositing des Browsers auf integrierter Grafik etwa 23 ms, daher liegen WebGL-Bilder dort im Schnitt bei 29 ms.',
      'Tick-Zeiteinheiten werden aus den jüngsten Trades gebaut, die ein Feed liefert; ältere Tick-Historie lässt sich nicht laden.',
      'Volumen-Delta und CVD werden aus den Kerzen geschätzt, nicht aus der Seite jedes einzelnen Trades.',
      'Höchstens 8 Charts pro Seite zeichnen gleichzeitig mit WebGL; die übrigen zeichnen mit Canvas 2D.',
    ],
  },

  business: {
    metaTitle: 'Für Unternehmen — TradeCanvas',
    description:
      'TradeCanvas in einem kommerziellen Produkt: MIT-lizenziert, kein Logo im Chart, keine Registrierung, keine Datenübertragung. Was eine IT-Prüfung fragt, mit Quellen, und das Programm für erste Partner.',
    eyebrow: 'Für Unternehmen',
    title: 'Ihr Trading-Chart, unter Ihrer eigenen Marke.',
    lede: 'TradeCanvas ist MIT-lizenziert. Bauen Sie es in ein kommerzielles Produkt ein, passen Sie es an, hosten Sie es selbst: Ihre Kunden sehen Ihre Marke, und Ihre Daten bleiben auf Ihren Servern.',
    ctaContact: 'Sprechen Sie mit uns',
    ctaAudit: 'Zum Systemaudit',

    freeTitle: 'Kostenlos, für jeden Zweck',
    free: [
      {
        title: 'Kein Logo im Chart',
        body: 'TradeCanvas zeichnet nichts Eigenes in den Chart oder ins Widget. Die MIT-Lizenz verlangt nur, dass ihr Text beim Code bleibt.',
      },
      {
        title: 'Keine Daten nach außen',
        body: 'Die Bibliothek enthält keine Telemetrie. Verbindungen öffnet sie nur über einen Datenadapter, den Sie starten: einen der eingebauten Börsen-Feeds oder Ihren eigenen.',
      },
      {
        title: 'Kein Antrag, keine Freigabe',
        body: 'npm install, und jede Funktion aus dem Systemaudit gehört Ihnen, einschließlich Markttiefe-Leiter, Tiefenchart und Heatmap.',
      },
      {
        title: 'Der gesamte Quellcode',
        body: 'Lesen, korrigieren, forken. MIT stellt keine Bedingungen an Ihren eigenen Code: Er bleibt Ihrer und bleibt geschlossen, wenn Sie es so wollen.',
      },
    ],

    reviewTitle: 'Bereit für die IT-Prüfung',
    reviewLede: 'Was eine Sicherheits- oder Lieferantenprüfung üblicherweise fragt, und wo Sie jede Antwort nachprüfen können.',
    reviewHtml: [
      'Keine Laufzeitabhängigkeiten von Drittanbietern: Das Chart-Paket hängt nur von core und commons aus TradeCanvas selbst ab.',
      'Kein <code>eval</code> und kein <code>new Function</code>, daher läuft es unter einer Content Security Policy ohne <code>unsafe-eval</code>.',
      "Das Widget fügt ein <code>&lt;style&gt;</code>-Element ein, seine Seiten brauchen daher <code>style-src 'unsafe-inline'</code>; der Headless-<code>Chart</code> fügt keines ein.",
      'Sicherheitsprobleme werden vertraulich gemeldet und innerhalb einer Woche beantwortet.',
      'Jeder Pull Request wird in der CI gebaut, typgeprüft und getestet: mehr als 3.000 Unit-Tests.',
      'Releases veröffentlicht GitHub Actions aus dem Repository, nicht vom Rechner eines Entwicklers.',
      'Chrome 80+, Firefox 80+, Safari 14+ und Edge 80+.',
      'Die Lizenz: MIT, eine Seite.',
    ],
    source: 'Quelle',

    dataTitle: 'Ihre Daten, Ihre Server',
    dataHtml:
      'Der Chart zeichnet die Bars, Ticks und Orders, die Sie ihm übergeben. Binden Sie Ihr eigenes Backend mit einem <code>DataAdapter</code> an, oder mit einem <code>WebSocketAdapter</code>, dem Sie eine URL, eine History-Funktion und einen Nachrichtenparser mitgeben; Orders gehen über einen eigenen Execution-Adapter hinaus. Die Doku zu Realtime und Trading zeigt, wie.',
    dataDocs: 'Realtime-Doku',
    tradingDocs: 'Trading-Doku',

    partnerTitle: 'Erste Partner',
    partnerLede:
      'Wir suchen die ersten Broker, Handelsplattformen und Fintech-Teams, die TradeCanvas ihren Kunden anbieten.',
    partnerGetTitle: 'Was Sie bekommen',
    partnerGet: [
      'Hilfe bei der Anbindung Ihres Datenfeeds und Ihrer Orders',
      'Probleme, auf die Sie stoßen, werden zuerst behoben',
      'Mitsprache dabei, was als Nächstes entsteht',
    ],
    partnerGiveTitle: 'Worum wir bitten',
    partnerGive: ['Feedback, während Sie entwickeln', 'Die Erlaubnis, Sie nach dem Livegang als Nutzer zu nennen'],
    partnerNote:
      'Bezahlter Support mit vertraglich zugesicherten Reaktionszeiten, Langzeitsupport für eine Hauptversion und eigens für Sie gebaute Module folgen später. Wenn Sie das schon jetzt brauchen, sagen Sie es uns.',

    contactTitle: 'Sprechen Sie mit uns',
    contactLede: 'Erzählen Sie uns, wer Sie sind, was Sie bauen und für welche Märkte.',
    contactPublic: 'Fragen zum Code stellen Sie am besten öffentlich, in den GitHub-Issues.',

    faqTitle: 'Fragen',
    faq: [
      {
        q: 'Müssen wir den Namen oder das Logo von TradeCanvas zeigen?',
        a: 'Nein. Der Lizenztext bleibt beim Code, wie er es in node_modules ohnehin tut; auf dem Bildschirm muss nichts erscheinen.',
      },
      {
        q: 'Müssen wir unseren eigenen Code veröffentlichen?',
        a: 'Nein. MIT stellt keine Bedingungen an den Code drumherum.',
      },
      {
        q: 'Kann sich die Lizenz nachträglich ändern?',
        a: 'Jede bereits veröffentlichte Version steht unter MIT und bleibt es: Die Lizenz eines veröffentlichten Releases lässt sich nicht zurücknehmen.',
      },
    ],
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
      styling: 'Gestaltung',
      customization: 'Anpassung',
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

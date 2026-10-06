import type { SiteMessages } from '../messages';

const de: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Canvas-Trading-Charts fürs Web',
    description:
      'TradeCanvas ist eine Trading-Chart-Bibliothek für das Web, gezeichnet mit Canvas 2D oder WebGL: 18 Charttypen, 111 Indikatoren, 69 Zeichenwerkzeuge, Live-Daten von Börsen, Orders im Chart, Replay und Backtesting, in 30 Sprachen. Keine Abhängigkeiten, MIT.',
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
    tagline: 'Trading-Charts für das Web, gezeichnet mit Canvas 2D oder WebGL. Keine Abhängigkeiten, MIT-lizenziert.',
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
    release: 'WebGL-Renderer, 30 Sprachen',
    title: 'Die Chart-Engine für Trading-Apps.',
    ledeHtml:
      'Von Kerzen bis Renko, 111 Indikatoren, 69 Zeichenwerkzeuge, Live-Daten von Börsen und Orders direkt im Chart. Gezeichnet mit Canvas 2D oder WebGL, ohne Abhängigkeiten. Binden Sie das komplette <code>ChartWidget</code> ein oder bauen Sie Ihre eigene Oberfläche auf dem Headless-<code>Chart</code>.',
    getStarted: 'Loslegen',
    browseExamples: 'Beispiele ansehen',
    specsLabel: 'Kennzahlen',
    specs: [
      'Indikatoren',
      'Zeichenwerkzeuge',
      'Charttypen',
      'Widget-Sprachen',
      'Kerzen bei 60 fps mit WebGL',
      'Laufzeitabhängigkeiten',
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
            '111 Indikatoren, jeder auf jedem anderen, etwa ein Durchschnitt des RSI',
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
      stat: '111 integriert',
      blurb:
        'Overlays und eigene Bereiche, selbst berechnet, ohne Mathe-Abhängigkeiten. Live-Ticks berechnen nur die laufende Kerze neu – 0,001 ms pro Tick mit vier Indikatoren auf 100k Kerzen.',
      tryThis: [
        'Klicken Sie auf „Indikatoren“ (oder Ctrl+K) und durchsuchen Sie alle 111',
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
      stat: '89 Schlüssel',
      blurb:
        'Jeder Teil des Chart-Aussehens per Schlüssel, unabhängig vom Theme: das Raster je Richtung, das Fadenkreuz, die Achsen, die Panes, die Legende, der letzte Kurs, das Volumen und die Farben jedes Charttyps. Hier ist das vertikale Raster aus, das horizontale gepunktet, das Fadenkreuz durchgezogen und die Signallinie des MACD gestrichelt in einem Pane mit eigenem Trenner.',
      tryThis: [
        'Wechseln Sie den Charttyp: Balken und Heikin-Ashi nehmen die Farben der Kerzen, solange sie keine eigenen haben',
        'Wechseln Sie das Theme der Seite: Was nicht überschrieben ist, folgt ihm',
        'Öffnen Sie die Einstellungen und wählen Sie eine Farbe: Sie landet in der Ebene des Nutzers, beim Theme gespeichert',
      ],
    },
    parts: {
      title: 'Dein Widget, deine Teile',
      stat: '112 Schalter',
      blurb:
        'Jeder Teil des Widgets hat einen Schalter, an, bis du ihn ausschaltest, und im Betrieb änderbar: eine ganze Funktion (Alarme, Einstellungen, Tastenkürzel) oder eine Stelle (ein Knopf der Werkzeugleiste, ein Menüeintrag, eine Gruppe von Zeichenwerkzeugen). Eigene Knöpfe, Menüs und Statuseinträge sitzen in den Leisten des Widgets. Hier sind Replay, zwei Zeichengruppen und der Datendownload aus, und die Werkzeugleiste trägt ein Menü der Schalter.',
      tryThis: [
        'Öffne „features“ in der Werkzeugleiste und schalte Teile aus und an',
        'Das Auge unten in der Zeichenleiste blendet Werkzeug- und Statusleiste aus und wieder ein',
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

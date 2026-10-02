import type { SiteMessages } from '../messages';

const fr: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Graphiques de trading en Canvas pour le web',
    description:
      'TradeCanvas est une bibliothèque de graphiques de trading en Canvas2D : 17 types de graphiques, 85 indicateurs, 40 outils de dessin, flux en direct des plateformes d’échange, ordres sur le graphique, relecture et backtesting. Zéro dépendance, MIT.',
  },

  nav: {
    main: 'Navigation principale',
    docs: 'Doc',
    examples: 'Exemples',
    playground: 'Bac à sable',
    changelog: 'Notes de version',
    toLight: 'Passer au thème clair',
    toDark: 'Passer au thème sombre',
    github: 'TradeCanvas sur GitHub',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    menu: 'Menu',
    language: 'Langue',
  },

  footer: {
    tagline: 'Graphiques de trading Canvas2D pour le web. Zéro dépendance, sous licence MIT.',
    library: 'Bibliothèque',
    packages: 'Paquets',
    project: 'Projet',
    gettingStarted: 'Premiers pas',
    apiReference: 'Référence de l’API',
    examples: 'Exemples',
    changelog: 'Notes de version',
    issues: 'Tickets',
    boGrid: 'bo-grid (grille de données)',
    builtWith: 'Réalisé avec TradeCanvas',
  },

  home: {
    release: 'rendu sur deux canvas, défilement libre',
    title: 'Le moteur de graphiques des applications de trading.',
    ledeHtml:
      'Des chandeliers au Renko, 85 indicateurs, 40 outils de dessin, des flux de marché en direct et des ordres sur le graphique. Dessiné en Canvas2D, sans aucune dépendance. Intégrez le <code>ChartWidget</code> complet ou bâtissez votre propre interface sur le moteur headless <code>Chart</code>.',
    getStarted: 'Commencer',
    browseExamples: 'Voir les exemples',
    specsLabel: 'Chiffres clés',
    specs: [
      'types de graphiques',
      'indicateurs',
      'outils de dessin',
      'dépendance d’exécution',
      'gzip, cœur headless',
      'rendu au survol, 100k barres',
    ],
    hood: {
      eyebrow: 'Sous le capot',
      title: 'Mesuré, documenté, à vous de l’étendre',
      subtitleHtml: 'Le moteur derrière le Labo des fonctionnalités. Chaque chiffre ci-dessous se reproduit avec <code>pnpm bench</code>.',
      frameBudget: 'Budget par image',
      perf: [
        'tick en direct avec 4 indicateurs sur 100k barres',
        'recalcul complet après un changement de symbole, 100k barres',
        'sous-échantillonnage LTTB, 100k → 1 600 points',
        'rendu au survol, constant de 500 à 100k barres',
      ],
      perfFoot: 'Deux canvas superposés : au survol, seul le canvas supérieur, très léger, est redessiné. Chaque moteur de rendu ne parcourt que les barres visibles.',
      gestures: 'Gestes',
      gestureList: [
        ['Glisser', 'défiler, y compris au-delà de la dernière barre'],
        ['Molette', 'zoomer autour du pointeur'],
        ['Pincer', 'zoomer sur écran tactile'],
        ['Glisser à droite', 'les barres plus anciennes se chargent au fur et à mesure'],
        ['Glisser un axe', 'le mettre à l’échelle'],
        ['Ctrl + glisser', 'sélectionner des dessins'],
        ['Shift + glisser', 'mesurer'],
        ['Alt + clic', 'épingler une info-bulle'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Un appel, toute l’interface de trading',
        text: 'ChartWidget apporte la barre d’outils, la barre latérale de dessin, la liste de suivi, les alertes, l’arborescence des objets, la fenêtre de données, la relecture et une palette de commandes (Ctrl+K), en 14 langues, de l’anglais et du vietnamien au chinois, au japonais et au coréen.',
      },
      {
        label: 'Données',
        title: 'N’importe quel flux de marché',
        text: 'Adaptateurs Binance, Coinbase, Bybit et Kraken intégrés ; WebSocketAdapter et PollingAdapter pour tout le reste. Les barres plus anciennes se chargent quand vous remontez dans le temps ; la reconnexion est automatique et les changements de symbole dépassés sont abandonnés.',
      },
      {
        label: 'Trading',
        title: 'Des ordres sur le graphique',
        text: 'ExecutionAdapter avec un courtier simulé, création d’ordres par glisser, ordres bracket, lignes de stop-loss et de take-profit déplaçables, alertes vers des webhooks et notifications de bureau.',
      },
      {
        label: 'Frameworks',
        title: 'React, Vue et Svelte',
        text: '@tradecanvas/react, /vue et /svelte enveloppent le même moteur avec des props réactives et typées. L’instance Chart complète reste à portée d’une ref.',
      },
      {
        label: 'Plugins',
        title: 'Chaque couche est extensible',
        text: 'Enregistrez vos propres indicateurs avec update() incrémental, outils de dessin, types de graphiques et superpositions, globalement ou par graphique.',
      },
      {
        label: 'Analyse',
        title: 'Des backtests à côté du graphique',
        text: 'Un Backtester barre par barre avec bandes de Monte-Carlo, et un pipeline d’indicateurs dans un Web Worker qui laisse le thread principal libre.',
      },
    ],
    quickstart: {
      eyebrow: 'Démarrage rapide',
      title: 'Un même graphique, cinq points d’entrée',
      subtitle: 'Le widget complet, un composant de framework ou le moteur headless. Tous partagent le même moteur de rendu.',
      tabs: 'Variante du démarrage rapide',
    },
    closing: {
      title: 'Ajoutez un graphique en direct à votre app dès aujourd’hui.',
      readDocs: 'Lire la documentation',
      star: 'Ajouter une étoile sur GitHub',
    },
  },

  lab: {
    eyebrow: 'Labo des fonctionnalités',
    title: 'Chaque fonctionnalité, sur un graphique en direct.',
    subtitleHtml:
      'Choisissez une scène. Chacune lance le <code>ChartWidget</code> complet dans un état qui montre un domaine à l’œuvre — ensuite, il est à vous : faites glisser, dessinez, changez de symbole ou d’unité de temps.',
    scenes: 'Scènes de fonctionnalités',
    widgetLanguage: 'Langue du widget',
    idle: 'Faites défiler jusqu’ici pour lancer le graphique en direct',
    metricHint: 'Changez de symbole ou d’unité de temps pour chronométrer le changement',
    metricSwitch: '→ {label} : {ms} · {bars} barres',
    metricSetData: 'setData({bars} barres) : {ms}',
    tryThis: 'À essayer',
  },

  scenes: {
    drawings: {
      title: 'Outils de dessin',
      stat: '40 outils',
      blurb:
        'Lignes de tendance, d’information et d’angle, canaux et éventails de Fibonacci, fourchettes d’Andrews et de Schiff, XABCD harmonique, tête-épaules, cycles, boîtes de mesure. Aimantation, annuler/rétablir, sauvegarde et restauration en JSON.',
      tryThis: [
        'Ouvrez le groupe zigzag (Figures) dans la barre d’outils de gauche et placez un ABCD',
        'Cliquez sur un dessin, faites glisser ses poignées, puis Ctrl+Z',
        'Les dessins sont ancrés dans le temps : ils survivent aux changements d’unité de temps',
      ],
    },
    indicators: {
      title: 'Indicateurs',
      stat: '85 intégrés',
      blurb:
        'Superpositions et panneaux calculés en interne, sans aucune dépendance mathématique. En direct, seule la barre en formation est recalculée — 0,001 ms par tick avec quatre indicateurs sur 100k barres.',
      tryThis: [
        'Cliquez sur le bouton Indicateurs (ou Ctrl+K) et cherchez parmi les 85',
        'Cliquez sur le nom d’un indicateur dans la légende : paramètres, couleurs et niveaux',
        'Réglez le champ « Source » d’une moyenne mobile sur la ligne d’un autre indicateur',
        'Faites glisser la ligne entre deux panneaux pour les redimensionner',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'courtier simulé',
      blurb:
        'Positions avec stop-loss et take-profit déplaçables, ordres en attente, ordres bracket et outils de position acheteuse/vendeuse, transmis via un ExecutionAdapter — ici le courtier simulé fourni.',
      tryThis: [
        'Faites glisser les lignes SL / TP de la position acheteuse ouverte — le courtier les met à jour',
        'Faites glisser un ordre en attente vers un nouveau prix',
        'Utilisez les boutons bracket Achat/Vente de la barre d’outils supérieure',
      ],
    },
    navigation: {
      title: 'Périodes et mises en page',
      stat: '1D … Tout',
      blurb:
        'Allez à une période ou à une date, inversez l’échelle des prix, épinglez vos unités de temps, utilisez plusieurs fois le même indicateur — et retrouvez le tout depuis une mise en page enregistrée.',
      tryThis: [
        'Cliquez sur 1M, 3M ou 6M sous le graphique ; Alt+G va à une date',
        'Alt+I retourne l’échelle des prix ; l’échelle logarithmique se trouve dans les Paramètres',
        'Paramètres → Fuseau horaire : choisissez New York ou Tokyo — l’axe, les changements de jour et le YTD suivent, heure d’été comprise',
        'Paramètres → Échelle → Échelle des prix à gauche ; l’onglet Style d’une EMA permet de l’y placer',
        'Mettez une étoile à une unité de temps dans le menu ▾ à côté des boutons d’unité',
        'Activez le bouton ↻ de la barre de gauche pour tracer plusieurs lignes d’affilée ; Ctrl+C / Ctrl+V pour les copier',
      ],
    },
    history: {
      title: 'Remonter dans le temps',
      stat: 'historique paginé',
      blurb:
        'Les barres plus anciennes se chargent page par page à mesure que vous glissez vers la plus ancienne, et ce qui est à l’écran ne bouge pas. Dézoomez jusqu’à voir toutes les barres chargées : sous un pixel par barre, les chandeliers fusionnent par colonne de pixels, et des milliers de barres restent lisibles.',
      tryThis: [
        'Faites glisser le graphique vers la droite : une pastille à gauche signale le chargement des barres plus anciennes',
        'Dézoomez à la molette, au-delà de quelques centaines de barres, jusqu’à un quart de pixel par barre',
        'Cliquez sur Tout sous le graphique pour afficher tout ce qui est chargé',
        'Tapez 7 ou 90 dans le menu ▾ des unités de temps : Binance ne propose ni l’une ni l’autre, le graphique les construit donc à partir de barres 1m et 30m',
      ],
    },
    replay: {
      title: 'Relecture des barres',
      stat: 'barre de lecture',
      blurb:
        'Parcourez l’historique barre par barre pour vous entraîner sans connaître la suite. Les données en direct sont mises de côté pendant la relecture ; l’échelle des prix s’ajuste à chaque pas.',
      tryThis: [
        'Appuyez sur Lecture, ou avancez et reculez d’une barre avec Shift+→ / Shift+←',
        'Cliquez sur n’importe quelle barre déjà révélée pour y placer le curseur',
        '« Revenir au temps réel » rebascule sur la série en direct',
      ],
    },
    subcent: {
      title: '14 langues, des prix sous le centime',
      stat: 'i18n',
      blurb:
        'Tout le widget en 14 langues — menus, paramètres, outils de dessin, boîtes de dialogue — avec les nombres au format de chaque langue. PEPE s’échange autour de 0,000004 : chaque étiquette suit la précision de l’échelle des prix, et l’axe s’élargit pour tout afficher.',
      tryThis: [
        'Choisissez une langue au-dessus du graphique : 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P cherche parmi tous les symboles Binance, avec leur nom, au fil de la frappe',
        'Ouvrez les Paramètres ou les outils de dessin pour les voir traduits',
        'Survolez le graphique : l’étiquette du réticule garde toute la précision, au format numérique de la langue',
      ],
    },
    bigdata: {
      title: '200 000 barres',
      stat: 'performances',
      blurb:
        'Deux cent mille barres d’une minute avec quatre indicateurs. Le rendu ne touche que les barres visibles ; les unités de temps plus longues sont recalculées localement, derrière un voile de chargement quand cela prend plus de quelques images.',
      tryThis: [
        'Passez en 1H, en 4H puis revenez en 1m — les durées s’affichent sous le graphique',
        'Dézoomez au maximum et faites défiler : le coût par image reste constant',
        'Ajoutez un indicateur et observez le temps de changement',
      ],
    },
    switching: {
      title: 'Changements sur réseau lent',
      stat: '+1,2 s de latence',
      blurb:
        'Ici, chaque requête d’historique est retardée de 1,2 s. Le graphique précédent reste affiché et n’est voilé que si un changement dure plus de 200 ms ; les clics rapides ne laissent jamais gagner une réponse périmée.',
      tryThis: [
        'Cliquez rapidement sur plusieurs symboles — seul le dernier s’affiche',
        'Changez d’unité de temps et regardez le voile apparaître puis disparaître',
        'Comparez avec la scène Indicateurs : les changements rapides ne clignotent jamais',
      ],
    },
  },

  gallery: {
    eyebrow: 'Types de graphiques',
    title: 'Chaque type de graphique, en direct dans la page',
    subtitleHtml:
      'Chaque vignette est une vraie instance de <code>Chart</code>, pas une image. Glissez pour défiler, utilisez la molette pour zoomer et survolez pour afficher le réticule ; chaque vignette réagit indépendamment.',
    tiles: {
      candlestick: { name: 'Chandeliers', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Tendance' },
      area: { name: 'Aire', tag: 'Clôture' },
      baseline: { name: 'Ligne de base', tag: 'Au-dessus / en dessous' },
      bar: { name: 'Barres OHLC', tag: 'Classique' },
      stepLine: { name: 'Ligne en escalier', tag: 'Discret' },
    },
  },

  finance: {
    eyebrow: 'Graphiques financiers',
    title: 'Au-delà des chandeliers',
    subtitle: 'Sparklines, courbes de capital, profondeur du carnet d’ordres, cartes de chaleur sectorielles, cascades et jauges pour les portefeuilles et les KPI.',
    portfolio: 'Performance du portefeuille',
    depth: 'Profondeur du carnet d’ordres',
    heatmap: 'Carte de chaleur du marché crypto',
    pnl: 'Attribution du P&L',
    fearGreed: 'Indice de peur et d’avidité',
    waterfall: {
      start: 'Début',
      btcLong: 'BTC long',
      ethShort: 'ETH short',
      solLong: 'SOL long',
      fees: 'Frais',
      end: 'Fin',
    },
    zones: {
      extremeFear: 'Peur extrême',
      fear: 'Peur',
      neutral: 'Neutre',
      greed: 'Avidité',
      extremeGreed: 'Avidité extrême',
    },
  },

  terminal: {
    symbol: 'Symbole',
    timeframe: 'Unité de temps',
    chartType: 'Type de graphique',
    types: {
      candlestick: 'Chandeliers',
      heikinAshi: 'Heikin-Ashi',
      area: 'Aire',
      bar: 'Barres',
      baseline: 'Ligne de base',
    },
    unavailable: 'Flux en direct indisponible : {error}',
    live: 'EN DIRECT',
    offline: 'HORS LIGNE',
    connecting: 'CONNEXION',
    hints: [
      ['Glisser', 'défiler'],
      ['Molette', 'zoom'],
      ['Glisser l’axe', 'échelle'],
    ],
  },

  copy: {
    copy: 'COPIER',
    copied: 'COPIÉ',
    copiedAnnouncement: 'Copié dans le presse-papiers',
    copyLabel: 'Copier {label}',
    copyCode: 'Copier le code',
    codeSample: 'Exemple de code',
    packageManager: 'Gestionnaire de paquets',
    copyInstall: 'Copier la commande d’installation',
  },

  examples: {
    metaTitle: 'Exemples · TradeCanvas',
    description: 'Exemples StackBlitz en direct pour Vanilla JS, React, Vue, Svelte, le ChartWidget et des tableaux de bord financiers.',
    eyebrow: 'Exemples · StackBlitz',
    title: 'Exemples',
    subtitleHtml:
      'Des bacs à sable en direct, à forker en un clic. Chacun s’ouvre dans StackBlitz avec les derniers paquets 1.x déjà branchés. Pour essayer les fonctionnalités sans rien installer, utilisez le <a href="{lab}">Labo des fonctionnalités</a> de la page d’accueil.',
    open: 'Ouvrir {title} dans StackBlitz',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'Le Chart headless : flux Binance en direct, Bollinger + RSI et les outils de dessin dans votre propre interface.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'Toute l’interface de trading en un appel : barre d’outils, 40 outils de dessin, liste de suivi, trading, relecture, en 14 langues.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — props réactives et typées, le Chart sous-jacent via une ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, props réactives, le Chart depuis @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — runes, props réactives, bind:chart.',
      },
      finance: {
        title: 'Tableau de bord financier',
        blurb: 'Rendus sparkline, jauge, carte de chaleur, profondeur et courbe de capital réunis dans une seule mise en page.',
      },
    },
  },

  playground: {
    metaTitle: 'Bac à sable · TradeCanvas',
    description: 'Forkez un bac à sable TradeCanvas interactif dans StackBlitz et lancez-vous.',
    eyebrow: 'Bac à sable · StackBlitz',
    title: 'Bac à sable',
    subtitle: 'Un projet modifiable dans StackBlitz, avec le ChartWidget déjà connecté aux données en direct de Binance.',
    launch: 'Lancer le bac à sable',
    more: 'Plus d’exemples',
    insideTitle: 'Ce qu’il contient',
    insideHtml:
      'Un projet Vite + TypeScript minimal avec un seul fichier, <code>src/main.ts</code>, qui monte le <code>ChartWidget</code> et connecte un <code>BinanceAdapter</code>.',
  },

  changelog: {
    metaTitle: 'Notes de version — TradeCanvas',
    description: 'Les notes de chaque version de TradeCanvas.',
    englishOnly: 'Les notes de version sont rédigées en anglais.',
  },

  backtest: {
    title: 'Backtest en direct — croisement SMA(10/30)',
    subtitle: '365 jours de cours synthétiques, 10 k$ de capital initial, 0,05 % de commission, 0,03 % de glissement.',
    play: 'Lecture',
    pause: 'Pause',
    replay: 'Rejouer',
    end: 'Fin',
    running: 'Backtest en cours…',
    failed: 'Échec : {error}',
    bar: 'Barre {index}/{total}',
    totalReturn: 'Rendement total',
    maxDrawdown: 'DD max.',
    winRate: 'Taux de réussite',
    profitFactor: 'Facteur de profit',
    trades: 'Trades',
  },

  error: {
    notFound: 'Page introuvable',
    notFoundText: 'Cette page n’existe pas ou a été déplacée.',
    other: 'Une erreur s’est produite',
    otherText: 'Impossible d’afficher la page. Réessayez, ou repartez de l’accueil.',
    home: 'Retour à l’accueil',
    docs: 'Ouvrir la documentation',
  },

  docs: {
    titleSuffix: 'Documentation TradeCanvas',
    navLabel: 'Navigation de la documentation',
    groups: {
      start: 'Premiers pas',
      chart: 'Graphique',
      trading: 'Trading',
    },
    pages: {
      'getting-started': 'Premiers pas',
      frameworks: 'Frameworks',
      embed: 'Widget intégrable',
      api: 'Référence de l’API',
      'chart-types': 'Types de graphiques',
      indicators: 'Indicateurs',
      'drawing-tools': 'Outils de dessin',
      plugins: 'Plugins',
      performance: 'Performances',
      trading: 'Surcouche de trading',
      finance: 'Graphiques financiers',
      realtime: 'Temps réel et relecture',
      analytics: 'Analyse',
    },
    notTranslated: 'Cette page n’est pas encore traduite ; elle s’affiche en anglais.',
  },
};

export default fr;

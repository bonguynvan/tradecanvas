import type { SiteMessages } from '../messages';

const fr: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Graphiques de trading en Canvas pour le web',
    description:
      'TradeCanvas est une bibliothèque de graphiques de trading pour le web, dessinée en Canvas 2D ou WebGL : 18 types de graphiques, 111 indicateurs, 69 outils de dessin, flux de marché en direct, ordres sur le graphique, replay et backtesting, en 30 langues. Aucune dépendance, MIT.',
  },

  nav: {
    main: 'Navigation principale',
    docs: 'Doc',
    examples: 'Exemples',
    playground: 'Bac à sable',
    changelog: 'Notes de version',
    audit: 'Audit',
    business: 'Entreprises',
    toLight: 'Passer au thème clair',
    toDark: 'Passer au thème sombre',
    github: 'TradeCanvas sur GitHub',
    sponsor: 'Sponsoriser',
    sponsorLabel: 'Sponsoriser TradeCanvas sur GitHub',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    menu: 'Menu',
    language: 'Langue',
  },

  footer: {
    tagline: 'Des graphiques de trading pour le web, dessinés en Canvas 2D ou WebGL. Aucune dépendance, licence MIT.',
    library: 'Bibliothèque',
    packages: 'Paquets',
    project: 'Projet',
    gettingStarted: 'Premiers pas',
    apiReference: 'Référence de l’API',
    examples: 'Exemples',
    changelog: 'Notes de version',
    audit: 'Audit du système',
    business: 'Pour les entreprises',
    issues: 'Tickets',
    boGrid: 'bo-grid (grille de données)',
    builtWith: 'Réalisé avec TradeCanvas',
  },

  home: {
    release: 'moteur de rendu WebGL, 30 langues',
    title: 'Le moteur de graphiques des applications de trading.',
    ledeHtml:
      'Des chandeliers au Renko, 111 indicateurs, 69 outils de dessin, des flux de marché en direct et des ordres sur le graphique. Dessiné en Canvas 2D ou WebGL, sans aucune dépendance. Intégrez le <code>ChartWidget</code> complet ou bâtissez votre propre interface sur le moteur headless <code>Chart</code>.',
    getStarted: 'Commencer',
    browseExamples: 'Voir les exemples',
    specsLabel: 'Chiffres clés',
    specs: [
      'indicateurs',
      'outils de dessin',
      'types de graphiques',
      'langues du widget',
      'barres à 60 fps avec WebGL',
      'dépendance tierce à l’exécution',
    ],
    tape: 'Cours en direct de Binance',
    tapePause: 'Mettre les cours en pause',
    tapePlay: 'Relancer les cours',
    story: {
      eyebrow: 'Du premier coup d’œil à l’ordre exécuté',
      title: 'Un graphique pour tout le trade',
      subtitle: 'Quatre graphiques en direct, chacun à l’œuvre sur sa part. Faites-les glisser, zoomez, dessinez dessus.',
      chapters: [
        {
          title: 'Lire le marché',
          text: 'Bandes, moyennes et oscillateurs sur les bougies, niveaux de Fibonacci et lignes de tendance par-dessus, chacun avec ses réglages et ses alertes.',
          points: [
            '111 indicateurs, l’un sur l’autre, comme une moyenne du RSI',
            '69 outils de dessin avec aimant, groupes et annulation',
            'Alertes sur les prix, les lignes et les croisements d’indicateurs',
          ],
        },
        {
          title: 'Trader sur le graphique',
          text: 'Ordres, positions et leurs brackets vivent sur l’échelle des prix. Faites glisser un stop pour le déplacer ; le courtier fictif les exécute, vous construisez donc avant de vous connecter.',
          points: [
            'Placez un ordre en glissant, déplacez son stop-loss et son take-profit de même',
            'Marques d’exécution et profits et pertes sur le graphique',
            'Votre courtier se branche par un seul adaptateur',
          ],
        },
        {
          title: 'Rejouer le passé',
          text: 'Parcourez l’historique bougie par bougie ou laissez-le défiler : indicateurs, dessins et ordres fictifs suivent le prix rejoué.',
          points: [
            'N’importe quelle bougie de départ, n’importe quelle vitesse',
            'Chaque bougie peut se former pas à pas à partir de plus fines',
            'Tradez le replay avec le courtier fictif',
          ],
        },
        {
          title: 'Monter en charge sans saccades',
          text: 'Ici, 200 000 barres et quatre indicateurs qui défilent seuls. Changez de moteur de rendu et regardez le temps par image : avec WebGL, le GPU dessine les bougies et les lignes.',
          points: [
            '1 000 000 de barres en vue d’ensemble à 60 fps avec WebGL',
            'Canvas 2D là où WebGL manque, avec le même rendu',
            'Seules les barres à l’écran sont dessinées',
          ],
        },
      ],
      frameTime: '{ms} ms par image',
      panning: 'Défile seul jusqu’à ce que vous preniez la main',
      renderer: 'Moteur de rendu',
      replaying: 'Replay en cours',
    },
    trust: {
      label: 'Open source',
      downloads: '{n} téléchargements npm par mois',
      license: 'licence {n}',
      dependencies: '{n} dépendance d’exécution',
      typescript: 'types {n} pour toute l’API',
    },
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
        text: 'ChartWidget apporte la barre d’outils, la barre latérale de dessin, la liste de suivi, les alertes, l’arborescence des objets, la fenêtre de données, la relecture et une palette de commandes (Ctrl+K), en 30 langues, de l’anglais et du vietnamien au chinois, au japonais, au coréen et à l’arabe.',
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
    widgetLook: 'Apparence du widget',
    widgetRenderer: 'Moteur de rendu',
    idle: 'Faites défiler jusqu’ici pour lancer le graphique en direct',
    metricHint: 'Changez de symbole ou d’unité de temps pour chronométrer le changement',
    metricSwitch: '→ {label} : {ms} · {bars} barres',
    metricSetData: 'setData({bars} barres) : {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name} : {ms} par image en défilement',
    metricRendererMissing: 'Pas de WebGL 2 ici : rendu en Canvas 2D',
    tryThis: 'À essayer',
  },

  scenes: {
    drawings: {
      title: 'Outils de dessin',
      stat: '69 outils',
      blurb:
        'Outils de Fibonacci et de Gann avec vos propres niveaux, vagues d’Elliott, figures harmoniques, notes et pinceaux. Un double-clic sur un dessin ouvre ses paramètres, un clic droit son menu ; les alertes suivent les lignes de tendance, et l’outil de position acheteuse/vendeuse calcule la taille de la position.',
      tryThis: [
        'Double-cliquez sur le retracement de Fibonacci et modifiez ses niveaux',
        'Faites un clic droit sur un dessin : avancez-le d’un plan, groupez-le ou ajoutez une alerte',
        'Choisissez le pinceau ou l’outil Tracé ; Entrée termine un tracé',
      ],
    },
    indicators: {
      title: 'Indicateurs',
      stat: '111 intégrés',
      blurb:
        'Superpositions et panneaux calculés en interne, sans aucune dépendance mathématique. En direct, seule la barre en formation est recalculée — 0,001 ms par tick avec quatre indicateurs sur 100k barres.',
      tryThis: [
        'Cliquez sur le bouton Indicateurs (ou Ctrl+K) et cherchez parmi les 111',
        'Cliquez sur le nom d’un indicateur dans la légende : paramètres, couleurs et niveaux',
        'Réglez le champ « Source » d’une moyenne mobile sur la ligne d’un autre indicateur',
        'Faites glisser la ligne entre deux panneaux pour les redimensionner ; les boutons en haut à droite d’un panneau le déplacent, le replient ou l’agrandissent',
        'Le ⋯ d’une ligne de la légende déplace l’indicateur dans le panneau du dessus ou du dessous, ou dans son propre panneau',
        'Menu Indicateurs → Enregistrer les indicateurs comme modèle… ; Ctrl+Z annule aussi les modifications des indicateurs',
        'Tapez un nombre sur le graphique (4, puis h, Entrée) pour changer d’unité de temps ; Alt+T choisit la ligne de tendance',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'courtier simulé',
      blurb:
        'Des ordres et des positions que vous pilotez depuis le graphique : déplacez stops et objectifs, annulez, clôturez ou inversez depuis la ligne, et voyez chaque exécution marquée sur sa barre. Un ticket d’ordre et le panneau du compte se trouvent sous le graphique ; tout passe par un ExecutionAdapter — ici le courtier simulé fourni.',
      tryThis: [
        'Cliquez sur ⇅ de la position acheteuse ouverte pour l’inverser, ou sur × pour la clôturer — l’exécution s’affiche comme une marque sur sa barre',
        'Faites un clic droit sous le prix : achat à cours limité, vente stop ou nouvel ordre à ce prix',
        'Le panneau du compte, sous le graphique, liste les positions avec leur P&L, les ordres et l’historique',
        'Faites glisser les lignes SL / TP de la position acheteuse ouverte — le courtier les met à jour',
        'Le + près de l’axe des prix propose une alerte, un ordre ou une ligne à ce prix',
      ],
    },
    workspace: {
      title: 'Espace de travail',
      stat: 'multi-graphique',
      blurb:
        'Deux graphiques côte à côte, liés par le réticule — ou, à votre choix, par le symbole, l’unité de temps, le temps et les dessins. Enregistrez tout l’espace de travail comme disposition nommée et revenez-y plus tard.',
      tryThis: [
        'Survolez un graphique : l’autre affiche le même moment',
        'Activez « Unité » dans la barre Synchro, puis changez l’unité de temps d’un graphique',
        'Choisissez quatre graphiques dans la barre ; avec « Symbole » synchronisé, les nouveaux s’ouvrent sur le symbole du graphique actif',
        'Disposition ▾ → Enregistrer sous…, modifiez quelque chose, puis rouvrez la disposition (Ctrl+S enregistre)',
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
        'Choisissez un Pas plus fin dans la barre de relecture (15m) pour voir chaque barre se former',
        'Les marques d’achat et de vente et la transaction n’apparaissent qu’une fois atteintes par le replay',
      ],
    },
    compare: {
      title: 'Comparaison, écart, ratio',
      stat: 'symboles',
      blurb:
        'ETH sur sa propre échelle de prix à côté de BTC, et BTC ÷ ETH dans un panneau. Les autres symboles s’alignent sur le graphique dans le temps ; l’écart ou le ratio a sa légende, ses étiquettes de valeur et ses alertes comme n’importe quel indicateur. Le plus haut et le plus bas à l’écran sont marqués.',
      tryThis: [
        'Ouvrez l’arborescence des objets et cliquez sur le + à côté de Comparer : choisissez un symbole, puis la manière',
        'Faites un clic droit sur le panneau du ratio pour une échelle en pourcentage',
        'Faites un clic droit sur le graphique : Exporter les données (CSV) emporte toutes les lignes d’indicateurs',
        'Changez d’unité de temps : les barres de l’autre symbole sont récupérées de nouveau',
      ],
    },
    bonds: {
      title: 'Obligations en 32es',
      stat: 'formats',
      blurb:
        'Une obligation cotée en 32es et demi-32es (110’165 vaut 110 et 16½ 32es) sur des barres haut-bas. Chaque prix du graphique — axe, réticule, légende, ordres, dessins — se lit de la même façon, et les graduations de l’axe tombent sur des fractions entières.',
      tryThis: [
        'Survolez le graphique : le réticule et la légende affichent des 32es',
        'Paramètres → Affichage → désactivez Horaires de négociation étendus pour ne garder que la séance régulière',
        'Passez en Renko ou en Kagi et réglez la boîte ou le retournement dans les Paramètres',
        'Tracez une ligne horizontale : son étiquette s’affiche aussi en 32es',
      ],
    },
    subcent: {
      title: '30 langues, des prix sous le centime',
      stat: 'i18n',
      blurb:
        'Tout le widget en 30 langues — menus, paramètres, outils de dessin, boîtes de dialogue, l’arabe, l’hébreu et le persan de droite à gauche — avec les nombres au format de chaque langue. PEPE s’échange autour de 0,000004 : chaque étiquette suit la précision de l’échelle des prix, et l’axe s’élargit pour tout afficher.',
      tryThis: [
        'Choisissez une langue au-dessus du graphique : 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P cherche parmi tous les symboles Binance, avec leur nom, au fil de la frappe',
        'Ouvrez les Paramètres ou les outils de dessin pour les voir traduits',
        'Survolez le graphique : l’étiquette du réticule garde toute la précision, au format numérique de la langue',
      ],
    },
    looks: {
      title: 'Votre propre apparence',
      stat: '3 préréglages',
      blurb:
        'Les formes et les tailles du widget sont des tokens : coins, hauteur des contrôles, typographie, bordures, ombres, aspect d’un bouton sélectionné, barres ancrées ou flottantes. Partez de Studio, Terminal ou Capsule et changez ce qui vous plaît ; les étiquettes de prix du graphique prennent les mêmes coins.',
      tryThis: [
        'Changez d’apparence au-dessus du graphique : elle change sur place, rien n’est reconstruit',
        'Ouvrez les Paramètres, un menu ou les outils de dessin dans chaque apparence',
        'Capsule fait flotter la barre d’outils et les outils de dessin comme des îlots, avec des étiquettes de prix en pastille',
        'Terminal est dense et carré : libellés en majuscules, et un trait sous l’unité de temps choisie',
      ],
    },
    overrides: {
      title: 'Overrides de style',
      stat: '101 clés',
      blurb:
        'N’importe quelle partie de l’aspect du graphique par clé, à part du thème : la grille dans chaque sens, le réticule, les axes, les panneaux, la légende, le dernier cours, le volume et les couleurs de chaque type de graphique. Ici la grille verticale est masquée, l’horizontale en pointillés, le réticule plein, et la ligne de signal du MACD en tirets dans un panneau avec son propre séparateur.',
      tryThis: [
        'Changez de type de graphique : les barres et le Heikin-Ashi prennent les couleurs des bougies s’ils n’ont pas les leurs',
        'Changez le thème du site : ce qui n’est pas surchargé le suit',
        'Ouvrez les Paramètres : l’onglet Style règle chaque clé, couleurs du type de graphique affiché comprises ; l’onglet Trading règle les couleurs des ordres, marqueurs et zones, en Auto tant que vous n’en choisissez pas',
      ],
    },
    parts: {
      title: 'Votre widget, vos pièces',
      stat: '112 interrupteurs',
      blurb:
        'Chaque partie du widget a son interrupteur, allumé jusqu’à ce que vous l’éteigniez et modifiable en marche : une capacité entière (alertes, réglages, raccourcis) ou un seul endroit (un bouton de la barre, une entrée de menu, une section d’outils de dessin). Vos propres boutons, menus et éléments d’état prennent place dans les barres du widget. Ici le replay, deux sections de dessin et le téléchargement des données sont éteints, et la barre porte un menu d’interrupteurs.',
      tryThis: [
        'Ouvrez « features » dans la barre et éteignez ou rallumez des parties',
        'L’œil en bas de la barre de dessin masque la barre d’outils et la barre d’état, puis les rend (Alt+X)',
        'Clic droit sur un dessin : la dernière entrée est celle de la page',
      ],
    },
    markets: {
      title: 'Listes de suivi et marché',
      stat: 'cours en direct',
      blurb:
        'Des listes de symboles avec les cours en direct du flux, un panneau avec le prix du symbole, l’état du marché et les chiffres du jour, et des graphiques en ticks : une barre toutes les 100 transactions.',
      tryThis: [
        'Ouvrez le menu de la liste de suivi : passez à Memes, créez votre propre liste, renommez-la',
        'Ajoutez un symbole avec +, faites glisser les lignes pour les réordonner, ou appuyez sur Suppr sur l’une d’elles',
        'Tapez 100T sur le graphique pour une barre toutes les 100 transactions, puis 1m pour revenir',
        'Survolez le graphique pour voir les boutons de zoom et de défilement en bas',
      ],
    },
    bigdata: {
      title: '200 000 barres',
      stat: 'performances',
      blurb:
        'Deux cent mille barres d’une minute avec quatre indicateurs. Le rendu ne touche que les barres visibles ; les unités de temps plus longues sont recalculées localement, derrière un voile de chargement quand cela prend plus de quelques images.',
      tryThis: [
        'Basculez entre Canvas 2D et WebGL au-dessus du graphique : chaque bascule chronomètre un court défilement',
        'Avec WebGL, passez le type de graphique en Ligne de base, Kagi ou Point & Figure : eux aussi sont dessinés par le GPU',
        'Passez en 1H, en 4H puis revenez en 1m — les durées s’affichent sous le graphique',
        'Dézoomez au maximum et faites défiler : le coût par image reste constant',
        'Ajoutez un indicateur et observez le temps de changement',
      ],
    },
    heatmap: {
      title: 'Heatmap de liquidité',
      stat: '240 × 80 cellules',
      blurb:
        'Deux cent quarante instantanés du carnet d’ordres, de 80 niveaux de prix chacun, en heatmap derrière les bougies : la taille en attente s’allume niveau par niveau, achats en vert, ventes en rouge, et les murs qui persistent ressortent. Avec WebGL, les 19 200 cellules sont dessinées par le GPU sous les barres.',
      tryThis: [
        'Basculez entre Canvas 2D et WebGL au-dessus du graphique : chaque bascule chronomètre un court défilement',
        'Repérez les rangées brillantes : des murs de taille qui restent sur un prix dans le temps',
        'Zoomez sur un mur puis faites défiler d’un côté à l’autre : les cellules suivent les barres',
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

  engage: {
    click: 'Cliquez pour utiliser le graphique',
    tap: 'Touchez pour utiliser le graphique',
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
    drawnWith: 'Dessiné avec {renderer}',
    live: 'EN DIRECT',
    offline: 'HORS LIGNE',
    connecting: 'CONNEXION',
    hints: [
      ['Glisser', 'défiler'],
      ['Clic + molette', 'zoom'],
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
        blurb: 'Toute l’interface de trading en un appel : barre d’outils, 69 outils de dessin, liste de suivi, trading, relecture, en 30 langues.',
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

  audit: {
    metaTitle: 'Audit du système — TradeCanvas',
    description:
      'Ce que fait TradeCanvas, et à quelle vitesse : chaque fonctionnalité par domaine, les temps par image sur une puce graphique intégrée, le chemin des données, le poids du téléchargement, la façon dont il est testé et les limites connues.',
    eyebrow: 'Audit du système',
    title: 'Ce qu’il fait, et à quelle vitesse.',
    ledeHtml:
      'Tout ce qui figure sur cette page est livré dans <code>@tradecanvas/chart</code> {version}. Les temps par image ont été mesurés dans Chrome, sur un portable à puce graphique intégrée (Intel UHD) ; <code>node scripts/bench-render.mjs</code>, dans le dépôt, rejoue les mêmes scènes sur votre machine.',
    numbersTitle: 'En chiffres',
    numbers: [
      'types de graphiques',
      'indicateurs intégrés',
      'outils de dessin',
      'langues du widget',
      'clés de style',
      'interrupteurs de fonctionnalités du widget',
      'dépendance tierce à l’exécution',
      'tests unitaires',
    ],

    perfTitle: 'Temps par image',
    perfLede: 'Le temps de dessin d’une image pendant le défilement. 16,7 ms correspondent à 60 images par seconde.',
    perfChart: 'Graphique',
    perfRatio: 'Ratio de pixels',
    perf: [
      '1600×900, 500 bougies + 4 indicateurs',
      '1600×900, vue d’ensemble sur 200 000 barres + 4 indicateurs',
      '1600×900, vue d’ensemble sur 1 000 000 de barres + 4 indicateurs',
      '1600×900, heatmap de profondeur, 240 instantanés × 80 niveaux',
      'Six graphiques, avec 500 bougies et 2 indicateurs chacun',
      '2560×1400, 2 000 bougies + 4 indicateurs',
      '2560×1400, 2 000 bougies + 4 indicateurs',
      '2560×1400, 2 000 bougies + 4 indicateurs',
    ],
    perfNoteHtml:
      'Canvas 2D est le moteur de rendu par défaut. <code>renderer: \'webgl\'</code> (ou <code>\'auto\'</code>) dessine la zone du graphique en WebGL 2 et revient à Canvas 2D là où WebGL 2 manque ou quand son contexte est perdu.',

    dataTitle: 'Chemin des données',
    data: [
      'Un tick en direct avec bandes de Bollinger, EMA, RSI et MACD sur 100 000 barres',
      'Les quatre mêmes indicateurs entièrement recalculés sur 100 000 barres',
      'Une ligne de 1 000 000 de points visibles, sous-échantillonnée pour une image',
      'Un redessin au survol (réticule, légende)',
      'Un changement de symbole ou d’unité de temps n’affiche un voile de chargement qu’au-delà de',
    ],

    sizeTitle: 'Poids du téléchargement',
    sizeLede: 'Minifié et compressé en gzip, avec tout ce qu’il importe.',
    size: ['Chart, l’API headless', 'ChartWidget, l’interface complète', 'Le moteur de rendu WebGL, chargé à la première utilisation'],

    qualityTitle: 'Comment c’est vérifié',
    quality: [
      'Plus de 3 000 tests unitaires, répartis sur les sept paquets, s’exécutent en CI à chaque pull request.',
      'Le moteur de rendu WebGL dessine les bougies sur les mêmes pixels de l’appareil que Canvas 2D ; les lignes et les remplissages ne diffèrent que sur quelques pixels de bord lissés.',
      'Le moteur de rendu WebGL a été vérifié dans Chromium, Firefox et WebKit. Sans WebGL 2, ou quand son contexte est perdu, le graphique continue en Canvas 2D.',
      'Les exemples de code de la doc et de la skill pour agents sont vérifiés par typage contre la vraie API.',
      'Les graphiques se lisent au lecteur d’écran et s’utilisent au clavier ; le widget s’affiche de droite à gauche en arabe, en hébreu et en persan.',
    ],

    catalogTitle: 'Fonctionnalités',
    catalogLede: 'Filtrez par domaine, ou cherchez par nom ou par API.',
    search: 'Rechercher une fonctionnalité',
    searchPlaceholder: 'relecture, webgl, alerte…',
    all: 'Tout',
    count: '{shown} sur {total}',
    colCapability: 'Fonctionnalité',
    colArea: 'Domaine',
    colDetail: 'Détails et API',
    areas: {
      chartTypes: 'Types de graphiques',
      rendering: 'Rendu',
      indicators: 'Indicateurs',
      drawings: 'Outils de dessin',
      scales: 'Échelles et temps',
      data: 'Données et temps réel',
      trading: 'Trading',
      alerts: 'Alertes et relecture',
      workspace: 'Espace de travail',
      customization: 'Personnalisation',
      access: 'Langues et accessibilité',
      developers: 'Développeurs',
    },
    catalog: {
      chartTypes: [
        { name: 'Bougies, barres OHLC, ligne, aire, ligne de base, Heikin-Ashi, bougies creuses', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko, line break, Kagi, point & figure, barres de range', detail: 'Taille de boîte ou ATR, lignes à casser, retournement en pourcentage ou en prix, amplitude par barre' },
        { name: 'Bougies de volume, Equivolume, aire HLC, ligne en escalier, ligne avec marqueurs, haut-bas', detail: '18 types de graphiques au total' },
        { name: 'La série principale masquée', detail: 'Seuls les indicateurs et les dessins restent' },
      ],
      rendering: [
        { name: 'Canvas 2D ou WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto', setRenderer, l’événement rendererChange" },
        { name: 'Un trait par colonne de pixels en vue d’ensemble', detail: 'Lignes, bandes et histogrammes d’indicateurs sous un pixel par barre' },
        { name: 'Un million de barres qui défilent sans à-coups', detail: 'Avec quatre indicateurs, à un ratio de pixels de 2' },
        { name: 'Heatmap de profondeur, profil de volume et profil de marché sur le GPU', detail: 'pushDepthSnapshot(book, time)' },
        { name: 'Plusieurs graphiques WebGL sur une page', detail: 'Jusqu’à 8 (setMaxWebGLCharts) ; les autres dessinent en Canvas 2D ; retour à WebGL quand le contexte revient' },
        { name: 'Net à toutes les échelles d’affichage', detail: 'Bougies, volume et dessins sur les pixels de l’appareil à 100 %, 125 % et 200 %' },
        { name: 'Aucune dépendance tierce à l’exécution', detail: 'Rien d’autre à installer ni à auditer' },
      ],
      indicators: [
        { name: '111 indicateurs intégrés', detail: 'Points pivots de six sortes, MA Cross, corrélation avec un autre symbole' },
        { name: 'Source de prix', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: 'Un indicateur appliqué à un indicateur', detail: 'Comme une moyenne mobile du RSI, mise à jour à chaque tick' },
        { name: 'Plusieurs indicateurs dans un panneau, déplacés d’un panneau à l’autre', detail: 'moveIndicatorToPane' },
        { name: 'Plusieurs fois le même indicateur', detail: 'EMA 20 et EMA 50 côte à côte' },
        { name: 'Niveaux et seuils', detail: 'RSI 30/70, CCI ±100, enregistrés avec la disposition' },
        { name: 'Dernière valeur sur l’axe', detail: 'Sur l’axe des prix et sur l’axe de chaque panneau, dans la couleur de la ligne' },
        { name: 'Panneaux repliés, agrandis et réordonnés', detail: 'Enregistrés avec la disposition' },
        { name: 'Modèles d’indicateurs', detail: 'Paramètres, style, niveaux et panneau, enregistrés et appliqués ensemble' },
        { name: 'Style et visibilité de chaque ligne', detail: 'Une ligne masquée n’étire pas l’échelle ; setIndicatorDefaults' },
        { name: 'Delta de volume et CVD', detail: 'Estimés à partir des barres' },
        { name: 'Export des valeurs d’indicateurs', detail: 'CSV ou JSON, une colonne par ligne' },
        { name: 'Mises à jour incrémentales sur les ticks en direct', detail: 'update() ne recalcule que la barre en formation' },
      ],
      drawings: [
        { name: '69 outils de dessin', detail: 'Lignes, canaux, Fibonacci, Gann, fourchettes, vagues d’Elliott, figures, cycles, projections' },
        { name: 'Les réglages propres à chaque outil', detail: 'Style, propriétés et coordonnées sur la grille de prix du marché' },
        { name: 'Positions acheteuses et vendeuses', detail: 'Rapport risque/rendement, quantité à partir du risque en pourcentage ou en montant' },
        { name: 'Alertes sur un dessin', detail: 'Quand le prix franchit une ligne de tendance ou un canal tel qu’il est dessiné, échelle logarithmique comprise' },
        { name: 'Ordre, groupes et modèles', detail: 'Avancer, reculer, grouper, verrouiller, masquer' },
        { name: 'Notes, bulles, flèches, drapeaux, pinceau, tracé, courbe', detail: 'Dessin à main levée et à plusieurs points' },
        { name: 'VWAP ancré et profil de volume sur plage fixe', detail: 'Lisent les barres du graphique' },
        { name: 'Gomme, zoom par zone, aimant fort, raccourcis clavier', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: 'Aller à une date ; périodes de 1D à Tout', detail: 'Pas de limite de dézoom' },
        { name: 'Fuseaux horaires IANA avec heure d’été', detail: 'Ou le fuseau propre à la place de marché' },
        { name: 'N’importe quelle unité de temps, et barres en ticks', detail: '7m, 90m, 2d construites à partir de ce que sert le flux ; 100T à partir de ses transactions' },
        { name: 'Échelles gauche et droite ; logarithmique, inversée et en pourcentage par panneau', detail: 'L’échelle de gauche pour une superposition ou une copie de l’échelle des prix' },
        { name: 'Comparer des symboles, spread et ratio', detail: 'Sur leur propre échelle ou panneau, alignés dans le temps' },
        { name: 'Horaires étendus', detail: 'D’après les horaires de séance du symbole' },
        { name: 'Formats de prix et d’heure', detail: 'priceFormat en fonction ou en fractions comme 1/32 ; timeFormatter' },
        { name: 'L’échelle aux décimales et au pas de prix du symbole', detail: 'pricePrecision, minTick : une action qui évolue par pas de 10 n’affiche jamais 21 705' },
        { name: 'Lignes du plus haut et du plus bas, bid et ask', detail: 'Bid et ask d’après les ticks du flux' },
        { name: 'Marques d’événements sur le graphique', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: 'Des flux prêts à l’emploi, et les vôtres', detail: 'Binance, Bybit, Coinbase, Kraken, mock ; WebSocketAdapter, PollingAdapter' },
        { name: 'Historique plus ancien chargé en défilant vers la gauche', detail: 'fetchHistoryBefore' },
        { name: 'Recherche de symboles avec leurs détails', detail: 'searchSymbols, resolveSymbol : décimales, pas de prix, séances, fuseau horaire' },
        { name: 'Détails du symbole appris après la connexion', detail: 'L’événement symbolInfo de l’adaptateur' },
        { name: 'Échelle de profondeur de marché', detail: 'Taille à l’achat et à la vente par prix ; cliquez pour trader' },
        { name: 'Cours en direct pour les listes de suivi', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: 'Actualités et état du marché', detail: 'fetchNews ; un compte à rebours jusqu’à l’ouverture ou la clôture' },
      ],
      trading: [
        { name: 'Ordres et positions sur le graphique', detail: 'Faites glisser pour modifier ; annulez, clôturez et inversez depuis la ligne' },
        { name: 'Marques d’exécution', detail: 'Motif et gain ou perte dans executionFill' },
        { name: 'Ticket d’ordre', detail: 'Quantité, type, stop-loss et take-profit, durée de validité, vérifiés pendant la saisie' },
        { name: 'Panneau du compte', detail: 'Positions avec gains et pertes en direct, ordres en attente, exécutions' },
        { name: 'Signaux et zones de trade', detail: 'Clés de style markers.*, tradeZones.*' },
        { name: 'Backtesting et mesures de risque', detail: '@tradecanvas/analytics : commission, glissement, Sharpe, Sortino, Calmar, drawdown' },
      ],
      alerts: [
        { name: 'Des alertes au-delà d’un niveau de prix', detail: 'Ligne qui en croise une autre, variation de N % en N barres, à la clôture de la barre, avec expiration' },
        { name: 'Relecture des barres par pas plus fins', detail: 'Une unité de temps plus longue rejouée à partir de barres plus courtes' },
        { name: 'Trading fictif pendant une relecture', detail: 'Ordres exécutés aux prix rejoués' },
        { name: 'Relecture sur une grille de graphiques', detail: 'Tous au même pas' },
        { name: 'Relecture pour les applications', detail: 'startTime, hideHistory, duration, marques révélées au fil de la lecture, replayComplete' },
      ],
      workspace: [
        { name: 'Une grille de widgets synchronisés', detail: 'Jusqu’à 6, partageant symbole, unité de temps, réticule, temps et dessins' },
        { name: 'Des dispositions nommées sur votre propre stockage', detail: 'Enregistrer, ouvrir, renommer, enregistrement auto ; LayoutStorage pour un serveur' },
        { name: 'Annuler et rétablir pour tout', detail: 'Dessins, indicateurs, paramètres et type de graphique ; recordUndo' },
        { name: 'Menus contextuels par zone', detail: 'Dessins, zone du graphique, panneaux, axe des prix, axe du temps' },
        { name: 'Listes de suivi', detail: 'Plusieurs listes, réordonnées par glisser' },
        { name: 'Des événements pour l’application hôte', detail: 'symbolChange, timeframeChange, ordersChange, executionFill, styleChange et d’autres' },
      ],
      customization: [
        { name: 'Trois apparences pour le widget', detail: 'Studio, Terminal, Capsule ; ui et setUI ; variables CSS --tcw-*' },
        { name: 'L’apparence du graphique, clé par clé', detail: 'applyOverrides sur 101 clés typées, sur une couche hôte et une couche utilisateur' },
        { name: 'Des paramètres qui atteignent chaque clé', detail: 'Un onglet de style pour le type de graphique affiché, un onglet trading' },
        { name: '112 interrupteurs de fonctionnalités', detail: 'features, setFeatures, isFeatureOn ; modifiables en marche' },
        { name: 'Vos propres pièces dans le widget', detail: 'Boutons et menus déroulants de la barre d’outils, boutons de la barre latérale, éléments d’état, emplacements, entrées de menu' },
        { name: 'Vos propres raccourcis', detail: 'addHotkey selon la disposition du clavier' },
      ],
      access: [
        { name: 'Le widget en 30 langues', detail: 'L’arabe, l’hébreu et le persan de droite à gauche' },
        { name: 'Lecteurs d’écran et clavier', detail: 'Un résumé du graphique, les barres lues une à une, les boîtes de dialogue au clavier' },
        { name: 'La doc en six langues, ce site en quatorze', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'Composants React, Vue et Svelte', detail: 'Props réactives : overrides, indicators, features' },
        { name: 'Plugins', detail: 'Indicateurs, outils de dessin, types de graphiques et superpositions ; overlayScale et getPriceStep pour dessiner sur la grille de prix' },
        { name: 'Une doc pour les agents de code', detail: 'llms.txt, llms-full.txt et une skill pour agents' },
      ],
    },

    limitsTitle: 'Limites connues',
    limits: [
      'Canvas 2D reste le moteur de rendu par défaut tant que WebGL n’a pas été essayé sur davantage d’appareils ; sa fréquence d’images sur Safari et sur les écrans 5K n’a pas encore été mesurée.',
      'À un ratio de pixels de 2 sur un graphique de 2560×1400, la composition du navigateur prend à elle seule environ 23 ms sur une puce graphique intégrée ; les images WebGL y durent donc 29 ms en moyenne.',
      'Les unités de temps en ticks sont construites à partir des transactions récentes que renvoie un flux ; un historique de ticks plus ancien ne peut pas être chargé.',
      'Le delta de volume et le CVD sont estimés à partir des barres, pas du sens de chaque transaction.',
      'Au plus 8 graphiques d’une page dessinent en WebGL en même temps ; les autres dessinent en Canvas 2D.',
    ],
  },

  business: {
    metaTitle: 'Pour les entreprises — TradeCanvas',
    description:
      'TradeCanvas dans un produit commercial : licence MIT, aucun logo sur le graphique, aucune inscription, rien n’est envoyé nulle part. Ce que demande une revue informatique, sources à l’appui, et le programme des premiers partenaires.',
    eyebrow: 'Pour les entreprises',
    title: 'Votre graphique de trading, sous votre propre marque.',
    lede: 'TradeCanvas est sous licence MIT. Intégrez-le à un produit commercial, modifiez-le, hébergez-le vous-même : vos clients voient votre marque, et vos données restent sur vos serveurs.',
    ctaContact: 'Nous contacter',
    ctaAudit: 'Lire l’audit du système',

    freeTitle: 'Gratuit, pour tout usage',
    free: [
      {
        title: 'Aucun logo sur le graphique',
        body: 'TradeCanvas ne dessine rien de son cru sur le graphique ni dans le widget. La licence MIT demande seulement que son texte accompagne le code.',
      },
      {
        title: 'Rien n’est envoyé nulle part',
        body: 'La bibliothèque n’a aucune télémétrie. Elle n’ouvre de connexion que par un adaptateur de données que vous démarrez : l’un des flux de marché intégrés, ou le vôtre.',
      },
      {
        title: 'Ni demande, ni validation',
        body: 'Un npm install, et toutes les fonctionnalités de l’audit du système sont à vous, y compris l’échelle de profondeur de marché, le graphique de profondeur et la heatmap.',
      },
      {
        title: 'Tout le code source',
        body: 'Lisez-le, corrigez-le, forkez-le. La licence MIT n’exige rien de votre propre code : il reste le vôtre, et reste fermé si vous le souhaitez.',
      },
    ],

    reviewTitle: 'Prêt pour une revue informatique',
    reviewLede: 'Ce que demande généralement une revue de sécurité ou une évaluation fournisseur, et où vérifier chaque réponse.',
    reviewHtml: [
      'Aucune dépendance tierce à l’exécution : le paquet du graphique ne dépend que du core et des commons de TradeCanvas lui-même.',
      'Ni <code>eval</code> ni <code>new Function</code> : il fonctionne donc sous une Content Security Policy sans <code>unsafe-eval</code>.',
      "Le widget ajoute un élément <code>&lt;style&gt;</code>, ses pages ont donc besoin de <code>style-src 'unsafe-inline'</code> ; le <code>Chart</code> headless n’en ajoute aucun.",
      'Les problèmes de sécurité se signalent en privé et reçoivent une réponse sous une semaine.',
      'Chaque pull request est compilée, son typage vérifié et ses tests exécutés en CI : plus de 3 000 tests unitaires.',
      'Les versions sont publiées par GitHub Actions depuis le dépôt, pas depuis la machine d’un développeur.',
      'Chrome 80+, Firefox 80+, Safari 14+ et Edge 80+.',
      'La licence : MIT, une page.',
    ],
    source: 'Source',

    dataTitle: 'Vos données, vos serveurs',
    dataHtml:
      'Le graphique dessine les barres, les ticks et les ordres que vous lui fournissez. Branchez votre propre backend avec un <code>DataAdapter</code>, ou avec un <code>WebSocketAdapter</code> auquel vous donnez une URL, une fonction d’historique et un parseur de messages ; les ordres partent par un adaptateur d’exécution qui vous appartient. La doc Realtime et la doc Trading expliquent comment.',
    dataDocs: 'Doc Realtime',
    tradingDocs: 'Doc Trading',

    partnerTitle: 'Premiers partenaires',
    partnerLede:
      'Nous cherchons les premiers courtiers, plateformes de trading et équipes fintech qui mettront TradeCanvas entre les mains de leurs clients.',
    partnerGetTitle: 'Ce que vous obtenez',
    partnerGet: [
      'De l’aide pour brancher votre flux de données et vos ordres',
      'Les problèmes que vous rencontrez, corrigés en priorité',
      'Votre mot à dire sur la suite',
    ],
    partnerGiveTitle: 'Ce que nous demandons',
    partnerGive: ['Vos retours pendant que vous développez', 'L’autorisation de vous citer comme utilisateur une fois en production'],
    partnerNote:
      'Le support payant, avec des délais de réponse contractuels, un support à long terme d’une version majeure et des modules développés pour vous, viendra plus tard. Si vous en avez besoin dès maintenant, dites-le-nous.',

    contactTitle: 'Nous contacter',
    contactLede: 'Dites-nous qui vous êtes, ce que vous construisez et pour quels marchés.',
    contactPublic: 'Les questions sur le code ont leur place en public, dans les issues GitHub.',

    faqTitle: 'Questions',
    faq: [
      {
        q: 'Devons-nous afficher le nom ou le logo de TradeCanvas ?',
        a: 'Non. Gardez le texte de la licence avec le code, comme c’est déjà le cas dans node_modules ; rien ne doit apparaître à l’écran.',
      },
      {
        q: 'Devons-nous publier notre propre code ?',
        a: 'Non. La licence MIT n’impose aucune condition au code qui l’entoure.',
      },
      {
        q: 'La licence pourrait-elle changer du jour au lendemain ?',
        a: 'Chaque version déjà publiée est sous MIT et le restera : la licence d’une version publiée ne peut pas être retirée.',
      },
    ],
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
      styling: 'Apparence',
      customization: 'Personnalisation',
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

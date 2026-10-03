import type { SiteMessages } from '../messages';

const es: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Gráficos de trading en Canvas para la web',
    description:
      'TradeCanvas es una biblioteca de gráficos de trading en Canvas2D: 17 tipos de gráfico, 85 indicadores, 69 herramientas de dibujo, datos en vivo de exchanges, órdenes en el gráfico, repetición y backtesting. Sin dependencias, MIT.',
  },

  nav: {
    main: 'Principal',
    docs: 'Documentación',
    examples: 'Ejemplos',
    playground: 'Zona de pruebas',
    changelog: 'Cambios',
    toLight: 'Cambiar al tema claro',
    toDark: 'Cambiar al tema oscuro',
    github: 'TradeCanvas en GitHub',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    menu: 'Menú',
    language: 'Idioma',
  },

  footer: {
    tagline: 'Gráficos de trading en Canvas2D para la web. Sin dependencias, con licencia MIT.',
    library: 'Biblioteca',
    packages: 'Paquetes',
    project: 'Proyecto',
    gettingStarted: 'Primeros pasos',
    apiReference: 'Referencia de la API',
    examples: 'Ejemplos',
    changelog: 'Registro de cambios',
    issues: 'Incidencias',
    boGrid: 'bo-grid (tabla de datos)',
    builtWith: 'Hecho con TradeCanvas',
  },

  home: {
    release: 'renderizador de dos canvas, desplazamiento libre',
    title: 'El motor de gráficos para apps de trading.',
    ledeHtml:
      'De velas a Renko, 85 indicadores, 69 herramientas de dibujo, datos en vivo de exchanges y órdenes en el gráfico. Dibujado en Canvas2D sin dependencias. Integra el <code>ChartWidget</code> completo o crea tu propia interfaz sobre el <code>Chart</code> headless.',
    getStarted: 'Empezar',
    browseExamples: 'Ver ejemplos',
    specsLabel: 'Cifras clave',
    specs: [
      'tipos de gráfico',
      'indicadores',
      'herramientas de dibujo',
      'dependencias en tiempo de ejecución',
      'gzip, núcleo headless',
      'fotograma al pasar el cursor, 100k barras',
    ],
    hood: {
      eyebrow: 'Bajo el capó',
      title: 'Medido, documentado y listo para ampliar',
      subtitleHtml:
        'El motor que impulsa el Laboratorio de funciones. Cada cifra de abajo se puede reproducir con <code>pnpm bench</code>.',
      frameBudget: 'Presupuesto por fotograma',
      perf: [
        'tick en vivo con 4 indicadores sobre 100k barras',
        'recálculo completo tras cambiar de símbolo, 100k barras',
        'submuestreo LTTB, 100k → 1,600 puntos',
        'fotograma al pasar el cursor, constante de 500 a 100k barras',
      ],
      perfFoot:
        'Dos canvas superpuestos: al pasar el cursor solo se repinta el fino canvas superior. Cada renderizador recorre solo las barras en pantalla.',
      gestures: 'Gestos',
      gestureList: [
        ['Arrastrar', 'desplazar, también más allá de la última barra'],
        ['Rueda', 'zoom alrededor del puntero'],
        ['Pellizcar', 'zoom en una pantalla táctil'],
        ['Arrastrar a la derecha', 'las barras antiguas se cargan sobre la marcha'],
        ['Arrastrar un eje', 'escalarlo'],
        ['Ctrl + arrastrar', 'seleccionar dibujos'],
        ['Shift + arrastrar', 'medir'],
        ['Alt + clic', 'fijar un tooltip'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Una llamada, toda la interfaz de trading',
        text: 'ChartWidget trae la barra de herramientas, la barra lateral de dibujo, la lista de seguimiento, las alertas, el árbol de objetos, la ventana de datos, la repetición y una paleta de comandos (Ctrl+K), en 14 idiomas, del inglés y el vietnamita al chino, el japonés y el coreano.',
      },
      {
        label: 'Datos',
        title: 'Cualquier fuente de mercado',
        text: 'Adaptadores integrados para Binance, Coinbase, Bybit y Kraken; WebSocketAdapter y PollingAdapter para todo lo demás. Las barras antiguas se cargan al desplazarte hacia atrás; se reconecta solo y descarta los cambios de símbolo que han quedado obsoletos.',
      },
      {
        label: 'Trading',
        title: 'Órdenes en el gráfico',
        text: 'ExecutionAdapter con un bróker simulado, órdenes creadas arrastrando, órdenes bracket, líneas de stop-loss y take-profit arrastrables, alertas a webhooks y notificaciones de escritorio.',
      },
      {
        label: 'Frameworks',
        title: 'React, Vue y Svelte',
        text: '@tradecanvas/react, /vue y /svelte envuelven el mismo motor con props reactivas y tipadas. La instancia completa de Chart sigue a una ref de distancia.',
      },
      {
        label: 'Plugins',
        title: 'Amplía cada capa',
        text: 'Registra indicadores personalizados con update() incremental, herramientas de dibujo, tipos de gráfico y superposiciones, de forma global o por gráfico.',
      },
      {
        label: 'Analítica',
        title: 'Backtests junto al gráfico',
        text: 'Un Backtester barra a barra con bandas de Monte Carlo y un pipeline de indicadores en un Web Worker que deja libre el hilo principal.',
      },
    ],
    quickstart: {
      eyebrow: 'Inicio rápido',
      title: 'El mismo gráfico, cinco formas de empezar',
      subtitle: 'El widget completo, un componente de framework o el motor headless. Todos comparten un mismo renderizador.',
      tabs: 'Variante de inicio rápido',
    },
    closing: {
      title: 'Pon un gráfico en vivo en tu app hoy mismo.',
      readDocs: 'Leer la documentación',
      star: 'Dar una estrella en GitHub',
    },
  },

  lab: {
    eyebrow: 'Laboratorio de funciones',
    title: 'Cada función, en un gráfico en vivo.',
    subtitleHtml:
      'Elige una escena. Cada una arranca el <code>ChartWidget</code> completo en un estado que muestra un área en acción; después es tuyo para arrastrar, dibujar y cambiar.',
    scenes: 'Escenas de funciones',
    widgetLanguage: 'Idioma del widget',
    idle: 'Desplázate hasta aquí para iniciar el gráfico en vivo',
    metricHint: 'Cambia de símbolo o de temporalidad para medir el tiempo',
    metricSwitch: '→ {label}: {ms} · {bars} barras',
    metricSetData: 'setData({bars} barras): {ms}',
    tryThis: 'Prueba esto',
  },

  scenes: {
    drawings: {
      title: 'Herramientas de dibujo',
      stat: '69 herramientas',
      blurb:
        'Herramientas de Fibonacci y Gann con tus propios niveles, ondas de Elliott, patrones armónicos, notas y pinceles. Doble clic en un dibujo abre su configuración y clic derecho, su menú; las alertas siguen las líneas de tendencia, y la herramienta de posición larga/corta calcula el tamaño de la posición.',
      tryThis: [
        'Haz doble clic en el retroceso de Fibonacci y edita sus niveles',
        'Haz clic derecho en un dibujo: tráelo adelante, agrúpalo o añade una alerta',
        'Elige el pincel o la herramienta de ruta; Enter termina una ruta',
      ],
    },
    indicators: {
      title: 'Indicadores',
      stat: '85 integrados',
      blurb:
        'Superpuestos y en paneles, calculados internamente, sin dependencias matemáticas. Los ticks en vivo recalculan solo la barra en formación: 0.001 ms por tick con cuatro indicadores sobre 100k barras.',
      tryThis: [
        'Pulsa el botón Indicadores (o Ctrl+K) y busca cualquiera de los 85',
        'Haz clic en el nombre de un indicador en la leyenda: parámetros, colores y niveles',
        'Pon como fuente de una media móvil la línea de otro indicador',
        'Arrastra la línea entre paneles para cambiar su tamaño; los botones de arriba a la derecha de un panel lo mueven, lo contraen o lo maximizan',
        'El ⋯ de una fila de la leyenda mueve el indicador al panel de arriba o de abajo, o a un panel propio',
        'Menú Indicadores → Guardar indicadores como plantilla…; Ctrl+Z también deshace los cambios en los indicadores',
        'Escribe un número en el gráfico (4, luego h, Enter) para cambiar la temporalidad; Alt+T elige la línea de tendencia',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'bróker simulado',
      blurb:
        'Órdenes y posiciones que manejas desde el gráfico: arrastra stops y objetivos, cancela, cierra o invierte desde la línea, y ve cada ejecución marcada en su barra. Bajo el gráfico hay un ticket de orden y un panel de cuenta, y todo pasa por un ExecutionAdapter; aquí, el bróker simulado incluido.',
      tryThis: [
        'Pulsa ⇅ en la posición larga abierta para invertirla, o × para cerrarla: la ejecución aparece como una marca en su barra',
        'Haz clic derecho por debajo del precio: compra límite, venta stop o una nueva orden a ese precio',
        'El panel de cuenta bajo el gráfico muestra las posiciones con su P&L, las órdenes y el historial',
        'Arrastra las líneas SL / TP de la posición larga abierta: el bróker las actualiza',
        'El + junto al eje de precio ofrece una alerta, una orden o una línea a ese precio',
      ],
    },
    workspace: {
      title: 'Espacio de trabajo',
      stat: 'varios gráficos',
      blurb:
        'Dos gráficos uno junto a otro, enlazados por la cruz o, si lo eliges, por símbolo, temporalidad, tiempo y dibujos. Guarda todo el espacio de trabajo como un diseño con nombre y vuelve a él cuando quieras.',
      tryThis: [
        'Pasa el cursor por un gráfico: el otro muestra el mismo momento',
        'Activa Temporalidad en la barra Sincronizar y luego cambia la temporalidad de un gráfico',
        'Elige cuatro gráficos en la barra; con Símbolo sincronizado, los nuevos se abren con el símbolo del gráfico activo',
        'Diseño ▾ → Guardar como…, cambia algo y vuelve a abrir el diseño (Ctrl+S guarda)',
      ],
    },
    navigation: {
      title: 'Rangos y diseños',
      stat: '1D … Todo',
      blurb:
        'Salta a un intervalo o a una fecha, invierte la escala de precio, fija las temporalidades que usas, añade el mismo indicador varias veces, y recupéralo todo desde un diseño guardado.',
      tryThis: [
        'Haz clic en 1M, 3M o 6M bajo el gráfico; Alt+G va a una fecha',
        'Alt+I invierte la escala de precio; la escala logarítmica está en Configuración',
        'Configuración → Zona horaria: elige Nueva York o Tokio; el eje, los cortes de día y YTD la siguen, con el horario de verano incluido',
        'Configuración → Escala → Escala de precio izquierda; la pestaña Estilo de una EMA puede moverla a esa escala',
        'Marca una temporalidad con la estrella en el menú ▾ junto a los botones de temporalidad',
        'Activa el botón ↻ de la barra de herramientas izquierda para dibujar varias líneas seguidas; Ctrl+C / Ctrl+V las copia',
      ],
    },
    history: {
      title: 'Retrocede en el tiempo',
      stat: 'historial paginado',
      blurb:
        'Las barras antiguas se cargan a medida que arrastras hacia la más antigua, una página cada vez, y lo que está en pantalla no se mueve. Aleja el zoom hasta que quepan todas las barras cargadas: por debajo de un píxel por barra, las velas se fusionan por columna de píxeles, así que miles de barras siguen siendo legibles.',
      tryThis: [
        'Arrastra el gráfico hacia la derecha: una etiqueta a la izquierda indica que se cargan barras antiguas',
        'Usa la rueda para alejar el zoom, más allá de unos cientos de barras, hasta un cuarto de píxel por barra',
        'Haz clic en Todo bajo el gráfico para ajustar todo lo cargado hasta ahora',
        'Escribe 7 o 90 en el menú ▾ de temporalidades: Binance no tiene ninguna de las dos, así que el gráfico las construye a partir de barras de 1m y 30m',
      ],
    },
    replay: {
      title: 'Repetición de barras',
      stat: 'control deslizante',
      blurb:
        'Recorre el historial barra a barra para practicar tus lecturas sin sesgo retrospectivo. Los datos en vivo quedan en espera durante la repetición; la escala de precio se ajusta en cada paso.',
      tryThis: [
        'Pulsa reproducir, o avanza barra a barra con Shift+→ / Shift+←',
        'Haz clic en cualquier barra ya mostrada para llevar el cursor allí',
        '“Volver al tiempo real” regresa a la serie en vivo',
      ],
    },
    subcent: {
      title: '14 idiomas, precios por debajo del centavo',
      stat: 'i18n',
      blurb:
        'Todo el widget en 14 idiomas (menús, configuración, herramientas de dibujo, diálogos), con los números en el formato propio de cada uno. PEPE cotiza en torno a 0.000004: cada etiqueta sigue la precisión de la escala de precio y el eje se ensancha para que quepa.',
      tryThis: [
        'Elige un idioma encima del gráfico: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P busca entre todos los símbolos de Binance, con sus nombres, mientras escribes',
        'Abre Configuración o las herramientas de dibujo para verlas traducidas',
        'Pasa el cursor: la etiqueta de la cruz mantiene la precisión completa en el formato numérico del idioma',
      ],
    },
    bigdata: {
      title: '200,000 barras',
      stat: 'rendimiento',
      blurb:
        'Doscientas mil barras de 1 minuto con cuatro indicadores. El renderizado solo toca las barras visibles; las temporalidades mayores se remuestrean localmente, tras un velo de carga cuando eso tarda más de unos pocos fotogramas.',
      tryThis: [
        'Cambia a 1H, 4H y vuelve a 1m: los tiempos aparecen bajo el gráfico',
        'Aleja el zoom al máximo y desplázate: el coste por fotograma se mantiene constante',
        'Añade otro indicador y observa el tiempo del cambio',
      ],
    },
    switching: {
      title: 'Cambios con red lenta',
      stat: '+1.2 s de latencia',
      blurb:
        'Aquí cada petición de historial se retrasa 1.2 s. El gráfico anterior sigue en pantalla y solo se cubre con un velo cuando un cambio tarda más de 200 ms; los clics rápidos nunca dejan ganar a una respuesta obsoleta.',
      tryThis: [
        'Haz clic rápidamente en varios símbolos: solo llega el último',
        'Cambia de temporalidad y observa cómo el velo aparece y desaparece',
        'Compáralo con la escena Indicadores: los cambios rápidos nunca parpadean',
      ],
    },
  },

  gallery: {
    eyebrow: 'Tipos de gráfico',
    title: 'Todos los tipos de gráfico, en vivo en la página',
    subtitleHtml:
      'Cada recuadro es una instancia real de <code>Chart</code>, no una imagen. Arrastra para desplazar, usa la rueda para hacer zoom y pasa el cursor para ver la cruz; cada recuadro responde por su cuenta.',
    tiles: {
      candlestick: { name: 'Velas', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Tendencia' },
      area: { name: 'Área', tag: 'Cierre' },
      baseline: { name: 'Línea base', tag: 'Encima / debajo' },
      bar: { name: 'Barras OHLC', tag: 'Clásico' },
      stepLine: { name: 'Línea escalonada', tag: 'Discreto' },
    },
  },

  finance: {
    eyebrow: 'Gráficos financieros',
    title: 'Más allá de las velas',
    subtitle:
      'Sparklines, curvas de capital, profundidad del libro de órdenes, mapas de calor por sector, gráficos de cascada y medidores para carteras y KPI.',
    portfolio: 'Rendimiento de la cartera',
    depth: 'Profundidad del libro de órdenes',
    heatmap: 'Mapa de calor del mercado cripto',
    pnl: 'Atribución de P&L',
    fearGreed: 'Índice de miedo y codicia',
    waterfall: {
      start: 'Inicio',
      btcLong: 'BTC largo',
      ethShort: 'ETH corto',
      solLong: 'SOL largo',
      fees: 'Comisiones',
      end: 'Final',
    },
    zones: {
      extremeFear: 'Miedo extremo',
      fear: 'Miedo',
      neutral: 'Neutral',
      greed: 'Codicia',
      extremeGreed: 'Codicia extrema',
    },
  },

  terminal: {
    symbol: 'Símbolo',
    timeframe: 'Temporalidad',
    chartType: 'Tipo de gráfico',
    types: {
      candlestick: 'Velas',
      heikinAshi: 'Heikin-Ashi',
      area: 'Área',
      bar: 'Barras',
      baseline: 'Línea base',
    },
    unavailable: 'Datos en vivo no disponibles: {error}',
    live: 'EN VIVO',
    offline: 'SIN CONEXIÓN',
    connecting: 'CONECTANDO',
    hints: [
      ['Arrastrar', 'desplazar'],
      ['Rueda', 'zoom'],
      ['Arrastrar eje', 'escalar'],
    ],
  },

  copy: {
    copy: 'COPIAR',
    copied: 'COPIADO',
    copiedAnnouncement: 'Copiado al portapapeles',
    copyLabel: 'Copiar {label}',
    copyCode: 'Copiar código',
    codeSample: 'Ejemplo de código',
    packageManager: 'Gestor de paquetes',
    copyInstall: 'Copiar comando de instalación',
  },

  examples: {
    metaTitle: 'Ejemplos · TradeCanvas',
    description:
      'Ejemplos en vivo en StackBlitz para JavaScript puro, React, Vue, Svelte, el ChartWidget y paneles financieros.',
    eyebrow: 'Ejemplos · StackBlitz',
    title: 'Ejemplos',
    subtitleHtml:
      'Entornos en vivo que puedes bifurcar con un clic. Cada uno se abre en StackBlitz con los paquetes 1.x más recientes ya conectados. Para probar las funciones sin configurar nada, usa el <a href="{lab}">Laboratorio de funciones</a> de la página de inicio.',
    open: 'Abrir {title} en StackBlitz',
    items: {
      vanilla: {
        title: 'JavaScript puro',
        blurb: 'El Chart headless: flujo en vivo de Binance, Bollinger + RSI y las herramientas de dibujo en tu propia interfaz.',
      },
      widget: {
        title: 'ChartWidget',
        blurb:
          'Toda la interfaz de trading en una llamada: barra de herramientas, 69 herramientas de dibujo, lista de seguimiento, trading y repetición, en 14 idiomas.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react: props reactivas y tipadas, y el Chart subyacente a través de una ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue: script setup, props reactivas y el Chart desde @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte: runes, props reactivas y bind:chart.',
      },
      finance: {
        title: 'Panel financiero',
        blurb: 'Renderizadores de sparkline, medidor, mapa de calor, profundidad y curva de capital en un solo diseño.',
      },
    },
  },

  playground: {
    metaTitle: 'Zona de pruebas · TradeCanvas',
    description: 'Bifurca un entorno interactivo de TradeCanvas en StackBlitz y empieza a programar.',
    eyebrow: 'Zona de pruebas · StackBlitz',
    title: 'Zona de pruebas',
    subtitle: 'Un entorno editable en StackBlitz con el ChartWidget ya conectado a datos en vivo de Binance.',
    launch: 'Abrir la zona de pruebas',
    more: 'Más ejemplos',
    insideTitle: 'Qué incluye',
    insideHtml:
      'Un proyecto mínimo de Vite + TypeScript con un solo archivo, <code>src/main.ts</code>, que monta <code>ChartWidget</code> y conecta un <code>BinanceAdapter</code>.',
  },

  changelog: {
    metaTitle: 'Registro de cambios — TradeCanvas',
    description: 'Notas de cada versión de TradeCanvas.',
    englishOnly: 'Las notas de versión están escritas en inglés.',
  },

  backtest: {
    title: 'Backtest en vivo — cruce SMA(10/30)',
    subtitle: '365 días de precios sintéticos, $10k de capital inicial, comisión del 0.05%, deslizamiento del 0.03%.',
    play: 'Reproducir',
    pause: 'Pausa',
    replay: 'Repetir',
    end: 'Final',
    running: 'Ejecutando el backtest…',
    failed: 'Error: {error}',
    bar: 'Barra {index}/{total}',
    totalReturn: 'Rentabilidad total',
    maxDrawdown: 'Máx. DD',
    winRate: 'Tasa de acierto',
    profitFactor: 'Factor de beneficio',
    trades: 'Operaciones',
  },

  error: {
    notFound: 'Página no encontrada',
    notFoundText: 'Esta página no existe o se ha movido.',
    other: 'Algo salió mal',
    otherText: 'No se pudo mostrar la página. Vuelve a intentarlo o empieza desde la página de inicio.',
    home: 'Volver al inicio',
    docs: 'Abrir la documentación',
  },

  docs: {
    titleSuffix: 'Documentación de TradeCanvas',
    navLabel: 'Navegación de la documentación',
    groups: {
      start: 'Introducción',
      chart: 'Gráfico',
      trading: 'Trading',
    },
    pages: {
      'getting-started': 'Primeros pasos',
      frameworks: 'Frameworks',
      embed: 'Widget incrustable',
      api: 'Referencia de la API',
      'chart-types': 'Tipos de gráfico',
      indicators: 'Indicadores',
      'drawing-tools': 'Herramientas de dibujo',
      plugins: 'Plugins',
      performance: 'Rendimiento',
      trading: 'Capa de trading',
      finance: 'Gráficos financieros',
      realtime: 'Tiempo real y repetición',
      analytics: 'Análisis',
    },
    notTranslated: 'Esta página aún no está traducida, así que se muestra en inglés.',
  },
};

export default es;

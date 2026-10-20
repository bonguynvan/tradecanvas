import type { SiteMessages } from '../messages';

const es: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Gráficos de trading en Canvas para la web',
    description:
      'TradeCanvas es una biblioteca de gráficos de trading para la web, dibujada con Canvas 2D o WebGL: 18 tipos de gráfico, 111 indicadores, 69 herramientas de dibujo, datos en vivo de exchanges, órdenes en el gráfico, replay y backtesting, en 30 idiomas. Sin dependencias, MIT.',
  },

  nav: {
    main: 'Principal',
    docs: 'Documentación',
    examples: 'Ejemplos',
    playground: 'Zona de pruebas',
    changelog: 'Cambios',
    audit: 'Auditoría',
    business: 'Empresas',
    toLight: 'Cambiar al tema claro',
    toDark: 'Cambiar al tema oscuro',
    github: 'TradeCanvas en GitHub',
    sponsor: 'Patrocinar',
    sponsorLabel: 'Patrocina TradeCanvas en GitHub',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    menu: 'Menú',
    language: 'Idioma',
  },

  footer: {
    tagline: 'Gráficos de trading para la web, dibujados con Canvas 2D o WebGL. Sin dependencias, licencia MIT.',
    library: 'Biblioteca',
    packages: 'Paquetes',
    project: 'Proyecto',
    gettingStarted: 'Primeros pasos',
    apiReference: 'Referencia de la API',
    examples: 'Ejemplos',
    changelog: 'Registro de cambios',
    audit: 'Auditoría del sistema',
    business: 'Para empresas',
    issues: 'Incidencias',
    boGrid: 'bo-grid (tabla de datos)',
    builtWith: 'Hecho con TradeCanvas',
  },

  home: {
    release: 'renderizador WebGL, 30 idiomas',
    title: 'El motor de gráficos para apps de trading.',
    ledeHtml:
      'De velas a Renko, 111 indicadores, 69 herramientas de dibujo, datos en vivo de exchanges y órdenes en el gráfico. Dibujado con Canvas 2D o WebGL, sin dependencias. Integra el <code>ChartWidget</code> completo o crea tu propia interfaz sobre el <code>Chart</code> headless.',
    getStarted: 'Empezar',
    browseExamples: 'Ver ejemplos',
    specsLabel: 'Cifras clave',
    specs: [
      'indicadores',
      'herramientas de dibujo',
      'tipos de gráfico',
      'idiomas del widget',
      'barras a 60 fps con WebGL',
      'dependencias de terceros en tiempo de ejecución',
    ],
    tape: 'Precios en vivo de Binance',
    tapePause: 'Pausar los precios',
    tapePlay: 'Reanudar los precios',
    story: {
      eyebrow: 'Del primer vistazo a la orden ejecutada',
      title: 'Un gráfico para toda la operación',
      subtitle: 'Cuatro gráficos en vivo, cada uno trabajando en su parte. Arrástralos, haz zoom, dibuja sobre ellos.',
      chapters: [
        {
          title: 'Leer el mercado',
          text: 'Bandas, medias y osciladores sobre las velas, niveles de Fibonacci y líneas de tendencia encima, cada uno con sus ajustes y alertas.',
          points: [
            '111 indicadores, cualquiera sobre otro, como una media del RSI',
            '69 herramientas de dibujo con imán, grupos y deshacer',
            'Alertas sobre precios, líneas y cruces de indicadores',
          ],
        },
        {
          title: 'Operar en el gráfico',
          text: 'Órdenes, posiciones y sus brackets viven en la escala de precios. Arrastra un stop para moverlo; el broker simulado las ejecuta, así que puedes construir antes de conectar.',
          points: [
            'Arrastra para colocar una orden, arrastra su stop-loss y take-profit para moverlos',
            'Marcas de ejecución y ganancias y pérdidas en el gráfico',
            'Tu broker se conecta mediante un solo adaptador',
          ],
        },
        {
          title: 'Reproducir el pasado',
          text: 'Recorre la historia vela a vela o déjala correr: indicadores, dibujos y órdenes simuladas siguen el precio reproducido.',
          points: [
            'Cualquier vela de inicio, cualquier velocidad',
            'Cada vela puede formarse paso a paso a partir de otras más finas',
            'Opera el replay con el broker simulado',
          ],
        },
        {
          title: 'Escalar sin tirones',
          text: 'Aquí, 200.000 barras con cuatro indicadores, desplazándose solas. Cambia el renderizador y mira el tiempo por fotograma: con WebGL, la GPU dibuja las velas y las líneas.',
          points: [
            '1.000.000 de barras con el zoom alejado a 60 fps con WebGL',
            'Canvas 2D donde no hay WebGL, con el mismo aspecto',
            'Solo se dibujan las barras en pantalla',
          ],
        },
      ],
      frameTime: '{ms} ms por fotograma',
      panning: 'Se desplaza solo hasta que tomes el control',
      renderer: 'Renderizador',
      replaying: 'Reproduciendo',
    },
    trust: {
      label: 'Código abierto',
      downloads: '{n} descargas de npm al mes',
      license: 'licencia {n}',
      dependencies: '{n} dependencias en tiempo de ejecución',
      typescript: 'tipos {n} para toda la API',
    },
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
        text: 'ChartWidget trae la barra de herramientas, la barra lateral de dibujo, la lista de seguimiento, las alertas, el árbol de objetos, la ventana de datos, la repetición y una paleta de comandos (Ctrl+K), en 30 idiomas, del inglés y el vietnamita al chino, el japonés, el coreano y el árabe.',
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
    widgetLook: 'Aspecto del widget',
    widgetRenderer: 'Renderizador',
    idle: 'Desplázate hasta aquí para iniciar el gráfico en vivo',
    metricHint: 'Cambia de símbolo o de temporalidad para medir el tiempo',
    metricSwitch: '→ {label}: {ms} · {bars} barras',
    metricSetData: 'setData({bars} barras): {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}: {ms} por fotograma al desplazar',
    metricRendererMissing: 'Sin WebGL 2 aquí: se dibuja con Canvas 2D',
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
      stat: '111 integrados',
      blurb:
        'Superpuestos y en paneles, calculados internamente, sin dependencias matemáticas. Los ticks en vivo recalculan solo la barra en formación: 0.001 ms por tick con cuatro indicadores sobre 100k barras.',
      tryThis: [
        'Pulsa el botón Indicadores (o Ctrl+K) y busca cualquiera de los 111',
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
        'Elige un Paso más fino en la barra de repetición (15m) para ver cómo se forma cada barra',
        'Las marcas de compra y venta y la operación solo aparecen cuando la reproducción llega a ellas',
      ],
    },
    compare: {
      title: 'Comparar, diferencial, ratio',
      stat: 'símbolos',
      blurb:
        'ETH en su propia escala de precio junto a BTC, y BTC ÷ ETH en un panel. Los demás símbolos se alinean con el gráfico por tiempo; el diferencial o el ratio tienen leyenda, etiquetas de valor y alertas como cualquier indicador. El máximo más alto y el mínimo más bajo en pantalla quedan marcados.',
      tryThis: [
        'Abre el árbol de objetos y pulsa + junto a Comparar: elige un símbolo y luego cómo',
        'Haz clic derecho en el panel del ratio para una escala porcentual',
        'Haz clic derecho en el gráfico: Exportar datos (CSV) incluye todas las líneas de los indicadores',
        'Cambia la temporalidad: las barras del otro símbolo se vuelven a pedir',
      ],
    },
    bonds: {
      title: 'Bonos en 32avos',
      stat: 'formatos',
      blurb:
        'Un bono cotizado en 32avos y medios 32avos (110’165 es 110 y 16½ 32avos) en barras de máximo-mínimo. Cada precio del gráfico (eje, cruz, leyenda, órdenes, dibujos) se lee igual, y las marcas del eje caen en fracciones enteras.',
      tryThis: [
        'Pasa el cursor: la cruz y la leyenda se leen en 32avos',
        'Configuración → Visualización → desactiva Horario extendido para ver solo la sesión regular',
        'Cambia a Renko o Kagi y ajusta la caja o la reversión en Configuración',
        'Dibuja una línea horizontal: su etiqueta también se lee en 32avos',
      ],
    },
    subcent: {
      title: '30 idiomas, precios por debajo del centavo',
      stat: 'i18n',
      blurb:
        'Todo el widget en 30 idiomas (menús, configuración, herramientas de dibujo, diálogos, árabe, hebreo y persa de derecha a izquierda), con los números en el formato propio de cada uno. PEPE cotiza en torno a 0.000004: cada etiqueta sigue la precisión de la escala de precio y el eje se ensancha para que quepa.',
      tryThis: [
        'Elige un idioma encima del gráfico: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P busca entre todos los símbolos de Binance, con sus nombres, mientras escribes',
        'Abre Configuración o las herramientas de dibujo para verlas traducidas',
        'Pasa el cursor: la etiqueta de la cruz mantiene la precisión completa en el formato numérico del idioma',
      ],
    },
    looks: {
      title: 'Tu propio aspecto',
      stat: '3 preajustes',
      blurb:
        'Las formas y los tamaños del widget son tokens: esquinas, altura de los controles, tipografía, bordes, sombras, cómo se ve un botón elegido, barras acopladas o flotantes. Parte de Studio, Terminal o Capsule y cambia lo que quieras; las etiquetas de precio del gráfico usan las mismas esquinas.',
      tryThis: [
        'Cambia el aspecto encima del gráfico: cambia en el sitio, sin reconstruir nada',
        'Abre Configuración, un menú o las herramientas de dibujo en cada aspecto',
        'Capsule hace flotar la barra de herramientas y las herramientas de dibujo como islas, con etiquetas de precio en forma de píldora',
        'Terminal es denso y cuadrado: etiquetas en mayúsculas y una línea bajo la temporalidad elegida',
      ],
    },
    overrides: {
      title: 'Overrides de estilo',
      stat: '101 claves',
      blurb:
        'Cualquier parte del aspecto del gráfico por clave, aparte del tema: la cuadrícula en cada dirección, el crosshair, los ejes, los paneles, la leyenda, el último precio, el volumen y los colores de cada tipo de gráfico. Aquí la cuadrícula vertical está apagada, la horizontal punteada, el crosshair continuo, y la línea de señal del MACD discontinua en un panel con su propio separador.',
      tryThis: [
        'Cambia el tipo de gráfico: las barras y Heikin-Ashi toman los colores de las velas si no tienen los suyos',
        'Cambia el tema del sitio: lo que no tiene override lo sigue',
        'Abre los Ajustes: la pestaña Estilo fija cada clave, incluidos los colores del tipo de gráfico a la vista; la pestaña Trading, los colores de órdenes, marcas y zonas, en Auto hasta que elijas uno',
      ],
    },
    parts: {
      title: 'Tu widget, tus piezas',
      stat: '112 interruptores',
      blurb:
        'Cada parte del widget tiene un interruptor, encendido hasta que lo apagas y cambiable en marcha: una capacidad entera (alertas, ajustes, atajos) o un solo lugar (un botón de la barra, una entrada de menú, una sección de herramientas de dibujo). Tus propios botones, menús y elementos de estado van en las barras del widget. Aquí la reproducción, dos secciones de dibujo y la descarga de datos están apagadas, y la barra lleva un menú de interruptores.',
      tryThis: [
        'Abre «features» en la barra y apaga y enciende partes',
        'El ojo al pie de la barra de dibujo oculta la barra de herramientas y la de estado, y las devuelve (Alt+X)',
        'Haz clic derecho en un dibujo: la última entrada es de la página',
      ],
    },
    markets: {
      title: 'Listas de seguimiento y mercado',
      stat: 'cotizaciones en vivo',
      blurb:
        'Listas de símbolos con cotizaciones en vivo de la fuente de datos, un panel con el precio del símbolo, el estado del mercado y los datos del día, y gráficos de ticks: una barra cada 100 operaciones.',
      tryThis: [
        'Abre el menú de la lista de seguimiento: cambia a Memes, crea una lista propia y renómbrala',
        'Añade un símbolo con +, arrastra las filas para reordenarlas o pulsa Supr sobre una',
        'Escribe 100T en el gráfico para tener una barra cada 100 operaciones, y luego 1m para volver',
        'Pasa el ratón por el gráfico para ver los botones de zoom y desplazamiento en su parte inferior',
      ],
    },
    bigdata: {
      title: '200,000 barras',
      stat: 'rendimiento',
      blurb:
        'Doscientas mil barras de 1 minuto con cuatro indicadores. El renderizado solo toca las barras visibles; las temporalidades mayores se remuestrean localmente, tras un velo de carga cuando eso tarda más de unos pocos fotogramas.',
      tryThis: [
        'Cambia entre Canvas 2D y WebGL sobre el gráfico: cada cambio mide un breve desplazamiento',
        'Con WebGL activo, cambia el tipo de gráfico a Línea base, Kagi o Punto y figura: también se dibujan en la GPU',
        'Cambia a 1H, 4H y vuelve a 1m: los tiempos aparecen bajo el gráfico',
        'Aleja el zoom al máximo y desplázate: el coste por fotograma se mantiene constante',
        'Añade otro indicador y observa el tiempo del cambio',
      ],
    },
    heatmap: {
      title: 'Mapa de calor de liquidez',
      stat: '240 × 80 celdas',
      blurb:
        'Doscientas cuarenta instantáneas del libro de órdenes, de 80 niveles de precio cada una, como un mapa de calor tras las velas: el tamaño en espera se ilumina nivel a nivel, compras en verde y ventas en rojo, y los muros que persisten destacan. Con WebGL, las 19,200 celdas se dibujan en la GPU bajo las barras.',
      tryThis: [
        'Cambia entre Canvas 2D y WebGL sobre el gráfico: cada cambio mide un breve desplazamiento',
        'Busca las filas brillantes: muros de tamaño que se quedan en un precio con el tiempo',
        'Acerca el zoom a un muro y desplázate de un lado a otro: las celdas siguen a las barras',
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

  engage: {
    click: 'Haz clic para usar el gráfico',
    tap: 'Toca para usar el gráfico',
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
    drawnWith: 'Dibujado con {renderer}',
    live: 'EN VIVO',
    offline: 'SIN CONEXIÓN',
    connecting: 'CONECTANDO',
    hints: [
      ['Arrastrar', 'desplazar'],
      ['Clic + rueda', 'zoom'],
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
          'Toda la interfaz de trading en una llamada: barra de herramientas, 69 herramientas de dibujo, lista de seguimiento, trading y repetición, en 30 idiomas.',
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

  audit: {
    metaTitle: 'Auditoría del sistema — TradeCanvas',
    description:
      'Qué hace TradeCanvas y a qué velocidad: cada capacidad por área, tiempos por fotograma con GPU integrada, la ruta de los datos, el tamaño de descarga, cómo se prueba y los límites que conocemos.',
    eyebrow: 'Auditoría del sistema',
    title: 'Qué hace y a qué velocidad lo hace.',
    ledeHtml:
      'Todo lo que aparece en esta página viene en <code>@tradecanvas/chart</code> {version}. Los tiempos por fotograma se midieron en Chrome, en un portátil con GPU integrada (Intel UHD); <code>node scripts/bench-render.mjs</code>, en el repositorio, ejecuta las mismas escenas en el tuyo.',
    numbersTitle: 'En cifras',
    numbers: [
      'tipos de gráfico',
      'indicadores integrados',
      'herramientas de dibujo',
      'idiomas del widget',
      'claves de estilo',
      'interruptores de funciones del widget',
      'dependencias de terceros en tiempo de ejecución',
      'pruebas unitarias',
    ],

    perfTitle: 'Tiempo por fotograma',
    perfLede: 'Lo que tarda en dibujarse un fotograma durante el desplazamiento. 16,7 ms equivalen a 60 fotogramas por segundo.',
    perfChart: 'Gráfico',
    perfRatio: 'Relación de píxeles',
    perf: [
      '1600×900, 500 velas + 4 indicadores',
      '1600×900, con el zoom alejado sobre 200.000 barras + 4 indicadores',
      '1600×900, con el zoom alejado sobre 1.000.000 de barras + 4 indicadores',
      '1600×900, mapa de calor de profundidad, 240 instantáneas × 80 niveles',
      'Seis gráficos, con 500 velas y 2 indicadores cada uno',
      '2560×1400, 2.000 velas + 4 indicadores',
      '2560×1400, 2.000 velas + 4 indicadores',
      '2560×1400, 2.000 velas + 4 indicadores',
    ],
    perfNoteHtml:
      'Canvas 2D es el renderizador predeterminado. <code>renderer: \'webgl\'</code> (o <code>\'auto\'</code>) dibuja el área del gráfico con WebGL 2 y vuelve a Canvas 2D donde falta WebGL 2 o se pierde su contexto.',

    dataTitle: 'Ruta de los datos',
    data: [
      'Un tick en vivo con Bandas de Bollinger, EMA, RSI y MACD sobre 100.000 barras',
      'Los mismos cuatro indicadores recalculados por completo sobre 100.000 barras',
      'Una línea de 1.000.000 de puntos visibles, reducida para un fotograma',
      'Un redibujado al pasar el cursor (cruz, leyenda)',
      'Un cambio de símbolo o de temporalidad solo muestra un velo de carga pasados',
    ],

    sizeTitle: 'Tamaño de descarga',
    sizeLede: 'Minificado y comprimido con gzip, con todo lo que importa.',
    size: ['Chart, la API headless', 'ChartWidget, la interfaz completa', 'El renderizador WebGL, que se carga la primera vez que se usa'],

    qualityTitle: 'Cómo se comprueba',
    quality: [
      'Más de 3.000 pruebas unitarias repartidas en los siete paquetes se ejecutan en CI con cada pull request.',
      'El renderizador WebGL dibuja las velas en los mismos píxeles del dispositivo que Canvas 2D; las líneas y los rellenos solo difieren en unos pocos píxeles de borde suavizados.',
      'El renderizador WebGL se ha comprobado en Chromium, Firefox y WebKit. Sin WebGL 2, o cuando se pierde su contexto, el gráfico sigue con Canvas 2D.',
      'Los ejemplos de código de la documentación y de la skill para agentes se comprueban con los tipos de la API real.',
      'Los gráficos se pueden leer con lectores de pantalla y manejar con el teclado; el widget se lee de derecha a izquierda en árabe, hebreo y persa.',
    ],

    catalogTitle: 'Capacidades',
    catalogLede: 'Filtra por área o busca por nombre o API.',
    search: 'Buscar capacidades',
    searchPlaceholder: 'repetición, webgl, alerta…',
    all: 'Todas',
    count: '{shown} de {total}',
    colCapability: 'Capacidad',
    colArea: 'Área',
    colDetail: 'Detalles y API',
    areas: {
      chartTypes: 'Tipos de gráfico',
      rendering: 'Renderizado',
      indicators: 'Indicadores',
      drawings: 'Herramientas de dibujo',
      scales: 'Escalas y tiempo',
      data: 'Datos y tiempo real',
      trading: 'Trading',
      alerts: 'Alertas y repetición',
      workspace: 'Espacio de trabajo',
      customization: 'Personalización',
      access: 'Idiomas y accesibilidad',
      developers: 'Desarrolladores',
    },
    catalog: {
      chartTypes: [
        { name: 'Velas, barras OHLC, línea, área, línea base, Heikin-Ashi, velas huecas', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko, ruptura de línea, Kagi, punto y figura, barras de rango', detail: 'Tamaño de caja o ATR, líneas para la ruptura, reversión en porcentaje o en precio, rango por barra' },
        { name: 'Velas de volumen, Equivolume, área HLC, línea escalonada, línea con marcadores, máximo-mínimo', detail: '18 tipos de gráfico en total' },
        { name: 'Serie principal oculta', detail: 'Solo quedan los indicadores y los dibujos' },
      ],
      rendering: [
        { name: 'Canvas 2D o WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto', setRenderer, el evento rendererChange" },
        { name: 'Un tramo por columna de píxeles con el zoom alejado', detail: 'Líneas, bandas e histogramas de indicadores por debajo de un píxel por barra' },
        { name: 'Un millón de barras desplazadas con fluidez', detail: 'Con cuatro indicadores, a una relación de píxeles de 2' },
        { name: 'Mapa de calor de profundidad, perfil de volumen y perfil de mercado en la GPU', detail: 'pushDepthSnapshot(book, time)' },
        { name: 'Varios gráficos WebGL en una página', detail: 'Hasta 8 (setMaxWebGLCharts); el resto dibuja con Canvas 2D; vuelven a WebGL cuando el contexto regresa' },
        { name: 'Nítido a cualquier escala de pantalla', detail: 'Velas, volumen y dibujos en píxeles del dispositivo al 100%, 125% y 200%' },
        { name: 'Sin dependencias de terceros en tiempo de ejecución', detail: 'Nada más que instalar ni auditar' },
      ],
      indicators: [
        { name: '111 indicadores integrados', detail: 'Puntos pivote de seis tipos, MA Cross, correlación con otro símbolo' },
        { name: 'Fuente de precio', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: 'Un indicador sobre otro indicador', detail: 'Como una media móvil del RSI, actualizada con cada tick' },
        { name: 'Varios indicadores en un panel, movidos entre paneles', detail: 'moveIndicatorToPane' },
        { name: 'Varias veces el mismo indicador', detail: 'EMA 20 y EMA 50 una junto a otra' },
        { name: 'Niveles y umbrales', detail: 'RSI 30/70, CCI ±100, guardados con el diseño' },
        { name: 'Último valor en el eje', detail: 'En el eje de precio y en el eje de cada panel, con el color de la línea' },
        { name: 'Paneles contraídos, maximizados y reordenados', detail: 'Se guardan con el diseño' },
        { name: 'Plantillas de indicadores', detail: 'Parámetros, estilo, niveles y panel, guardados y aplicados juntos' },
        { name: 'Estilo y visibilidad de cada línea', detail: 'Una línea oculta no estira la escala; setIndicatorDefaults' },
        { name: 'Delta de volumen y CVD', detail: 'Estimados a partir de las barras' },
        { name: 'Exportación de los valores de los indicadores', detail: 'CSV o JSON, una columna por línea' },
        { name: 'Actualizaciones incrementales con ticks en vivo', detail: 'update() solo recalcula la barra en formación' },
      ],
      drawings: [
        { name: '69 herramientas de dibujo', detail: 'Líneas, canales, Fibonacci, Gann, horquillas, ondas de Elliott, patrones, ciclos, proyecciones' },
        { name: 'Ajustes propios de cada herramienta', detail: 'Estilo, propiedades y coordenadas sobre la cuadrícula de precios del mercado' },
        { name: 'Posiciones largas y cortas', detail: 'Riesgo:beneficio, cantidad a partir del riesgo en porcentaje o en dinero' },
        { name: 'Alertas sobre un dibujo', detail: 'Cuando el precio cruza una línea de tendencia o un canal tal como está dibujado, también en escala logarítmica' },
        { name: 'Orden, grupos y plantillas', detail: 'Traer adelante, enviar atrás, agrupar, bloquear, ocultar' },
        { name: 'Notas, globos, flechas, banderas, pincel, trazado, curva', detail: 'Dibujo a mano alzada y de varios puntos' },
        { name: 'VWAP anclado y perfil de volumen de rango fijo', detail: 'Leen las barras del gráfico' },
        { name: 'Borrador, zoom de área, imán fuerte, atajos de teclado', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: 'Ir a una fecha; rangos de 1D a Todo', detail: 'Sin límite al alejar el zoom' },
        { name: 'Zonas horarias IANA con horario de verano', detail: 'O la zona propia de la bolsa' },
        { name: 'Cualquier temporalidad, y barras de ticks', detail: '7m, 90m, 2d construidas a partir de lo que sirve la fuente; 100T a partir de sus operaciones' },
        { name: 'Escalas izquierda y derecha; logarítmica, invertida y porcentual por panel', detail: 'La escala izquierda para una superposición o una copia de la escala de precio' },
        { name: 'Comparar símbolos, diferencial y ratio', detail: 'En su propia escala o panel, alineados por tiempo' },
        { name: 'Horario extendido', detail: 'A partir del horario de sesión del símbolo' },
        { name: 'Formatos de precio y de hora', detail: 'priceFormat como función o fracciones como 1/32; timeFormatter' },
        { name: 'La escala con los decimales y el paso de precio del símbolo', detail: 'pricePrecision, minTick: una acción que se mueve de 10 en 10 nunca muestra 21.705' },
        { name: 'Líneas de máximo y mínimo, bid y ask', detail: 'Bid y ask a partir de los ticks de la fuente' },
        { name: 'Marcas de eventos en el gráfico', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: 'Fuentes listas para usar y las tuyas', detail: 'Binance, Bybit, Coinbase, Kraken, mock; WebSocketAdapter, PollingAdapter' },
        { name: 'Historial anterior cargado al desplazarse a la izquierda', detail: 'fetchHistoryBefore' },
        { name: 'Búsqueda de símbolos con sus detalles', detail: 'searchSymbols, resolveSymbol: decimales, paso de precio, sesiones, zona horaria' },
        { name: 'Detalles del símbolo conocidos tras conectar', detail: 'El evento symbolInfo del adaptador' },
        { name: 'Escalera de profundidad de mercado', detail: 'Tamaño de compra y de venta por precio; haz clic para operar' },
        { name: 'Cotizaciones en vivo para listas de seguimiento', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: 'Noticias y estado del mercado', detail: 'fetchNews; una cuenta atrás hasta la apertura o el cierre' },
      ],
      trading: [
        { name: 'Órdenes y posiciones en el gráfico', detail: 'Arrastra para modificar; cancela, cierra o invierte desde la línea' },
        { name: 'Marcas de ejecución', detail: 'Motivo y ganancia o pérdida en executionFill' },
        { name: 'Ticket de orden', detail: 'Cantidad, tipo, stop-loss y take-profit, vigencia, validados mientras escribes' },
        { name: 'Panel de cuenta', detail: 'Posiciones con ganancias y pérdidas en vivo, órdenes pendientes, ejecuciones' },
        { name: 'Señales y zonas de operación', detail: 'Claves de estilo markers.*, tradeZones.*' },
        { name: 'Backtesting y métricas de riesgo', detail: '@tradecanvas/analytics: comisión, deslizamiento, Sharpe, Sortino, Calmar, drawdown' },
      ],
      alerts: [
        { name: 'Alertas más allá de un nivel de precio', detail: 'Línea que cruza otra línea, un movimiento del N% en N barras, al cierre de la barra, con vencimiento' },
        { name: 'Repetición de barras en pasos más finos', detail: 'Una temporalidad mayor repetida a partir de barras menores' },
        { name: 'Trading simulado sobre una repetición', detail: 'Órdenes ejecutadas a los precios repetidos' },
        { name: 'Repetición en una cuadrícula de gráficos', detail: 'Todos al mismo paso' },
        { name: 'Repetición para aplicaciones', detail: 'startTime, hideHistory, duration, marcas que se revelan a medida que avanza, replayComplete' },
      ],
      workspace: [
        { name: 'Una cuadrícula de widgets sincronizados', detail: 'Hasta 6, que comparten símbolo, temporalidad, cruz, tiempo y dibujos' },
        { name: 'Diseños con nombre en tu propio almacenamiento', detail: 'Guardar, abrir, renombrar, autoguardado; LayoutStorage para un servidor' },
        { name: 'Deshacer y rehacer para todo', detail: 'Dibujos, indicadores, configuración y tipo de gráfico; recordUndo' },
        { name: 'Menús contextuales por zona', detail: 'Dibujos, área del gráfico, paneles, eje de precio, eje de tiempo' },
        { name: 'Listas de seguimiento', detail: 'Varias listas, reordenadas arrastrando' },
        { name: 'Eventos para la aplicación', detail: 'symbolChange, timeframeChange, ordersChange, executionFill, styleChange y más' },
      ],
      customization: [
        { name: 'Tres aspectos para el widget', detail: 'Studio, Terminal, Capsule; ui y setUI; variables CSS --tcw-*' },
        { name: 'El aspecto del gráfico por clave', detail: 'applyOverrides sobre 101 claves tipadas, en una capa de la aplicación y otra del usuario' },
        { name: 'Una configuración que llega a cada clave', detail: 'Una pestaña de estilo para el tipo de gráfico visible, una pestaña de trading' },
        { name: '112 interruptores de funciones', detail: 'features, setFeatures, isFeatureOn; se cambian en marcha' },
        { name: 'Tus propias piezas en el widget', detail: 'Botones y desplegables en la barra de herramientas, botones laterales, elementos de estado, slots, entradas de menú' },
        { name: 'Tus propios atajos', detail: 'addHotkey según la distribución del teclado' },
      ],
      access: [
        { name: 'El widget en 30 idiomas', detail: 'Árabe, hebreo y persa de derecha a izquierda' },
        { name: 'Lectores de pantalla y teclado', detail: 'Un resumen del gráfico, las barras leídas una a una, diálogos con el teclado' },
        { name: 'Documentación en seis idiomas, este sitio en catorce', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'Componentes para React, Vue y Svelte', detail: 'Props reactivas: overrides, indicators, features' },
        { name: 'Plugins', detail: 'Indicadores, herramientas de dibujo, tipos de gráfico y superposiciones; overlayScale y getPriceStep para dibujar sobre la cuadrícula de precios' },
        { name: 'Documentación para agentes de código', detail: 'llms.txt, llms-full.txt y una skill para agentes' },
      ],
    },

    limitsTitle: 'Límites conocidos',
    limits: [
      'Canvas 2D sigue siendo el renderizador predeterminado hasta que WebGL se haya probado en más dispositivos; su tasa de fotogramas en Safari y en pantallas 5K aún no se ha medido.',
      'Con una relación de píxeles de 2 en un gráfico de 2560×1400, solo la composición del navegador tarda unos 23 ms con GPU integrada, así que ahí los fotogramas WebGL promedian 29 ms.',
      'Las temporalidades de ticks se construyen con las operaciones recientes que devuelve la fuente; no se puede cargar un historial de ticks más antiguo.',
      'El delta de volumen y el CVD se estiman a partir de las barras, no del lado de cada operación.',
      'Como máximo 8 gráficos de una página dibujan con WebGL a la vez; los demás dibujan con Canvas 2D.',
    ],
  },

  business: {
    metaTitle: 'Para empresas — TradeCanvas',
    description:
      'TradeCanvas en un producto comercial: licencia MIT, sin logo en el gráfico, sin registro, sin enviar nada a ningún sitio. Lo que pregunta una revisión de TI, con fuentes, y el programa para los primeros socios.',
    eyebrow: 'Para empresas',
    title: 'Tu gráfico de trading, con tu propia marca.',
    lede: 'TradeCanvas tiene licencia MIT. Intégralo en un producto comercial, modifícalo, alójalo tú mismo: tus clientes ven tu marca y tus datos se quedan en tus servidores.',
    ctaContact: 'Habla con nosotros',
    ctaAudit: 'Lee la auditoría del sistema',

    freeTitle: 'Gratis, para cualquier uso',
    free: [
      {
        title: 'Sin logo en el gráfico',
        body: 'TradeCanvas no dibuja nada suyo en el gráfico ni en el widget. La licencia MIT solo pide que su texto acompañe al código.',
      },
      {
        title: 'No envía nada a ningún sitio',
        body: 'La biblioteca no tiene telemetría. Solo abre una conexión a través de un adaptador de datos que tú inicias: uno de los feeds de exchanges integrados, o el tuyo propio.',
      },
      {
        title: 'Sin solicitudes ni aprobaciones',
        body: 'npm install y todas las capacidades de la auditoría del sistema son tuyas, incluidas la escalera de profundidad de mercado, el gráfico de profundidad y el mapa de calor.',
      },
      {
        title: 'Todo el código fuente',
        body: 'Léelo, corrígelo, haz un fork. MIT no exige nada de tu propio código: sigue siendo tuyo y sigue cerrado si así lo quieres.',
      },
    ],

    reviewTitle: 'Listo para una revisión de TI',
    reviewLede: 'Lo que suele preguntar una revisión de seguridad o de proveedores, y dónde comprobar cada respuesta.',
    reviewHtml: [
      'Sin dependencias de terceros en tiempo de ejecución: el paquete del gráfico solo depende del core y los commons del propio TradeCanvas.',
      'Sin <code>eval</code> ni <code>new Function</code>, así que funciona bajo una Content Security Policy sin <code>unsafe-eval</code>.',
      "El widget añade un elemento <code>&lt;style&gt;</code>, así que sus páginas necesitan <code>style-src 'unsafe-inline'</code>; el <code>Chart</code> headless no añade ninguno.",
      'Los problemas de seguridad se reportan en privado y se responden en menos de una semana.',
      'Cada pull request se compila, se comprueban sus tipos y se prueba en CI: más de 3.000 pruebas unitarias.',
      'Las versiones las publica GitHub Actions desde el repositorio, no desde el equipo de un desarrollador.',
      'Chrome 80+, Firefox 80+, Safari 14+ y Edge 80+.',
      'La licencia: MIT, una página.',
    ],
    source: 'Fuente',

    dataTitle: 'Tus datos, tus servidores',
    dataHtml:
      'El gráfico dibuja las barras, los ticks y las órdenes que le entregas. Conecta tu propio backend con un <code>DataAdapter</code>, o con un <code>WebSocketAdapter</code> al que le das una URL, una función de historial y un parser de mensajes; las órdenes salen a través de un adaptador de ejecución tuyo. La documentación de Realtime y de Trading explica cómo.',
    dataDocs: 'Documentación de Realtime',
    tradingDocs: 'Documentación de Trading',

    partnerTitle: 'Primeros socios',
    partnerLede:
      'Buscamos a los primeros brókeres, plataformas de trading y equipos fintech que pongan TradeCanvas al alcance de sus clientes.',
    partnerGetTitle: 'Lo que obtienes',
    partnerGet: [
      'Ayuda para conectar tu feed de datos y tus órdenes',
      'Los problemas que encuentres, resueltos primero',
      'Voz en lo que se construye a continuación',
    ],
    partnerGiveTitle: 'Lo que pedimos',
    partnerGive: ['Tus comentarios mientras construyes', 'Permiso para mencionarte como usuario cuando estés en producción'],
    partnerNote:
      'El soporte de pago, con tiempos de respuesta por contrato, soporte a largo plazo para una versión mayor y módulos hechos a tu medida, llegará más adelante. Si lo necesitas ya, dínoslo.',

    contactTitle: 'Habla con nosotros',
    contactLede: 'Cuéntanos quién eres, qué estás construyendo y para qué mercados.',
    contactPublic: 'Las preguntas sobre el código es mejor hacerlas en público, en los issues de GitHub.',

    faqTitle: 'Preguntas',
    faq: [
      {
        q: '¿Tenemos que mostrar el nombre o el logo de TradeCanvas?',
        a: 'No. Basta con conservar el texto de la licencia junto al código, como ya está en node_modules; no tiene que aparecer nada en pantalla.',
      },
      {
        q: '¿Tenemos que publicar nuestro propio código?',
        a: 'No. MIT no impone condiciones al código que lo rodea.',
      },
      {
        q: '¿Podría cambiar la licencia de un día para otro?',
        a: 'Cada versión ya publicada es MIT y seguirá siendo MIT: la licencia de una versión publicada no se puede retirar.',
      },
    ],
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
      styling: 'Estilos',
      customization: 'Personalización',
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

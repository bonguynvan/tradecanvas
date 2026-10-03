# @tradecanvas/chart

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Español**

Gráfico de trading en canvas de alto rendimiento, con indicadores, herramientas de dibujo y streaming en tiempo real integrados. Sin dependencias externas.

**[Demo en vivo](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## ¿Por qué TradeCanvas?

La mayoría de las bibliotecas de gráficos te obligan a elegir: gráficos bonitos sin funciones de trading, o funciones de trading con una API fea. TradeCanvas te da las dos cosas.

- **85 indicadores integrados** — SMA, EMA, TEMA, VWMA, Hull MA, RSI, MACD, Bollinger, Envelope, Ichimoku, Pivot Points, Anchored VWAP, ZigZag, Linear Regression Channel, Awesome / Chaikin Oscillator y más. Cualquier indicador puede leer la línea de otro (una SMA del RSI). No hace falta una biblioteca de cálculo aparte.
- **69 herramientas de dibujo** — Líneas de tendencia (línea de información, ángulo de tendencia, línea en cruz), Fibonacci (retroceso, extensión, canal, zonas temporales, abanico y arcos de velocidad, círculos, espiral, cuña), líneas horizontales/verticales, canales, horquillas y abanico de horquilla, abanico / caja / cuadrado de Gann, ciclos, patrones armónicos (XABCD, cypher, ABCD, tres impulsos, hombro-cabeza-hombro), ondas de Elliott, notas, globos de texto y marcas, pincel y trazado, previsión y proyección, posición larga/corta con cálculo del tamaño, perfil de volumen de rango fijo. Cada una con sus propios ajustes, alertas sobre líneas de tendencia, grupos y capas, deshacer/rehacer y serialización completa.
- **17 tipos de gráfico** — Velas, línea, área, barras, velas huecas, línea base, Heikin-Ashi, Renko, Kagi, ruptura de líneas, punto y figura, barras de rango, velas de volumen, **Equivolumen**, área HLC, línea escalonada, línea con marcadores.
- **Interacción de nivel profesional** — desplázate libremente más allá de la última barra, hacia el espacio futuro vacío (los dibujos también pueden ir allí), arrastra los ejes de precio/tiempo para escalarlos, haz doble clic para el ajuste automático, `Ctrl/⌘+drag` para seleccionar varios dibujos (y luego moverlos, cambiarles el estilo o borrarlos juntos), `Shift+drag` para medir (barras × Δ precio × %), `Alt+click` para fijar un tooltip de comparación, cursores contextuales (cruz, mano de agarre, flechas de redimensionado), etiquetas de precio/tiempo bajo el cursor que siguen a los ejes y resaltado de la barra al pasar el cursor.
- **Capa de trading** — Muestra las posiciones abiertas con línea de entrada, zona de P&L y marcadores SL/TP. Las órdenes, como líneas discontinuas. Arrastra SL/TP para modificarlos, cancela / cierra / invierte con los botones de cada línea y ve cada ejecución marcada en su barra. ChartWidget añade un ticket de orden que valida la orden mientras la rellenas y un panel de cuenta con posiciones, órdenes pendientes e historial. Se desactiva limpiamente con `features.trading: false` en proyectos sin trading.
- **Streaming en tiempo real** — Adaptadores integrados para Binance, Coinbase, Bybit y Kraken, además de las bases genéricas `WebSocketAdapter` / `PollingAdapter`, para conectar cualquier fuente en ~20 líneas. Las barras antiguas se cargan al desplazarte hacia atrás, cualquier intervalo (`7m`, `90m`, `2d`) se construye a partir de los de la propia fuente, y la búsqueda de símbolos viene de la fuente.
- **Zonas horarias** — cualquier zona IANA con horario de verano (`'America/New_York'`), un desfase fijo o la zona propia de la bolsa, para el eje, la cruz, los cortes de día y el horario de sesión.
- **14 idiomas** — `ChartWidget` en inglés, vietnamita, chino simplificado y tradicional, japonés, coreano, español, portugués, francés, alemán, ruso, turco, indonesio y tailandés.
- **Ejecución en vivo** — conecta un `ExecutionAdapter` para convertir la capa de trading en una superficie de trading real, arrastra en el gráfico para crear órdenes y concilia las ejecuciones. Incluye el sandbox `PaperExecutionAdapter`.
- **SDK de plugins** — registra indicadores, herramientas de dibujo, tipos de gráfico y superposiciones personalizados, de forma global o por gráfico.
- **Backtester de estrategias** — `@tradecanvas/analytics` incluye un `Backtester` barra a barra con ejecuciones virtuales, modelos de comisión/deslizamiento, seguimiento de cartera y métricas de riesgo (Sharpe, Sortino, Calmar, drawdown máximo). **Ahora con 4 estrategias de referencia listas para usar + análisis de dependencia de la trayectoria con Monte Carlo.**
- **Modo de repetición** — `ReplayController` hace avanzar barras históricas a velocidad controlada con start / pause / step / seek / setSpeed. Sobre él, el widget incluye ahora una barra de reproducción flotante en la parte inferior (reproducir/pausa/paso/búsqueda + velocidad de 0.5× a 100×).
- **Perfil de volumen** — histograma horizontal opcional del volumen negociado, agrupado por precio en el rango visible, con el punto de control (POC) resaltado.
- **Lista de seguimiento lateral** — panel vertical opcional que lista símbolos con último precio, % de cambio y un mini sparkline. Haz clic en una fila para cambiar de gráfico.
- **Arrastrar y soltar CSV / JSON** — suelta un archivo sobre el gráfico y se analiza y carga al instante. Detecta distintas disposiciones de encabezado, marcas de tiempo ISO/unix-s/unix-ms y JSON en forma de array o de objeto.
- **Diseños con nombre** — guarda el gráfico con un nombre (símbolo, temporalidad, escala, indicadores, dibujos, alertas); ábrelo, renómbralo, bórralo, guarda automáticamente el que está abierto, `Ctrl/⌘+S`. Se guarda en el navegador o en tu servidor mediante un `LayoutStorage` de cuatro llamadas. También sigue disponible la persistencia automática por símbolo (`persistLayouts`).
- **Varios gráficos** — `ChartWidgetGrid` coloca hasta seis widgets completos uno junto a otro, enlazados por símbolo, temporalidad, cruz, tiempo o dibujos según elijas, y los guarda como un solo diseño. `ChartGrid` hace lo mismo con gráficos sin widget.
- **Marcadores de señales y zonas de operación** — muestra la salida de bots/algoritmos (flechas direccionales, rectángulos de entrada→salida) como una capa de primera clase del gráfico.
- **Hoja de atajos** — pulsa `?` en el widget para abrir una referencia de atajos de teclado organizada por categorías.
- **Widget extensible** — añade tus propios botones a la barra de herramientas y entradas al menú del clic derecho (`addToolbarButton`, `chartMenuItems`).
- **Guardar/cargar el estado del gráfico** — guarda dibujos, indicadores, tema y tipo de gráfico en JSON. Restáuralos con una sola llamada.
- **Sin dependencias** — toda la biblioteca es autónoma. Sin `d3`, sin `chart.js`, sin `fancy-canvas`.

## Instalación

```bash
npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart
```

## Inicio rápido

El camino más rápido es `ChartWidget`: un componente listo para usar con una interfaz de trading completa (barra de herramientas, barra lateral de dibujo, diálogo de configuración, barra de estado). No depende de ningún framework.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  trading: true,
})
```

Eso es todo. Datos en vivo, los 85 indicadores, las 69 herramientas de dibujo, paleta de comandos (`Ctrl+K`), búsqueda de símbolos (`Ctrl+P`), hoja de atajos (`?`), medición con Shift + arrastrar, tooltip fijado con Alt + clic y carga de CSV/JSON arrastrando y soltando.

## Gráfico headless

Para proyectos que quieren controlar la interfaz que lo rodea (barra de herramientas propia, controles específicos de un framework), usa directamente la clase de bajo nivel `Chart`:

```typescript
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,           // set false to disable orders/positions entirely
    tradingContextMenu: true, // opt-in right-click order menu (off by default)
    volume: true,
  },
})

const adapter = new BinanceAdapter()
chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m', historyLimit: 300 })
```

### Opciones del widget

| Opción | Tipo | Valor por defecto | Descripción |
|---|---|---|---|
| `symbol` | `string` | `'BTCUSDT'` | Símbolo de trading inicial |
| `timeframe` | `TimeFrame` | `'5m'` | Temporalidad inicial |
| `theme` | `'dark' \| 'light' \| Theme` | `'dark'` | Tema del gráfico |
| `adapter` | `DataAdapter` | — | Adaptador de la fuente de datos |
| `toolbar` | `boolean` | `true` | Mostrar la barra de herramientas superior |
| `drawingTools` | `boolean` | `true` | Mostrar la barra lateral de dibujo a la izquierda |
| `settings` | `boolean` | `true` | Mostrar el botón de configuración |
| `trading` | `boolean` | `true` | Activar la capa de trading |
| `statusBar` | `boolean` | `true` | Mostrar la barra de estado inferior |
| `rangeBar` | `boolean` | `true` | Rangos predefinidos (1D … Todo) e ir a fecha (Alt+G) en la barra de estado |
| `indicatorLegend` | `boolean` | `true` | Indicadores listados en el gráfico (bajo la leyenda OHLCV y encima de sus paneles) con mostrar / configuración / quitar |
| `fullscreen` | `boolean` | `true` | Botón de pantalla completa en la barra de herramientas |
| `symbols` | `string[]` | BTC/ETH/SOL/BNB | Catálogo de símbolos con búsqueda |
| `timeframes` | `TimeFrame[]` | de 1m a 1M | Temporalidades disponibles; fija tus favoritas desde el menú ▾ |
| `chartTypes` | `ChartType[]` | 11 tipos | Tipos de gráfico disponibles |
| `watchlist` | `boolean` | `false` | Lista de seguimiento lateral a la derecha |
| `dragDropImport` | `boolean` | `true` | Suelta archivos CSV / JSON sobre el gráfico para cargar datos |
| `persistLayouts` | `boolean \| { keyPrefix, debounceMs }` | `false` | Guarda por símbolo los indicadores / dibujos / tipo de gráfico en localStorage |
| `onSymbolChange` | `(symbol) => void` | — | Callback al cambiar de símbolo |
| `onTimeframeChange` | `(tf) => void` | — | Callback al cambiar de temporalidad |
| `onReady` | `(chart) => void` | — | Se dispara cuando el gráfico está listo |
| `locale` | `string` | `'en'` | Idioma de la interfaz: `'en'` y `'vi'` integrados, 12 más desde el punto de entrada de locales; consulta **i18n del widget** más abajo |
| `messages` | `Partial<Record<MessageKey, string>>` | — | Sobrescribe o añade cadenas de la interfaz, una a una, sobre `locale` |

### Iconos

El conjunto de iconos del widget se exporta para tu propia interfaz: `createIcon(name)`,
`createToolIcon(drawingTool)` y `createChartTypeIcon(chartType)` devuelven cadenas
SVG en línea dibujadas en `currentColor` (cuadrícula de 24 px, trazos de 1.75 px).

```ts
import { createToolIcon } from '@tradecanvas/chart/widget'
button.innerHTML = createToolIcon('fibRetracement', 16)
```

### i18n del widget

`ChartWidget` habla 14 idiomas: inglés, vietnamita, chino simplificado y tradicional, japonés, coreano, español, portugués, francés, alemán, ruso, turco, indonesio y tailandés. Todas las cadenas que muestra están traducidas: barra de herramientas, configuración, herramientas de dibujo, alertas, diálogos, la paleta de comandos, la hoja de atajos y los avisos. Los nombres de los indicadores (SMA, RSI…) se mantienen tal cual. Se define al construir el widget.

El inglés y el vietnamita vienen integrados. Los demás se cargan desde `@tradecanvas/chart/widget/locales`, así que una página solo incluye los idiomas que importa:

```ts
import { ja } from '@tradecanvas/chart/widget/locales'

new ChartWidget(el, {
  locale: 'ja',
  messages: ja,                               // or registerWidgetLocales() for all of them
  chartOptions: { numberLocale: 'ja-JP' },    // separate: number/date formatting (see below)
});
```

`messages` también sobrescribe claves sueltas sobre `locale` (`{ 'watchlist.title': 'Theo dõi' }`). Un locale con región recurre a su idioma (`ja-JP` → `ja`; `zh-TW` → chino tradicional).

`locale`/`messages` cubren el **texto**; `chartOptions.numberLocale` controla el **formato** de números y fechas (eje de precio, leyenda, precios de la lista de seguimiento, etiqueta del precio actual, fechas de cambio de sesión) mediante `Intl`.

Consulta `packages/library/src/widget/locales/en.ts` para ver la lista completa de claves (`MessageKey`).

### Widget frente a headless

| | `Chart` (headless) | `ChartWidget` |
|---|---|---|
| Importación | `@tradecanvas/chart` | `@tradecanvas/chart/widget` |
| Interfaz incluida | Ninguna: crea la tuya | Barra de herramientas, barra lateral y configuración completas |
| Impacto en el bundle | ~50 KB gzip | ~65 KB gzip (incluye la interfaz) |
| Framework | Cualquiera (React, Vue, Svelte, vanilla) | DOM con JS puro (funciona en cualquier sitio) |
| Personalización | Control total | Activar/desactivar secciones |
| Acceso avanzado | API directa | `widget.getChart()` para la API directa |

### Temas del widget

La interfaz propia de `ChartWidget` (barra de herramientas, barras laterales, panel de configuración, lista de seguimiento: todo lo que está *fuera* del canvas) se estiliza por completo mediante propiedades personalizadas de CSS en `.tcw-root`, el elemento raíz del propio widget. Forman un **contrato estable y documentado**: entre versiones menores y de parche solo se añaden propiedades; ninguna se renombra ni se elimina sin un cambio de versión mayor. Sobrescríbelas desde la página anfitriona; no hace falta ningún paso de compilación ni objeto de tema.

```css
/* Dark is the default (no attribute needed); light sets data-tcw-theme="light" */
.my-app .tcw-root:not([data-tcw-theme="light"]) {
  --tcw-bg: #0a0a0f;
  --tcw-accent: #7c5cff;
  --tcw-radius: 0px;
  --tcw-radius-lg: 0px;
}
```

| Variable | Valor por defecto (oscuro) | Función |
|---|---|---|
| `--tcw-bg` | `#080b10` | Fondo raíz |
| `--tcw-bg-surface` | `#0c1016` | Superficie de paneles / barra de herramientas |
| `--tcw-bg-elevated` | `#141922` | Popovers, menús desplegables, modales |
| `--tcw-bg-overlay` | `rgba(20,25,34,.5)` | Fondo detrás de las superposiciones |
| `--tcw-border` | `#1f2630` | Borde por defecto |
| `--tcw-border-strong` | `#2a323e` | Borde destacado (anillos de foco, divisores) |
| `--tcw-text` | `#e7e9ee` | Texto principal |
| `--tcw-text-dim` | `#aab1bd` | Texto secundario |
| `--tcw-text-muted` | `#758091` | Texto terciario / de marcador de posición |
| `--tcw-accent` | `#f2a93b` | Acento principal (pestaña activa, foco, enlaces) |
| `--tcw-accent-ink` | `#1a1204` | Texto e iconos sobre un relleno de acento |
| `--tcw-accent-hover` | `#f5b95c` | Acento al pasar el cursor |
| `--tcw-accent-soft` | `rgba(242,169,59,.14)` | Tinte de acento (fondo de la fila seleccionada) |
| `--tcw-accent-glow` | `rgba(242,169,59,.22)` | Brillo de acento (halo de foco) |
| `--tcw-accent-line` | `rgba(242,169,59,.55)` | Borde/subrayado de acento |
| `--tcw-red` / `--tcw-red-soft` | `#e8505b` / tinte | Bajista/venta/negativo |
| `--tcw-green` / `--tcw-green-soft` | `#1fa874` / tinte | Alcista/compra/positivo |
| `--tcw-amber` | `#ff9f43` | Advertencia |
| `--tcw-hover-bg` | `rgba(255,255,255,.05)` | Fondo de fila/botón al pasar el cursor |
| `--tcw-active-bg` | `rgba(255,255,255,.08)` | Fondo de fila/botón pulsado |
| `--tcw-divider` | `rgba(255,255,255,.06)` | Divisores finos |
| `--tcw-ease` / `--tcw-ease-out` | cubic-bezier | Curva de las transiciones |
| `--tcw-dur-fast` / `-normal` / `-slow` | `120ms` / `180ms` / `260ms` | Duración de las transiciones |
| `--tcw-radius-sm` / `-base` / `-lg` / `-xl` | `4px` / `6px` / `10px` / `14px` | Radios de las esquinas: ponlos a `0` para un aspecto cuadrado |
| `--tcw-shadow-sm` / `-md` / `-lg` / `-xl` | valores de box-shadow | Elevación |
| `--tcw-ring` | `0 0 0 2px rgba(242,169,59,.45)` | Anillo de foco |
| `--tcw-font-mono` | `'JetBrains Mono', …` | Pila de fuentes monoespaciadas (escalera de precios, código) |

El tema claro (`[data-tcw-theme="light"]`) redefine el grupo de colores (`--tcw-bg*`, `--tcw-border*`, `--tcw-text*`, `--tcw-accent*`, `--tcw-hover-bg`, `--tcw-active-bg`, `--tcw-divider`, `--tcw-shadow*`) con sus propios valores por defecto; sobrescribe ambos selectores si admites los dos temas.

## Funciones

### Tipos de gráfico

| Tipo | Descripción |
|---|---|
| Velas | Velas OHLC estándar |
| Velas huecas | La apertura/cierre determina el relleno |
| Barras (OHLC) | Barras clásicas de apertura-máximo-mínimo-cierre |
| Línea | Línea del precio de cierre |
| Área | Área rellena bajo el cierre |
| Línea base | Área bicolor dividida en un precio de referencia |
| Heikin-Ashi | Velas suavizadas para identificar tendencias |
| Renko | Ladrillos de tamaño fijo que ignoran el tiempo |
| Kagi | Gráfico de líneas basado en reversiones |
| Punto y figura | Columnas de X/O para el análisis de oferta/demanda |
| Ruptura de líneas | Gráficos de ruptura de tres líneas |
| Barras de rango | Barras de rango de precio fijo: en cada barra, máximo − mínimo es igual a un rango configurado |
| Velas de volumen | Velas con un ancho proporcional al volumen |
| Equivolumen | Cajas de rango completo con un ancho proporcional a su parte del volumen (estilo Richard Arms) |
| Área HLC | Banda de área máximo-mínimo-cierre con línea de cierre |
| Línea escalonada | Patrón en escalera a partir de los precios de cierre |
| Línea con marcadores | Línea de cierre con marcadores circulares en cada punto de datos |

### Cuadrícula de varios gráficos

Muestra varios gráficos sincronizados uno junto a otro, con cruces y eje de tiempo enlazados:

```typescript
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart'

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
})

// An adapter keeps one stream: give each chart its own
grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m')
```

Con el widget completo en cada gráfico, una barra para elegir la disposición y la sincronización, y toda la cuadrícula guardada como un diseño con nombre:

```typescript
import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const workspace = new ChartWidgetGrid(document.getElementById('grid')!, {
  layout: '1x2',
  adapter: () => new BinanceAdapter(),
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT', timeframe: '1h' }],
  sync: { crosshair: true, interval: false, symbol: false, time: false, drawings: false },
})
workspace.setSync({ time: true })
```

Diseños admitidos: `'1x1'`, `'1x2'`, `'2x1'`, `'2x2'`, `'1x3'`, `'3x1'`, `'2x3'`, `'3x2'`.

### Paleta de comandos

Pulsa `Ctrl+K` (o `Cmd+K`) dentro de ChartWidget para abrir una paleta de comandos con búsqueda. Encuentra y activa indicadores rápidamente, cambia el tipo de gráfico, activa herramientas de dibujo, cambia de temporalidad o lanza acciones (captura de pantalla, cambio de tema, configuración).

### Gráficos financieros

| Gráfico | Descripción |
|---|---|
| SparklineChart | Pequeño gráfico de línea/área en línea a partir de un array de números, para paneles y tarjetas de KPI |
| DepthChart | Visualización del libro de órdenes de compra/venta con áreas de volumen acumulado |
| EquityCurveChart | Línea de capital de la cartera con sombreado del drawdown y comparación con un índice de referencia |
| HeatmapChart | Cuadrícula de celdas coloreadas con disposición treemap, para el rendimiento por sector/mercado |
| WaterfallChart | Barras acumulativas: atribución de P&L, puente de ingresos, flujo de caja |
| GaugeChart | Medidor tipo velocímetro: KPI, puntuaciones de riesgo, índice de miedo y codicia |

```typescript
import {
  SparklineChart, DepthChart, EquityCurveChart, HeatmapChart,
  WaterfallChart, GaugeChart,
} from '@tradecanvas/chart'

// Sparkline in a 120x48 container
new SparklineChart(el, { data: [100, 102, 98, 105, 103], mode: 'area', color: '#1fa874' })

// Equity curve with drawdown
new EquityCurveChart(el, { data: equityPoints, drawdown: true, benchmark: spyData })

// Order book depth
new DepthChart(el, { data: { bids, asks }, crosshair: true })

// Market heatmap (treemap weighted by market cap)
new HeatmapChart(el, { data: cells, weighted: true })

// P&L waterfall
new WaterfallChart(el, {
  data: [
    { label: 'Start', value: 10000, type: 'total' },
    { label: 'Gain', value: 1850 },
    { label: 'Loss', value: -620 },
    { label: 'End', value: 11230, type: 'total' },
  ],
})

// Fear & Greed gauge: zones light up to the value, the label shows the current zone
const gauge = new GaugeChart(el, {
  value: 72,
  label: 'Fear & Greed',
  zones: [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 25, to: 45, color: '#f2a93b', label: 'Fear' },
    { from: 45, to: 55, color: '#8a93a3', label: 'Neutral' },
    { from: 55, to: 75, color: '#62c895', label: 'Greed' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ],
  // pointer: 'needle',  // classic needle instead of the ring marker
})
gauge.setValue(85) // animates smoothly
```

### Indicadores (integrados)

85 indicadores: medias móviles (SMA, EMA, WMA, Hull, DEMA, TEMA, ALMA, KAMA,
LSMA, McGinley, SMMA, MA Cross, MTF MA), bandas y canales (Bollinger,
Keltner, Donchian, Envelope, Linear Regression), tendencia y stops (Ichimoku,
Supertrend, Parabolic SAR, Chandelier, Chande Kroll Stop, Alligator, ZigZag,
Fractals, Pivot Points), VWAP y Volume Profile en el panel de precio; RSI, MACD,
Stochastic, ATR, ADX, CCI, OBV, MFI, Bollinger %B y BandWidth, Historical
Volatility, Ulcer Index y 40 osciladores más, e indicadores de volumen y de
volatilidad en paneles. El [catálogo de indicadores](https://bonguynvan.github.io/tradecanvas/docs/indicators)
lista cada id con sus parámetros, líneas y niveles.

```typescript
import { indicatorSource } from '@tradecanvas/chart'

const rsi = chart.addIndicator('rsi', { period: 14 })!
chart.addIndicator('ema', { period: 21, source: 'hlc3' })                     // another price
chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') }) // RSI's own average, in RSI's pane
chart.setIndicatorLevels(rsi, [20, 50, 80])
```

- **Fuentes**: close, open, high, low, hl2, hlc3, ohlc4, hlcc4, o la línea de otro indicador.
- **Paneles**: una escala de valores por panel para líneas, niveles, eje y cruz; mueve un indicador a otro panel, a uno nuevo o de vuelta al panel de precio; contrae, maximiza y reordena paneles (`moveIndicatorToPane`, `setPaneCollapsed`, `setMaximizedPane`, `movePane`).
- **Deshacer y plantillas**: Ctrl/Cmd+Z deshace los cambios en los indicadores, en el mismo historial que los dibujos; ChartWidget guarda los indicadores como plantillas con nombre (`getIndicatorSetup` / `applyIndicatorSetup`).
- **Niveles**: editables por instancia (RSI 30/70, CCI ±100 …) y conservados en los diseños guardados.
- **Etiquetas de valor**: el último valor de cada línea sobre su eje, en su color.
- **Los indicadores personalizados** declaran sus líneas (`plots`), su escala, sus niveles y sus parámetros; el gráfico los dibuja y los etiqueta.

Los parámetros no válidos (NaN, Infinity, cadenas no numéricas, claves ausentes) recurren
a los valores por defecto en lugar de llegar a los cálculos.

### Herramientas de dibujo

Línea de tendencia, línea horizontal, línea vertical, rayo, línea extendida, canal paralelo, retroceso de Fibonacci, extensión de Fibonacci, **zonas temporales de Fibonacci**, rectángulo, elipse, triángulo, flecha, horquilla, abanico de Gann, caja de Gann, onda de Elliott, canal de regresión, rango de fechas, rango de precio, medir, VWAP anclado, perfil de volumen de rango fijo, anotación de texto

Todas las herramientas de dibujo admiten:
- Colocación con un clic y ajuste magnético a los valores OHLC
- Deshacer / rehacer (Ctrl+Z / Ctrl+Y)
- Serialización para guardar/cargar
- Estilos personalizados (color, grosor, patrón de guiones)

### Capa de trading

Muestra las posiciones abiertas y las órdenes pendientes directamente en el gráfico, como en MT4/MT5.

```typescript
import type { TradingPosition, TradingOrder } from '@tradecanvas/chart'

chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 3500,
  quantity: 1.5,
  closedQuantity: 0.5,   // partial close — visualized as a left-edge dim band
  stopLoss: 3400,
  takeProfit: 3700,
}])

chart.setOrders([{
  id: 'order-1',
  side: 'sell',
  type: 'limit',
  price: 3800,
  quantity: 0.5,
  label: 'TP',
  draggable: true,
}])

// Customize the position zone color via P&L thresholds
chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#b91c1c' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 50,        color: '#16a34a' },
    { pnl: 200,       color: '#15803d' },
  ],
  // Custom label template — tokens: {side} {qty} {openQty} {closedQty} {entry} {price} {pnl} {pnlPct} {pnlSign}
  positionLabel: '{side} {openQty}/{qty} @ {entry} | {pnlSign}{pnl} ({pnlPct})',
})

// Listen for user drag-to-modify
chart.on('positionModify', (e) => console.log('SL/TP moved:', e.payload))
chart.on('orderModify', (e) => console.log('Order moved:', e.payload))

// The × and ⇅ buttons on the lines raise these; so can your own UI
chart.cancelOrderIntent('order-1')
chart.reversePositionIntent('pos-1')
chart.on('executionFill', (e) => console.log(e.payload.reason, e.payload.pnl))
```

### Marcadores de señales

Visualiza señales de compra/venta procedentes de bots, indicadores o análisis manual.

```typescript
chart.addSignalMarker({
  time: 1715692800000,
  price: 62500,
  direction: 'long',
  confidence: 0.85,
  source: 'ema-crossover',
  label: 'EMA Cross',
})

// Color-code by source
chart.setSignalMarkerStyle({
  sourceColors: {
    'ema-crossover': '#4c8dff',
    'rsi-divergence': '#f2a93b',
    'whale-flow': '#9C27B0',
  },
})
```

### Zonas de operación

Muestra rectángulos de entrada→salida coloreados según el P&L de las operaciones ejecutadas.

```typescript
const zoneId = chart.addTradeZone({
  entryTime: 1715692800000,
  entryPrice: 62500,
  exitTime: 1715700000000,
  exitPrice: 63200,
  direction: 'long',
  pnl: 140,
  pnlPercent: 1.12,
})

// Update a live trade when it closes
chart.updateTradeZone(zoneId, {
  exitTime: Date.now(),
  exitPrice: 63500,
  pnl: 200,
})
```

### Streaming en tiempo real

```typescript
// Built-in Binance adapter (free, no API key)
chart.connect({
  adapter: new BinanceAdapter(),
  symbol: 'ETHUSDT',
  timeframe: '1m',
  historyLimit: 500,
})

// Or manual data feed
chart.setData(historicalBars)
chart.appendBar(newBar)
chart.updateLastBar(updatedBar)
chart.setCurrentPrice(3500.42)
```

**Adaptadores integrados** (todos gratuitos, sin clave de API): `BinanceAdapter`, `CoinbaseAdapter`, `BybitAdapter`, `KrakenAdapter`, además de `MockAdapter` para trabajar sin conexión y para pruebas.

```typescript
import { BybitAdapter, KrakenAdapter, CoinbaseAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
```

**Cualquier fuente en ~20 líneas.** Extiende `WebSocketAdapter` (en vivo + historial REST) o `PollingAdapter` (fuentes solo REST): la base se encarga del ciclo de vida de la conexión, la reconexión, la decodificación y la emisión de eventos. Tú aportas una URL y una función de análisis:

```typescript
import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => `wss://api.myexchange.com/ws/${c.symbol}@kline_${c.timeframe}`,
  fetchHistory: (symbol, tf, limit) => fetch(`/candles?...`).then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})
```

### Ejecución en vivo

Conecta un `ExecutionAdapter` para convertir la capa de trading, que de por sí solo muestra información, en una superficie de trading real. El gráfico envía sus intenciones de orden/posición al adaptador y muestra las `orders` / `positions` de referencia que el adaptador le devuelve: el **adaptador es la única fuente de verdad**. Sin un adaptador conectado, esas intenciones siguen siendo simples eventos (compatible con versiones anteriores).

```typescript
import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64000 }))

// Drag-to-create an order, then confirm:
chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace → adapter fills → chart renders the position
// chart.cancelOrderDraft()

// One channel for failures (adapter-reported or a failed command):
chart.on('executionError', (e) => toast(e.payload.message))
```

Implementa `ExecutionAdapter` (es el equivalente de `DataAdapter`) para conectar un bróker / OMS real: `placeOrder`, `modifyOrder`, `cancelOrder`, `modifyPosition`, `closePosition`, además de los eventos `orders` / `positions` / `fill` / `error`. `PaperExecutionAdapter` es un sandbox con ejecuciones virtuales para demos y pruebas. El tipo de una orden creada arrastrando (limit o stop) se deduce de dónde sueltas la línea respecto al precio actual.

### Plugins — amplía el gráfico

Registra **indicadores**, **herramientas de dibujo**, **tipos de gráfico** y **superposiciones** personalizados, de forma global (todos los gráficos creados después los heredan) o por gráfico.

```typescript
import { Chart, registerPlugin, IndicatorBase } from '@tradecanvas/chart'

class MyIndicator extends IndicatorBase { /* descriptor, calculate(), render() */ }

// 1) Global — available to every chart created afterward:
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction:
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance:
chart.plugins.register({ kind: 'chartType', plugin: myCustomCandles })
chart.setChartType('my-custom-candles')   // custom chart types render via the plugin
```

| Tipo de plugin | Contrato |
|---|---|
| `indicator` | `IndicatorPlugin` — `calculate()` + `render()` |
| `drawing` | `DrawingPlugin` — `render()` + `hitTest()` |
| `chartType` | `ChartTypePlugin` — `createRenderer()` + `transform()` opcional |
| `overlay` | `OverlayPlugin` — `render(ctx, { viewport, data, theme })` en la capa `main` / `overlay` / `ui` |

### Indicadores fuera del gráfico

`IndicatorWorkerHost` calcula un indicador a partir de barras con los mismos mensajes que
usaría un Web Worker. El script del worker todavía no forma parte de los paquetes
publicados; pasa `null` y registra los plugins para calcular en el propio hilo (SSR,
pruebas, scripts):

```typescript
import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)
```

### Guardar / cargar

```typescript
const json = chart.saveState()
localStorage.setItem('my-chart', json!)

chart.loadState(localStorage.getItem('my-chart')!)

// Download / upload files
chart.downloadState('my-chart.json')
await chart.loadStateFromFile()

// Or keep a layout saved as it changes (debounced)
chart.setAutoSave('my-chart', 1500)
```

Un diseño guardado contiene el tipo de gráfico, el tema, los dibujos, los indicadores (parámetros, panel,
colores, visibilidad) y las alertas, incluidas las alertas sobre líneas de indicadores.

### Temas

```typescript
import { DARK_THEME, LIGHT_THEME, DARK_TERMINAL } from '@tradecanvas/chart'

// Built-in presets: DARK_THEME, LIGHT_THEME, DARK_TERMINAL
chart.setTheme(DARK_TERMINAL)  // fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace

// Or customize any preset
chart.setTheme({
  ...DARK_THEME,
  candleUp: '#1fa874',
  candleDown: '#e8505b',
  background: '#0a0a0f',
})
```

### Eventos

```typescript
chart.on('crosshairMove', (e) => { /* { point, bar, barIndex, indicatorValues } — also over indicator panes */ })
chart.on('crosshairLeave', () => { /* the pointer left the plot */ })
chart.on('drawingToolChange', (e) => { /* { tool } — null once a drawing is finished or cancelled */ })
chart.on('indicatorUpdate', (e) => { /* { from } — indicator values recomputed from this bar on */ })
chart.on('paneResize', (e) => { /* { instanceId, size } — an indicator pane was resized */ })
chart.on('indicatorChange', (e) => { /* { instanceId, change } — shown/hidden, restyled, levels, inputs or pane changed */ })
chart.on('barClick', (e) => { /* { bar, barIndex, point } */ })
chart.on('visibleRangeChange', (e) => { /* { from, to } — bar indices, not timestamps */ })
chart.on('priceRangeChange', (e) => { /* { min, max } — visible price bounds */ })
chart.on('zoomChange', (e) => { /* { barWidth } — pixels per bar */ })
chart.on('drawingCreate', (e) => { /* ... */ })
chart.on('orderModify', (e) => { /* ... */ })
chart.on('positionModify', (e) => { /* ... */ })
```

`visibleRangeChange`, `priceRangeChange` y `zoomChange` se disparan con cada desplazamiento,
zoom, redimensionado y actualización de datos, pero solo cuando esa parte del estado de la vista
ha cambiado de verdad. Convierte un índice de `visibleRangeChange` en tiempo con
`chart.getData()[e.payload.from].time`.

### Modo de repetición

`ReplayController` reproduce hacia delante una `DataSeries` histórica a velocidad controlada. Está desacoplado de `Chart`: conéctalo a cualquier destino (el gráfico, para reproducir en la interfaz, o una función de estrategia, para backtests headless).

```typescript
import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,        // bars per second
  startIndex: 0,
})

// Seed the chart with the prefix before replay starts
chart.setData(replay.getPrefix())

// Each emitted bar drives the chart forward
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
```

### Interacción con el gráfico

Todos los gestos que esperarías de un gráfico de trading de escritorio vienen integrados:

| Gesto | Resultado |
|---|---|
| Arrastrar el cuerpo del gráfico a izquierda/derecha | Desplazarse en el tiempo |
| Arrastrar el cuerpo del gráfico arriba/abajo | Desplazar la escala de precio (congela la escala automática; doble clic en el eje de precio para restaurarla) |
| Arrastrar el eje de precio arriba/abajo | Comprimir / expandir la escala vertical (congela la escala automática) |
| Arrastrar el eje de tiempo a izquierda/derecha | Zoom del eje de tiempo |
| Doble clic en el eje de precio | Reactivar la escala automática |
| Doble clic en el eje de tiempo | Ajustar todos los datos a la vista |
| Rueda | Zoom alrededor del cursor |
| Arrastrar un divisor de paneles | Redimensionar el panel del indicador (cursor `ns-resize` al pasar por encima) |
| `Shift` + arrastrar | Regla de medición (barras × tiempo × Δ precio × %) |
| `Alt` + clic | Fijar el tooltip OHLC; la cruz en vivo muestra la Δ respecto a la barra fijada |
| Pasar el cursor | Etiquetas de precio + tiempo que acompañan al cursor en ambos ejes |
| `Esc` | Soltar el tooltip / cancelar el dibujo |
| `?` | Mostrar la hoja de atajos de teclado *(widget)* |
| `Ctrl/⌘ + K` | Paleta de comandos *(widget)* |
| `Ctrl/⌘ + P` | Búsqueda de símbolos *(widget)* |
| `Ctrl/⌘ + Z` / `Shift + Z` | Deshacer / rehacer dibujos |

### Importación de datos — arrastrar y soltar o por código

```typescript
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)
```

Suelta un archivo CSV o JSON sobre el widget y se carga al instante. Detecta automáticamente
el delimitador (`,` / `;` / tabulador / `|`), si hay encabezado o no, las marcas de tiempo ISO 8601
y JSON como array de arrays o como array de objetos.

### Backtesting (`@tradecanvas/analytics`)

Backtester de estrategias barra a barra con ejecuciones virtuales, modelos de comisión/deslizamiento y un informe completo de métricas de riesgo.

```typescript
import { Backtester, PercentCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new PercentCommission(0.0005),
  slippage: new PercentSlippage(0.0003),
})

const result = bt.run(historicalBars, (ctx) => {
  // Strategy fn runs at close of each bar; orders fill on the NEXT bar.
  if (!ctx.position && smaFast > smaSlow) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.position && smaFast < smaSlow) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe)         // 1.42
console.log(result.metrics.maxDrawdownPct) // 0.087
console.log(result.equityCurve)            // → feed into the chart via EquityCurveRenderer
```

Devuelve: `fills`, los `trades` cerrados, `equityCurve` y `metrics` (Sharpe, Sortino, Calmar, CAGR, drawdown máximo, tasa de acierto, profit factor, esperanza matemática). Consulta la [demo de backtest en vivo](https://bonguynvan.github.io/tradecanvas/docs/analytics/).

#### Biblioteca de estrategias
Cuatro estrategias de referencia listas para usar; cada una devuelve una `StrategyFn` lista para
pasar a `Backtester.run()`:

```typescript
import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))
bt.run(bars, donchianBreakoutStrategy({ entryPeriod: 20, exitPeriod: 10 }))
```

#### Dependencia de la trayectoria con Monte Carlo
Baraja N veces el orden de las operaciones realizadas para revelar si una estrategia depende de
una secuencia afortunada. Banda P5/P95 estrecha = ventaja robusta; banda ancha = dependiente de la trayectoria.

```typescript
import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, { simulations: 1000, seed: 42 })

mc.equityBands              // [{ step, p5, p25, p50, p75, p95 }, …]
mc.finalEquityPercentiles   // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable    // 0..1
mc.worstMaxDrawdownPct
```

## Comparación

| Función | @tradecanvas/chart | lightweight-charts | chart.js | Highcharts Stock |
|---|---|---|---|---|
| Tipos de gráfico | 17 + 6 financieros | 4 | 8 (no financieros) | 10+ |
| Gráficos financieros | Sparkline, Depth, Equity, Heatmap, Waterfall, Gauge | Ninguno | Ninguno | Algunos |
| Indicadores integrados | 85 | 0 | 0 | ~30 |
| Herramientas de dibujo | 69 | 0 | 0 | Algunas |
| Capa de trading | Completa (posiciones + órdenes + arrastre) | Ninguna | Ninguna | Ninguna |
| Streaming en tiempo real | Integrado (Binance) | Manual | Manual | Integrado |
| Guardar/cargar estado | Sí | No | No | Sí |
| Modo de repetición | Sí (`ReplayController`) | No | No | No |
| Backtester | Sí (`@tradecanvas/analytics`) | No | No | No |
| Cuadrícula de varios gráficos | Sí (`ChartGrid`) | No | No | Sí |
| Bundle (gzip) | ~100 KB núcleo | ~45 KB | ~70 KB | ~200 KB |
| Dependencias | 0 | 1 | 0 | 0 |
| Widget (interfaz completa) | Sí (`ChartWidget`) | No | No | No |
| Licencia | MIT | Apache 2.0 | MIT | Comercial |

## Resumen de la API

### `new Chart(container, options)`

```typescript
const chart = new Chart(element, {
  chartType: 'candlestick',
  theme: DARK_THEME,
  autoScale: true,
  rightMargin: 5,
  numberLocale: 'en-US',  // or 'de-DE', 'vi-VN', etc. — BCP 47 locale
  crosshair: { mode: 'magnet' },
  features: { drawings: true, indicators: true, trading: true, volume: true },
})

// Change locale at runtime
chart.setNumberLocale('de-DE')  // 65.234,00
```

### Métodos principales

| Método | Descripción |
|---|---|
| `setData(bars)` | Carga datos OHLCV históricos |
| `appendBar(bar)` | Añade una vela nueva |
| `appendBars(bars)` | Añade barras en bloque (puesta al día tras una reconexión) |
| `updateLastBar(bar)` | Actualiza la vela en curso |
| `setCurrentPrice(price, pulseColor?)` | Muestra una línea de precio en vivo |
| `connect(config)` | Se conecta a una fuente de datos en tiempo real |
| `setTimeframe(tf)` | Cambia la temporalidad del stream activo |
| `setChartType(type)` | Cambia el tipo de gráfico |
| `setTheme(theme)` | Aplica un tema (DARK_THEME, LIGHT_THEME, DARK_TERMINAL) |
| `setNumberLocale(locale)` | Define el locale del formato numérico (en-US, de-DE, vi-VN) |
| `setStatusText(text)` | Muestra un estado en la zona de la leyenda ("LIVE · 8ms") |
| `addIndicator(id, params?)` | Añade un indicador técnico |
| `removeIndicator(instanceId)` | Quita un indicador |
| `setDrawingTool(tool)` | Activa una herramienta de dibujo |
| `setPositions(positions)` | Muestra posiciones de trading |
| `setOrders(orders)` | Muestra órdenes pendientes |
| `setVolumeProfileVisible(v)` | Muestra u oculta la superposición horizontal del perfil de volumen |
| `setVolumeProfileConfig({ buckets, widthRatio, opacity, highlightPoC })` | Ajusta el perfil de volumen |
| `setAutoScale(v)` / `setLogScale(v)` | Fija o cambia el modo de la escala de precio |
| `setInvertScale(v)` | Invierte la escala de precio |
| `fitContent()` / `scrollToEnd()` | Ajusta todos los datos / salta al borde en vivo |
| `setVisibleRangePreset(p)` | Muestra `1D`, `5D`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `5Y` o `All` |
| `goToTime(time)` | Centra la barra de un momento dado |
| `setCrosshairTime(time)` | Replica la cruz de otro gráfico (solo la línea vertical) |
| `copyDrawings()` / `pasteDrawings()` | Copia la selección y la pega en este u otro gráfico |
| `setStayInDrawingMode(v)` | Mantiene la herramienta de dibujo tras cada dibujo |
| `saveState(key?)` | Serializa el estado del gráfico |
| `loadState(json)` | Restaura el estado del gráfico |
| `screenshot()` | Descarga el gráfico como imagen |
| `on(event, handler)` | Se suscribe a eventos |
| `destroy()` | Libera todos los recursos |

### Formato de datos

```typescript
interface OHLCBar {
  time: number    // Unix time in ms or seconds (up to 1e12 is read as seconds); ascending
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

## Ejemplos

| Ejemplo | Descripción |
|---|---|
| [Demo en vivo](https://bonguynvan.github.io/tradecanvas/) | Laboratorio de funciones: herramientas de dibujo, indicadores, trading, rangos, historial paginado, repetición, 14 idiomas con precios por debajo del centavo, 200k barras, cambios con red lenta; cada uno en un gráfico en vivo. El sitio y la documentación también están en vietnamita, chino, japonés, coreano y español |
| [Entornos de StackBlitz](https://bonguynvan.github.io/tradecanvas/examples/) | Con un clic y bifurcables: `Chart` con JS puro, `ChartWidget`, wrappers de React / Vue / Svelte, gráficos financieros |
| [`@tradecanvas/react`](./packages/react/) · [`/vue`](./packages/vue/) · [`/svelte`](./packages/svelte/) | Componentes para frameworks: props reactivas y tipadas, sin código repetitivo |

## Herramientas de programación con IA

- [`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) y
  [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) dan a
  los asistentes la documentación en un solo lugar.
- Una skill para agentes, [`skills/tradecanvas`](skills/tradecanvas/SKILL.md), enseña
  a los agentes de programación a construir con TradeCanvas: los puntos de entrada, las reglas que
  evitan la mayoría de los errores y ejemplos completos cuyos tipos comprueba la CI contra la biblioteca.
  Copia la carpeta en el `.claude/skills/` de tu proyecto (o en la carpeta de skills de tu agente)
  para usarla.

## Compatibilidad con navegadores

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+

## Integración con frameworks

Componentes wrapper oficiales: props reactivas, refs, sin código repetitivo. Publicados en `1.x` junto al núcleo:

```bash
npm install @tradecanvas/react    # or @tradecanvas/vue · @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" theme="dark" indicators={['rsi', 'macd']} />
```

Los tres comparten la misma superficie de props y te dan el `Chart` subyacente (para dibujos, trading, ejecución y plugins) mediante `onReady` / ref / `bind:chart`. Consulta la [documentación de frameworks](https://bonguynvan.github.io/tradecanvas/docs/frameworks).

### Headless (controla el ciclo de vida)

La clase `Chart` también acepta directamente un elemento del DOM, sin depender de ningún framework:

**React:**

```tsx
import { useEffect, useRef } from 'react'
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

function TradingChart() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = new Chart(ref.current!, {
      theme: 'dark',
      features: { indicators: true, drawings: true },
    })
    chart.connect({
      adapter: new BinanceAdapter(),
      symbol: 'BTCUSDT',
      timeframe: '5m',
    })
    return () => chart.destroy()
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 500 }} />
}
```

**Svelte:**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'
  import type { TimeFrame } from '@tradecanvas/chart'

  interface Props { symbol?: string; timeframe?: TimeFrame }
  let { symbol = 'BTCUSDT', timeframe = '5m' }: Props = $props()

  let container: HTMLDivElement
  let chart: Chart | null = null

  onMount(() => {
    chart = new Chart(container, {
      chartType: 'candlestick',
      theme: DARK_THEME,
      autoScale: true,
      features: { indicators: true, drawings: true, volume: true },
    })
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })

  onDestroy(() => chart?.destroy())

  $effect(() => {
    if (!chart) return
    chart.disconnectStream()
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })
</script>

<div bind:this={container} style="width: 100%; height: 600px" />
```

**Vue:**

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 600px" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'

const chartContainer = ref<HTMLDivElement>()
let chart: Chart | null = null

onMounted(() => {
  if (!chartContainer.value) return
  chart = new Chart(chartContainer.value, {
    chartType: 'candlestick',
    theme: DARK_THEME,
    autoScale: true,
    features: { indicators: true, drawings: true, volume: true },
  })
  chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
})

onUnmounted(() => chart?.destroy())
</script>
```

## Rendimiento

Un pipeline de Canvas2D con dos canvas: al pasar el cursor solo se repinta el fino canvas superior, nunca la escena. Cuatro cosas mantienen la fluidez con grandes volúmenes de datos:

- **Submuestreo LTTB** — los gráficos de línea / área submuestrean automáticamente el rango visible a ~2 puntos por píxel con Largest-Triangle-Three-Buckets cuando hay muchas más barras que píxeles. La línea se ve idéntica y se dibujan decenas de veces menos puntos; con un zoom normal no hace nada. La utilidad `lttbDownsample` se exporta para que la uses tú.
- **Renderizado del rango visible** — cada renderizador recorre solo las barras a la vista, nunca la serie completa. El coste por fotograma al pasar el cursor y al desplazar se mantiene constante de 500 a 100,000 barras cargadas.
- **Indicadores incrementales en los ticks en vivo** — un tick solo cambia la barra en formación, así que los indicadores integrados que implementan `update()` (SMA, EMA, WMA, VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic) recalculan solo esa barra en lugar de todo el historial. Los demás recurren a un recálculo completo. Los plugins personalizados pueden sumarse mediante `IndicatorPlugin.update`.
- **Cargas completas baratas** — un cambio de símbolo/temporalidad recalcula cada indicador una vez. Su búsqueda de `values` por barra es un `IndicatorValueMap` (respaldado por un array mientras las barras llegan en orden temporal, ~3x más barato de construir que un `Map` indexado por marcas de tiempo), y `setData` reutiliza las barras que ya están bien formadas en lugar de copiar cada una.

BB + EMA + RSI + MACD (`pnpm bench`, un solo núcleo):

| Historial | Recálculo completo (cambio / `setData`) | `update()` incremental (tick en vivo) |
|---|---|---|
| 20,000 barras | ~5 ms | ~0.0005 ms |
| 100,000 barras | ~27 ms | ~0.001 ms |

Velocidad del submuestreo (`pnpm bench`, un solo núcleo):

| Puntos visibles → 1600 | Tiempo / fotograma | Rendimiento |
|---|---|---|
| 10,000 | ~0.025 ms | 39,600 / s |
| 100,000 | ~0.32 ms | 3,100 / s |
| 1,000,000 | ~2.6 ms | 380 / s |

Un gráfico de líneas de 100k barras se submuestrea en ~0.3 ms, muy por debajo de un presupuesto de 16.6 ms por fotograma, y luego dibuja ~62× menos puntos (100k → 1600).

## Arquitectura

Dos canvas superpuestos: al pasar el cursor solo se repinta el fino canvas superior:

```
  Top canvas    (crosshair + axis pills, legend, countdown, measure)   z=1
  Scene canvas  (grid, candles, indicators, drawings, orders, axes)    z=0
```

## Proyectos relacionados

- **[bo-grid](https://github.com/bonguynvan/bo-grid)** — tabla de datos **Svelte 5** pequeña y rápida para interfaces fintech: sparklines en canvas, actualizaciones de celdas en tiempo real por lotes, desplazamiento virtual, agrupación / pivot / datos en árbol y exportación a Excel, con un núcleo que ocupa ~32 KB con gzip. Es la mitad de tablas del mismo kit: combínala con TradeCanvas para un puesto de trading completo. **[Demo en vivo](https://bonguynvan.github.io/bo-grid/)**

## Licencia

[MIT](./LICENSE)

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/es/"><img src=".github/assets/banner.png" alt="TradeCanvas, el motor de gráficos para apps de trading" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/v/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=f2a93b&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/dm/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=3ccf91" alt="npm downloads"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/bonguynvan/tradecanvas/ci.yml?branch=main&style=flat-square&labelColor=0b0e13&label=CI" alt="CI status"></a>
  <a href="https://pkg.pr.new/~/bonguynvan/tradecanvas"><img src="https://pkg.pr.new/badge/bonguynvan/tradecanvas" alt="pkg.pr.new previews"></a>
  <img src="https://img.shields.io/badge/third--party%20deps-0-3ccf91?style=flat-square&labelColor=0b0e13" alt="No third-party dependencies">
  <img src="https://img.shields.io/badge/TypeScript-strict-4c8dff?style=flat-square&labelColor=0b0e13" alt="TypeScript">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=a9b0bd" alt="MIT license"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/stargazers"><img src="https://img.shields.io/github/stars/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=f2a93b" alt="GitHub stars"></a>
  <a href="https://github.com/sponsors/bonguynvan"><img src="https://img.shields.io/github/sponsors/bonguynvan?style=flat-square&labelColor=0b0e13&color=db61a2&label=sponsors&logo=githubsponsors&logoColor=db61a2" alt="GitHub Sponsors"></a>
</p>

<p align="center">
  <b><a href="https://bonguynvan.github.io/tradecanvas/es/">Demo en vivo</a></b> ·
  <a href="https://bonguynvan.github.io/tradecanvas/es/docs/getting-started/">Documentación</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/es/examples/">Ejemplos</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/es/playground/">Playground</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/es/audit/">Auditoría del sistema</a> ·
  <a href="./CHANGELOG.md">Registro de cambios</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <b>Español</b>
</p>

**Un gráfico de trading completo para la web.** De velas japonesas a Renko, 111 indicadores, 69 herramientas de dibujo, datos en vivo de exchanges y órdenes sobre el gráfico, dibujado con Canvas 2D o WebGL y sin dependencias de terceros. Usa el `ChartWidget` completo o construye tu propia interfaz sobre el `Chart` headless, en TypeScript, React, Vue o Svelte.

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/es/"><img src=".github/assets/hero.png" alt="ChartWidget con BTCUSDT en vivo desde Binance: EMA 21 y 55, RSI, una línea de tendencia, una posición larga y una lista de seguimiento con cotizaciones en vivo" width="100%"></a>
</p>

## Lo más destacado

- **18 tipos de gráfico**, de velas y Heikin-Ashi a Renko, Kagi, punto y figura y Equivolumen, más seis gráficos financieros (sparkline, profundidad, curva de capital, mapa de calor, cascada, indicador de aguja).
- **111 indicadores y 69 herramientas de dibujo**: indicadores sobre indicadores, alertas en líneas de tendencia, plantillas, grupos, deshacer y rehacer.
- **Trading sobre el gráfico**: posiciones con P&L en vivo, órdenes y stop-loss/take-profit que arrastras, un ticket de orden, un panel de cuenta, y un bróker de simulación o tu propio adaptador de ejecución.
- **Datos en vivo**: Binance, Bybit, Coinbase y Kraken integrados, cualquier otra fuente en unas veinte líneas; historial anterior al desplazarte hacia atrás, cualquier intervalo, gráficos de ticks.
- **Canvas 2D o WebGL**: un millón de barras desplazadas a 60 fps, nítidas en cualquier escala de pantalla.
- **Un espacio de trabajo completo**: cuadrículas de varios gráficos, diseños con nombre, repetición de barras con trading simulado y un backtester en `@tradecanvas/analytics`.
- **A tu medida**: 101 claves de estilo, 112 interruptores de funciones, tres estilos y plugins para indicadores, herramientas de dibujo, tipos de gráfico y capas.
- **Para todos**: el widget en 30 idiomas, incluidos los de derecha a izquierda, con soporte para lectores de pantalla y teclado.

## Instalación

```bash
npm install @tradecanvas/chart
```

## Inicio rápido

`ChartWidget` es toda la interfaz de trading en una sola llamada: barra de herramientas, barra lateral de dibujo, configuración y barra de estado.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(), // datos en vivo, sin API key
  trading: true,
})
```

Para controlar tú la interfaz, usa el `Chart` headless y su API:

```typescript
import { Chart } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
chart.setData(bars) // [{ time, open, high, low, close, volume }, …]
chart.addIndicator('ema', { period: 50 })
chart.addIndicator('rsi')
```

Tu propia fuente se conecta con `WebSocketAdapter` o `PollingAdapter`; consulta [Tiempo real](https://bonguynvan.github.io/tradecanvas/es/docs/realtime/).

## Frameworks

```bash
npm install @tradecanvas/react    # o @tradecanvas/vue, @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['rsi', { id: 'ema', params: { period: 50 } }]} />
```

Los tres componentes comparten las mismas props y te dan el `Chart` subyacente. Consulta [Frameworks](https://bonguynvan.github.io/tradecanvas/es/docs/frameworks/).

## Un vistazo

<table>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/drawings.png"><img src=".github/assets/drawings.png" alt="Herramientas de dibujo: un retroceso de Fibonacci con una nota, una línea de tendencia, una onda de impulso de Elliott y una posición larga"></a>
      <br><b>69 herramientas de dibujo</b><br>
      Fibonacci, Gann, horquillas, ondas de Elliott, patrones armónicos, notas y una posición larga/corta que calcula el tamaño de la operación.
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/trading.png"><img src=".github/assets/trading.png" alt="Trading sobre el gráfico: una posición larga con stop-loss y take-profit, un buy stop y un sell limit, y el panel de cuenta"></a>
      <br><b>Trading sobre el gráfico</b><br>
      Posiciones con P&amp;L en vivo, órdenes que arrastras a otro precio, un ticket de orden y un panel de cuenta.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/grid.png"><img src=".github/assets/grid.png" alt="Un espacio de trabajo de dos por dos con gráficos de BTC, ETH, SOL y BNB en varias temporalidades"></a>
      <br><b>Espacio de trabajo multigráfico</b><br>
      Hasta seis gráficos lado a lado, enlazados por símbolo, temporalidad, cruz, tiempo o dibujos.
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/looks.png"><img src=".github/assets/looks.png" alt="Un gráfico con tres estilos: studio, terminal y capsule en el tema claro"></a>
      <br><b>Tu propio estilo</b><br>
      Tres preajustes o tus propias esquinas, densidad, fuentes y etiquetas de precio, en temas claro y oscuro.
    </td>
  </tr>
</table>

## Documentación

| Tema | |
|---|---|
| [Primeros pasos](https://bonguynvan.github.io/tradecanvas/es/docs/getting-started/) | Instalación, el widget, el gráfico headless |
| [Tipos de gráfico](https://bonguynvan.github.io/tradecanvas/es/docs/chart-types/) · [Indicadores](https://bonguynvan.github.io/tradecanvas/es/docs/indicators/) · [Herramientas de dibujo](https://bonguynvan.github.io/tradecanvas/es/docs/drawing-tools/) | Lo que dibuja el gráfico y los ajustes de cada cosa |
| [Tiempo real](https://bonguynvan.github.io/tradecanvas/es/docs/realtime/) | Fuentes integradas, tu propio adaptador, historial, gráficos de ticks |
| [Trading](https://bonguynvan.github.io/tradecanvas/es/docs/trading/) | Órdenes, posiciones, adaptadores de ejecución, repetición |
| [Estilos](https://bonguynvan.github.io/tradecanvas/es/docs/styling/) · [Personalización](https://bonguynvan.github.io/tradecanvas/es/docs/customization/) | Temas, claves de estilo, estilos visuales, interruptores de funciones, tus propias piezas |
| [Plugins](https://bonguynvan.github.io/tradecanvas/es/docs/plugins/) | Tus propios indicadores, herramientas de dibujo, tipos de gráfico y capas |
| [Analítica](https://bonguynvan.github.io/tradecanvas/es/docs/analytics/) · [Gráficos financieros](https://bonguynvan.github.io/tradecanvas/es/docs/finance/) | Backtesting y métricas de riesgo; profundidad, curva de capital y otros gráficos |
| [Rendimiento](https://bonguynvan.github.io/tradecanvas/es/docs/performance/) · [Referencia de la API](https://bonguynvan.github.io/tradecanvas/es/docs/api/) | Mediciones y la API completa |

La documentación también está en English, Tiếng Việt, 简体中文, 日本語 y 한국어.

## Rendimiento

Medido en Chrome con gráficos integrados (Intel UHD); la [auditoría del sistema](https://bonguynvan.github.io/tradecanvas/es/audit/) tiene la tabla completa.

| | |
|---|---|
| 1.000.000 de barras + 4 indicadores, con zoom alejado, WebGL | 16,7 ms por fotograma (60 fps) |
| Un tick en vivo sobre 100.000 barras con cuatro indicadores | ~0,001 ms |
| `Chart` / `ChartWidget`, minificados y con gzip | 176 KB / 315 KB |

## Paquetes

| Paquete | |
|---|---|
| [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) | El gráfico y `ChartWidget` (`/widget`) |
| [`@tradecanvas/react`](https://www.npmjs.com/package/@tradecanvas/react) · [`/vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`/svelte`](https://www.npmjs.com/package/@tradecanvas/svelte) | Componentes para frameworks |
| [`@tradecanvas/analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) | Backtester y métricas de riesgo |
| `@tradecanvas/core` · `@tradecanvas/commons` | El motor y los tipos compartidos, instalados con el gráfico |

## Versiones preliminares

Cada pull request y cada commit en `main` se publica en [pkg.pr.new](https://pkg.pr.new), así que puedes probar una corrección o una función antes de que salga. Instala una versión preliminar por número de pull request o por commit:

```bash
npm install https://pkg.pr.new/@tradecanvas/chart@123      # pull request #123
npm install https://pkg.pr.new/@tradecanvas/chart@a1b2c3d  # un commit en main
```

Cada pull request recibe un comentario con los comandos exactos para cada paquete.

## Compatibilidad con navegadores

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+.

## Herramientas de programación con IA

[`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) y [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) dan a los asistentes la documentación en un solo archivo, y la skill para agentes de [`skills/tradecanvas`](skills/tradecanvas/SKILL.md) enseña la API a los agentes de programación con ejemplos cuyos tipos comprueba la CI.

## Proyectos relacionados

- **[bo-grid](https://github.com/bonguynvan/bo-grid)**: una tabla de datos Svelte 5 pequeña y rápida para interfaces fintech, la mitad de tablas de un puesto de trading. [Demo en vivo](https://bonguynvan.github.io/bo-grid/)

## Contribuir

Los reportes de errores, las ideas y los pull requests son bienvenidos. [CONTRIBUTING.md](./CONTRIBUTING.md) explica la configuración (`pnpm install && pnpm build && pnpm test`) y lo que necesita un pull request. ¿Encontraste un problema de seguridad? Sigue [SECURITY.md](./SECURITY.md) en lugar de abrir un issue.

## Patrocinio

TradeCanvas es gratuito, con licencia MIT, y se desarrolla y mantiene en abierto. Si te ayuda en tu producto, puedes apoyar su desarrollo en [GitHub Sponsors](https://github.com/sponsors/bonguynvan).

## Licencia

[MIT](./LICENSE)

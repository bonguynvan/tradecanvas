<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugins — Documentación de TradeCanvas</title>
  <meta name="description" content="Amplía TradeCanvas con indicadores, herramientas de dibujo, tipos de gráfico y capas personalizados mediante el SDK de plugins." />
</svelte:head>

<h1>Plugins</h1>
<p>
  Amplía el gráfico con <strong>indicadores</strong>, <strong>herramientas de dibujo</strong>,
  <strong>tipos de gráfico</strong> y <strong>capas</strong> personalizados, registrados de
  forma global o por gráfico.
</p>

<h2>Registro</h2>
<p>Hay tres formas de registrar, por orden de prioridad: valores globales por defecto, el constructor y, por último, llamadas imperativas sobre la instancia.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>

<h2>Tipos de plugin</h2>
<table>
  <thead><tr><th>Tipo</th><th>Contrato</th><th>Dónde se dibuja</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render()</code></td><td>superpuesto o en panel</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>capa superpuesta</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + <code>transform()</code> opcional</td><td>serie principal</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>Indicador personalizado</h2>
<p>Extiende <code>IndicatorBase</code> para usar sus utilidades de dibujo; después regístralo y añádelo como cualquier indicador integrado:</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap, registerPlugin } from '@tradecanvas/chart'

class DoubleSMA extends IndicatorBase {
  descriptor = {
    id: 'double-sma', name: 'Double SMA',
    placement: 'overlay', defaultConfig: { fast: 10, slow: 30 },
  }
  calculate(data, config) { /* values = new IndicatorValueMap(); return { values, series } */ }
  render(ctx, output, viewport, style) { /* draw lines */ }
}

registerPlugin({ kind: 'indicator', plugin: new DoubleSMA() })
chart.addIndicator('double-sma', { fast: 10, slow: 30 })`}</code></pre>
<p>
  Para <code>values</code>, usa <code>new IndicatorValueMap()</code> en lugar de
  <code>new Map()</code>: es un <code>Map</code> intercambiable que resulta varias
  veces más barato de llenar barra a barra en orden temporal, que es justo lo que
  hace cada cambio de símbolo o de temporalidad sobre todo el historial.
</p>

<h3>Actualizaciones rápidas en vivo (opcional)</h3>
<p>
  En cada tick en vivo solo cambia la barra en formación. Implementa
  <code>update()</code> para recalcular solo las barras a partir de
  <code>from</code> en lugar de todo el historial: el gráfico lo usa con los ticks
  y las barras nuevas, y recurre a <code>calculate()</code> cuando no existe o
  devuelve <code>null</code>. Debe producir los mismos valores que produciría
  <code>calculate()</code>.
</p>
<pre><code>{`update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null   // IndicatorBase helper
  for (let i = from; i < data.length; i++) {
    this.writePoint(prev, data, i, { value: /* recompute bar i */ 0 })
  }
  return prev
}`}</code></pre>

<h2>Herramienta de dibujo personalizada</h2>
<p>
  Extiende <code>DrawingBase</code> para usar sus utilidades (de anclas a píxeles,
  estilos de línea, puntos de control), describe la herramienta y regístrala. La
  configuración que enumeres en <code>descriptor.options</code> aparece en el
  diálogo de configuración del widget y se guarda con el dibujo.
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* en this.anchorToPixel(state.anchors[0], viewport) */ }
  hitTest(point, state, viewport, tolerance) { /* ¿está el puntero sobre él? */ return false }
  // opcional: los precios de sus líneas, para que una alerta pueda seguirlas
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  El descriptor también puede indicar cómo se dibuja la herramienta
  (<code>creation</code>: <code>'clicks'</code>, <code>'freehand'</code> o
  <code>'path'</code>, con <code>maxAnchors</code>) y si el diálogo ofrece un
  relleno (<code>fill</code>) o texto (<code>text</code>). Una herramienta puede
  mover puntos de control que no son anclas con <code>moveHandle()</code> y
  recibe las barras del gráfico mediante <code>setDataGetter()</code> cuando
  dibuja a partir de ellas.
</p>

<h2>Tipo de gráfico personalizado</h2>
<p>Un <code>ChartTypePlugin</code> aporta un renderizador y una transformación de datos opcional; cámbiate a él como a uno integrado:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Capa personalizada</h2>
<p>Un <code>OverlayPlugin</code> dibuja cada fotograma en la capa que elijas y recibe la vista, los datos y el tema actuales:</p>
<pre><code>{`registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'vwap-band', name: 'VWAP Band', layer: 'main' },
    render(ctx, { viewport, data, theme }) {
      // draw onto the main layer with the current viewport + data
    },
  },
})`}</code></pre>

<p>Consulta la <a href={href('/docs/api')}>referencia de la API</a> para ver las firmas de tipos completas de los plugins.</p>

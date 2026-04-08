import { LayerType } from '@chart-lib/commons';
import type { Size, ViewportState, Theme, DataSeries, Rect } from '@chart-lib/commons';
import { priceToY, yToPrice, xToBarIndex, barIndexToX } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH, computeTickStep, formatPrice } from '@chart-lib/commons';
import { LayerManager } from './LayerManager.js';
import { RenderLoop } from './RenderLoop.js';
import { DPRManager } from './DPRManager.js';
import type { CanvasLayer } from './CanvasLayer.js';
import type { ChartRendererInterface } from '../charts/ChartRenderer.js';
import type { GridRenderer } from '../axis/GridRenderer.js';
import type { PriceAxis } from '../axis/PriceAxis.js';
import type { TimeAxis } from '../axis/TimeAxis.js';
import type { CrosshairHandler } from '../interaction/CrosshairHandler.js';
import type { IndicatorEngine } from '../indicators/IndicatorEngine.js';
import type { DrawingRenderer } from '../drawings/DrawingRenderer.js';
import type { TradingRenderer } from '../trading/TradingRenderer.js';
import type { CurrentPriceLine } from '../realtime/CurrentPriceLine.js';
import type { ChartLegend } from '../ui/ChartLegend.js';
import type { Watermark } from '../ui/Watermark.js';
import type { BarCountdown } from '../ui/BarCountdown.js';
import type { SessionBreaks } from '../ui/SessionBreaks.js';
import type { VolumeRenderer } from '../charts/VolumeRenderer.js';
import type { CompareRenderer } from '../charts/CompareRenderer.js';

export interface PanelRenderInfo {
  instanceId: string;
  rect: Rect;
  viewport: ViewportState;
}

export interface RenderContext {
  chartRenderer: ChartRendererInterface | null;
  gridRenderer: GridRenderer | null;
  priceAxis: PriceAxis | null;
  timeAxis: TimeAxis | null;
  crosshairHandler: CrosshairHandler | null;
  indicatorEngine: IndicatorEngine | null;
  drawingRenderer: DrawingRenderer | null;
  tradingRenderer: TradingRenderer | null;
  currentPriceLine: CurrentPriceLine | null;
  chartLegend: ChartLegend | null;
  volumeRenderer: VolumeRenderer | null;
  watermark: Watermark | null;
  barCountdown: BarCountdown | null;
  sessionBreaks: SessionBreaks | null;
  compareRenderer: CompareRenderer | null;
  panels: PanelRenderInfo[];
  priceLimits?: { ceiling: number; floor: number; reference: number; colors?: { ceiling?: string; floor?: string; reference?: string } } | null;
  timeAxisY?: number;
  viewport: ViewportState;
  theme: Theme;
  data: DataSeries;
}

export class RenderEngine {
  readonly layerManager: LayerManager;
  readonly renderLoop: RenderLoop;
  readonly dprManager: DPRManager;
  private renderCtx: RenderContext | null = null;

  // Cached layer references — avoid Map lookup per frame
  private bgLayer: CanvasLayer | undefined;
  private mainLayer: CanvasLayer | undefined;
  private overlayLayer: CanvasLayer | undefined;
  private uiLayer: CanvasLayer | undefined;

  constructor(container: HTMLElement) {
    this.layerManager = new LayerManager(container);
    this.renderLoop = new RenderLoop();
    this.dprManager = new DPRManager(container);

    this.layerManager.createLayers();
    this.cacheLayerRefs();

    this.renderLoop.setCallback((dirtyLayers) => this.render(dirtyLayers));

    this.dprManager.onResize((size, dpr) => {
      this.layerManager.resize(size, dpr);
      this.renderLoop.markAllDirty();
    });

    const size = this.dprManager.getContainerSize();
    const dpr = this.dprManager.getDpr();
    this.layerManager.resize(size, dpr);
  }

  private cacheLayerRefs(): void {
    this.bgLayer = this.layerManager.getLayer(LayerType.Background);
    this.mainLayer = this.layerManager.getLayer(LayerType.Main);
    this.overlayLayer = this.layerManager.getLayer(LayerType.Overlay);
    this.uiLayer = this.layerManager.getLayer(LayerType.UI);
  }

  setRenderContext(ctx: RenderContext): void {
    this.renderCtx = ctx;
  }

  start(): void {
    this.renderLoop.start();
  }

  stop(): void {
    this.renderLoop.stop();
  }

  requestRender(layer?: LayerType): void {
    if (layer !== undefined) {
      this.renderLoop.markDirty(layer);
    } else {
      this.renderLoop.markAllDirty();
    }
  }

  private render(dirtyLayers: ReadonlySet<LayerType>): void {
    const ctx = this.renderCtx;
    if (!ctx) return;
    const { viewport, theme, data } = ctx;

    // Skip rendering if viewport has zero dimensions
    if (viewport.chartRect.width <= 0 || viewport.chartRect.height <= 0) return;

    if (dirtyLayers.has(LayerType.Background) && this.bgLayer) {
      this.bgLayer.clear();
      ctx.gridRenderer?.render(this.bgLayer.ctx, viewport, theme);
      ctx.sessionBreaks?.render(this.bgLayer.ctx, viewport, theme, data);
      ctx.watermark?.render(this.bgLayer.ctx, viewport, theme);
    }

    if (dirtyLayers.has(LayerType.Main) && this.mainLayer) {
      this.mainLayer.clear();
      const c = this.mainLayer.ctx;

      // Clip main chart area
      c.save();
      c.beginPath();
      c.rect(viewport.chartRect.x, viewport.chartRect.y, viewport.chartRect.width, viewport.chartRect.height);
      c.clip();

      // Volume bars (drawn first, behind candles)
      ctx.volumeRenderer?.render(c, data, viewport, theme);
      ctx.chartRenderer?.render(c, data, viewport, theme);
      ctx.compareRenderer?.render(c, data, viewport, theme);
      ctx.indicatorEngine?.renderOverlays(c, viewport);

      c.restore();

      // Render panel indicators in their own clipped regions
      const panels = ctx.panels;
      const indicatorEngine = ctx.indicatorEngine;
      if (indicatorEngine && panels.length > 0) {
        // Cache font string once for all panels
        const panelFont = `10px ${theme.font.family}`;

        // Build descriptor lookup once per frame — avoids O(n*m) .find() per panel
        const panelDescs = indicatorEngine.getPanelIndicators();
        const descMap = new Map<string, typeof panelDescs[0]>();
        for (const d of panelDescs) descMap.set(d.instanceId, d);

        for (const panel of panels) {
          if (panel.rect.width <= 0 || panel.rect.height <= 0) continue;

          c.save();
          c.beginPath();
          c.rect(panel.rect.x, panel.rect.y, panel.rect.width, panel.rect.height);
          c.clip();

          const PANEL_HEADER_HEIGHT = 20;

          // Panel background
          c.fillStyle = theme.background;
          c.fillRect(panel.rect.x, panel.rect.y, panel.rect.width, panel.rect.height);

          // Thick divider bar at top of panel
          c.fillStyle = theme.axisLine;
          c.fillRect(panel.rect.x, panel.rect.y, panel.rect.width, 3);

          // Panel indicator name in header area
          c.fillStyle = theme.textSecondary;
          c.font = panelFont;
          c.textBaseline = 'top';
          c.textAlign = 'left';
          const desc = descMap.get(panel.instanceId);
          if (desc) {
            c.fillText(desc.descriptor.name, panel.rect.x + 6, panel.rect.y + 6);
          }

          // Clip indicator rendering to below the header
          c.save();
          c.beginPath();
          c.rect(panel.rect.x, panel.rect.y + PANEL_HEADER_HEIGHT, panel.rect.width, panel.rect.height - PANEL_HEADER_HEIGHT);
          c.clip();

          indicatorEngine.renderPanel(c, panel.instanceId, panel.viewport);

          c.restore();

          c.restore();
        }
      }
    }

    if (dirtyLayers.has(LayerType.Overlay) && this.overlayLayer) {
      this.overlayLayer.clear();
      const c = this.overlayLayer.ctx;

      // Price limit lines (ceiling/floor/reference)
      if (ctx.priceLimits) {
        this.renderPriceLimits(c, viewport, theme, ctx.priceLimits);
      }

      ctx.drawingRenderer?.render(c, viewport);
      ctx.tradingRenderer?.render(c, viewport, theme);
      ctx.crosshairHandler?.render(c, viewport, theme);

      // Panel crosshair — draw crosshair lines in the hovered panel
      const cursorPos = ctx.crosshairHandler?.getPosition();
      if (cursorPos && ctx.panels.length > 0) {
        for (const panel of ctx.panels) {
          const pr = panel.rect;
          if (cursorPos.x >= pr.x && cursorPos.x <= pr.x + pr.width &&
              cursorPos.y >= pr.y && cursorPos.y <= pr.y + pr.height) {
            const pv = panel.viewport;
            // Vertical line (synced with main chart bar snapping)
            let cx = cursorPos.x;
            const barIdx = xToBarIndex(cx, pv);
            const snappedIdx = Math.max(0, Math.min((ctx.data?.length ?? 1) - 1, Math.round(barIdx)));
            cx = barIndexToX(snappedIdx, pv);

            c.save();
            c.beginPath();
            c.rect(pr.x, pr.y, pr.width, pr.height);
            c.clip();

            c.setLineDash([4, 4]);
            c.strokeStyle = theme.crosshair;
            c.lineWidth = 1;

            // Vertical
            c.beginPath();
            c.moveTo(Math.round(cx) + 0.5, pr.y);
            c.lineTo(Math.round(cx) + 0.5, pr.y + pr.height);
            c.stroke();

            // Horizontal
            c.beginPath();
            c.moveTo(pr.x, Math.round(cursorPos.y) + 0.5);
            c.lineTo(pr.x + pr.width, Math.round(cursorPos.y) + 0.5);
            c.stroke();

            c.setLineDash([]);
            c.restore();
            break;
          }
        }
      }
    }

    if (dirtyLayers.has(LayerType.UI) && this.uiLayer) {
      this.uiLayer.clear();
      const c = this.uiLayer.ctx;
      ctx.priceAxis?.render(c, viewport, theme);
      ctx.currentPriceLine?.render(c, viewport, theme);
      ctx.timeAxis?.render(c, viewport, theme, data, ctx.timeAxisY);
      ctx.chartLegend?.render(c, viewport, theme, data);
      ctx.barCountdown?.render(c, viewport, theme, data);

      // Panel Y-axis + crosshair value label + header values
      if (ctx.panels.length > 0) {
        const cursorPos2 = ctx.crosshairHandler?.getPosition();
        const indicatorEngine2 = ctx.indicatorEngine;
        const panelFont = `${theme.font.sizeSmall}px ${theme.font.family}`;

        // Build descriptor lookup once for UI layer panels
        let uiDescMap: Map<string, { instanceId: string; descriptor: any }> | undefined;
        if (indicatorEngine2) {
          const descs = indicatorEngine2.getPanelIndicators();
          uiDescMap = new Map();
          for (const d of descs) uiDescMap.set(d.instanceId, d);
        }

        for (const panel of ctx.panels) {
          const pv = panel.viewport;
          const pr = panel.rect;
          const { min, max } = pv.priceRange;
          const range = max - min;
          if (range <= 0 || pr.height <= 0) continue;

          const axisX = pr.x + pr.width;
          const insetRect = pv.chartRect; // already inset by header

          // --- Panel Y-axis ---
          // Axis line
          c.strokeStyle = theme.axisLine;
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(axisX + 0.5, pr.y);
          c.lineTo(axisX + 0.5, pr.y + pr.height);
          c.stroke();

          // Value labels
          const step = computeTickStep(min, max, 4);
          const firstVal = Math.ceil(min / step) * step;
          const precision = step < 1 ? Math.ceil(-Math.log10(step)) + 1 : step < 10 ? 1 : 0;

          c.font = panelFont;
          c.textBaseline = 'middle';
          c.textAlign = 'left';

          for (let val = firstVal; val <= max; val += step) {
            const y = priceToY(val, pv);
            if (y < insetRect.y || y > insetRect.y + insetRect.height) continue;
            // Tick mark
            c.strokeStyle = theme.axisLine;
            c.beginPath();
            c.moveTo(axisX, Math.round(y) + 0.5);
            c.lineTo(axisX + 4, Math.round(y) + 0.5);
            c.stroke();
            // Label
            c.fillStyle = theme.axisLabel;
            c.fillText(formatPrice(val, precision), axisX + 6, y);
          }

          // --- Crosshair value badge on panel Y-axis ---
          if (cursorPos2 &&
              cursorPos2.x >= pr.x && cursorPos2.x <= pr.x + pr.width &&
              cursorPos2.y >= pr.y && cursorPos2.y <= pr.y + pr.height) {
            const hoverVal = yToPrice(cursorPos2.y, pv);
            const valText = formatPrice(hoverVal, precision);
            c.font = `bold ${theme.font.sizeSmall}px ${theme.font.family}`;
            const tw = c.measureText(valText).width;
            const badgeW = Math.min(tw + 10, PRICE_AXIS_WIDTH - 2);

            c.fillStyle = theme.crosshair;
            c.fillRect(axisX + 1, cursorPos2.y - 9, badgeW, 18);
            c.fillStyle = theme.background;
            c.textBaseline = 'middle';
            c.textAlign = 'left';
            c.fillText(valText, axisX + 5, cursorPos2.y);
          }

          // --- Indicator values at crosshair bar in panel header ---
          if (cursorPos2 && indicatorEngine2) {
            const barIdx = xToBarIndex(cursorPos2.x, pv);
            const snappedIdx = Math.max(0, Math.min((data?.length ?? 1) - 1, Math.round(barIdx)));
            const output = indicatorEngine2.getOutput(panel.instanceId);
            if (output?.series && snappedIdx < output.series.length) {
              const val = output.series[snappedIdx];
              if (val) {
                const parts: string[] = [];
                for (const key in val) {
                  const v = val[key];
                  if (v !== undefined) parts.push(`${key}: ${v.toFixed(precision)}`);
                }
                if (parts.length > 0) {
                  const desc = uiDescMap?.get(panel.instanceId);
                  const nameWidth = desc ? c.measureText(desc.descriptor.name).width + 14 : 10;
                  c.font = panelFont;
                  c.fillStyle = theme.textSecondary;
                  c.textBaseline = 'top';
                  c.textAlign = 'left';
                  c.fillText(parts.join('  '), pr.x + nameWidth, pr.y + 6);
                }
              }
            }
          }
        }
      }
    }
  }

  private renderPriceLimits(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    limits: NonNullable<RenderContext['priceLimits']>,
  ): void {
    const { chartRect } = viewport;
    const lines = [
      { price: limits.ceiling, color: limits.colors?.ceiling ?? '#FF00FF', label: 'CE' },
      { price: limits.floor, color: limits.colors?.floor ?? '#00FFFF', label: 'FL' },
      { price: limits.reference, color: limits.colors?.reference ?? '#FFD700', label: 'REF' },
    ];

    const boldFont = `bold 9px ${theme.font.family}`;
    const normalFont = `10px ${theme.font.family}`;

    for (const { price, color, label } of lines) {
      const y = priceToY(price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;

      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.font = boldFont;
      ctx.fillStyle = color;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} ${price.toFixed(2)}`, chartRect.x + 4, y - 2);

      // Axis badge
      const axisX = chartRect.x + chartRect.width + 1;
      ctx.fillStyle = color;
      ctx.fillRect(axisX, y - 7, PRICE_AXIS_WIDTH - 2, 14);
      ctx.fillStyle = '#000';
      ctx.font = normalFont;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), axisX + 4, y);
    }
  }

  destroy(): void {
    this.renderLoop.stop();
    this.dprManager.destroy();
    this.layerManager.destroy();
  }
}

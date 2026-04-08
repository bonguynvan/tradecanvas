import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';

export interface CompareSymbol {
  id: string;
  label: string;
  data: DataSeries;
  color: string;
  lineWidth?: number;
  visible: boolean;
}

/**
 * Renders comparison overlays on the main chart.
 * Each compare symbol is normalized to percentage change from the first visible bar,
 * then mapped onto the main chart's price axis.
 */
export class CompareRenderer {
  private symbols = new Map<string, CompareSymbol>();
  private mode: 'percent' | 'absolute' = 'percent';

  setMode(mode: 'percent' | 'absolute'): void {
    this.mode = mode;
  }

  addSymbol(symbol: CompareSymbol): void {
    this.symbols.set(symbol.id, symbol);
  }

  removeSymbol(id: string): void {
    this.symbols.delete(id);
  }

  setSymbolData(id: string, data: DataSeries): void {
    const sym = this.symbols.get(id);
    if (sym) sym.data = data;
  }

  setSymbolVisible(id: string, visible: boolean): void {
    const sym = this.symbols.get(id);
    if (sym) sym.visible = visible;
  }

  getSymbols(): CompareSymbol[] {
    return Array.from(this.symbols.values());
  }

  clear(): void {
    this.symbols.clear();
  }

  render(
    ctx: CanvasRenderingContext2D,
    mainData: DataSeries,
    viewport: ViewportState,
    theme: Theme,
  ): void {
    if (this.symbols.size === 0 || mainData.length === 0) return;

    const { chartRect } = viewport;

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();

    for (const sym of this.symbols.values()) {
      if (!sym.visible || sym.data.length === 0) continue;
      this.renderSymbol(ctx, sym, mainData, viewport, theme);
    }

    ctx.restore();
  }

  private renderSymbol(
    ctx: CanvasRenderingContext2D,
    sym: CompareSymbol,
    mainData: DataSeries,
    viewport: ViewportState,
    _theme: Theme,
  ): void {
    const { chartRect } = viewport;

    // Find the first visible bar index for the main data
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const firstVisibleIdx = Math.max(0, Math.floor(viewport.offset / barUnit));

    if (firstVisibleIdx >= mainData.length || firstVisibleIdx >= sym.data.length) return;

    const mainBase = mainData[firstVisibleIdx].close;
    const symBase = sym.data[firstVisibleIdx].close;

    if (mainBase === 0 || symBase === 0) return;

    ctx.strokeStyle = sym.color;
    ctx.lineWidth = sym.lineWidth ?? 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let started = false;
    const lastIdx = Math.min(mainData.length, sym.data.length);

    for (let i = firstVisibleIdx; i < lastIdx; i++) {
      const x = barIndexToX(i, viewport);
      if (x < chartRect.x - barUnit) continue;
      if (x > chartRect.x + chartRect.width + barUnit) break;

      let y: number;
      if (this.mode === 'percent') {
        // Percentage change from base, mapped to main chart's price scale
        const pctChange = (sym.data[i].close - symBase) / symBase;
        const mappedPrice = mainBase * (1 + pctChange);
        y = priceToY(mappedPrice, viewport);
      } else {
        y = priceToY(sym.data[i].close, viewport);
      }

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw label
    if (started) {
      const labelIdx = Math.min(firstVisibleIdx + 2, lastIdx - 1);
      const labelX = barIndexToX(labelIdx, viewport) + 4;
      let labelY: number;
      if (this.mode === 'percent') {
        const pct = (sym.data[labelIdx].close - symBase) / symBase;
        labelY = priceToY(mainBase * (1 + pct), viewport) - 4;
      } else {
        labelY = priceToY(sym.data[labelIdx].close, viewport) - 4;
      }
      ctx.fillStyle = sym.color;
      ctx.font = `bold 10px sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(sym.label, labelX, labelY);
    }
  }
}

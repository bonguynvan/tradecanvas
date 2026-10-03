import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';
import { SymbolSeriesStore } from '../indicators/symbols/SymbolSeriesStore.js';

export interface CompareSymbol {
  id: string;
  label: string;
  data: DataSeries;
  color: string;
  lineWidth?: number;
  visible: boolean;
}

/**
 * Renders comparison overlays on the main chart. Each compare series is
 * lined up with the main bars by time (its bar at or before each one), and
 * in percent mode rebased on the first main bar on screen it has a value
 * for, then mapped onto the main chart's price axis.
 */
export class CompareRenderer {
  private symbols = new Map<string, CompareSymbol>();
  private mode: 'percent' | 'absolute' = 'percent';
  private store = new SymbolSeriesStore();
  /** Each series' closes on the main bars, for the main series it was worked out for. */
  private aligned = new Map<string, { main: DataSeries; data: DataSeries; length: number; lastTime: number; closes: Float64Array }>();

  setMode(mode: 'percent' | 'absolute'): void {
    this.mode = mode;
  }

  getMode(): 'percent' | 'absolute' {
    return this.mode;
  }

  addSymbol(symbol: CompareSymbol): void {
    this.symbols.set(symbol.id, symbol);
    this.store.set(symbol.id, symbol.data);
    this.aligned.delete(symbol.id);
  }

  removeSymbol(id: string): void {
    this.symbols.delete(id);
    this.store.set(id, null);
    this.aligned.delete(id);
  }

  setSymbolData(id: string, data: DataSeries): void {
    const sym = this.symbols.get(id);
    if (!sym) return;
    sym.data = data;
    this.store.set(id, data);
    this.aligned.delete(id);
  }

  setSymbolVisible(id: string, visible: boolean): void {
    const sym = this.symbols.get(id);
    if (sym) sym.visible = visible;
  }

  getSymbols(): CompareSymbol[] {
    return Array.from(this.symbols.values());
  }

  clear(): void {
    for (const id of this.symbols.keys()) this.store.set(id, null);
    this.symbols.clear();
    this.aligned.clear();
  }

  /**
   * The prices the visible compare lines reach on the main scale (rebased in
   * percent mode), for the auto scale; null with none on screen.
   */
  getPriceRange(mainData: DataSeries, viewport: ViewportState): { min: number; max: number } | null {
    let min = Infinity;
    let max = -Infinity;
    for (const sym of this.symbols.values()) {
      if (!sym.visible || sym.data.length === 0) continue;
      const line = this.line(sym, mainData, viewport);
      if (!line) continue;
      for (let i = line.from; i <= line.to; i++) {
        const price = line.priceAt(i);
        if (price === null) continue;
        if (price < min) min = price;
        if (price > max) max = price;
      }
    }
    return min <= max ? { min, max } : null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    mainData: DataSeries,
    viewport: ViewportState,
    _theme: Theme,
  ): void {
    if (this.symbols.size === 0 || mainData.length === 0) return;

    const { chartRect } = viewport;

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();

    for (const sym of this.symbols.values()) {
      if (!sym.visible || sym.data.length === 0) continue;
      this.renderSymbol(ctx, sym, mainData, viewport);
    }

    ctx.restore();
  }

  /** `sym`'s closes on the bars of `main` (NaN where it has none). */
  private closesOn(sym: CompareSymbol, main: DataSeries): Float64Array {
    // The main series may be the same array grown by a bar, or its last bar replaced.
    const lastTime = main.length > 0 ? main[main.length - 1].time : Number.NaN;
    const cached = this.aligned.get(sym.id);
    if (cached && cached.main === main && cached.data === sym.data && cached.length === main.length && cached.lastTime === lastTime) {
      return cached.closes;
    }
    const closes = new Float64Array(main.length);
    for (let i = 0; i < main.length; i++) closes[i] = this.store.closeAt(sym.id, main[i].time) ?? Number.NaN;
    this.aligned.set(sym.id, { main, data: sym.data, length: main.length, lastTime, closes });
    return closes;
  }

  /** The visible stretch of `sym`'s line and its price at each main bar there. */
  private line(sym: CompareSymbol, mainData: DataSeries, viewport: ViewportState):
    { from: number; to: number; priceAt: (i: number) => number | null } | null {
    const closes = this.closesOn(sym, mainData);
    const from = Math.max(0, viewport.visibleRange.from);
    const to = Math.min(mainData.length - 1, viewport.visibleRange.to);
    let base = -1;
    for (let i = from; i <= to; i++) {
      if (Number.isFinite(closes[i]) && closes[i] !== 0 && mainData[i].close !== 0) { base = i; break; }
    }
    if (base < 0) return null;
    const mainBase = mainData[base].close;
    const symBase = closes[base];
    const percent = this.mode === 'percent';
    return {
      from: base,
      to,
      priceAt: (i) => {
        const c = closes[i];
        if (!Number.isFinite(c)) return null;
        return percent ? mainBase * (c / symBase) : c;
      },
    };
  }

  private renderSymbol(
    ctx: CanvasRenderingContext2D,
    sym: CompareSymbol,
    mainData: DataSeries,
    viewport: ViewportState,
  ): void {
    const line = this.line(sym, mainData, viewport);
    if (!line) return;

    ctx.strokeStyle = sym.color;
    ctx.lineWidth = sym.lineWidth ?? 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let drawn = 0;
    let label: { x: number; y: number } | null = null;
    for (let i = line.from; i <= line.to; i++) {
      const price = line.priceAt(i);
      if (price === null) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(price, viewport);
      if (drawn === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (drawn === 2 || (drawn === 0 && label === null)) label = { x: x + 4, y: y - 4 };
      drawn++;
    }
    ctx.stroke();

    if (label) {
      ctx.fillStyle = sym.color;
      ctx.font = `bold 10px sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(sym.label, label.x, label.y);
    }
  }
}

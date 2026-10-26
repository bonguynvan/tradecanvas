import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { barTimeUnit } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';
import { SymbolSeriesStore } from '../indicators/symbols/SymbolSeriesStore.js';

/** Between a line's end and its label (px). */
const LABEL_GAP = 4;
/** A label's text: its size (px), and the chip of the chart's ground around it. */
const LABEL_FONT_PX = 10;
const LABEL_PAD_X = 3;
const LABEL_HEIGHT = 14;
/** How strongly the chip covers what is under it: the line stays faintly seen through it. */
const CHIP_ALPHA = 0.85;
/** A label tried this many heights above and below its line's end before it settles where it first went. */
const LABEL_TRIES = 4;
/** An alert's label sits this far above its line, at the plot's right edge, as AlertManager draws it. */
const ALERT_LABEL_GAP = 2;

/** A label's box on the plot, px. */
interface LabelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const overlaps = (a: LabelBox, b: LabelBox): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

export interface CompareSymbol {
  id: string;
  label: string;
  data: DataSeries;
  color: string;
  lineWidth?: number;
  visible: boolean;
}

/** A compare's values at one main bar, for a legend. */
export interface CompareValue {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  /** Its close at or before the bar; past its last bar, its last close. Null before its first bar. */
  close: number | null;
  /**
   * Its change in percent since the first bar on screen it has a close for:
   * what its line reads on a percent price scale. Null without a close.
   */
  change: number | null;
  /** The bar is past the compare's last bar: `close` is its last close, not one at this bar. */
  stale: boolean;
}

/**
 * Renders comparison overlays on the main chart. Each compare series is
 * lined up with the main bars by time (its bar at or before each one). In
 * percent mode each line starts at the main close of the first bar on
 * screen, the baseline the percent scale reads 0% at, from its own first
 * bar on screen: a symbol whose bars begin later starts at 0% there too, so
 * on a percent scale every line reads its own change. Then it is mapped onto
 * the main chart's price axis.
 */
export class CompareRenderer {
  private symbols = new Map<string, CompareSymbol>();
  private mode: 'percent' | 'absolute' = 'percent';
  private store = new SymbolSeriesStore();
  /** Each series' closes on the main bars, for the main series it was worked out for. */
  private aligned = new Map<string, { main: DataSeries; data: DataSeries; length: number; lastTime: number; closes: Float64Array }>();
  /** The prices of the lines whose labels sit at the plot's right edge (price alerts): see `setReservedLevels`. */
  private reservedLevels: () => readonly number[] = () => [];

  /**
   * The prices of lines labelled at the plot's right edge, just above the
   * line (a price alert's): each compare's label keeps clear of them, as it
   * does of the other compares' labels.
   */
  setReservedLevels(levels: () => readonly number[]): void {
    this.reservedLevels = levels;
  }

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
    theme: Theme,
  ): void {
    if (this.symbols.size === 0 || mainData.length === 0) return;

    const { chartRect } = viewport;

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();

    // The lines first, then their labels over all of them.
    const ends: { sym: CompareSymbol; x: number; y: number }[] = [];
    for (const sym of this.symbols.values()) {
      if (!sym.visible || sym.data.length === 0) continue;
      const end = this.renderSymbol(ctx, sym, mainData, viewport);
      if (end) ends.push({ sym, ...end });
    }
    this.renderLabels(ctx, ends, viewport, theme);

    ctx.restore();
  }

  /**
   * Each line's label at its end, where the lines part (in percent mode they
   * all start at the same point, and labels there would stack), on a chip of
   * the chart's ground, clear of an alert's label and of the labels placed
   * before it: tried above the end, then below, then further out.
   */
  private renderLabels(ctx: CanvasRenderingContext2D, ends: readonly { sym: CompareSymbol; x: number; y: number }[], viewport: ViewportState, theme: Theme): void {
    if (ends.length === 0) return;
    ctx.font = `bold ${LABEL_FONT_PX}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    const taken = this.reservedBoxes(viewport);
    for (const { sym, x, y } of ends) {
      const width = ctx.measureText(sym.label).width + 2 * LABEL_PAD_X;
      const box = this.placeLabel(x - LABEL_GAP, y, width, taken);
      taken.push(box);
      ctx.globalAlpha = CHIP_ALPHA;
      ctx.fillStyle = theme.background;
      ctx.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
      ctx.globalAlpha = 1;
      ctx.fillStyle = sym.color;
      ctx.fillText(sym.label, box.right - LABEL_PAD_X, (box.top + box.bottom) / 2);
    }
  }

  /** The first free box `width` wide ending at `right`, by its line's end at `y`: above it, below it, then further out. */
  private placeLabel(right: number, y: number, width: number, taken: readonly LabelBox[]): LabelBox {
    const at = (top: number): LabelBox => ({ left: right - width, top, right, bottom: top + LABEL_HEIGHT });
    const above = y - LABEL_GAP - LABEL_HEIGHT;
    const below = y + LABEL_GAP;
    for (let step = 0; step < LABEL_TRIES; step++) {
      for (const box of [at(above - step * LABEL_HEIGHT), at(below + step * LABEL_HEIGHT)]) {
        if (!taken.some((t) => overlaps(t, box))) return box;
      }
    }
    return at(above);
  }

  /** Where the alerts' labels sit: a band just above each line, across the plot (their text runs left from its right edge). */
  private reservedBoxes(viewport: ViewportState): LabelBox[] {
    const { chartRect } = viewport;
    return this.reservedLevels().map((price) => {
      const bottom = priceToY(price, viewport) - ALERT_LABEL_GAP;
      return { left: chartRect.x, top: bottom - LABEL_HEIGHT, right: chartRect.x + chartRect.width, bottom };
    });
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
    const unit = barTimeUnit(main);
    for (let i = 0; i < main.length; i++) closes[i] = this.store.closeAt(sym.id, main[i].time, unit) ?? Number.NaN;
    this.aligned.set(sym.id, { main, data: sym.data, length: main.length, lastTime, closes });
    return closes;
  }

  /**
   * Where `sym`'s line starts on screen: its first bar there with a close
   * (`base`), its close then, and the main price it starts at in percent
   * mode, the percent scale's baseline (the first main close on screen).
   */
  private anchor(sym: CompareSymbol, mainData: DataSeries, viewport: ViewportState):
    { closes: Float64Array; base: number; to: number; mainBase: number; symBase: number } | null {
    const closes = this.closesOn(sym, mainData);
    const from = Math.max(0, viewport.visibleRange.from);
    const to = Math.min(mainData.length - 1, viewport.visibleRange.to);
    let base = -1;
    for (let i = from; i <= to; i++) {
      if (Number.isFinite(closes[i]) && closes[i] !== 0 && mainData[i].close !== 0) { base = i; break; }
    }
    if (base < 0) return null;
    const mainBase = viewport.scaleBaseline || mainData[from]?.close || mainData[base].close;
    return { closes, base, to, mainBase, symBase: closes[base] };
  }

  /** The visible stretch of `sym`'s line and its price at each main bar there. */
  private line(sym: CompareSymbol, mainData: DataSeries, viewport: ViewportState):
    { from: number; to: number; priceAt: (i: number) => number | null } | null {
    const anchor = this.anchor(sym, mainData, viewport);
    if (!anchor) return null;
    const { closes, mainBase, symBase } = anchor;
    const percent = this.mode === 'percent';
    return {
      from: anchor.base,
      to: anchor.to,
      priceAt: (i) => {
        const c = closes[i];
        if (!Number.isFinite(c)) return null;
        return percent ? mainBase * (c / symBase) : c;
      },
    };
  }

  /**
   * Each compare's close at main bar `index` and its change since its line's
   * start on screen, rebased as the line is, so a legend reads what the
   * percent scale does. Past a compare's last bar it gives its last close,
   * `stale`. Without a viewport (no line on screen to read it off) the
   * change is null.
   */
  valuesAt(mainData: DataSeries, viewport: ViewportState | null, index: number): CompareValue[] {
    const time = mainData[index]?.time;
    const unit = barTimeUnit(mainData);
    return this.getSymbols().map((sym) => {
      const at = time === undefined ? undefined : this.store.lastCloseAt(sym.id, time, unit);
      const symBase = at && viewport ? this.anchor(sym, mainData, viewport)?.symBase : undefined;
      const close = at?.close ?? null;
      return {
        id: sym.id,
        label: sym.label,
        color: sym.color,
        visible: sym.visible,
        close,
        change: close !== null && symBase ? (close / symBase - 1) * 100 : null,
        stale: at?.stale ?? false,
      };
    });
  }

  /** Draw `sym`'s line; where it ends on screen, or null when it has no point there. */
  private renderSymbol(
    ctx: CanvasRenderingContext2D,
    sym: CompareSymbol,
    mainData: DataSeries,
    viewport: ViewportState,
  ): { x: number; y: number } | null {
    const line = this.line(sym, mainData, viewport);
    if (!line) return null;

    ctx.strokeStyle = sym.color;
    ctx.lineWidth = sym.lineWidth ?? 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let drawn = 0;
    let end: { x: number; y: number } | null = null;
    for (let i = line.from; i <= line.to; i++) {
      const price = line.priceAt(i);
      if (price === null) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(price, viewport);
      if (drawn === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      end = { x, y };
      drawn++;
    }
    ctx.stroke();
    return end;
  }
}

import type { IndicatorMarkerShape } from '@tradecanvas/commons';
import { colorColumn, flagColumn, floatColumn, type Column } from './Column.js';
import type { HlineOptions, PlotHandle, PlotOptions, ScriptPlotKind, ShapeHandle, ShapeOptions } from './defineScript.js';
import type { Scope } from './scope.js';

export interface PlotDeclaration {
  readonly title: string;
  readonly kind: ScriptPlotKind;
  readonly color?: string;
  readonly width?: number;
}

export interface ShapeDeclaration {
  readonly title: string;
  readonly shape: IndicatorMarkerShape;
  readonly position: 'aboveBar' | 'belowBar';
  readonly color?: string;
}

export interface LevelDeclaration {
  readonly price: number;
  readonly color?: string;
  readonly title?: string;
}

/** What a script draws, known once its setup has run. */
export interface ScriptDeclarations {
  readonly overlay: boolean;
  readonly plots: readonly PlotDeclaration[];
  readonly shapes: readonly ShapeDeclaration[];
  readonly levels: readonly LevelDeclaration[];
}

/** A plot's values, a bar each, and the colour each bar was given. */
export interface PlotOutput extends PlotDeclaration {
  readonly values: Float64Array;
  /** Each bar's colour: 0 for the plot's own, else 1 + its place in `palette`. */
  readonly colors: Uint16Array;
}

export interface ShapeOutput extends ShapeDeclaration {
  /** 1 on the bars it marks. */
  readonly on: Uint8Array;
}

export interface ScriptError {
  /** The bar it stopped at. */
  readonly bar: number;
  readonly message: string;
}

/** What a run has drawn so far, a value a bar, without copying. */
export interface ScriptOutput {
  readonly length: number;
  readonly plots: readonly PlotOutput[];
  readonly shapes: readonly ShapeOutput[];
  readonly levels: readonly LevelDeclaration[];
  /** The colours bars were given, each once. */
  readonly palette: readonly string[];
  readonly errors: readonly ScriptError[];
}

/** The most colours a script's bars take: each bar keeps its colour's place in 16 bits, 0 for none. */
const MAX_COLORS = 65535;

interface PlotSlot {
  declaration: PlotDeclaration;
  values: Column<Float64Array>;
  colors: Column<Uint16Array>;
}

interface ShapeSlot {
  declaration: ShapeDeclaration;
  on: Column<Uint8Array>;
}

/** The plots, marks and levels a script declares, and what its bars set in them. */
export class Outputs {
  private readonly plots: PlotSlot[] = [];
  private readonly shapes: ShapeSlot[] = [];
  private readonly levels: LevelDeclaration[] = [];
  private readonly palette: string[] = [];
  private readonly paletteIndex = new Map<string, number>();
  private open = true;

  constructor(private readonly scope: Scope) {
    scope.clearers.push((bar) => {
      for (const plot of this.plots) {
        plot.values.set(bar, Number.NaN);
        plot.colors.set(bar, 0);
      }
      for (const shape of this.shapes) shape.on.set(bar, 0);
    });
  }

  /** No more plots, marks or levels: the setup is over. */
  close(): void {
    this.open = false;
  }

  private declaring(what: string): void {
    if (!this.open) throw new Error(`${what} is declared in the script's setup, not on a bar`);
  }

  private colorIndex(color: string): number {
    let index = this.paletteIndex.get(color);
    if (index === undefined) {
      if (this.palette.length >= MAX_COLORS) throw new Error(`a script gives its bars at most ${MAX_COLORS} colours`);
      this.palette.push(color);
      index = this.palette.length;
      this.paletteIndex.set(color, index);
    }
    return index;
  }

  plot(title: string, options: PlotOptions = {}): PlotHandle {
    this.declaring('plot');
    const slot: PlotSlot = {
      declaration: { title, kind: options.kind ?? 'line', ...(options.color ? { color: options.color } : {}), ...(options.width ? { width: options.width } : {}) },
      values: floatColumn(),
      colors: colorColumn(),
    };
    this.plots.push(slot);
    return {
      set: (value, color) => {
        slot.values.set(this.scope.bar, Number.isFinite(value) ? value : Number.NaN);
        if (color !== undefined) slot.colors.set(this.scope.bar, this.colorIndex(color));
        return value;
      },
    };
  }

  shape(title: string, options: ShapeOptions = {}): ShapeHandle {
    this.declaring('shape');
    const slot: ShapeSlot = {
      declaration: { title, shape: options.shape ?? 'triangleUp', position: options.position ?? 'belowBar', ...(options.color ? { color: options.color } : {}) },
      on: flagColumn(),
    };
    this.shapes.push(slot);
    return {
      set: (on) => {
        slot.on.set(this.scope.bar, on ? 1 : 0);
        return on;
      },
    };
  }

  hline(price: number, options: HlineOptions = {}): void {
    this.declaring('hline');
    this.levels.push({ price, ...options });
  }

  declarations(overlay: boolean): ScriptDeclarations {
    return {
      overlay,
      plots: this.plots.map((p) => p.declaration),
      shapes: this.shapes.map((s) => s.declaration),
      levels: [...this.levels],
    };
  }

  output(length: number, errors: readonly ScriptError[]): ScriptOutput {
    return {
      length,
      plots: this.plots.map((p) => ({ ...p.declaration, values: p.values.view(length), colors: p.colors.view(length) })),
      shapes: this.shapes.map((s) => ({ ...s.declaration, on: s.on.view(length) })),
      levels: [...this.levels],
      palette: [...this.palette],
      errors: [...errors],
    };
  }
}

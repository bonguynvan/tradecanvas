import type { IndicatorDrawing, IndicatorMarkerShape } from '@tradecanvas/commons';
import type { ScriptDrawings } from './drawings.js';
import { colorColumn, flagColumn, floatColumn, type Column } from './Column.js';
import type {
  BackgroundHandle,
  BackgroundOptions,
  FillHandle,
  FillOptions,
  HlineOptions,
  PlotHandle,
  PlotOptions,
  ScriptPlotKind,
  ShapeHandle,
  ShapeOptions,
  ShapePosition,
} from './defineScript.js';
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
  readonly position: ShapePosition;
  readonly color?: string;
}

export interface LevelDeclaration {
  readonly price: number;
  readonly color?: string;
  readonly title?: string;
}

export interface FillDeclaration {
  /** The two plots it shades between, by their place among the plots. */
  readonly between: readonly [number, number];
  readonly color?: string;
}

export interface BackgroundDeclaration {
  readonly title: string;
}

/** What a script draws, known once its setup has run. */
export interface ScriptDeclarations {
  readonly overlay: boolean;
  readonly plots: readonly PlotDeclaration[];
  readonly shapes: readonly ShapeDeclaration[];
  readonly levels: readonly LevelDeclaration[];
  readonly fills: readonly FillDeclaration[];
  readonly backgrounds: readonly BackgroundDeclaration[];
}

/** A colour a bar, by its place in the output's `palette` plus one: 0 for none. */
export type BarColors = Uint16Array;

/** A plot's values, a bar each, and the colour each bar was given. */
export interface PlotOutput extends PlotDeclaration {
  readonly values: Float64Array;
  /** Each bar's colour: 0 for the plot's own. */
  readonly colors: BarColors;
}

export interface ShapeOutput extends ShapeDeclaration {
  /** 1 on the bars it marks. */
  readonly on: Uint8Array;
}

export interface FillOutput extends FillDeclaration {
  /** Each bar's colour: 0 for the fill's own. */
  readonly colors: BarColors;
}

export interface BackgroundOutput extends BackgroundDeclaration {
  /** Each bar's colour: 0 for no background there. */
  readonly colors: BarColors;
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
  readonly fills: readonly FillOutput[];
  readonly backgrounds: readonly BackgroundOutput[];
  /** The colours bars were given, each once. */
  readonly palette: readonly string[];
  /** The labels, lines and boxes it keeps, in the order made. */
  readonly drawings: readonly IndicatorDrawing[];
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

interface ColorSlot<D> {
  declaration: D;
  colors: Column<Uint16Array>;
}

/** The plots, marks, fills, backgrounds and levels a script declares, and what its bars set in them. */
export class Outputs {
  private readonly plots: PlotSlot[] = [];
  private readonly handles = new Map<PlotHandle, number>();
  private readonly shapes: ShapeSlot[] = [];
  private readonly fills: ColorSlot<FillDeclaration>[] = [];
  private readonly backgrounds: ColorSlot<BackgroundDeclaration>[] = [];
  private readonly levels: LevelDeclaration[] = [];
  private readonly drawingLists: ScriptDrawings[] = [];
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
      for (const fill of this.fills) fill.colors.set(bar, 0);
      for (const background of this.backgrounds) background.colors.set(bar, 0);
    });
  }

  /** No more plots, marks or levels: the setup is over. */
  close(): void {
    this.open = false;
  }

  private declaring(what: string): void {
    if (!this.open) throw new Error(`${what} is declared in the script's setup, not on a bar`);
  }

  /** A colour's place in the palette plus one. */
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
    const handle: PlotHandle = {
      set: (value, color) => {
        slot.values.set(this.scope.bar, Number.isFinite(value) ? value : Number.NaN);
        if (color !== undefined) slot.colors.set(this.scope.bar, this.colorIndex(color));
        return value;
      },
    };
    this.handles.set(handle, this.plots.length - 1);
    return handle;
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

  fill(a: PlotHandle, b: PlotHandle, options: FillOptions = {}): FillHandle {
    this.declaring('fill');
    const first = this.handles.get(a);
    const second = this.handles.get(b);
    if (first === undefined || second === undefined) throw new Error('fill is between two plots of the same script');
    const slot: ColorSlot<FillDeclaration> = {
      declaration: { between: [first, second], ...(options.color ? { color: options.color } : {}) },
      colors: colorColumn(),
    };
    this.fills.push(slot);
    return {
      set: (color) => {
        slot.colors.set(this.scope.bar, color === undefined ? 0 : this.colorIndex(color));
      },
    };
  }

  bgcolor(options: BackgroundOptions = {}): BackgroundHandle {
    this.declaring('bgcolor');
    const slot: ColorSlot<BackgroundDeclaration> = { declaration: { title: options.title ?? 'Background' }, colors: colorColumn() };
    this.backgrounds.push(slot);
    return {
      set: (color) => {
        slot.colors.set(this.scope.bar, color === undefined ? 0 : this.colorIndex(color));
      },
    };
  }

  /** Shapes the script draws, listed with its output. */
  addDrawings(list: ScriptDrawings): ScriptDrawings {
    this.drawingLists.push(list);
    return list;
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
      fills: this.fills.map((f) => f.declaration),
      backgrounds: this.backgrounds.map((b) => b.declaration),
    };
  }

  output(length: number, errors: readonly ScriptError[]): ScriptOutput {
    return {
      length,
      plots: this.plots.map((p) => ({ ...p.declaration, values: p.values.view(length), colors: p.colors.view(length) })),
      shapes: this.shapes.map((s) => ({ ...s.declaration, on: s.on.view(length) })),
      levels: [...this.levels],
      fills: this.fills.map((f) => ({ ...f.declaration, colors: f.colors.view(length) })),
      backgrounds: this.backgrounds.map((b) => ({ ...b.declaration, colors: b.colors.view(length) })),
      palette: [...this.palette],
      drawings: this.drawingLists.flatMap((list) => list.list()),
      errors: [...errors],
    };
  }
}

import type {
  IndicatorBoxDrawing,
  IndicatorDrawing,
  IndicatorLabelDrawing,
  IndicatorLineDrawing,
  IndicatorPoint,
} from '@tradecanvas/commons';
import type { Scope } from './scope.js';

export type LabelProps = Omit<IndicatorLabelDrawing, 'kind'>;
export type LineProps = Omit<IndicatorLineDrawing, 'kind'>;
export type BoxProps = Omit<IndicatorBoxDrawing, 'kind'>;

/** A shape a script drew: changed or taken away on a later bar. */
export interface DrawingHandle<P> {
  /** Change some of it; a shape taken away (by the script, or as the oldest past the limit) is left as it is. */
  set(changes: Partial<P>): void;
  /** Take it away. */
  remove(): void;
}

/** The most of each kind a script keeps; past it, the oldest goes. */
export interface DrawingLimits {
  /** Labels kept: default 50, at most 500. */
  maxLabels?: number;
  /** Lines kept: default 50, at most 500. */
  maxLines?: number;
  /** Boxes kept: default 50, at most 500. */
  maxBoxes?: number;
}

type Kind = IndicatorDrawing['kind'];

/** The most a script keeps of a kind unless it says otherwise, and the most it may ask for. */
const DEFAULT_MAX = 50;
const MOST = 500;

/** A limit as asked, within 1 and the most; none asked (or not a number): the default. */
const limitOf = (asked: number | undefined) =>
  asked === undefined || Number.isNaN(asked) ? DEFAULT_MAX : Math.min(MOST, Math.max(1, Math.floor(asked)));

/** Whether a point is a bar and a value: a script in plain JS may give anything. */
const isPoint = (p: unknown): p is IndicatorPoint =>
  !!p && typeof (p as IndicatorPoint).bar === 'number' && typeof (p as IndicatorPoint).value === 'number';

/** The points a kind needs, by the field each is under. */
const POINTS: Record<Kind, readonly ('at' | 'from' | 'to')[]> = { label: ['at'], line: ['from', 'to'], box: ['from', 'to'] };

/** Throws, for the script's error, when a shape lacks a point it needs. */
function checked<D extends IndicatorDrawing>(drawing: D): D {
  for (const key of POINTS[drawing.kind]) {
    if (!isPoint((drawing as unknown as Record<string, unknown>)[key])) throw new Error(`a ${drawing.kind} needs ${key}: { bar, value }`);
  }
  return drawing;
}

/** A copy of a point, so the script changing its own object later changes nothing drawn. */
const pointOf = (p: IndicatorPoint): IndicatorPoint => ({ bar: p.bar, value: p.value });

/** A drawing with its points its own. */
function copied<D extends IndicatorDrawing>(drawing: D): D {
  const out: Record<string, unknown> = { ...drawing };
  for (const key of ['at', 'from', 'to'] as const) {
    const point = out[key] as IndicatorPoint | undefined;
    if (point) out[key] = pointOf(point);
  }
  return out as unknown as D;
}

/**
 * The labels, lines and boxes a script draws, kept from bar to bar. On the
 * live bar it records how to undo each change, so a tick that runs the bar
 * again starts from the shapes as the bar before left them.
 */
export class ScriptDrawings {
  /** By id: an id is the order made in. */
  private readonly items = new Map<number, IndicatorDrawing>();
  private readonly order: Record<Kind, number[]> = { label: [], line: [], box: [] };
  private readonly limits: Record<Kind, number>;
  private nextId = 0;
  private undo: (() => void)[] = [];

  constructor(private readonly scope: Scope, limits: DrawingLimits = {}) {
    this.limits = { label: limitOf(limits.maxLabels), line: limitOf(limits.maxLines), box: limitOf(limits.maxBoxes) };
    scope.units.push({
      commit: () => {
        this.undo = [];
      },
      rollback: () => {
        for (let i = this.undo.length - 1; i >= 0; i--) this.undo[i]();
        this.undo = [];
      },
    });
  }

  label(props: LabelProps): DrawingHandle<LabelProps> {
    return this.add({ kind: 'label', ...props });
  }

  line(props: LineProps): DrawingHandle<LineProps> {
    return this.add({ kind: 'line', ...props });
  }

  box(props: BoxProps): DrawingHandle<BoxProps> {
    return this.add({ kind: 'box', ...props });
  }

  /** The shapes kept, in the order made. */
  list(): IndicatorDrawing[] {
    return [...this.items.keys()].sort((a, b) => a - b).map((id) => this.items.get(id)!);
  }

  private record(step: () => void): void {
    if (this.scope.live) this.undo.push(step);
  }

  private add<D extends IndicatorDrawing>(drawing: D): DrawingHandle<Omit<D, 'kind'>> {
    checked(drawing);
    const id = this.nextId++;
    this.record(() => {
      this.nextId = id;
    });
    this.items.set(id, copied(drawing));
    this.record(() => {
      this.items.delete(id);
    });
    const ids = this.order[drawing.kind];
    ids.push(id);
    this.record(() => {
      ids.pop();
    });
    while (ids.length > this.limits[drawing.kind]) {
      const oldest = ids.shift()!;
      const item = this.items.get(oldest)!;
      this.items.delete(oldest);
      this.record(() => {
        this.items.set(oldest, item);
        ids.unshift(oldest);
      });
    }
    return {
      set: (changes) => this.change(id, changes as Partial<IndicatorDrawing>),
      remove: () => this.remove(id),
    };
  }

  private change(id: number, changes: Partial<IndicatorDrawing>): void {
    const before = this.items.get(id);
    if (!before) return;
    this.items.set(id, copied(checked({ ...before, ...changes, kind: before.kind } as IndicatorDrawing)));
    this.record(() => {
      this.items.set(id, before);
    });
  }

  private remove(id: number): void {
    const before = this.items.get(id);
    if (!before) return;
    this.items.delete(id);
    const ids = this.order[before.kind];
    const at = ids.indexOf(id);
    if (at >= 0) ids.splice(at, 1);
    this.record(() => {
      this.items.set(id, before);
      if (at >= 0) ids.splice(at, 0, id);
    });
  }
}

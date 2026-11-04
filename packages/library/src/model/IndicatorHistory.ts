import type { SnapshotIndicator, UndoRedoManager } from '@tradecanvas/core';

/** Changes to one indicator closer together than this are one undo step (a colour dragged, a period typed). */
export const INDICATOR_EDIT_MERGE_MS = 800;

/** The undo history the indicator steps go in. */
export type IndicatorSteps = Pick<UndoRedoManager, 'push' | 'last' | 'replaceLast' | 'dropLast'>;

export interface IndicatorHistoryOptions {
  steps: IndicatorSteps;
  /** The chart's indicators as a layout keeps them. */
  snapshot: () => SnapshotIndicator[];
  /** Whether undo is on (`features.drawingUndoRedo`). */
  enabled: () => boolean;
  now?: () => number;
}

/** An indicator step's pane renames, when it made any. */
function withRenames(renames: [string, string][]): { renames?: [string, string][] } {
  return renames.length > 0 ? { renames } : {};
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * The indicators' undo steps: each change as the indicators before and
 * after it, a burst of quick changes to one indicator merged into one step,
 * an edit (a settings dialog) as one step from its begin to its end. The
 * panes another indicator took over in a step go with it, so the drawings
 * on them can follow. No DOM.
 */
export class IndicatorHistory {
  private readonly steps: IndicatorSteps;
  private readonly snapshot: () => SnapshotIndicator[];
  private readonly enabled: () => boolean;
  private readonly now: () => number;
  /** Above 0 while a change is being recorded, or runs quietly: nested changes add no steps. */
  private depth = 0;
  private edit: { subject: string; before: SnapshotIndicator[] } | null = null;
  /** The panes renamed by the change being recorded, null outside one. */
  private renames: [string, string][] | null = null;

  constructor(options: IndicatorHistoryOptions) {
    this.steps = options.steps;
    this.snapshot = options.snapshot;
    this.enabled = options.enabled;
    this.now = options.now ?? (() => performance.now());
  }

  /**
   * Run an indicator change as one undo step. Quick changes about the same
   * `subject` (an indicator, a pane) merge into one step; a burst that ends
   * where it began leaves none.
   */
  record<T>(subject: string | undefined, change: () => T): T {
    if (this.depth > 0 || !this.enabled()) return change();
    const before = this.snapshot();
    const renames: [string, string][] = [];
    const outer = this.renames;
    this.renames = renames;
    let result: T;
    try {
      result = this.quietly(change);
    } finally {
      this.renames = outer;
    }
    const after = this.snapshot();
    if (same(before, after)) return result;
    this.push(subject, before, after, renames);
    return result;
  }

  private push(subject: string | undefined, before: SnapshotIndicator[], after: SnapshotIndicator[], renames: [string, string][]): void {
    const at = this.now();
    const last = this.steps.last();
    const burst = last?.type === 'indicators' ? last.indicators : undefined;
    const merge = subject !== undefined && burst?.subject === subject
      && at - (burst.at ?? 0) < INDICATOR_EDIT_MERGE_MS
      && same(burst.after, before);
    const step = { type: 'indicators' as const, before: null, after: null };
    if (merge && burst) {
      // Back where the burst began (hidden, then shown again): no step left.
      if (same(burst.before, after)) this.steps.dropLast();
      else this.steps.replaceLast({ ...step, indicators: { ...burst, after, at, ...withRenames([...(burst.renames ?? []), ...renames]) } });
    } else {
      this.steps.push({ ...step, indicators: { before, after, subject, at, ...withRenames(renames) } });
    }
  }

  /** Run `change` without recording undo steps for the indicators it changes. */
  quietly<T>(change: () => T): T {
    this.depth++;
    try {
      return change();
    } finally {
      this.depth--;
    }
  }

  /** Pane `from` was handed to the indicator `to` in the change being recorded. */
  renamed(from: string, to: string): void {
    this.renames?.push([from, to]);
  }

  /**
   * Start an edit of one indicator: its changes until `end` are one undo
   * step, and none when they end where they began (a cancel that put
   * everything back). An edit still open is ended first.
   */
  begin(subject: string): void {
    this.end();
    if (!this.enabled()) return;
    this.edit = { subject, before: this.snapshot() };
    this.depth++;
  }

  /** End the edit `begin` started, as one undo step when anything changed. */
  end(): void {
    const edit = this.edit;
    if (!edit) return;
    this.edit = null;
    this.depth--;
    const after = this.snapshot();
    if (same(after, edit.before)) return;
    this.steps.push({ type: 'indicators', before: null, after: null, indicators: { before: edit.before, after, subject: edit.subject, at: this.now() } });
  }
}

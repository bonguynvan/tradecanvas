import { readLayoutSummary, readSavedLayout, type LayoutStorage, type SavedLayout, type SavedLayoutSummary } from './layoutStorage.js';

/** The longest a layout's name may be. */
export const MAX_LAYOUT_NAME = 80;

/** A layout name trimmed, with runs of spaces folded and capped in length; `null` when nothing is left. */
export function cleanLayoutName(name: string): string | null {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_LAYOUT_NAME).trim();
  return clean || null;
}

/** What a session saves and opens: the widget, or a grid of widgets. */
export interface LayoutSessionHost {
  /** What to save now, with the symbol and interval a list shows. */
  capture(): { content: string; symbol?: string; timeframe?: string };
  /** Show a saved layout; throw when its content can't be shown. */
  apply(layout: SavedLayout): Promise<void> | void;
}

export interface LayoutSessionOptions {
  /** Save the current layout by itself once changes settle. Default `true`. */
  autoSave?: boolean;
  /** How long changes must settle before an auto-save. Default 1500 ms. */
  debounceMs?: number;
  /**
   * What this session saves (`'chart'`, the default, or `'grid'`): it lists
   * and opens only layouts of its kind, so both can share one storage.
   */
  kind?: string;
  /** The current layout, its saved state or the auto-save switch changed. */
  onChange?: () => void;
  /** An auto-save failed (a full storage, a server down). */
  onError?: (error: unknown) => void;
  now?: () => number;
  newId?: () => string;
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function summaryOf(layout: SavedLayoutSummary): SavedLayoutSummary {
  const { id, name, symbol, timeframe, updatedAt, kind } = layout;
  return {
    id,
    name,
    ...(symbol !== undefined ? { symbol } : {}),
    ...(timeframe !== undefined ? { timeframe } : {}),
    updatedAt,
    ...(kind !== undefined ? { kind } : {}),
  };
}

type Captured = ReturnType<LayoutSessionHost['capture']>;

/**
 * Named layouts over a {@link LayoutStorage}: the one showing now, save it,
 * save it under a new name, open, rename and remove. Changes reported with
 * `changed()` are auto-saved into the current layout once they settle, and
 * only when what would be saved differs from what was.
 *
 * Every operation runs in turn, and reads the current layout and captures
 * the chart when its turn comes: a save never lands in a layout opened after
 * it was asked for, and never holds a half-opened chart. What storage hands
 * back is checked before it is used.
 */
export class LayoutSession {
  private currentLayout: SavedLayoutSummary | null = null;
  /** What the current layout holds in storage (as captured), to tell a real change. */
  private savedContent: string | null = null;
  private dirty = false;
  private autoSave: boolean;
  private readonly debounceMs: number;
  private readonly kind: string;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private applying = 0;
  /** Operations waiting or running; a change while one runs is looked at after. */
  private busy = 0;
  private changedWhileBusy = false;
  private tail: Promise<unknown> = Promise.resolve();
  private destroyed = false;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(
    private readonly storage: LayoutStorage,
    private readonly host: LayoutSessionHost,
    private readonly options: LayoutSessionOptions = {},
  ) {
    this.autoSave = options.autoSave ?? true;
    this.debounceMs = options.debounceMs ?? 1500;
    this.kind = options.kind ?? 'chart';
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? randomId;
  }

  /** The layout showing now, or `null` before one is saved or opened. */
  current(): SavedLayoutSummary | null {
    return this.currentLayout;
  }

  /** The chart differs from the current layout as saved (auto-save off, failed, or not yet run). */
  isDirty(): boolean {
    return this.dirty;
  }

  isAutoSave(): boolean {
    return this.autoSave;
  }

  setAutoSave(on: boolean): void {
    if (this.autoSave === on) return;
    this.autoSave = on;
    this.notify();
    if (on && this.dirty) this.changed();
  }

  /** Every saved layout of this session's kind, newest first; entries that aren't layouts are left out. */
  async list(): Promise<SavedLayoutSummary[]> {
    const all: unknown = await this.storage.list();
    if (!Array.isArray(all)) return [];
    return all
      .map(readLayoutSummary)
      .filter((s): s is SavedLayoutSummary => s !== null && (s.kind ?? 'chart') === this.kind)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Save into the current layout; `null` when there is none yet (ask for a name, then `saveAs`). */
  save(): Promise<SavedLayoutSummary | null> {
    return this.queue(() => {
      const current = this.currentLayout;
      return current ? this.write(current.id, current.name) : null;
    });
  }

  /** Save as a new layout called `name`, and make it the current one. */
  saveAs(name: string): Promise<SavedLayoutSummary> {
    const clean = cleanLayoutName(name);
    if (!clean) return Promise.reject(new Error('A layout needs a name'));
    return this.queue(() => this.write(this.newId(), clean));
  }

  /**
   * Show a saved layout. `false` when there is no such layout (or it isn't
   * one of this kind); rejects when it could not be shown, and then no layout
   * is current (the chart may be part way).
   */
  open(id: string): Promise<boolean> {
    return this.queue(async () => {
      const layout = readSavedLayout(await this.storage.load(id));
      if (!layout || layout.id !== id || (layout.kind ?? 'chart') !== this.kind || this.destroyed) return false;
      this.cancelTimer();
      this.applying++;
      try {
        await this.host.apply(layout);
      } catch (err) {
        this.forget();
        throw err;
      } finally {
        this.applying--;
      }
      this.cancelTimer();
      this.currentLayout = summaryOf(layout);
      // Restored state can read differently (new ids): what shows now counts as saved.
      this.savedContent = this.host.capture().content;
      this.dirty = false;
      this.notify();
      return true;
    });
  }

  rename(id: string, name: string): Promise<void> {
    const clean = cleanLayoutName(name);
    if (!clean) return Promise.reject(new Error('A layout needs a name'));
    return this.queue(async () => {
      const layout = readSavedLayout(await this.storage.load(id));
      if (!layout || layout.id !== id) return;
      await this.storage.save({ ...layout, name: clean });
      if (this.currentLayout?.id === id) this.currentLayout = { ...this.currentLayout, name: clean };
      this.notify();
    });
  }

  remove(id: string): Promise<void> {
    return this.queue(async () => {
      await this.storage.remove(id);
      if (this.currentLayout?.id === id) this.forget();
    });
  }

  /** Something a layout holds may have changed: check once things settle, and auto-save. */
  changed(): void {
    if (this.destroyed || this.applying > 0) return;
    if (!this.currentLayout) {
      // A first save under way: look again once it has a layout to compare with.
      if (this.busy > 0) this.changedWhileBusy = true;
      return;
    }
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.queue(() => this.settle());
    }, this.debounceMs);
  }

  /** Stop. A change still waiting to be auto-saved is saved now. */
  destroy(): void {
    if (this.destroyed) return;
    const pending = this.timer !== null;
    this.cancelTimer();
    const current = this.currentLayout;
    if (pending && current && this.autoSave) {
      // Capture now: the chart is about to go.
      let captured: Captured | null = null;
      try {
        captured = this.host.capture();
      } catch (err) {
        this.options.onError?.(err);
      }
      if (captured && captured.content !== this.savedContent) {
        const last = captured;
        void this.queue(() => this.write(current.id, current.name, last)).catch((err: unknown) => this.options.onError?.(err));
      }
    }
    this.destroyed = true;
  }

  /** The changes have settled: save them into the current layout, or mark it changed. */
  private async settle(): Promise<void> {
    const current = this.currentLayout;
    if (this.destroyed || !current) return;
    let captured: Captured;
    try {
      captured = this.host.capture();
    } catch (err) {
      this.options.onError?.(err);
      return;
    }
    const differs = captured.content !== this.savedContent;
    if (differs && this.autoSave) {
      try {
        await this.write(current.id, current.name, captured);
      } catch (err) {
        this.dirty = true;
        this.notify();
        this.options.onError?.(err);
      }
      return;
    }
    if (differs !== this.dirty) {
      this.dirty = differs;
      this.notify();
    }
  }

  /** Store the chart as layout `id` and make it the current one (runs inside the queue). */
  private async write(id: string, name: string, captured: Captured = this.host.capture()): Promise<SavedLayoutSummary> {
    this.cancelTimer();
    const layout: SavedLayout = {
      id,
      name,
      ...(captured.symbol !== undefined ? { symbol: captured.symbol } : {}),
      ...(captured.timeframe !== undefined ? { timeframe: captured.timeframe } : {}),
      updatedAt: this.now(),
      kind: this.kind,
      content: captured.content,
    };
    await this.storage.save(layout);
    const summary = summaryOf(layout);
    this.currentLayout = summary;
    this.savedContent = captured.content;
    this.dirty = false;
    this.notify();
    return summary;
  }

  /** No layout is current any more. */
  private forget(): void {
    this.cancelTimer();
    this.currentLayout = null;
    this.savedContent = null;
    this.dirty = false;
    this.notify();
  }

  /** Run operations one after another; a failed one does not stop the next. */
  private queue<T>(task: () => T | Promise<T>): Promise<T> {
    this.busy++;
    const run = this.tail.then(task).finally(() => {
      this.busy--;
      if (this.busy === 0 && this.changedWhileBusy) {
        this.changedWhileBusy = false;
        this.changed();
      }
    });
    this.tail = run.catch(() => undefined);
    return run;
  }

  private cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private notify(): void {
    if (!this.destroyed) this.options.onChange?.();
  }
}

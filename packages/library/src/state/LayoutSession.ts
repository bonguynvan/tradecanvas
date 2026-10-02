import type { LayoutStorage, SavedLayout, SavedLayoutSummary } from './layoutStorage.js';

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
  /** Show a saved layout. */
  apply(layout: SavedLayout): Promise<void> | void;
}

export interface LayoutSessionOptions {
  /** Save the current layout by itself once changes settle. Default `true`. */
  autoSave?: boolean;
  /** How long changes must settle before an auto-save. Default 1500 ms. */
  debounceMs?: number;
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
  const { id, name, symbol, timeframe, updatedAt } = layout;
  return { id, name, ...(symbol !== undefined ? { symbol } : {}), ...(timeframe !== undefined ? { timeframe } : {}), updatedAt };
}

/**
 * Named layouts over a {@link LayoutStorage}: the one showing now, save it,
 * save it under a new name, open, rename and remove. Changes reported with
 * `changed()` are auto-saved into the current layout once they settle, and
 * only when what would be saved differs from what was. Writes go one at a
 * time, in order.
 */
export class LayoutSession {
  private currentLayout: SavedLayoutSummary | null = null;
  /** What the current layout holds in storage (as captured), to tell a real change. */
  private savedContent: string | null = null;
  private dirty = false;
  private autoSave: boolean;
  private readonly debounceMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private applying = 0;
  private writes: Promise<unknown> = Promise.resolve();
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
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? randomId;
  }

  /** The layout showing now, or `null` before one is saved or opened. */
  current(): SavedLayoutSummary | null {
    return this.currentLayout;
  }

  /** The chart differs from the current layout as saved (auto-save off, or not yet run). */
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

  /** Every saved layout, newest first. */
  async list(): Promise<SavedLayoutSummary[]> {
    const all = await this.storage.list();
    return [...all].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Save into the current layout; `null` when there is none yet (ask for a name, then `saveAs`). */
  async save(): Promise<SavedLayoutSummary | null> {
    const current = this.currentLayout;
    if (!current) return null;
    return this.write(current.id, current.name);
  }

  /** Save as a new layout called `name`, and make it the current one. */
  async saveAs(name: string): Promise<SavedLayoutSummary> {
    const clean = cleanLayoutName(name);
    if (!clean) throw new Error('A layout needs a name');
    return this.write(this.newId(), clean);
  }

  /** Show a saved layout; `false` when there is no such layout. */
  async open(id: string): Promise<boolean> {
    const layout = await this.storage.load(id);
    if (!layout || this.destroyed) return false;
    this.cancelTimer();
    this.applying++;
    try {
      await this.host.apply(layout);
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
  }

  async rename(id: string, name: string): Promise<void> {
    const clean = cleanLayoutName(name);
    if (!clean) throw new Error('A layout needs a name');
    await this.queue(async () => {
      const layout = await this.storage.load(id);
      if (!layout) return;
      await this.storage.save({ ...layout, name: clean });
      if (this.currentLayout?.id === id) this.currentLayout = { ...this.currentLayout, name: clean };
    });
    this.notify();
  }

  async remove(id: string): Promise<void> {
    await this.queue(() => this.storage.remove(id));
    if (this.currentLayout?.id === id) {
      this.cancelTimer();
      this.currentLayout = null;
      this.savedContent = null;
      this.dirty = false;
    }
    this.notify();
  }

  /** Something a layout holds may have changed: check once things settle, and auto-save. */
  changed(): void {
    if (this.destroyed || this.applying > 0 || !this.currentLayout) return;
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.settle();
    }, this.debounceMs);
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelTimer();
  }

  private settle(): void {
    const current = this.currentLayout;
    if (this.destroyed || !current) return;
    const differs = this.host.capture().content !== this.savedContent;
    if (differs && this.autoSave) {
      this.write(current.id, current.name).catch((err: unknown) => this.options.onError?.(err));
      return;
    }
    if (differs !== this.dirty) {
      this.dirty = differs;
      this.notify();
    }
  }

  private async write(id: string, name: string): Promise<SavedLayoutSummary> {
    this.cancelTimer();
    const captured = this.host.capture();
    const layout: SavedLayout = {
      id,
      name,
      ...(captured.symbol !== undefined ? { symbol: captured.symbol } : {}),
      ...(captured.timeframe !== undefined ? { timeframe: captured.timeframe } : {}),
      updatedAt: this.now(),
      content: captured.content,
    };
    await this.queue(() => this.storage.save(layout));
    const summary = summaryOf(layout);
    this.currentLayout = summary;
    this.savedContent = captured.content;
    this.dirty = false;
    this.notify();
    return summary;
  }

  /** Run storage writes one after another; a failed one does not stop the next. */
  private queue<T>(task: () => T | Promise<T>): Promise<T> {
    const run = this.writes.then(task, task);
    this.writes = run.catch(() => undefined);
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

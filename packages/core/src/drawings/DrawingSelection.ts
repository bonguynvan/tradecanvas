/**
 * The selected drawings: a primary one (its handles show, it is what a drag
 * reshapes) and the others selected with it (a box, Ctrl/⌘-clicks, its group).
 */
export class DrawingSelection {
  private primaryId: string | null = null;
  private others = new Set<string>();
  private listener: ((ids: string[]) => void) | null = null;

  /** Told the selected ids (the primary first) after each change. */
  setListener(listener: ((ids: string[]) => void) | null): void {
    this.listener = listener;
  }

  /** Run a change; tell the listener when the selection came out different. */
  private change<T>(apply: () => T): T {
    const before = this.ids().join('\u0000');
    const result = apply();
    if (this.listener && this.ids().join('\u0000') !== before) this.listener(this.ids());
    return result;
  }

  get primary(): string | null {
    return this.primaryId;
  }

  has(id: string): boolean {
    return id === this.primaryId || this.others.has(id);
  }

  /** Every selected id, the primary first. */
  ids(): string[] {
    return this.primaryId ? [this.primaryId, ...this.others] : [];
  }

  clear(): void {
    this.change(() => {
      this.primaryId = null;
      this.others.clear();
    });
  }

  /** Add a drawing; the first one is the primary. */
  add(id: string): void {
    this.change(() => {
      if (!this.primaryId) this.primaryId = id;
      else if (id !== this.primaryId) this.others.add(id);
    });
  }

  /** Select `id` as the primary, and `along` with it (the rest of its group). */
  only(id: string, along: Iterable<string> = []): void {
    this.change(() => {
      this.primaryId = id;
      this.others.clear();
      for (const other of along) if (other !== id) this.others.add(other);
    });
  }

  /** Make a selected drawing the primary, keeping the rest. */
  focus(id: string): void {
    if (id === this.primaryId || !this.others.has(id)) return;
    this.change(() => {
      if (this.primaryId) this.others.add(this.primaryId);
      this.others.delete(id);
      this.primaryId = id;
    });
  }

  /** Take drawings out; another selected one becomes the primary. Whether anything changed. */
  remove(ids: Iterable<string>): boolean {
    return this.change(() => this.removeNow(ids));
  }

  private removeNow(ids: Iterable<string>): boolean {
    let changed = false;
    for (const id of ids) {
      if (this.others.delete(id)) changed = true;
      if (id === this.primaryId) {
        this.primaryId = null;
        changed = true;
      }
    }
    if (!this.primaryId) {
      const next = this.others.values().next();
      if (!next.done) {
        this.primaryId = next.value;
        this.others.delete(next.value);
      }
    }
    return changed;
  }
}

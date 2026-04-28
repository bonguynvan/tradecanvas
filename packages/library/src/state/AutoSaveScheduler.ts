/**
 * Debounced auto-save scheduler. Coalesces a burst of `schedule()` calls into
 * a single `save(key)` invocation after `delayMs` of quiet time. Pure state
 * machine — owner injects the actual save callback so this stays testable.
 */
export class AutoSaveScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delayMs = 0;
  private key: string | null = null;

  constructor(private save: (key: string) => void) {}

  /** Enable auto-save with the given storage key and quiet-time debounce. */
  enable(key: string, delayMs: number): void {
    this.key = key;
    this.delayMs = delayMs;
  }

  /** Disable auto-save and cancel any pending fire. */
  disable(): void {
    this.key = null;
    this.delayMs = 0;
    this.cancel();
  }

  /**
   * Reset the quiet-time window. If currently disabled (no key or delay ≤ 0),
   * this is a no-op. Subsequent calls within the window restart the timer.
   */
  schedule(): void {
    if (this.delayMs <= 0 || !this.key) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.key) this.save(this.key);
    }, this.delayMs);
  }

  /** Cancel any pending fire without changing enabled state. */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  isEnabled(): boolean {
    return this.delayMs > 0 && this.key !== null;
  }

  hasPending(): boolean {
    return this.timer !== null;
  }
}

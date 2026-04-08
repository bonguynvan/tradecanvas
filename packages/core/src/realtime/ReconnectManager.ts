import type { ReconnectConfig } from '@chart-lib/commons';
import { DEFAULT_RECONNECT } from '@chart-lib/commons';
import { Emitter } from './Emitter.js';

interface ReconnectEvents {
  attempt: { attempt: number; delay: number };
  success: void;
  giveUp: { attempts: number };
}

/**
 * Exponential backoff reconnection manager.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable max retries and max delay
 * - Reset on successful connection
 * - Cancellable pending reconnection
 */
export class ReconnectManager extends Emitter<ReconnectEvents> {
  private config: ReconnectConfig;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  constructor(config?: Partial<ReconnectConfig>) {
    super();
    this.config = { ...DEFAULT_RECONNECT, ...config };
  }

  schedule(connectFn: () => void): void {
    if (!this.config.enabled || !this.active) return;

    this.attempt++;

    if (this.attempt > this.config.maxRetries) {
      this.emit('giveUp', { attempts: this.attempt - 1 });
      this.active = false;
      return;
    }

    const delay = this.computeDelay();
    this.emit('attempt', { attempt: this.attempt, delay });

    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.active) connectFn();
    }, delay);
  }

  onConnected(): void {
    this.attempt = 0;
    this.cancel();
    this.emit('success', undefined as any);
  }

  start(): void {
    this.active = true;
  }

  stop(): void {
    this.active = false;
    this.cancel();
    this.attempt = 0;
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getAttempt(): number {
    return this.attempt;
  }

  isActive(): boolean {
    return this.active;
  }

  private computeDelay(): number {
    const base = this.config.baseDelay;
    const mult = Math.pow(this.config.backoffMultiplier, this.attempt - 1);
    const delay = Math.min(base * mult, this.config.maxDelay);
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(delay + jitter));
  }
}

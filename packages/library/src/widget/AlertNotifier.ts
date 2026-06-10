export interface AlertNotifyOptions {
  /** Play a sound on trigger. `true` = built-in beep, string = audio URL. Default `false`. */
  sound?: boolean | string;
  /** Show a desktop notification (requests permission on first use). Default `false`. */
  desktop?: boolean;
  /** Title for desktop notifications. Default `'Price alert'`. */
  title?: string;
}

/** True when the Notification API is present and not denied. */
export function canRequestNotifications(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission !== 'denied';
}

/**
 * Plays a sound and/or raises a desktop notification when a price alert fires.
 * Browser-API heavy by nature — every entry point is guarded so it degrades to
 * a no-op in SSR, unsupported browsers, or when permission is denied.
 */
export class AlertNotifier {
  private options: AlertNotifyOptions;
  private audioCtx: AudioContext | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private permissionAsked = false;

  constructor(options: AlertNotifyOptions = {}) {
    this.options = options;
    if (typeof options.sound === 'string') {
      try {
        this.audioEl = new Audio(options.sound);
        this.audioEl.preload = 'auto';
      } catch {
        this.audioEl = null;
      }
    }
    // Request notification permission up front so the first alert isn't silent.
    if (options.desktop) this.ensurePermission();
  }

  setOptions(options: AlertNotifyOptions): void {
    this.options = { ...this.options, ...options };
  }

  /** Fire the configured notifications for a triggered alert. */
  notify(message: string): void {
    if (this.options.sound) this.playSound();
    if (this.options.desktop) this.showDesktop(message);
  }

  private playSound(): void {
    if (this.audioEl) {
      this.audioEl.currentTime = 0;
      void this.audioEl.play().catch(() => {});
      return;
    }
    this.beep();
  }

  /** A short two-tone beep via Web Audio — no asset required. */
  private beep(): void {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!this.audioCtx) this.audioCtx = new Ctx();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.16);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Audio unavailable or blocked by autoplay policy — silent.
    }
  }

  private ensurePermission(): void {
    if (this.permissionAsked) return;
    this.permissionAsked = true;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {});
    }
  }

  private showDesktop(message: string): void {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') {
      this.ensurePermission();
      return;
    }
    try {
      new Notification(this.options.title ?? 'Price alert', { body: message });
    } catch {
      // Some browsers throw if not invoked from a user gesture — ignore.
    }
  }

  destroy(): void {
    try {
      void this.audioCtx?.close();
    } catch {
      // ignore
    }
    this.audioCtx = null;
    this.audioEl = null;
  }
}

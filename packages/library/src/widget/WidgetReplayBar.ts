import { escapeHtml } from './escapeHtml.js';
/**
 * Replay control bar. Surfaces the chart's replay engine as a floating
 * bottom-of-chart control and reports user intent through callbacks (no
 * chart coupling — the host calls chart.replayStart() / replayPause() / …).
 *
 * Two modes: `select` (pick the start bar: a hint, "random bar", play from a
 * default start) and `replay` (step, play/pause, scrub, speed). "Back to
 * realtime" is always there and is highlighted once the replay reaches the
 * last bar.
 */
export interface ReplayBarCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (index: number) => void;
  /** Bars revealed per second. */
  onSpeedChange: (barsPerSecond: number) => void;
  onRandomStart: () => void;
  onClose: () => void;
}

export interface ReplayBarLabels {
  selectHint: string;
  random: string;
  realtime: string;
  barsPerSecond: string;
  play: string;
  pause: string;
  stepBack: string;
  stepForward: string;
  replay: string;
  position: string;
  speed: string;
}

export const DEFAULT_REPLAY_LABELS: ReplayBarLabels = {
  selectHint: 'Click a bar to start the replay',
  random: 'Random bar',
  realtime: 'Back to realtime',
  barsPerSecond: 'bars/s',
  play: 'Play',
  pause: 'Pause',
  stepBack: 'Step back (Shift+←)',
  stepForward: 'Step forward (Shift+→)',
  replay: 'Replay',
  position: 'Replay position',
  speed: 'Speed',
};

export type ReplayBarState = 'playing' | 'paused' | 'stopped';
export type ReplayBarMode = 'select' | 'replay';

/** Replay speeds, in bars revealed per second. */
export const REPLAY_SPEEDS = [1, 2, 3, 5, 10, 25, 50] as const;
export const DEFAULT_REPLAY_SPEED = 5;

export class WidgetReplayBar {
  private root: HTMLDivElement | null = null;
  private scrubber: HTMLInputElement | null = null;
  private progressLabel: HTMLSpanElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private realtimeBtn: HTMLButtonElement | null = null;
  private state: ReplayBarState = 'stopped';
  private mode: ReplayBarMode = 'select';
  private ended = false;
  private total = 0;
  private speed = DEFAULT_REPLAY_SPEED;
  private readonly labels: ReplayBarLabels;

  constructor(private readonly callbacks: ReplayBarCallbacks, labels: Partial<ReplayBarLabels> = {}) {
    this.labels = { ...DEFAULT_REPLAY_LABELS, ...labels };
  }

  mount(host: HTMLElement, opts: { total: number; speed?: number; mode?: ReplayBarMode }): void {
    if (this.root) return;
    this.total = Math.max(0, opts.total);
    this.speed = opts.speed ?? DEFAULT_REPLAY_SPEED;
    this.state = 'paused';
    this.mode = opts.mode ?? 'select';

    this.root = document.createElement('div');
    this.root.className = 'tcw-replay-bar';
    this.root.setAttribute('role', 'toolbar');
    this.root.setAttribute('aria-label', this.labels.replay);
    this.root.innerHTML = this.markup();

    host.appendChild(this.root);
    this.wireEvents();
    this.syncUi();
  }

  unmount(): void {
    this.root?.remove();
    this.root = null;
    this.scrubber = null;
    this.progressLabel = null;
    this.playBtn = null;
    this.realtimeBtn = null;
    this.state = 'stopped';
    this.ended = false;
  }

  isMounted(): boolean {
    return this.root !== null;
  }

  getMode(): ReplayBarMode {
    return this.mode;
  }

  setMode(mode: ReplayBarMode): void {
    // The button that started the replay (Random, Play) is about to hide:
    // keep keyboard focus inside the bar, on Play.
    const hadFocus = !!this.root?.contains(document.activeElement);
    this.mode = mode;
    this.syncUi();
    if (hadFocus && mode === 'replay') this.playBtn?.focus();
  }

  setState(state: ReplayBarState): void {
    this.state = state;
    this.syncUi();
  }

  /** The replay sits on its last bar: nothing left to play. */
  setEnded(ended: boolean): void {
    if (this.ended === ended) return;
    this.ended = ended;
    this.syncUi();
  }

  /** `current`: index of the bar on screen. */
  setProgress(current: number, total: number): void {
    this.total = total;
    if (this.scrubber) {
      this.scrubber.max = String(Math.max(0, total - 1));
      this.scrubber.value = String(current);
    }
    if (this.progressLabel) {
      this.progressLabel.textContent = `${Math.min(current + 1, total)} / ${total}`;
    }
  }

  destroy(): void {
    this.unmount();
  }

  private markup(): string {
    const l = this.labels;
    const speeds = REPLAY_SPEEDS.map(
      (s) => `<option value="${s}"${s === this.speed ? ' selected' : ''}>${s} ${escapeHtml(l.barsPerSecond)}</option>`,
    ).join('');
    return `
      <span class="tcw-replay-group" data-mode="select">
        <span class="tcw-replay-hint" role="status">${svgCursor()}${escapeHtml(l.selectHint)}</span>
        <button class="tcw-replay-text-btn" data-act="random">${escapeHtml(l.random)}</button>
      </span>
      <span class="tcw-replay-group" data-mode="replay">
        <button class="tcw-replay-btn" data-act="stepBack" title="${escapeHtml(l.stepBack)}" aria-label="${escapeHtml(l.stepBack)}">${svgStepBack()}</button>
        <button class="tcw-replay-btn tcw-replay-play" data-act="play" title="${escapeHtml(l.play)}" aria-label="${escapeHtml(l.play)}">${svgPlay()}</button>
        <button class="tcw-replay-btn" data-act="stepForward" title="${escapeHtml(l.stepForward)}" aria-label="${escapeHtml(l.stepForward)}">${svgStepForward()}</button>
        <input type="range" class="tcw-replay-scrubber" data-act="seek" min="0" max="${Math.max(0, this.total - 1)}" value="0" step="1" aria-label="${escapeHtml(this.labels.position)}" />
        <span class="tcw-replay-progress" data-tcw="progress">1 / ${this.total}</span>
        <select class="tcw-replay-speed" data-act="speed" aria-label="${escapeHtml(this.labels.speed)}">${speeds}</select>
      </span>
      <button class="tcw-replay-text-btn tcw-replay-realtime" data-act="realtime">${escapeHtml(l.realtime)}</button>
    `;
  }

  private wireEvents(): void {
    const root = this.root;
    if (!root) return;
    this.scrubber = root.querySelector('input[data-act="seek"]');
    this.progressLabel = root.querySelector('[data-tcw="progress"]');
    this.playBtn = root.querySelector('button[data-act="play"]');
    this.realtimeBtn = root.querySelector('button[data-act="realtime"]');

    this.realtimeBtn?.addEventListener('click', () => this.callbacks.onClose());
    root.querySelector('[data-act="random"]')?.addEventListener('click', () => this.callbacks.onRandomStart());
    root.querySelector('[data-act="stepBack"]')?.addEventListener('click', () => this.callbacks.onStepBack());
    root.querySelector('[data-act="stepForward"]')?.addEventListener('click', () => this.callbacks.onStepForward());
    this.playBtn?.addEventListener('click', () => {
      if (this.state === 'playing') this.callbacks.onPause();
      else this.callbacks.onPlay();
    });
    this.scrubber?.addEventListener('input', () => this.callbacks.onSeek(Number(this.scrubber!.value)));
    (root.querySelector('[data-act="speed"]') as HTMLSelectElement | null)?.addEventListener('change', (e) => {
      const v = Number((e.target as HTMLSelectElement).value);
      this.speed = v;
      this.callbacks.onSpeedChange(v);
    });
  }

  private syncUi(): void {
    const root = this.root;
    if (!root) return;
    for (const group of root.querySelectorAll<HTMLElement>('.tcw-replay-group')) {
      group.hidden = group.dataset.mode !== this.mode;
    }
    root.classList.toggle('tcw-replay-bar--ended', this.ended);
    if (this.playBtn) {
      const playing = this.state === 'playing';
      this.playBtn.innerHTML = playing ? svgPause() : svgPlay();
      this.playBtn.title = playing ? this.labels.pause : this.labels.play;
      this.playBtn.setAttribute('aria-label', this.playBtn.title);
      const disable = this.ended && !playing;
      if (disable && document.activeElement === this.playBtn) this.realtimeBtn?.focus();
      this.playBtn.disabled = disable;
    }
  }
}


function svgPlay(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/></svg>';
}
function svgPause(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
}
function svgStepBack(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zM20 6L9 12l11 6V6z"/></svg>';
}
function svgStepForward(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6l11 6L4 18V6zM16 6h2v12h-2z"/></svg>';
}
function svgCursor(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>';
}

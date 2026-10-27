import { escapeHtml } from './escapeHtml.js';
import { markPart } from './widgetFeatures.js';
import { createIcon } from './icons.js';
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
  /** The step picked: `'bar'`, or a finer interval to replay through. */
  onStepChange?: (step: string) => void;
}

/** A replay step on offer: `'bar'` or a finer interval. */
export interface ReplayStepOption {
  value: string;
  label: string;
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
  step: string;
  /** Said in the hint while the bars to replay are on their way. */
  loading: string;
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
  step: 'Step',
  loading: 'Loading chart...',
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
  /** The bars to replay are on their way: picking and moving wait. */
  private pending = false;
  private hint: HTMLSpanElement | null = null;
  private total = 0;
  private speed = DEFAULT_REPLAY_SPEED;
  private steps: readonly ReplayStepOption[] = [];
  private step = 'bar';
  private readonly labels: ReplayBarLabels;

  constructor(private readonly callbacks: ReplayBarCallbacks, labels: Partial<ReplayBarLabels> = {}) {
    this.labels = { ...DEFAULT_REPLAY_LABELS, ...labels };
  }

  mount(
    host: HTMLElement,
    opts: { total: number; speed?: number; mode?: ReplayBarMode; steps?: readonly ReplayStepOption[]; step?: string },
  ): void {
    if (this.root) return;
    this.total = Math.max(0, opts.total);
    this.speed = opts.speed ?? DEFAULT_REPLAY_SPEED;
    this.steps = opts.steps ?? [];
    this.step = opts.step ?? 'bar';
    this.state = 'paused';
    this.mode = opts.mode ?? 'select';

    this.root = document.createElement('div');
    this.root.className = 'tcw-replay-bar';
    markPart(this.root, 'replay');
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
    this.hint = null;
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

  /**
   * The bars to replay are on their way: the hint says so, and picking a
   * bar, stepping, scrubbing and the step menu wait. Play stays: the chart
   * keeps a press for when they are in.
   */
  setPending(pending: boolean): void {
    if (this.pending === pending) return;
    this.pending = pending;
    this.syncUi();
  }

  isPending(): boolean {
    return this.pending;
  }

  /** The steps on offer changed (a new interval): the menu again, on `step`. */
  setSteps(steps: readonly ReplayStepOption[], step: string): void {
    this.steps = steps;
    this.step = step;
    const root = this.root;
    if (!root) return;
    const old = root.querySelector('[data-act="step"]');
    const markup = this.stepMarkup();
    if (old) old.outerHTML = markup;
    else this.realtimeBtn?.insertAdjacentHTML('beforebegin', markup);
    this.wireStep();
    this.syncUi();
  }

  /** `current`: index of the bar on screen. */
  setProgress(current: number, total: number): void {
    this.total = total;
    const text = `${Math.min(current + 1, total)} / ${total}`;
    if (this.scrubber) {
      this.scrubber.max = String(Math.max(0, total - 1));
      this.scrubber.value = String(current);
      // Read as where it is of how many, not as a raw index that jumps when the bars change.
      this.scrubber.setAttribute('aria-valuetext', text);
    }
    if (this.progressLabel) {
      this.progressLabel.textContent = text;
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
      ${this.stepMarkup()}
      <button class="tcw-replay-text-btn tcw-replay-realtime" data-act="realtime">${escapeHtml(l.realtime)}</button>
    `;
  }

  /** The step menu, when there is more than one step to pick. */
  private stepMarkup(): string {
    const l = this.labels;
    if (this.steps.length <= 1) return '';
    const options = this.steps
      .map((s) => `<option value="${escapeHtml(s.value)}"${s.value === this.step ? ' selected' : ''}>${escapeHtml(s.label)}</option>`)
      .join('');
    return `<select class="tcw-replay-speed tcw-replay-step" data-act="step" aria-label="${escapeHtml(l.step)}" title="${escapeHtml(l.step)}">${options}</select>`;
  }

  private wireStep(): void {
    (this.root?.querySelector('[data-act="step"]') as HTMLSelectElement | null)?.addEventListener('change', (e) => {
      this.step = (e.target as HTMLSelectElement).value;
      this.callbacks.onStepChange?.(this.step);
    });
  }

  private wireEvents(): void {
    const root = this.root;
    if (!root) return;
    this.hint = root.querySelector('.tcw-replay-hint');
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
    this.wireStep();
  }

  private syncUi(): void {
    const root = this.root;
    if (!root) return;
    for (const group of root.querySelectorAll<HTMLElement>('.tcw-replay-group')) {
      group.hidden = group.dataset.mode !== this.mode;
    }
    root.classList.toggle('tcw-replay-bar--ended', this.ended);
    this.syncPending(root);
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

  /** While the bars are on their way: busy, the hint says so, and the controls that pick or move wait. */
  private syncPending(root: HTMLElement): void {
    if (this.pending) root.setAttribute('aria-busy', 'true');
    else root.removeAttribute('aria-busy');
    if (this.hint) {
      // The cursor icon stays; the text after it changes.
      const text = this.hint.lastChild;
      const said = this.pending ? this.labels.loading : this.labels.selectHint;
      if (text && text.nodeType === Node.TEXT_NODE) text.textContent = said;
    }
    for (const act of ['random', 'stepBack', 'stepForward', 'seek', 'step']) {
      const control = root.querySelector<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(`[data-act="${act}"]`);
      if (control) control.disabled = this.pending;
    }
  }
}


// The replay's controls, from the icon set.
const svgPlay = () => createIcon('play', 14);
const svgPause = () => createIcon('pause', 14);
const svgStepBack = () => createIcon('stepBack', 14);
const svgStepForward = () => createIcon('stepForward', 14);
const svgCursor = () => createIcon('cursor', 14);

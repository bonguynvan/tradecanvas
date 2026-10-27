import { escapeHtml } from './escapeHtml.js';
import { markPart } from './widgetFeatures.js';
import { createIcon } from './icons.js';
/**
 * Replay control bar. Surfaces the chart's replay engine as a floating
 * transport over the foot of the main pane and reports user intent through
 * callbacks (no chart coupling — the host calls chart.replayStart() /
 * replayPause() / …).
 *
 * Two modes: `select` (pick the start bar: a hint, "random bar", the step,
 * cancel) and `replay` (step, play/pause, where it is as a date on a filled
 * track, speed, step, pick another bar, back to realtime). "Back to realtime"
 * is put forward once the replay reaches the last bar.
 */
export interface ReplayBarCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (index: number) => void;
  /** A multiplier on the pace: 1 plays one bar of the chart a second. */
  onSpeedChange: (rate: number) => void;
  onRandomStart: () => void;
  onClose: () => void;
  /** The step picked: `'bar'`, or a finer interval to replay through. */
  onStepChange?: (step: string) => void;
  /** Pick another start bar, inside the replay. */
  onSelectBar?: () => void;
  /** Cancel picking: back to the replay when there is one, else out (`onClose` without it). */
  onCancelPick?: () => void;
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
  selectBar: string;
  cancel: string;
  /** A speed, `{rate}` a multiplier: '{rate}×'. */
  rate: string;
  /** What a speed means, the speed field's tooltip. */
  rateHint: string;
  /** `{rate}`: the speed written as `rate` says. */
  playingAt: string;
  /** `{time}`: where the replay is. */
  pausedAt: string;
  endedAt: string;
}

export const DEFAULT_REPLAY_LABELS: ReplayBarLabels = {
  selectHint: 'Click a bar to start the replay',
  random: 'Random bar',
  realtime: 'Back to realtime',
  play: 'Play',
  pause: 'Pause',
  stepBack: 'Step back (Shift+←)',
  stepForward: 'Step forward (Shift+→)',
  replay: 'Replay',
  position: 'Replay position',
  speed: 'Speed',
  step: 'Step',
  loading: 'Loading chart...',
  selectBar: 'Select bar',
  cancel: 'Cancel',
  rate: '{rate}×',
  rateHint: '1× plays one bar a second',
  playingAt: 'Playing at {rate}',
  pausedAt: 'Paused at {time}',
  endedAt: 'Replay ended at {time}',
};

export type ReplayBarState = 'playing' | 'paused' | 'stopped';
export type ReplayBarMode = 'select' | 'replay';
/** How much the bar shows for the room it has: all, without its captions, or in two rows. */
export type ReplayBarFit = 'full' | 'compact' | 'stack';

/** Replay speeds as multipliers: 1-2-3-5 in each decade, 1× one bar of the chart a second. */
export const REPLAY_RATES = [0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10, 20, 30, 50] as const;
export const DEFAULT_REPLAY_RATE = 1;

const FIT_TIERS: readonly ReplayBarFit[] = ['full', 'compact', 'stack'];
/** A burst of steps (a held key) is said once it rests this long. */
const ANNOUNCE_REST_MS = 300;
/** The played part's share is written to two decimals. */
const PERCENT_DECIMALS = 2;

export interface ReplayBarMountOptions {
  total: number;
  /** The speed picked, a multiplier. */
  rate?: number;
  mode?: ReplayBarMode;
  steps?: readonly ReplayStepOption[];
  step?: string;
  /** The widget's direction: its words read so; the bar runs left to right with time. */
  dir?: 'ltr' | 'rtl';
  /** A speed as text, in the widget's number format (else `labels.rate`). */
  formatRate?: (rate: number) => string;
}

export class WidgetReplayBar {
  private root: HTMLDivElement | null = null;
  private scrubber: HTMLInputElement | null = null;
  private timeLabel: HTMLOutputElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private realtimeBtn: HTMLButtonElement | null = null;
  private liveRegion: HTMLSpanElement | null = null;
  private hintText: HTMLSpanElement | null = null;
  private state: ReplayBarState = 'stopped';
  private mode: ReplayBarMode = 'select';
  private ended = false;
  /** The bars to replay are on their way: picking and moving wait. */
  private pending = false;
  private total = 0;
  private rate = DEFAULT_REPLAY_RATE;
  private steps: readonly ReplayStepOption[] = [];
  private step = 'bar';
  private dir: 'ltr' | 'rtl' = 'ltr';
  private formatRate: (rate: number) => string;
  /** Where the replay is, as said: the date, or the position without one. */
  private where = '';
  private announceTimer: ReturnType<typeof setTimeout> | null = null;
  /** The bar's width in each tier, measured once per mode and steps. */
  private widths = new Map<string, number>();
  private readonly labels: ReplayBarLabels;

  constructor(private readonly callbacks: ReplayBarCallbacks, labels: Partial<ReplayBarLabels> = {}) {
    this.labels = { ...DEFAULT_REPLAY_LABELS, ...labels };
    this.formatRate = (r) => this.labels.rate.replace('{rate}', String(r));
  }

  mount(host: HTMLElement, opts: ReplayBarMountOptions): void {
    if (this.root) return;
    this.total = Math.max(0, opts.total);
    this.rate = opts.rate ?? DEFAULT_REPLAY_RATE;
    this.steps = opts.steps ?? [];
    this.step = opts.step ?? 'bar';
    this.dir = opts.dir ?? 'ltr';
    if (opts.formatRate) this.formatRate = opts.formatRate;
    this.state = 'paused';
    this.mode = opts.mode ?? 'select';

    this.root = document.createElement('div');
    this.root.className = 'tcw-replay-bar';
    markPart(this.root, 'replay');
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', this.labels.replay);
    this.root.dataset.fit = 'full';
    this.root.innerHTML = this.markup();

    host.appendChild(this.root);
    this.wireEvents();
    this.syncUi();
  }

  unmount(): void {
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = null;
    this.root?.remove();
    this.root = null;
    this.hintText = null;
    this.scrubber = null;
    this.timeLabel = null;
    this.playBtn = null;
    this.realtimeBtn = null;
    this.liveRegion = null;
    this.state = 'stopped';
    this.ended = false;
    this.where = '';
  }

  isMounted(): boolean {
    return this.root !== null;
  }

  /** The bar's element, to place it (null when not mounted). */
  element(): HTMLElement | null {
    return this.root;
  }

  getMode(): ReplayBarMode {
    return this.mode;
  }

  setMode(mode: ReplayBarMode): void {
    // The button that started the replay (Random, Play) or picking (Select
    // bar) is about to hide: keep keyboard focus inside the bar.
    const hadFocus = !!this.root?.contains(document.activeElement);
    this.mode = mode;
    this.syncUi();
    if (!hadFocus) return;
    if (mode === 'replay') this.playBtn?.focus();
    else this.root?.querySelector<HTMLButtonElement>('[data-act="random"]')?.focus();
  }

  setState(state: ReplayBarState): void {
    if (state === this.state) return;
    this.state = state;
    this.syncUi();
    if (this.mode !== 'replay') return;
    if (state === 'playing') this.announce(this.labels.playingAt.replace('{rate}', this.formatRate(this.rate)));
    else if (state === 'paused' && this.where) this.announce(this.labels.pausedAt.replace('{time}', this.where));
  }

  /** The replay sits on its last bar: nothing left to play. */
  setEnded(ended: boolean): void {
    if (this.ended === ended) return;
    this.ended = ended;
    this.syncUi();
    if (ended && this.where) this.announce(this.labels.endedAt.replace('{time}', this.where));
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
    this.widths.clear();
    const slot = this.root?.querySelector('[data-tcw="stepSlot"]');
    if (!slot) return;
    slot.innerHTML = this.stepMarkup();
    this.wireStep();
    this.syncUi();
  }

  /**
   * `current`: index of the bar on screen; `time`: where that is, as the
   * reader reads it (the date of the step shown). Without it the position
   * is read as where of how many.
   */
  setProgress(current: number, total: number, time?: string): void {
    this.total = total;
    const where = time ?? `${Math.min(current + 1, total)} / ${total}`;
    const moved = where !== this.where;
    this.where = where;
    if (this.scrubber) {
      this.scrubber.max = String(Math.max(0, total - 1));
      this.scrubber.value = String(current);
      this.scrubber.setAttribute('aria-valuetext', where);
      const done = total > 1 ? (Math.min(current, total - 1) / (total - 1)) * 100 : 0;
      this.scrubber.style.setProperty('--tcw-replay-done', `${Number(done.toFixed(PERCENT_DECIMALS))}%`);
    }
    if (this.timeLabel) {
      this.timeLabel.textContent = where;
      // The readout only grows, so the track doesn't shift as the months' names change length.
      const shownChars = Number.parseFloat(this.timeLabel.style.minInlineSize) || 0;
      if (where.length > shownChars) this.timeLabel.style.minInlineSize = `${where.length}ch`;
    }
    // Each step taken by hand is said; a run plays on unsaid.
    if (moved && this.mode === 'replay' && this.state !== 'playing') this.announce(where);
  }

  /**
   * The room the bar has (the main pane's width, less its margins): it takes
   * the widest tier that fits, measured once per mode and steps.
   */
  setRoom(room: number): void {
    const root = this.root;
    if (!root) return;
    for (const tier of FIT_TIERS) {
      if (tier === 'stack' || this.widthIn(tier) <= room) {
        root.dataset.fit = tier;
        return;
      }
    }
  }

  getFit(): ReplayBarFit {
    return (this.root?.dataset.fit as ReplayBarFit | undefined) ?? 'full';
  }

  destroy(): void {
    this.unmount();
  }

  /** The bar's width in `tier`, its track at its least. */
  private widthIn(tier: ReplayBarFit): number {
    const root = this.root!;
    const key = `${this.mode}|${this.steps.length}|${tier}`;
    const known = this.widths.get(key);
    if (known !== undefined) return known;
    const was = root.dataset.fit;
    root.dataset.fit = tier;
    root.dataset.measure = '';
    const width = root.getBoundingClientRect().width;
    delete root.dataset.measure;
    if (was) root.dataset.fit = was;
    if (width > 0) this.widths.set(key, width);
    return width;
  }

  private markup(): string {
    const l = this.labels;
    const words = `dir="${this.dir}"`;
    const rates = REPLAY_RATES.map(
      (r) => `<option value="${r}"${r === this.rate ? ' selected' : ''}>${escapeHtml(this.formatRate(r))}</option>`,
    ).join('');
    const button = (act: string, label: string, icon: string, cls = 'tcw-replay-btn', extra = '') =>
      `<button type="button" class="${cls}" data-act="${act}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"${extra}>${icon}</button>`;
    return `
      <span class="tcw-replay-group tcw-replay-picking" data-mode="select">
        <span class="tcw-replay-hint" ${words}>${createIcon('cursor', 14)}<span data-tcw="hint">${escapeHtml(l.selectHint)}</span></span>
        <button type="button" class="tcw-replay-text-btn tcw-replay-ghost" data-act="random" ${words}>${escapeHtml(l.random)}</button>
      </span>
      <span class="tcw-replay-group tcw-replay-transport" data-mode="replay">
        ${button('stepBack', l.stepBack, createIcon('stepBack', 14))}
        ${button('play', l.play, createIcon('play', 14), 'tcw-replay-btn tcw-replay-play', ' aria-keyshortcuts="Space"')}
        ${button('stepForward', l.stepForward, createIcon('stepForward', 14))}
      </span>
      <span class="tcw-replay-sep" data-mode="replay" aria-hidden="true"></span>
      <span class="tcw-replay-group tcw-replay-timeline" data-mode="replay">
        <output class="tcw-replay-time" data-tcw="time" aria-hidden="true" ${words}></output>
        <input type="range" class="tcw-replay-scrubber" data-act="seek" min="0" max="${Math.max(0, this.total - 1)}" value="0" step="1" aria-label="${escapeHtml(l.position)}" />
      </span>
      <span class="tcw-replay-sep" aria-hidden="true"></span>
      <span class="tcw-replay-group tcw-replay-pace">
        <label class="tcw-replay-chip" data-mode="replay" title="${escapeHtml(l.rateHint)}">
          <span class="tcw-replay-chip-label" ${words}>${escapeHtml(l.speed)}</span>
          <select class="tcw-replay-speed" data-act="speed" dir="ltr">${rates}</select>
        </label>
        <span class="tcw-replay-slot" data-tcw="stepSlot">${this.stepMarkup()}</span>
      </span>
      <span class="tcw-replay-sep" aria-hidden="true"></span>
      <span class="tcw-replay-group tcw-replay-exits">
        <span data-mode="replay" class="tcw-replay-slot">${button('selectBar', l.selectBar, createIcon('replayPick', 14))}</span>
        <button type="button" class="tcw-replay-text-btn tcw-replay-realtime" data-act="realtime" data-mode="replay" aria-label="${escapeHtml(l.realtime)}" title="${escapeHtml(l.realtime)}"><span class="tcw-replay-close-icon">${createIcon('x', 14)}</span><span class="tcw-replay-text" ${words}>${escapeHtml(l.realtime)}</span></button>
        <button type="button" class="tcw-replay-text-btn" data-act="cancel" data-mode="select" ${words}>${escapeHtml(l.cancel)}</button>
      </span>
      <span class="tcw-visually-hidden" role="status" aria-live="polite" data-tcw="announce" ${words}></span>
    `;
  }

  /** The step field, when there is more than one step to pick. */
  private stepMarkup(): string {
    const l = this.labels;
    if (this.steps.length <= 1) return '';
    const options = this.steps
      .map((s) => `<option value="${escapeHtml(s.value)}"${s.value === this.step ? ' selected' : ''}>${escapeHtml(s.label)}</option>`)
      .join('');
    return `<label class="tcw-replay-chip"><span class="tcw-replay-chip-label" dir="${this.dir}">${escapeHtml(l.step)}</span><select class="tcw-replay-speed tcw-replay-step" data-act="step" dir="ltr">${options}</select></label>`;
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
    this.hintText = root.querySelector('[data-tcw="hint"]');
    this.scrubber = root.querySelector('input[data-act="seek"]');
    this.timeLabel = root.querySelector('[data-tcw="time"]');
    this.playBtn = root.querySelector('button[data-act="play"]');
    this.realtimeBtn = root.querySelector('button[data-act="realtime"]');
    this.liveRegion = root.querySelector('[data-tcw="announce"]');

    const on = (act: string, fn: () => void) => root.querySelector(`[data-act="${act}"]`)?.addEventListener('click', fn);
    on('realtime', () => this.callbacks.onClose());
    on('random', () => this.callbacks.onRandomStart());
    on('stepBack', () => this.callbacks.onStepBack());
    on('stepForward', () => this.callbacks.onStepForward());
    on('selectBar', () => this.callbacks.onSelectBar?.());
    on('cancel', () => (this.callbacks.onCancelPick ?? this.callbacks.onClose)());
    on('play', () => this.togglePlay());
    this.scrubber?.addEventListener('input', () => this.callbacks.onSeek(Number(this.scrubber!.value)));
    (root.querySelector('[data-act="speed"]') as HTMLSelectElement | null)?.addEventListener('change', (e) => {
      const v = Number((e.target as HTMLSelectElement).value);
      this.rate = v;
      this.callbacks.onSpeedChange(v);
    });
    root.addEventListener('keydown', this.onKeydown);
    this.wireStep();
  }

  private togglePlay(): void {
    if (this.state === 'playing') this.callbacks.onPause();
    else this.callbacks.onPlay();
  }

  /** Space plays or pauses from the track or the bar itself; a focused button or field keeps it. */
  private readonly onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== ' ' || this.mode !== 'replay' || e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    if (target !== this.scrubber && target !== this.root) return;
    e.preventDefault();
    e.stopPropagation();
    if (!this.playBtn?.disabled) this.togglePlay();
  };

  /** Said once the changes rest, so a held key or a run doesn't flood the reader. */
  private announce(text: string): void {
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      this.announceTimer = null;
      if (this.liveRegion) this.liveRegion.textContent = text;
    }, ANNOUNCE_REST_MS);
  }

  private syncUi(): void {
    const root = this.root;
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>('[data-mode]')) {
      el.hidden = el.dataset.mode !== this.mode;
    }
    root.dataset.mode = this.mode;
    root.classList.toggle('tcw-replay-bar--ended', this.ended);
    this.syncPending(root);
    if (this.playBtn) {
      const playing = this.state === 'playing';
      this.playBtn.innerHTML = createIcon(playing ? 'pause' : 'play', 14);
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
    if (this.hintText) this.hintText.textContent = this.pending ? this.labels.loading : this.labels.selectHint;
    for (const act of ['random', 'stepBack', 'stepForward', 'seek', 'step', 'selectBar']) {
      const control = root.querySelector<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(`[data-act="${act}"]`);
      if (control) control.disabled = this.pending;
    }
  }
}

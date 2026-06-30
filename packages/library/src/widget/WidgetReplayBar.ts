/**
 * Replay scrubber bar — surfaces the chart's existing replay engine as a
 * visible bottom-of-chart control. Mounts under the chart container, owns
 * its own lifecycle, and reports user intent up via callbacks (no chart
 * coupling — the host calls chart.replayStart() / replayPause() / etc.).
 */
export interface ReplayBarCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (index: number) => void;
  onSpeedChange: (barsPerSecond: number) => void;
  onClose: () => void;
}

export type ReplayBarState = 'playing' | 'paused' | 'stopped';

const SPEEDS = [0.5, 1, 2, 5, 10, 20, 50, 100];

export class WidgetReplayBar {
  private root: HTMLDivElement | null = null;
  private scrubber: HTMLInputElement | null = null;
  private progressLabel: HTMLSpanElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private state: ReplayBarState = 'stopped';
  private total = 0;
  private speed = 5;
  private callbacks: ReplayBarCallbacks;

  constructor(callbacks: ReplayBarCallbacks) {
    this.callbacks = callbacks;
  }

  mount(host: HTMLElement, opts: { total: number; speed?: number }): void {
    if (this.root) return;
    this.total = Math.max(0, opts.total);
    this.speed = opts.speed ?? 5;
    this.state = 'paused';

    this.root = document.createElement('div');
    this.root.className = 'tcw-replay-bar';
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
    this.state = 'stopped';
  }

  isMounted(): boolean {
    return this.root !== null;
  }

  setState(state: ReplayBarState): void {
    this.state = state;
    this.syncUi();
  }

  setProgress(current: number, total: number): void {
    this.total = total;
    if (this.scrubber) {
      this.scrubber.max = String(Math.max(0, total - 1));
      this.scrubber.value = String(current);
    }
    if (this.progressLabel) {
      this.progressLabel.textContent = `${current + 1} / ${total}`;
    }
  }

  destroy(): void {
    this.unmount();
  }

  private markup(): string {
    const speeds = SPEEDS.map(s => `<option value="${s}"${s === this.speed ? ' selected' : ''}>${s}× bars/s</option>`).join('');
    return `
      <button class="tcw-replay-btn" data-act="close" title="Exit replay" aria-label="Exit replay">${svgX()}</button>
      <button class="tcw-replay-btn" data-act="stepBack" title="Step back" aria-label="Step back">${svgStepBack()}</button>
      <button class="tcw-replay-btn tcw-replay-play" data-act="play" title="Play / pause" aria-label="Play / pause">${svgPlay()}</button>
      <button class="tcw-replay-btn" data-act="stepForward" title="Step forward" aria-label="Step forward">${svgStepForward()}</button>
      <input type="range" class="tcw-replay-scrubber" data-act="seek" min="0" max="${Math.max(0, this.total - 1)}" value="0" step="1" />
      <span class="tcw-replay-progress" data-tcw="progress">1 / ${this.total}</span>
      <select class="tcw-replay-speed" data-act="speed">${speeds}</select>
    `;
  }

  private wireEvents(): void {
    if (!this.root) return;
    this.scrubber = this.root.querySelector('input[data-act="seek"]');
    this.progressLabel = this.root.querySelector('[data-tcw="progress"]');
    this.playBtn = this.root.querySelector('button[data-act="play"]');

    this.root.querySelector('[data-act="close"]')?.addEventListener('click', () => this.callbacks.onClose());
    this.root.querySelector('[data-act="stepBack"]')?.addEventListener('click', () => this.callbacks.onStepBack());
    this.root.querySelector('[data-act="stepForward"]')?.addEventListener('click', () => this.callbacks.onStepForward());
    this.playBtn?.addEventListener('click', () => {
      if (this.state === 'playing') {
        this.callbacks.onPause();
      } else {
        this.callbacks.onPlay();
      }
    });
    this.scrubber?.addEventListener('input', () => {
      const idx = Number(this.scrubber!.value);
      this.callbacks.onSeek(idx);
    });
    (this.root.querySelector('[data-act="speed"]') as HTMLSelectElement | null)?.addEventListener('change', (e) => {
      const v = Number((e.target as HTMLSelectElement).value);
      this.speed = v;
      this.callbacks.onSpeedChange(v);
    });
  }

  private syncUi(): void {
    if (!this.playBtn) return;
    this.playBtn.innerHTML = this.state === 'playing' ? svgPause() : svgPlay();
    this.playBtn.title = this.state === 'playing' ? 'Pause' : 'Play';
  }
}

function svgPlay(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>';
}
function svgPause(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
}
function svgStepBack(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6L9 12l11 6V6z"/></svg>';
}
function svgStepForward(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6l11 6L4 18V6zM16 6h2v12h-2z"/></svg>';
}
function svgX(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
}

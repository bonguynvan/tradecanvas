import type { DataAdapter, DataSeries, ReplayStepPayload, ReplayStepsLoadPayload, TimeFrame } from '@tradecanvas/commons';
import { timeframeToMs, zonedDateFormatter } from '@tradecanvas/commons';
import { ResamplingAdapter, servesTimeframe, withResampling } from '@tradecanvas/core';
import type { Chart } from '../Chart.js';
import { resampleOHLCV } from '../io/index.js';
import { replayStepChoices, resolveReplayStep } from '../replay/replayStep.js';
import { fill, type MessageKey } from './i18n.js';
import { IME_KEY_CODE, inOverlay, isKeyTarget, isTyping } from './keyTarget.js';
import type { ChartWidgetOptions } from './types.js';
import { WidgetReplayBar, DEFAULT_REPLAY_RATE } from './WidgetReplayBar.js';
import type { WidgetLoadingOverlay } from './WidgetLoadingOverlay.js';

/** A day: bars this long or longer have no time of day to go to. */
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
/** A bar of the chart at 1×, ms. */
const REPLAY_BAR_MS = 1000;
/** How often the replay panel follows the chart (ms). */
const REPLAY_POLL_MS = 150;
/** The most finer bars fetched for one replay. */
const MAX_REPLAY_STEPS = 5000;
/** The replay bar's margin over the main pane, each side (the --tcw-space-4 step). */
const REPLAY_BAR_MARGIN = 8;

/**
 * What bar replay reads of the widget around it, and asks of it. `root`, `chartContainer`,
 * `options` and `loading` are given once: the widget keeps the same ones for its whole life.
 */
export interface ReplayHost {
  chart(): Chart;
  readonly root: HTMLElement;
  readonly chartContainer: HTMLElement;
  readonly options: ChartWidgetOptions;
  t(key: MessageKey): string;
  /** Whether the replay's switch is on. */
  isOn(): boolean;
  isDestroyed(): boolean;
  /** The overlay over the chart while bars load. */
  readonly loading: WidgetLoadingOverlay;
  symbol(): string;
  timeframe(): TimeFrame;
  /** The widget's feed, if it has one. */
  adapter(): DataAdapter | null;
  /** The bars given without a feed, at their own interval, and that interval (ms). */
  baseSeries(): DataSeries | null;
  baseTimeframeMs(): number;
  resampleOptions(zone: string | null): { weekStartsOn: 0 | 1; timeZone?: string };
  textLocale(): string;
  intlLocale(): string;
  say(text: string, kind: 'info' | 'error'): void;
  /** Shows the toolbar's Bar replay button on or off. */
  markActive(on: boolean): void;
  /** The widget's body, under its toolbar. */
  bodyEl(): HTMLElement | null;
}

/**
 * Bar replay in the widget: the panel over the chart, picking the start bar on it, the
 * session it drives on the chart (in whole bars or finer steps), and its keys.
 */
export class WidgetReplay {
  private replayBar: WidgetReplayBar | null = null;
  private replayPollInterval: ReturnType<typeof setInterval> | null = null;
  /** The replay's speed, a multiplier: 1 plays one bar of the chart a second. */
  private replaySpeed = DEFAULT_REPLAY_RATE;
  /** The chart's bars the replay goes through, and when the step shown opened (from `replayStep`). */
  private replayBarsTotal: number | null = null;
  private replayStepTime: number | null = null;
  /** The symbol and interval of the finer steps given to the replay running (null: none given). */
  private replayStepsKey: string | null = null;
  /** `'auto'`, `'bar'`, or the finer interval a replay steps through. */
  private replayStep = 'auto';
  private replayStartSeq = 0;
  /** The time of a bar picked while the next bars loaded: the replay starts there once they come. */
  private replayPickTime: number | null = null;
  /** A replay start waiting for its finer steps: a Play pressed meanwhile plays it once it starts. */
  private replayStartPending = false;
  private replayPlayWanted = false;
  /** Finer bars fetched or built for the last replay in steps. */
  private replayStepsCache: { key: string; steps: DataSeries } | null = null;
  /** While picking the start bar: shades the bars right of the pointer. */
  private replayShade: HTMLDivElement | null = null;

  constructor(private readonly host: ReplayHost) {
    this.replayStep = host.options.replayStep ?? 'auto';
  }

  private get chart(): Chart {
    return this.host.chart();
  }

  private get root(): HTMLElement {
    return this.host.root;
  }

  private get chartContainer(): HTMLElement {
    return this.host.chartContainer;
  }

  private get t(): (key: MessageKey) => string {
    return this.host.t;
  }

  /** Whether the replay's panel is open. */
  isOpen(): boolean {
    return this.replayBar?.isMounted() ?? false;
  }

  /** Follows the chart: a click picks the start bar or moves the replay there, and the panel keeps up. */
  attach(): void {
    // Replay: while picking, a click starts the replay at that bar; during a
    // replay it jumps the cursor there.
    this.chart.on('barClick', (e) => {
      if (!this.replayBar?.isMounted()) return;
      const { barIndex: idx, bar: clicked } = e.payload as { barIndex?: number; bar?: { time?: number } };
      if (typeof idx !== 'number') return;
      // While the next bars load, the bar clicked is one of the old ones: keep its time and
      // start there once they come (syncReplayBar), rather than drop the click.
      if (this.seriesPending()) {
        const time = clicked?.time ?? this.chart.getData()[idx]?.time;
        if (this.replayBar.getMode() === 'select' && typeof time === 'number') this.replayPickTime = time;
        return;
      }
      if (this.replayBar.getMode() === 'select') {
        this.startReplayAt(idx, false, true);
        return;
      }
      if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
      // To the end of the bar clicked (in finer steps, its last step).
      this.chart.replaySeekToBar(idx);
      this.replayBar.setState('paused');
    });
    // While picking the start bar, shade the bars that would be hidden.
    this.chart.on('crosshairMove', (e) => {
      if (this.replayBar?.getMode() !== 'select' || !this.replayBar.isMounted()) return;
      const point = (e.payload as { point?: { x: number } | null }).point;
      this.positionReplayShade(this.seriesPending() ? null : point?.x ?? null);
    });
    // The replay went on over new bars (another interval, say): the panel follows.
    this.chart.on('replayStep', (e) => {
      const step = e.payload as ReplayStepPayload;
      this.replayBarsTotal = step.total;
      this.replayStepTime = typeof step.stepTime === 'number' ? step.stepTime : step.time;
      // Read once the chart is done: a carry-over resumes after its step, and the next bar starts to form after it.
      queueMicrotask(() => {
        if (this.host.isDestroyed()) return;
        if (step.cause === 'series') this.afterReplayCarryOver();
        else this.syncReplayBar();
      });
    });
    for (const event of ['resize', 'paneResize', 'paneChange'] as const) {
      this.chart.on(event, () => this.layoutReplayBar());
    }
    // The finer bars a replay fetches for itself failed: its bars form from their own prices.
    this.chart.on('replayStepsLoad', (e) => {
      if ((e.payload as ReplayStepsLoadPayload).state === 'error') this.host.say(this.t('replay.stepsFailed'), 'error');
    });
    this.chart.on('timeframeChange', () => this.refreshReplaySteps());
  }

  destroy(): void {
    if (this.replayPollInterval) clearInterval(this.replayPollInterval);
    this.replayShade?.remove();
    this.replayBar?.destroy();
  }

  /** Open (or close) bar replay with its scrubber — what the toolbar's Replay button does. */
  toggleReplay(): void {
    if (this.replayBar?.isMounted()) {
      this.exitReplay();
    } else if (this.host.isOn()) {
      this.enterReplay();
    }
  }

  /**
   * Open replay in "pick a start bar" mode: the bars right of the pointer
   * are shaded, and a click cuts the chart there and waits paused. Play
   * starts from a default point; "random bar" picks one.
   */
  private enterReplay(): void {
    if (this.replayTotal() < 2) return;

    const t = this.t;
    this.replayBar = new WidgetReplayBar(
      {
        onPlay: () => {
          if (this.replayBar?.getMode() === 'select') {
            if (!this.seriesPending()) this.startReplayAt(Math.max(1, this.replayTotal() - 100), true);
            return;
          }
          // A start still waiting for its steps plays once it starts.
          if (this.replayStartPending) this.replayPlayWanted = true;
          else if (this.chart.getReplayState() === 'paused') this.chart.replayResume();
          this.syncReplayBar();
        },
        onPause: () => {
          this.replayPlayWanted = false;
          this.chart.replayPause();
          this.syncReplayBar();
        },
        onStepBack: () => this.stepReplay(-1),
        onStepForward: () => this.stepReplay(1),
        onSeek: (idx) => {
          if (this.seriesPending()) return;
          if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
          this.chart.replaySeek(idx);
          this.replayBar?.setState('paused');
        },
        onSpeedChange: (rate) => {
          this.replaySpeed = rate;
          this.chart.setReplaySpeed(rate);
        },
        onRandomStart: () => {
          if (this.seriesPending()) return;
          // The chart's bars, not the steps of a replay in finer steps.
          const n = this.replayBarCount();
          // Somewhere in the middle 80%, so there is history before and bars after.
          const lo = Math.max(1, Math.floor(n * 0.1));
          const hi = Math.max(lo, Math.floor(n * 0.9));
          this.startReplayAt(lo + Math.floor(Math.random() * (hi - lo + 1)), false, true);
        },
        onClose: () => this.exitReplay(),
        onSelectBar: () => this.pickReplayBarAgain(),
        onCancelPick: () => this.cancelReplayPick(),
        onStepChange: (step) => {
          this.replayStep = step;
          if (this.replayBar?.getMode() !== 'replay') return;
          // Mid-replay: start again in the new steps from the bar before the
          // forming one (so the rest of it isn't given away), playing if it was.
          const playing = this.chart.getReplayState() === 'playing';
          this.startReplayAt(Math.max(0, this.chart.getReplayBarIndex() - 1), playing);
        },
      },
      {
        selectHint: t('replay.selectHint'),
        loading: t('status.loading'),
        random: t('replay.random'),
        realtime: t('replay.realtime'),
        play: t('replay.play'),
        pause: t('replay.pause'),
        stepBack: t('replay.stepBack'),
        stepForward: t('replay.stepForward'),
        replay: t('replay.label'),
        position: t('replay.position'),
        speed: t('replay.speed'),
        step: t('replay.step'),
        selectBar: t('replay.selectBar'),
        cancel: t('common.cancel'),
        rate: t('replay.rate'),
        rateHint: t('replay.rateHint'),
        playingAt: t('replay.playingAt'),
        pausedAt: t('replay.pausedAt'),
        endedAt: t('replay.endedAt'),
      },
    );
    const steps = this.replayStepMenu();
    this.replayBar.mount(this.chartContainer, {
      total: this.replayTotal(),
      rate: this.replaySpeed,
      mode: 'select',
      steps,
      step: this.replayStep,
      dir: this.root.dir === 'rtl' ? 'rtl' : 'ltr',
      formatRate: (rate) => fill(t('replay.rate'), { rate: rate.toLocaleString(this.host.intlLocale()) }),
    });
    this.watchReplayBar();
    this.host.markActive(true);
    this.root.setAttribute('data-tcw-replay', '');
    this.showReplayShade();
    this.layoutReplayBar();
  }

  /** While picking the start bar: the shade over the bars a pick would hide. */
  private showReplayShade(): void {
    if (this.replayShade) return;
    this.replayShade = document.createElement('div');
    this.replayShade.className = 'tcw-replay-shade';
    this.replayShade.hidden = true;
    this.chartContainer.appendChild(this.replayShade);
    this.chartContainer.addEventListener('mouseleave', this.hideReplayShade);
  }

  private removeReplayShade(): void {
    this.replayShade?.remove();
    this.replayShade = null;
    this.chartContainer.removeEventListener('mouseleave', this.hideReplayShade);
  }

  /**
   * Select bar, inside the replay: it pauses and picks again among the bars
   * shown, so the bars still to come stay hidden, the view stays and grid
   * followers go on. Cancel (or Esc) comes back to the same place.
   */
  private pickReplayBarAgain(): void {
    const bar = this.replayBar;
    if (!bar?.isMounted() || this.seriesPending()) return;
    this.replayPlayWanted = false;
    if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
    bar.setState('paused');
    bar.setMode('select');
    this.showReplayShade();
    this.layoutReplayBar();
  }

  /** Cancel picking: back to the replay when there is one, else out of it. */
  private cancelReplayPick(): void {
    const bar = this.replayBar;
    if (!bar?.isMounted()) return;
    if (!this.chart.isReplayActive() && !this.replayStartPending) {
      this.exitReplay();
      return;
    }
    this.removeReplayShade();
    bar.setMode('replay');
    this.syncReplayBar();
    this.layoutReplayBar();
  }

  /**
   * Where the bar sits: on the main pane's foot (bottom panes stay
   * readable), centred on its plot, in the tier its width allows; and how
   * high it reaches, for the toasts and the drawing button to clear it.
   */
  private layoutReplayBar(): void {
    const el = this.replayBar?.element();
    if (!el || !this.replayBar) return;
    const plot = this.chart.getPlotRect();
    const box = this.chartContainer;
    const px = (n: number) => `${Math.max(0, Math.round(n))}px`;
    el.style.setProperty('--tcw-replay-foot', px(box.clientHeight - (plot.y + plot.height)));
    el.style.setProperty('--tcw-replay-plot-start', px(plot.x));
    el.style.setProperty('--tcw-replay-plot-end', px(box.clientWidth - (plot.x + plot.width)));
    this.replayBar.setRoom(plot.width - 2 * REPLAY_BAR_MARGIN);
    this.liftOverReplayBar();
  }

  /**
   * How high the bar reaches over the widget's foot and its body's, for the
   * toasts and the drawing button to clear it. Also run as the panel follows
   * the chart: the bar's height changes with its rows and its words.
   */
  private liftOverReplayBar(): void {
    const el = this.replayBar?.element();
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const set = (host: HTMLElement | null) => {
      if (!host) return;
      const lift = `${Math.max(0, Math.round(host.getBoundingClientRect().bottom - top))}px`;
      if (host.style.getPropertyValue('--tcw-replay-lift') !== lift) host.style.setProperty('--tcw-replay-lift', lift);
    };
    set(this.root);
    set(this.host.bodyEl());
  }

  /**
   * Where the replay is, as the readout says it: the step's open time in
   * the display timezone and the widget's language; the date alone on a
   * daily chart and above, seconds under a minute (or with no interval),
   * the year only when it isn't this one.
   */
  private replayTimeText(): string | undefined {
    // The bar forming is the one on screen: name it, not the whole one before it.
    const progress = this.chart.getReplayProgress();
    const forming = this.chart.getReplayBarIndex() > progress.current ? progress.time : null;
    const time = forming ?? this.replayStepTime;
    if (time === null) return undefined;
    const locale = this.host.textLocale();
    const zone = this.chart.getTimeZone?.() ?? null;
    const ms = timeframeToMs(this.host.timeframe());
    const yearOf = zonedDateFormatter(locale, { year: 'numeric' }, zone);
    const date: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (yearOf(time) !== yearOf(Date.now())) date.year = 'numeric';
    const day = zonedDateFormatter(locale, date, zone)(time);
    if (Number.isFinite(ms) && ms >= DAY_MS) return day;
    const clock: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    if (!Number.isFinite(ms) || ms < MINUTE_MS) clock.second = '2-digit';
    return `${day} · ${zonedDateFormatter(locale, clock, zone)(time)}`;
  }

  /** The chart's bars the replay goes through (not its steps), or those loaded before it starts. */
  private replayBarCount(): number {
    return this.chart.isReplayActive() && this.replayBarsTotal !== null ? this.replayBarsTotal : this.chart.getData().length;
  }

  private readonly hideReplayShade = (): void => this.positionReplayShade(null);

  /**
   * Open replay (if it isn't open) and start it at bar `index` — paused, or
   * playing when `play` is set — skipping the pick-a-bar step.
   */
  replayFrom(index: number, play = false): void {
    if (!this.host.isOn()) return;
    if (!this.replayBar?.isMounted()) this.enterReplay();
    this.startReplayAt(index, play);
  }

  /**
   * The steps a replay can take on this interval, the one picked kept while
   * it is still one of them (else whole bars).
   */
  private replayStepMenu(): { value: string; label: string }[] {
    const steps = [
      { value: 'auto', label: this.t('replay.step.auto') },
      { value: 'bar', label: this.t('replay.step.bar') },
      ...this.replayStepOptions().map((tf) => ({ value: tf, label: tf })),
    ];
    if (!steps.some((s) => s.value === this.replayStep)) this.replayStep = 'auto';
    return steps;
  }

  /** The interval changed: the step menu offers its steps. */
  private refreshReplaySteps(): void {
    if (!this.replayBar?.isMounted()) return;
    const steps = this.replayStepMenu();
    this.replayBar.setSteps(steps, this.replayStep);
  }

  /**
   * The replay went on over new bars at the same time: the panel shows their
   * total, and a replay in finer steps fetches them for the new bars and
   * goes on from the bar it is on.
   */
  private afterReplayCarryOver(): void {
    const bar = this.replayBar;
    if (!bar?.isMounted() || bar.getMode() !== 'replay') return;
    this.syncReplayBar();
    // Whole bars, or the chart fetching the finer ones for the new bars itself.
    if (this.replayStep === 'bar' || this.chartFetchesReplaySteps()) return;
    // The same symbol and interval (a corrected bar, older bars): its steps still serve, and it keeps its place in the bar.
    if (this.replayStepsKey === this.replayStepsKeyNow()) return;
    this.startReplayAt(this.chart.getReplayBarIndex(), this.chart.getReplayState() === 'playing');
  }

  /**
   * A bar picked while the next bars loaded: once they are in, start the replay at the bar
   * holding its time; let it go if they failed or the pick was left.
   */
  private startPickedReplay(): void {
    const time = this.replayPickTime;
    if (time === null) return;
    if (this.host.loading.hasFailed() || this.replayBar?.getMode() !== 'select') {
      this.replayPickTime = null;
      return;
    }
    if (this.seriesPending()) return;
    this.replayPickTime = null;
    const bars = this.chart.getData();
    // Another symbol's bars may not reach the time: the bar asks for a pick again.
    if (!pickWithin(bars, time)) return;
    let index = 0;
    while (index + 1 < bars.length && bars[index + 1].time <= time) index++;
    this.startReplayAt(index, false, true);
  }

  /** Whether the bars on screen are about to be replaced: a new symbol's or interval's on their way. */
  private seriesPending(): boolean {
    return this.host.loading.isActive() && !this.host.loading.hasFailed();
  }

  /** The panel follows the chart, and whether the bars are on their way, a few times a second. */
  private watchReplayBar(): void {
    if (this.replayPollInterval) clearInterval(this.replayPollInterval);
    this.replayPollInterval = setInterval(() => this.syncReplayBar(), REPLAY_POLL_MS);
  }

  /**
   * Cut the chart at `index` and wait paused (or play at once). `ofBars`:
   * `index` is one of the chart's bars (a pick), not a step of the replay.
   */
  private startReplayAt(index: number, play = false, ofBars = false): void {
    const bar = this.replayBar;
    if (!bar) return;
    const n = ofBars ? this.replayBarCount() : this.replayTotal();
    const start = Math.max(0, Math.min(Number.isFinite(index) ? Math.floor(index) : 0, n - 1));
    // By time: bars that land while its steps load don't move it.
    const startTime = this.chart.getData()[start]?.time;
    this.removeReplayShade();
    bar.setMode('replay');
    this.layoutReplayBar();
    // A newer start (a quicker step choice) wins over one still fetching its steps.
    const seq = ++this.replayStartSeq;
    this.replayPlayWanted = play;
    const animate = this.host.options.replayAnimate !== false;
    const fetchedByChart = this.chartFetchesReplaySteps();
    const go = (steps: DataSeries | null) => {
      if (this.host.isDestroyed() || this.replayBar !== bar || !bar.isMounted() || seq !== this.replayStartSeq) return;
      this.replayStartPending = false;
      this.replayStepsKey = steps ? this.replayStepsKeyNow() : null;
      this.chart.replayStart({
        speed: this.replaySpeed,
        // 1× is a bar of the chart a second, whatever the step.
        interval: animate ? REPLAY_BAR_MS : REPLAY_BAR_MS / this.replayStepsPerBar(steps ? tf : null),
        ...(startTime !== undefined ? { startTime } : { startIndex: start }),
        paused: true,
        revealMarks: this.host.options.replayRevealMarks !== false,
        animate,
        ...(fetchedByChart ? { step: this.replayStep as TimeFrame | 'auto' } : {}),
        ...(steps ? { steps } : {}),
      });
      if (this.replayPlayWanted) this.chart.replayResume();
      this.replayPlayWanted = false;
      this.syncReplayBar();
      this.watchReplayBar();
    };
    const tf = this.replayStepInterval();
    if (fetchedByChart || tf === null) {
      go(null);
      return;
    }
    this.replayStartPending = true;
    void this.replayStepsFor(tf).then((steps) => {
      if (seq !== this.replayStartSeq) return; // a newer start took over
      if (!steps) this.host.say(this.t('replay.stepsFailed'), 'error');
      go(steps);
    });
  }

  private replayStepsKeyNow(): string {
    return `${this.host.symbol()}|${this.host.timeframe()}`;
  }

  /** How many steps of `tf` make a bar of the chart (1 for whole bars, or a chart without an interval). */
  private replayStepsPerBar(tf: TimeFrame | null): number {
    if (tf === null) return 1;
    const ratio = timeframeToMs(this.host.timeframe()) / timeframeToMs(tf);
    return Number.isFinite(ratio) && ratio >= 1 ? Math.round(ratio) : 1;
  }

  /** Finer intervals a replay can step through: they divide the chart's, and the feed (or the bars loaded) has them. */
  private replayStepOptions(): TimeFrame[] {
    return replayStepChoices(this.host.timeframe(), (tf) => this.hasReplayStep(tf));
  }

  /** Whether the feed serves `tf`, or the bars loaded build it. */
  private hasReplayStep(tf: TimeFrame): boolean {
    const adapter = this.host.adapter();
    if (adapter) return servesTimeframe(adapter, tf);
    const ms = timeframeToMs(tf);
    const baseMs = this.host.baseTimeframeMs();
    return this.host.baseSeries() !== null && baseMs > 0 && ms >= baseMs && ms % baseMs === 0;
  }

  /** The finer interval the step picked stands for (`'auto'` worked out here); null for whole bars. */
  private replayStepInterval(): TimeFrame | null {
    // Without animate, Auto is whole bars: finer steps of their own are a choice, as they were.
    if (this.replayStep === 'bar' || (this.replayStep === 'auto' && this.host.options.replayAnimate === false)) return null;
    return resolveReplayStep(this.replayStep as TimeFrame | 'auto', this.host.timeframe(), (tf) => this.hasReplayStep(tf));
  }

  /**
   * Whether the chart fetches a replay's finer bars itself: its bars form, a
   * step is picked and the feed pages back. A feed that can't page back gets
   * its finer bars fetched here, in one request, as before.
   */
  private chartFetchesReplaySteps(): boolean {
    const adapter = this.host.adapter();
    if (this.host.options.replayAnimate === false || !adapter || this.replayStep === 'bar') return false;
    return withResampling(adapter).fetchHistoryBefore !== undefined;
  }

  /** The finer bars for a replay in `tf` steps: from the feed, or built from the bars loaded. Null when there are none. */
  private async replayStepsFor(tf: TimeFrame): Promise<DataSeries | null> {
    const zone = this.chart.getExchangeTimeZone() ?? null;
    const symbol = this.host.symbol();
    const timeframe = this.host.timeframe();
    const key = () => `${symbol}|${timeframe}|${tf}|${zone}|${this.builtStepsZone(symbol, tf)}`;
    if (this.replayStepsCache?.key === key()) return this.replayStepsCache.steps;
    let steps: DataSeries | null = null;
    const adapter = this.host.adapter();
    const base = this.host.baseSeries();
    if (adapter) {
      const ratio = Math.max(1, Math.round(timeframeToMs(timeframe) / timeframeToMs(tf)));
      const limit = Math.min(MAX_REPLAY_STEPS, Math.max(this.chart.getData().length, 100) * ratio);
      try {
        steps = await withResampling(adapter).fetchHistory(symbol, tf, limit);
      } catch {
        steps = null;
      }
    } else if (base) {
      steps = timeframeToMs(tf) === this.host.baseTimeframeMs() ? base : resampleOHLCV(base, tf, this.host.resampleOptions(zone));
    }
    if (!steps || steps.length === 0) return null;
    // Kept under the zone the fetch settled: a first answer about the symbol comes during it.
    this.replayStepsCache = { key: key(), steps };
    return steps;
  }

  /**
   * The zone the feed's wrapper builds `tf` in for `symbol` ('' when the feed
   * serves it): after no answer about the symbol it builds on UTC's days
   * until the chart loads the symbol afresh, so steps fetched before then
   * are stale after it.
   */
  private builtStepsZone(symbol: string, tf: TimeFrame): string {
    const adapter = this.host.adapter();
    const feed = adapter ? withResampling(adapter) : null;
    if (!(feed instanceof ResamplingAdapter)) return '';
    const bucket = feed.bucketFor(symbol, tf);
    return bucket ? String(bucket.timeZone ?? 'UTC') : '';
  }

  /** Bars available to replay: the whole series, not the slice on screen. */
  private replayTotal(): number {
    return this.chart.isReplayActive() ? this.chart.getReplayProgress().total : this.chart.getData().length;
  }

  /** Mirror the replay engine in the bar; close it if the session ended elsewhere. */
  syncReplayBar(): void {
    const bar = this.replayBar;
    if (!bar?.isMounted()) return;
    bar.setPending(this.seriesPending());
    this.startPickedReplay();
    this.liftOverReplayBar();
    if (bar.getMode() !== 'replay') return;
    if (this.replayStartPending) {
      // Waiting for its steps: no session yet, so nothing plays.
      bar.setState('paused');
      return;
    }
    if (!this.chart.isReplayActive()) {
      // The host ended it (replayStop), or a paper account's symbol changed.
      this.teardownReplayUi();
      return;
    }
    const p = this.chart.getReplayProgress();
    const state = this.chart.getReplayState();
    bar.setProgress(p.current, p.total, this.replayTimeText());
    bar.setState(state === 'stopped' ? 'paused' : state);
    bar.setEnded(state !== 'playing' && p.total > 0 && p.current >= p.total - 1);
  }

  private stepReplay(delta: number): void {
    if (this.replayBar?.getMode() !== 'replay' || this.seriesPending()) return;
    const p = this.chart.getReplayProgress();
    if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
    // A bar half drawn: forward completes it first; back leaves the one before it whole.
    const forming = this.chart.getReplayBarIndex() > p.current;
    const target = forming ? (delta > 0 ? this.chart.getReplayBarIndex() : p.current) : p.current + delta;
    this.chart.replaySeek(Math.max(0, Math.min(p.total - 1, target)));
    this.replayBar.setState('paused');
    this.syncReplayBar();
  }

  /**
   * Replay shortcuts: Shift+←/→ step one bar, Space on the chart plays or
   * pauses, Escape cancels picking a start bar. Only for the widget used
   * last, with focus in it (or nowhere), not while typing or in a dialog.
   */
  handleReplayKey(e: KeyboardEvent): boolean {
    if (e.defaultPrevented || e.isComposing || e.keyCode === IME_KEY_CODE) return false;
    if (isTyping() || inOverlay() || !isKeyTarget(this.root, true)) return false;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !this.root.contains(active)) return false;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
      return false;
    }
    const mode = this.replayBar?.getMode();
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && mode === 'replay') {
      e.preventDefault();
      // The chart's own Shift+Arrow scrolls ten bars; this one steps the replay.
      e.stopPropagation();
      this.stepReplay(e.key === 'ArrowRight' ? 1 : -1);
      return true;
    }
    if (e.key === ' ' && mode === 'replay' && this.onChartSurface(active)) {
      // Before the chart's own Space (fit content), which listens on window.
      e.preventDefault();
      e.stopPropagation();
      this.toggleReplayPlay();
      return true;
    }
    if (e.key === 'Escape' && mode === 'select') {
      this.cancelReplayPick();
      return true;
    }
    return false;
  }

  /** Focus on the chart itself (its container or the canvas in it), not on a control over it. */
  private onChartSurface(active: HTMLElement | null): boolean {
    if (!active || !this.chartContainer.contains(active)) return false;
    return active === this.chartContainer || active.closest('button, [role="button"], a, .tcw-replay-bar') === null;
  }

  private toggleReplayPlay(): void {
    if (this.replayStartPending) {
      this.replayPlayWanted = !this.replayPlayWanted;
      return;
    }
    if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
    else if (!this.replayBarAtEnd()) this.chart.replayResume();
    this.syncReplayBar();
  }

  private replayBarAtEnd(): boolean {
    const p = this.chart.getReplayProgress();
    return p.total > 0 && p.current >= p.total - 1;
  }

  private positionReplayShade(x: number | null): void {
    const shade = this.replayShade;
    if (!shade) return;
    const plot = this.chart.getPlotRect();
    if (x === null || x < plot.x || x > plot.x + plot.width) {
      shade.hidden = true;
      return;
    }
    shade.hidden = false;
    shade.style.left = `${x}px`;
    shade.style.top = `${plot.y}px`;
    shade.style.width = `${plot.x + plot.width - x}px`;
    shade.style.height = `${plot.height}px`;
  }

  /** Leave replay and return to the live series (with updates that arrived meanwhile). */
  exitReplay(): void {
    this.teardownReplayUi();
    this.chart.replayStop();
  }

  private teardownReplayUi(): void {
    this.replayStartSeq++; // a start still fetching its steps is dropped
    this.replayPickTime = null;
    this.replayStartPending = false;
    this.replayPlayWanted = false;
    if (this.replayPollInterval) {
      clearInterval(this.replayPollInterval);
      this.replayPollInterval = null;
    }
    this.removeReplayShade();
    const hadFocus = !!this.replayBar?.element()?.contains(document.activeElement);
    this.replayBar?.unmount();
    this.replayBar = null;
    this.replayBarsTotal = null;
    this.replayStepTime = null;
    this.host.markActive(false);
    this.root.removeAttribute('data-tcw-replay');
    this.root.style.removeProperty('--tcw-replay-lift');
    this.host.bodyEl()?.style.removeProperty('--tcw-replay-lift');
    if (hadFocus) this.focusAfterReplay();
  }

  /**
   * Focus was in the bar: back to the toolbar's Bar replay button, or the
   * "more" menu that folds it on a narrow toolbar, or the chart.
   */
  private focusAfterReplay(): void {
    const visible = (el: HTMLElement | null) => !!el && !el.hidden && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none';
    const btn = this.root.querySelector<HTMLElement>('.tcw-toolbar [data-role="replay"]');
    const more = this.root.querySelector<HTMLElement>('.tcw-toolbar .tcw-toolbar-more');
    const target = visible(btn) ? btn : visible(more) ? more : this.chartContainer;
    target?.focus();
  }
}

/**
 * Whether `time` falls in the span of `bars`: from the first bar's start to the last one's
 * end, the last bar taken as long as the one before it.
 */
function pickWithin(bars: readonly { time: number }[], time: number): boolean {
  const n = bars.length;
  if (n === 0 || time < bars[0].time) return false;
  const last = bars[n - 1].time;
  const lastSpan = n > 1 ? last - bars[n - 2].time : 0;
  return time < last + lastSpan || time === last;
}

import type { ChartType } from '@tradecanvas/commons';
import type { ChartSettingsState } from './types.js';
import { DEFAULT_SETTINGS } from './widgetConfig.js';
import { MOD_KEY } from './platformKeys.js';
import { LAYOUT_LEAVES, SHARE_LEAVES, pickSettings, readChartSettings, shareDelta } from './chartSettingsStore.js';
import { WidgetLayoutsUI } from './WidgetLayoutsUI.js';
import { layoutChartState, readWidgetLayout, parseLayoutJson, type WidgetLayoutContent } from './widgetLayout.js';
import { LayoutSession } from '../state/LayoutSession.js';
import { localStorageLayouts, type SavedLayout } from '../state/layoutStorage.js';
import { utcToWallTime } from './wallTime.js';
import { encodeWidgetState, decodeWidgetState, readShareHash, buildShareUrl } from './widgetShareState.js';
import type { ChartWidget } from './ChartWidget.js';

/**
 * The switches that start where the host's features put them. A share link
 * measures them from the sender's start, not the library's: a switch the
 * sender's app turned off is the app's, not the sender's choice, and would
 * turn it off in an app that has it on.
 */
const FEATURE_SET_SETTINGS: readonly (keyof ChartSettingsState)[] = ['legendVisible', 'volumeVisible', 'barCountdown', 'indicatorValueLabels', 'alignAxisLabels'];

/** What the layouts read of the widget around them, and ask of it. */
export interface LayoutsHost {
  allowedSettings: ChartWidget['chartSettings']['allowedSettings'];
  applyChartType: ChartWidget['applyChartType'];
  applySettings: ChartWidget['chartSettings']['applySettings'];
  readonly chart: ChartWidget['chart'];
  readonly chosenTimeframe: ChartWidget['chosenTimeframe'];
  claimSettings: ChartWidget['chartSettings']['claimSettings'];
  readonly destroyed: ChartWidget['destroyed'];
  displayTimezone: ChartWidget['displayTimezone'];
  getSettings: ChartWidget['chartSettings']['getSettings'];
  keysShown: ChartWidget['keysShown'];
  readonly options: ChartWidget['options'];
  overViewerTypeOptions: ChartWidget['overViewerTypeOptions'];
  readonly root: ChartWidget['root'];
  say: ChartWidget['say'];
  setSymbol: ChartWidget['setSymbol'];
  setTimeframe: ChartWidget['setTimeframe'];
  readonly settings: ChartWidget['settings'];
  readonly settingsDefaults: ChartWidget['chartSettings']['settingsDefaults'];
  showLinkSettings: ChartWidget['chartSettings']['showLinkSettings'];
  shownSettings: ChartWidget['chartSettings']['shownSettings'];
  state: ChartWidget['state'];
  syncIndicatorsFromChart: ChartWidget['syncIndicatorsFromChart'];
  readonly t: ChartWidget['t'];
  readonly toolbar: ChartWidget['toolbar'];
  updateUI: ChartWidget['updateUI'];
}

/**
 * The widget's layouts: what one holds (the chart's state and the widget's), the named layouts
 * and the one in use, saving it as it changes, a symbol's own layout, and the state shared by link.
 */
export class WidgetLayouts {
  constructor(private readonly host: LayoutsHost) {}

  layoutSession: LayoutSession | null = null;

  layoutsUI: WidgetLayoutsUI | null = null;

  layoutKeyPrefix: string | null = null;

  layoutDebounceMs = 1500;

  private activeLayoutKey: string | null = null;

  /** A view shared in the URL (`#tcw=`), when `shareUrl` is on. */
  restoreSharedView(): void {
    if (!this.host.options.shareUrl || typeof location === 'undefined') return;
    const encoded = readShareHash(location.hash);
    if (encoded) void this.importState(encoded);
  }

  /**
   * Encode the current view (symbol, timeframe, chart type, scale,
   * indicators, drawings, and the Chart Settings changed from the defaults
   * but the viewer's time zone and number format; for the switches the
   * host's features set, from where they set them).
   */
  exportState(): string {
    const indicators = this.host.chart.getActiveIndicators().map((i) => ({
      id: i.id,
      params: i.params as Record<string, number | string | boolean>,
    }));
    const settings = this.host.getSettings();
    // Only what differs from the defaults, so a link stays short; the switches
    // the host's features set, from where they set them.
    const base = { ...DEFAULT_SETTINGS, ...Object.fromEntries(FEATURE_SET_SETTINGS.map((key) => [key, this.host.settingsDefaults[key]])) };
    const changed = shareDelta(settings, base);
    return encodeWidgetState({
      v: 1,
      symbol: this.host.state.symbol,
      timeframe: this.host.state.timeframe,
      chartType: this.host.state.chartType,
      scaleMode: settings.scaleMode,
      indicators,
      drawings: this.host.chart.getDrawings(),
      ...(Object.keys(changed).length > 0 ? { settings: changed } : {}),
    });
  }

  /** Restore a view from an `exportState()` string. Returns false if malformed. */
  async importState(encoded: string): Promise<boolean> {
    const s = decodeWidgetState(encoded);
    if (!s) return false;

    // Symbol/timeframe first so any stream/layout restore happens before we
    // overlay the shared view on top.
    if (s.symbol && s.symbol !== this.host.state.symbol) await this.host.setSymbol(s.symbol);
    if (s.timeframe && s.timeframe !== this.host.state.timeframe) await this.host.setTimeframe(s.timeframe);

    if (s.chartType) this.host.applyChartType(s.chartType);
    // Through the settings, so a percent compare keeps its scale and the settings show the shared one;
    // the sender's overlays with it, never their time zone or number format (the reader leaves those out).
    const { chartTypeOptions, ...shared } = this.host.allowedSettings({ scaleMode: s.scaleMode, ...readChartSettings(s.settings, SHARE_LEAVES) });
    const typeOptions = this.host.overViewerTypeOptions(s.chartType, chartTypeOptions);
    this.host.showLinkSettings(typeOptions ? { ...shared, chartTypeOptions: typeOptions } : shared);
    this.host.settings?.refresh(this.host.shownSettings());

    // The shared indicators in place of the chart's, as one undo step.
    this.host.chart.applyIndicatorSetup(s.indicators.map((ind, i) => ({ id: ind.id, instanceId: `shared_${i}`, params: ind.params })));
    this.host.chart.setDrawings(s.drawings);
    this.host.updateUI();
    return true;
  }

  /** Copy a shareable deep-link (current view encoded in the URL hash) to the clipboard. */
  async copyShareLink(): Promise<void> {
    const base = typeof location !== 'undefined' ? location.href : '';
    const url = buildShareUrl(base, this.exportState());
    try {
      await navigator.clipboard.writeText(url);
      this.host.say(this.host.t('toast.linkCopied'));
    } catch {
      this.host.say(this.host.t('toast.copyFailed'), 'error');
    }
  }

  /** Named layouts: save, open, rename, delete, auto-save. `null` with `layouts: false`. */
  getLayoutSession(): LayoutSession | null {
    return this.layoutSession;
  }

  /**
   * This chart as a layout: symbol, interval, scale, the Chart Settings (but
   * the viewer's time zone and number format) and the chart's state (no
   * theme). A copy, free to keep.
   */
  captureLayout(): WidgetLayoutContent {
    const settings = this.host.getSettings();
    const json = this.host.chart.saveState();
    const state = json ? parseLayoutJson(json) : null;
    // The theme stays the viewer's; the time of the capture would make every capture differ.
    const chart = state && typeof state === 'object' ? layoutChartState(state as Record<string, unknown>) : null;
    return {
      v: 1,
      symbol: this.host.state.symbol,
      // The user's timeframe, not one a long range switched to.
      timeframe: this.host.chosenTimeframe ?? this.host.state.timeframe,
      scaleMode: settings.scaleMode,
      invertScale: settings.invertScale,
      chart,
      // All of them, not only those changed: the layout opens as it was saved.
      settings: pickSettings(settings, LAYOUT_LEAVES),
    };
  }

  /** Show a layout from `captureLayout()`. */
  async restoreLayout(content: WidgetLayoutContent): Promise<void> {
    if (content.symbol !== this.host.state.symbol) await this.host.setSymbol(content.symbol);
    if (content.timeframe !== this.host.state.timeframe) await this.host.setTimeframe(content.timeframe);
    if (this.host.destroyed) return;
    if (content.chart) {
      this.host.chart.loadState(JSON.stringify(layoutChartState(content.chart)));
      const type = content.chart.chartType;
      if (typeof type === 'string') this.host.state = { ...this.host.state, chartType: type as ChartType };
    }
    // A layout saved before the settings were kept has none: they stay as they are.
    const settings = this.host.allowedSettings({
      scaleMode: content.scaleMode,
      invertScale: content.invertScale,
      ...readChartSettings(content.settings, LAYOUT_LEAVES),
    });
    this.host.claimSettings(Object.keys(settings) as (keyof ChartSettingsState)[]);
    this.host.applySettings(settings);
    this.host.syncIndicatorsFromChart();
    this.host.updateUI();
    this.host.settings?.refresh(this.host.shownSettings(), this.host.state.chartType);
  }

  /** `captureLayout()` as JSON. */
  getLayoutContent(): string {
    return JSON.stringify(this.captureLayout());
  }

  /** Show a layout from `getLayoutContent()`; `false` when it is not one. */
  async applyLayoutContent(content: string): Promise<boolean> {
    const layout = readWidgetLayout(parseLayoutJson(content));
    if (!layout) return false;
    await this.restoreLayout(layout);
    return true;
  }

  setupLayouts(cfg: import('./types.js').WidgetLayoutsOptions): void {
    const session = new LayoutSession(cfg.storage ?? localStorageLayouts(), {
      capture: () => ({ content: this.getLayoutContent(), symbol: this.host.state.symbol, timeframe: this.host.chosenTimeframe ?? this.host.state.timeframe }),
      apply: async (layout: SavedLayout) => {
        if (!(await this.applyLayoutContent(layout.content))) throw new Error('Not a widget layout');
      },
    }, {
      autoSave: cfg.autoSave,
      debounceMs: cfg.debounceMs,
      onChange: () => this.host.toolbar?.setLayout(session.current()?.name ?? null, session.isDirty()),
      onError: () => this.host.say(this.host.t('layouts.saveFailed'), 'error'),
    });
    this.layoutSession = session;
    this.layoutsUI = new WidgetLayoutsUI(session, {
      root: this.host.root,
      t: this.host.t,
      saveKeys: () => this.host.keysShown('hotkeys.save', `${MOD_KEY}+S`),
      toast: (message, kind) => this.host.say(message, kind),
      formatTime: (ms) => {
        const { date, time } = utcToWallTime(ms, this.host.displayTimezone());
        return `${date} ${time}`;
      },
    });
    this.host.chart.on('stateChange', () => session.changed());
    if (cfg.openLast) {
      void session.list().then(([last]) => (last && !this.host.destroyed ? this.openLayout(last.id) : undefined), () => undefined);
    }
  }

  /** Save into the open layout, or ask for a name when there is none. */
  async saveLayout(): Promise<void> {
    await this.layoutsUI?.save();
  }

  /** Open a saved layout by id; `false` when it could not be. */
  async openLayout(id: string): Promise<boolean> {
    return (await this.layoutsUI?.open(id)) ?? false;
  }

  /**
   * Wipe the layout saved for `symbol` (or the active symbol if omitted).
   * Useful as an "Reset layout" command in user-facing menus.
   */
  clearSavedLayout(symbol?: string): void {
    if (!this.layoutKeyPrefix) return;
    const target = symbol ?? this.host.state.symbol;
    try {
      localStorage.removeItem(this.layoutKeyPrefix + target);
    } catch { /* localStorage may be unavailable (private mode, SSR, etc.) */ }
  }

  applySymbolLayout(symbol: string): void {
    if (!this.layoutKeyPrefix) return;
    const key = this.layoutKeyPrefix + symbol;
    this.activeLayoutKey = key;

    try {
      // Best-effort load. If parsing or any restore step throws, we silently
      // fall back to a fresh layout — a corrupted layout shouldn't break the
      // chart.
      const ok = this.host.chart.loadStateFromStorage(key);
      if (ok) this.host.syncIndicatorsFromChart();
    } catch { /* swallow — layout will be rebuilt from user actions */ }

    // Wire chart-level auto-save so any further drawing/indicator change
    // flushes itself into this symbol's slot.
    this.host.chart.setAutoSave(key, this.layoutDebounceMs);
  }

  flushActiveLayout(): void {
    if (!this.activeLayoutKey) return;
    try { this.host.chart.saveState(this.activeLayoutKey); } catch { /* same */ }
    this.host.chart.disableAutoSave();
    this.activeLayoutKey = null;
  }
}

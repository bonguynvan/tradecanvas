import type { PriceScaleMode } from '@tradecanvas/commons';
import { settingToTimezone, timezoneToSetting } from './widgetTimezones.js';
import type { ChartSettingsState, SettingsStylePatch } from './types.js';
import { SETTINGS_LOOK_KEYS } from './widgetSettingsLook.js';
import type { WidgetSettings, SettingsTab } from './WidgetSettings.js';
import { ChartTemplateStore } from './chartTemplates.js';
import { ChartSettingsStore, readChartSettings, typesAtDefaults, typesWithSettings } from './chartSettingsStore.js';
import { WidgetNamePrompt } from './WidgetNamePrompt.js';
import { fill } from './i18n.js';
import { type ChartStyleKey } from '@tradecanvas/commons';
import { VIEWER_KEYS } from './chartSettingsStore.js';
import type { ChartWidget } from './ChartWidget.js';
import { signal, effect, batch, type Dispose } from './signals.js';
import { DEFAULT_SETTINGS } from './widgetConfig.js';

/** Settings a layout doesn't hold (the viewer's own, and auto-scale, which a drag changes): a change to them leaves the open layout as saved. */
const NOT_IN_LAYOUT = new Set<keyof ChartSettingsState>([...VIEWER_KEYS, 'autoScale']);

/** What the chart settings read of the widget around them, and ask of them. */
export interface ChartSettingsHost {
  readonly chart: ChartWidget['chart'];
  readonly comparing: ChartWidget['comparing'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly featureState: ChartWidget['featureState'];
  readonly layouts: ChartWidget['layouts'];
  readonly legend: ChartWidget['legend'];
  readonly overlayHost: ChartWidget['overlayHost'];
  placeDrawingButton: ChartWidget['placeDrawingButton'];
  say: ChartWidget['say'];
  readonly settings: ChartWidget['settings'];
  readonly settingsPart: ChartWidget['settingsPart'];
  readonly state: ChartWidget['state'];
  readonly statusBar: ChartWidget['statusBar'];
  readonly t: ChartWidget['t'];
  readonly watching: ChartWidget['watching'];
  whenLoaded: ChartWidget['whenLoaded'];
}

/**
 * The chart settings: their state and defaults, the store that keeps them, the settings dialog
 * and the edit it makes (OK as one undo step, Cancel back), the chart's templates, the settings
 * a host locks or a shared link shows, what the chart changed itself, and the scale mode shown.
 */
export class WidgetChartSettings {
  constructor(private readonly host: ChartSettingsHost) {}

  /** The chart templates of the settings' Template menu, and the prompt that names a new one. */
  chartTemplates = new ChartTemplateStore();

  chartTemplatePrompt: WidgetNamePrompt | null = null;

  /**
   * The settings open now: as they were on opening, and the keys changed since
   * (a change, a reset, a template). Cancel puts those back, OK records them
   * as one step; the rest (an axis dragged meanwhile) is left as it is.
   */
  settingsEdit: {
    settings: ChartSettingsState;
    style: { theme: string; overrides: SettingsStylePatch };
    keys: Set<keyof ChartSettingsState>;
    styleKeys: Set<ChartStyleKey>;
    /** Whether percent compares held the price scale in percent on opening. */
    held: boolean;
  } | null = null;

  /** The Chart Settings, followed by the open settings dialog (`followSettings`). */
  private readonly state = signal<ChartSettingsState>(DEFAULT_SETTINGS);
  /** A change made in the settings dialog is running: it shows it already. */
  private dialogChanging = 0;

  /** The Chart Settings now. Read without following, so an effect that only asks for them doesn't run again on each change. */
  get settingsState(): ChartSettingsState {
    return this.state.peek();
  }

  set settingsState(value: ChartSettingsState) {
    this.state.set(value);
  }

  /** The cursor kind, followed: an effect that reads it runs again when it changes. */
  followCrosshairCursor(): ChartSettingsState['crosshairCursor'] {
    return this.state.get().crosshairCursor;
  }

  /** What Reset in the settings panel goes back to: the defaults, as the host's features set them. */
  settingsDefaults!: ChartSettingsState;

  /** Where `persistSettings` keeps the settings; null while it is off. */
  settingsStore: ChartSettingsStore | null = null;

  /**
   * The settings as last kept and told to the listeners, as JSON: a change
   * that leaves them so (a Cancel, a call setting what is already set) is
   * neither. Null while the widget is being made, which tells nobody.
   */
  private settingsPublished: string | null = null;

  /**
   * The settings shared links set this visit (`shown`) and the viewer's own
   * they took the place of (`own`): what `persistSettings` keeps for a
   * setting still as a link set it. Null when no link set any.
   */
  private linkSettings: { shown: Partial<ChartSettingsState>; own: Partial<ChartSettingsState> } | null = null;

  readonly settingsListeners = new Set<(settings: ChartSettingsState) => void>();

  /** Switches the host's features turned off: a setting kept, shared or in a layout can't turn them on. */
  settingsLocked: ReadonlySet<keyof ChartSettingsState> = new Set();

  /** The status bar's scale switches as the chart is now (a shared link or your code may have set it). */
  refreshScaleSwitches(): void {
    this.host.statusBar?.setScale({ mode: this.host.chart.getScaleMode(), auto: this.host.chart.isAutoScale() });
  }

  /** `mode` on, or back to a regular scale when it is on already, through the settings. */
  toggleScaleMode(mode: 'percentage' | 'logarithmic'): void {
    this.changeSettings({ scaleMode: this.host.chart.getScaleMode() === mode ? 'regular' : mode });
  }

  /**
   * A link's settings, for this visit: shown, but neither kept nor told.
   * They are someone else's choices (an upside-down scale, a hidden price),
   * so `persistSettings` keeps the viewer's own in their place until the
   * viewer changes them, and listeners hear of them with the next change.
   */
  showLinkSettings(patch: Partial<ChartSettingsState>): void {
    const before = this.getSettings();
    const keys = Object.keys(patch) as (keyof ChartSettingsState)[];
    const earlier = this.linkSettings;
    // A second link takes the place of the first's: the viewer's own are still from before both.
    const own = { ...Object.fromEntries(keys.map((key) => [key, before[key]])), ...earlier?.own } as Partial<ChartSettingsState>;
    this.applySettings(patch, false);
    this.linkSettings = { shown: { ...earlier?.shown, ...patch }, own };
    this.markSettingsTold();
  }

  /** `settings` with each one still as a link set it back to the viewer's own: what `persistSettings` keeps. */
  private ownSettings(settings: ChartSettingsState): ChartSettingsState {
    const link = this.linkSettings;
    if (!link) return settings;
    const still = (Object.keys(link.shown) as (keyof ChartSettingsState)[])
      .filter((key) => JSON.stringify(settings[key]) === JSON.stringify(link.shown[key]));
    return { ...settings, ...Object.fromEntries(still.map((key) => [key, link.own[key]])) };
  }

  /**
   * Settings the viewer or the host just set: a link's no more, so from here
   * on they are kept as they are, the link's value too when it is picked
   * again on purpose. Kept at once, since a pick of the value on screen (a
   * Reset where the link set the defaults) changes nothing to tell.
   */
  claimSettings(keys: Iterable<keyof ChartSettingsState>): void {
    const link = this.linkSettings;
    if (!link) return;
    const claimed = new Set(keys);
    const left = (from: Partial<ChartSettingsState>) => Object.fromEntries(
      Object.entries(from).filter(([key]) => !claimed.has(key as keyof ChartSettingsState)),
    ) as Partial<ChartSettingsState>;
    const shown = left(link.shown);
    if (Object.keys(shown).length === Object.keys(link.shown).length) return;
    this.linkSettings = Object.keys(shown).length > 0 ? { shown, own: left(link.own) } : null;
    if (this.settingsPublished !== null && !this.host.destroyed) this.settingsStore?.save(this.ownSettings(this.getSettings()), this.settingsDefaults);
  }

  /**
   * The scale on screen: the user's, or percent while percent compares hold a
   * regular one. Logarithmic, percentage and indexed to 100 are left alone: a
   * log scale draws the compare lines true, and the other two read them right.
   */
  effectiveScaleMode(): PriceScaleMode {
    return this.host.comparing.holdsPercentScale() ? 'percentage' : this.settingsState.scaleMode;
  }

  /** The scale the user picked, for a shared link, a layout and the settings: never the percent a compare holds. */
  private userScaleMode(): PriceScaleMode {
    return this.host.comparing.holdsPercentScale() ? this.settingsState.scaleMode : this.host.chart.getScaleMode();
  }

  /** The settings as the dialog shows them: the scale on screen. */
  shownSettings(): ChartSettingsState {
    return { ...this.settingsState, scaleMode: this.effectiveScaleMode() };
  }

  /** Put the chart's price scale on the one it should show now. */
  showScaleMode(): void {
    const mode = this.effectiveScaleMode();
    if (this.host.chart.getScaleMode() !== mode) this.host.chart.setScaleMode(mode);
  }

  openSettings(tab?: SettingsTab): void {
    this.host.whenLoaded(this.host.settingsPart, () => this.host.featureState.settings, (dialog) => this.showSettings(dialog, tab));
  }

  private showSettings(dialog: WidgetSettings, tab?: SettingsTab): void {
    if (dialog.isOpen()) return;
    // What it opens on is read now, once its code is in. The chart's own settings of its type (a layout may have brought them), its scale as a drag left it.
    this.syncSettingsFromChart();
    // What the dialog opens on is what listeners last heard: a drag that turned auto-scale off told
    // nobody, and Cancel, or an OK that changes nothing, must not tell them now.
    this.markSettingsTold();
    this.settingsEdit = {
      settings: { ...this.settingsState }, style: this.settingsStyle(), keys: new Set(), styleKeys: new Set(), held: this.host.comparing.compareScaleHeld,
    };
    dialog.open(this.shownSettings(), this.host.state.chartType, tab);
  }

  /** The settings closed: OK keeps what they changed as one undo step, Cancel puts it back as it was on opening. */
  endSettingsEdit(keep: boolean): void {
    const edit = this.settingsEdit;
    this.settingsEdit = null;
    if (!edit) return;
    const keys = [...edit.keys];
    const pick = (from: ChartSettingsState): Partial<ChartSettingsState> => Object.fromEntries(keys.map((k) => [k, from[k]]));
    const styleKeys = [...edit.styleKeys];
    const before = pick(edit.settings);
    const beforeStyle = styleKeys.length > 0
      ? { theme: edit.style.theme, overrides: Object.fromEntries(styleKeys.map((k) => [k, edit.style.overrides[k] ?? null])) as SettingsStylePatch }
      : null;
    // A scale picked in the settings let a compare's hold go: Cancel and an undo give it back.
    const scale = edit.keys.has('scaleMode');
    const heldAfter = this.host.comparing.compareScaleHeld;
    if (!keep) {
      // Put back as they were, which tells nobody: they are as last told.
      this.restoreSettings(before, beforeStyle, scale ? edit.held : undefined);
      return;
    }
    const after = pick(this.getSettings());
    const afterStyle = styleKeys.length > 0 ? this.settingsStyle(styleKeys) : null;
    const changed = JSON.stringify([before, beforeStyle]) !== JSON.stringify([after, afterStyle]) || (scale && edit.held !== heldAfter);
    // The undo step before the listeners hear of it, so a host's listener that throws can't cost it.
    if (changed) {
      this.host.chart.recordUndo({
        undo: () => this.restoreSettings(before, beforeStyle, scale ? edit.held : undefined),
        redo: () => this.restoreSettings(after, afterStyle, scale ? heldAfter : undefined),
      });
    }
    this.claimSettings(keys);
    this.publishSettings();
  }

  /**
   * The keys a change touched: in the open settings, what Cancel and the
   * undo step go by (and what OK takes from a link); outside them, a link's
   * no more.
   */
  private touchSettings(keys: Iterable<keyof ChartSettingsState>, styleKeys: Iterable<ChartStyleKey> = []): void {
    if (!this.settingsEdit) {
      this.claimSettings(keys);
      return;
    }
    for (const key of keys) this.settingsEdit.keys.add(key);
    for (const key of styleKeys) this.settingsEdit.styleKeys.add(key);
  }

  /** A chart template in place of the chart's look: its switches, and its colours over the theme's. */
  applyChartTemplate(name: string): void {
    const template = this.chartTemplates.get(name);
    if (!template) return;
    // Saved where the features were on, or by another app: it turns on nothing they switched off here.
    const settings = this.allowedSettings(template.settings);
    this.touchSettings(Object.keys(settings) as (keyof ChartSettingsState)[], SETTINGS_LOOK_KEYS);
    this.applySettings(settings);
    this.host.chart.resetOverrides([...SETTINGS_LOOK_KEYS], { layer: 'user' });
    this.host.chart.applyOverrides(template.style, { layer: 'user' });
    this.host.settings?.refresh(this.shownSettings());
    this.host.say(fill(this.host.t('templates.applied'), { name }));
  }

  /** Save the chart's look as a template, asking for its name over the open settings. */
  promptSaveChartTemplate(): void {
    this.chartTemplatePrompt ??= new WidgetNamePrompt(this.host.overlayHost(), this.host.t);
    this.chartTemplatePrompt.open({
      title: this.host.t('settings.saveTemplateTitle'),
      submitLabel: this.host.t('common.save'),
      placeholder: this.host.t('settings.templatePlaceholder'),
      onSubmit: (name) => {
        if (!this.chartTemplates.save(name, this.settingsState, this.settingsStyle().overrides)) {
          this.host.say(this.host.t('templates.saveFailed'), 'error');
          throw new Error('The template could not be saved');
        }
        this.host.say(fill(this.host.t('templates.saved'), { name }));
      },
    });
  }

  /**
   * The Chart Settings as they are now: the overlays, scales, crosshair,
   * legend, time zone, number format and a chart type's own settings. A
   * copy, free to keep. Read back from the chart first, so what was set on
   * `getChart()` itself is in it.
   */
  getSettings(): ChartSettingsState {
    this.syncSettingsFromChart();
    return JSON.parse(JSON.stringify(this.settingsState)) as ChartSettingsState;
  }

  /**
   * Change some of the Chart Settings, as the settings dialog does (an open
   * one shows them). What isn't a setting, or not of its kind, is left out,
   * and numbers are put in the dialog's ranges. Not an undo step: the change
   * is yours, not the user's. Auto-scale stays on until the chart has bars,
   * so settings `onSettingsChange` gave after a drag on the price axis are
   * safe to give back right after the constructor.
   */
  setSettings(patch: Partial<ChartSettingsState>): void {
    const settings = this.allowedSettings(this.withoutEarlyFreeze(readChartSettings(patch)));
    this.claimSettings(Object.keys(settings) as (keyof ChartSettingsState)[]);
    this.applySettings(settings);
  }

  /**
   * A patch without auto-scale off while the chart has no bars. Off holds the
   * price range on screen; before the first bars there is none, and the chart
   * would keep its empty 0 to 1 for every series after them.
   */
  private withoutEarlyFreeze(patch: Partial<ChartSettingsState>): Partial<ChartSettingsState> {
    if (patch.autoScale !== false || this.host.chart.getData().length > 0) return patch;
    return Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'autoScale')) as Partial<ChartSettingsState>;
  }

  /**
   * Hear of each change to the Chart Settings, with `getSettings()`: once
   * when the settings dialog closes with OK, never for Cancel or for a
   * change that leaves them as they were. Returns the function that stops it.
   */
  onSettingsChange(listener: (settings: ChartSettingsState) => void): () => void {
    this.settingsListeners.add(listener);
    return () => { this.settingsListeners.delete(listener); };
  }

  /**
   * The settings the chart says itself, over the widget's: what a host set
   * on `getChart()` directly, a scale a drag or a switched-off feature
   * changed, a type's own settings a layout brought. The scale is the
   * user's, never the percent a compare holds.
   */
  private syncSettingsFromChart(): void {
    const chart = this.host.chart;
    const zone = chart.getTimeZone?.();
    const profile = chart.getMarketProfileConfig?.();
    const pivots = chart.getPivotMarkersConfig?.();
    const read = this.allowedSettings(readChartSettings({
      gridVisible: chart.isGridVisible?.(),
      volumeVisible: chart.isVolumeVisible?.(),
      legendVisible: chart.isLegendVisible?.(),
      barCountdown: chart.isBarCountdownVisible?.(),
      indicatorValueLabels: chart.isIndicatorValueLabelsVisible?.(),
      alignAxisLabels: chart.isAxisLabelsAligned?.(),
      leftPriceScale: chart.isLeftPriceScaleVisible?.(),
      volumeProfileVisible: chart.isVolumeProfileVisible?.(),
      marketProfileVisible: chart.isMarketProfileVisible?.(),
      marketProfileSplit: profile?.splitBySession,
      marketProfileLetters: profile?.letters,
      marketProfileBuckets: profile?.buckets,
      marketProfileOpacity: profile?.opacity,
      depthHeatmapVisible: chart.isDepthHeatmapVisible?.(),
      depthHeatmapOpacity: chart.getDepthHeatmapConfig?.()?.opacity,
      pivotMarkersVisible: chart.isPivotMarkersVisible?.(),
      pivotStrength: pivots?.left,
      pivotStructureLabels: pivots?.structureLabels,
      sessionShadingVisible: chart.isSessionShadingVisible?.(),
      periodLevelsVisible: chart.isPeriodLevelsVisible?.(),
      periodLevelsPeriod: chart.getPeriodLevelsPeriod?.(),
      crosshairMode: chart.getCrosshairMode?.(),
      crosshairCursor: chart.getCrosshairCursor?.(),
      scaleMode: this.userScaleMode(),
      autoScale: chart.isAutoScale?.(),
      invertScale: chart.isInvertScale?.(),
      timezone: zone === undefined ? undefined : timezoneToSetting(zone),
      numberLocale: chart.getNumberLocale?.(),
      highLowLines: chart.isHighLowLinesVisible?.(),
      extendedHours: chart.isExtendedHoursVisible?.(),
      mainSeriesVisible: chart.isMainSeriesVisible?.(),
      chartTypeOptions: chart.getChartTypeOptions?.(),
    }));
    // The log flag goes with the scale.
    const scale = read.scaleMode ? { logScale: read.scaleMode === 'logarithmic' } : {};
    // A type at its defaults is as one never set: a reset, or a box typed and cancelled, changes nothing to listeners.
    const types = read.chartTypeOptions ? { chartTypeOptions: typesWithSettings(read.chartTypeOptions) } : {};
    this.settingsState = { ...this.settingsState, ...read, ...scale, ...types };
  }

  /**
   * A patch without what the host's features switched off: a bar countdown,
   * a legend, a volume or a log scale that isn't there stays off. Keys given
   * no value are left out too.
   */
  allowedSettings(patch: Partial<ChartSettingsState>): Partial<ChartSettingsState> {
    const locked = this.settingsLocked;
    const turnsOnLocked = (key: keyof ChartSettingsState, value: unknown): boolean => (key === 'scaleMode'
      ? value === 'logarithmic' && locked.has('logScale')
      : value === true && locked.has(key));
    return Object.fromEntries(Object.entries(patch)
      .filter(([key, value]) => value !== undefined && !turnsOnLocked(key as keyof ChartSettingsState, value))) as Partial<ChartSettingsState>;
  }

  /** The settings the user kept in this browser (`persistSettings`) back on the chart; from here on each change is kept and told. */
  restoreKeptSettings(): void {
    const kept = this.allowedSettings(this.settingsStore?.load() ?? {});
    if (Object.keys(kept).length > 0) this.applySettings(kept);
    this.settingsPublished = JSON.stringify(this.getSettings());
  }

  /** Once telling has begun, the settings as they are now count as told: the next change is measured from them. */
  private markSettingsTold(): void {
    if (this.settingsPublished !== null) this.settingsPublished = JSON.stringify(this.getSettings());
  }

  /** The settings changed: kept (`persistSettings`) and told to the listeners, unless they are as last time. */
  private publishSettings(): void {
    if (this.settingsPublished === null || this.host.destroyed) return;
    const settings = this.getSettings();
    const json = JSON.stringify(settings);
    if (json === this.settingsPublished) return;
    this.settingsPublished = json;
    this.settingsStore?.save(this.ownSettings(settings), this.settingsDefaults);
    // Each its own copy: a listener that changes what it gets changes nothing else.
    for (const listener of [...this.settingsListeners]) {
      // One that throws is the host's bug: said, and the others still hear.
      try {
        listener(JSON.parse(json) as ChartSettingsState);
      } catch (err: unknown) {
        console.error('[TradeCanvas] An onSettingsChange listener threw:', err);
      }
    }
  }

  /**
   * The open settings show the Chart Settings as they change, from code, the
   * keys, the palette, a layout or the chart read back, once a change is
   * done. A change made in them they show already, and they are not built
   * again for it or for one that changes nothing they show.
   */
  followSettings(): Dispose {
    return effect(() => {
      this.state.get();
      if (this.dialogChanging > 0) return;
      this.host.settings?.follow(this.shownSettings());
    });
  }

  /** A change made in the settings dialog. */
  changeFromDialog(patch: Partial<ChartSettingsState>): void {
    this.dialogChanging++;
    try {
      this.changeSettings(patch);
    } finally {
      this.dialogChanging--;
    }
  }

  /** `told` false leaves the change unkept and untold (a link's). The open settings show it once it is all done. */
  applySettings(patch: Partial<ChartSettingsState>, told = true): void {
    batch(() => this.applySettingsNow(patch, told));
  }

  private applySettingsNow(patch: Partial<ChartSettingsState>, told: boolean): void {
    this.settingsState = { ...this.settingsState, ...patch };
    if ((Object.keys(patch) as (keyof ChartSettingsState)[]).some((key) => !NOT_IN_LAYOUT.has(key))) this.host.layouts.layoutSession?.changed();
    this.host.legend.scheduleLegend(); // the OHLCV legend's rows and the locale move or reword it

    if (patch.gridVisible !== undefined) this.host.chart.setGridVisible(patch.gridVisible);
    if (patch.volumeVisible !== undefined) this.host.chart.setVolumeVisible(patch.volumeVisible);
    if (patch.volumeProfileVisible !== undefined) this.host.chart.setVolumeProfileVisible(patch.volumeProfileVisible);
    if (patch.marketProfileVisible !== undefined) this.host.chart.setMarketProfileVisible(patch.marketProfileVisible);
    if (patch.marketProfileSplit !== undefined) this.host.chart.setMarketProfileConfig({ splitBySession: patch.marketProfileSplit });
    if (patch.marketProfileLetters !== undefined) this.host.chart.setMarketProfileConfig({ letters: patch.marketProfileLetters });
    if (patch.marketProfileBuckets !== undefined) this.host.chart.setMarketProfileConfig({ buckets: patch.marketProfileBuckets });
    if (patch.marketProfileOpacity !== undefined) this.host.chart.setMarketProfileConfig({ opacity: patch.marketProfileOpacity });
    if (patch.depthHeatmapVisible !== undefined) this.host.chart.setDepthHeatmapVisible(patch.depthHeatmapVisible);
    if (patch.depthHeatmapOpacity !== undefined) this.host.chart.setDepthHeatmapConfig({ opacity: patch.depthHeatmapOpacity });
    if (patch.sessionShadingVisible !== undefined) this.host.chart.setSessionShadingVisible(patch.sessionShadingVisible);
    if (patch.pivotMarkersVisible !== undefined) this.host.chart.setPivotMarkersVisible(patch.pivotMarkersVisible);
    if (patch.pivotStrength !== undefined) this.host.chart.setPivotMarkersConfig({ left: patch.pivotStrength, right: patch.pivotStrength });
    if (patch.pivotStructureLabels !== undefined) this.host.chart.setPivotMarkersConfig({ structureLabels: patch.pivotStructureLabels });
    if (patch.periodLevelsVisible !== undefined) this.host.chart.setPeriodLevelsVisible(patch.periodLevelsVisible);
    if (patch.periodLevelsPeriod !== undefined) this.host.chart.setPeriodLevelsPeriod(patch.periodLevelsPeriod);
    if (patch.legendVisible !== undefined) this.host.chart.setLegend({ visible: patch.legendVisible });
    if (patch.barCountdown !== undefined) this.host.chart.setBarCountdownVisible(patch.barCountdown);
    if (patch.indicatorValueLabels !== undefined) this.host.chart.setIndicatorValueLabelsVisible(patch.indicatorValueLabels);
    if (patch.alignAxisLabels !== undefined) this.host.chart.setAxisLabelsAligned(patch.alignAxisLabels);
    if (patch.crosshairMode !== undefined) this.host.chart.setCrosshairMode(patch.crosshairMode);
    if (patch.crosshairCursor !== undefined) this.host.chart.setCrosshairCursor(patch.crosshairCursor);
    if (patch.autoScale !== undefined) this.host.chart.setAutoScale(patch.autoScale);
    if (patch.invertScale !== undefined) this.host.chart.setInvertScale(patch.invertScale);
    if (patch.leftPriceScale !== undefined) {
      this.host.chart.setLeftPriceScaleVisible(patch.leftPriceScale);
      this.host.placeDrawingButton();
    }
    if (patch.scaleMode !== undefined || patch.autoScale !== undefined) queueMicrotask(() => this.refreshScaleSwitches());
    // Another zone: the clock says so at once.
    if (patch.timezone !== undefined) queueMicrotask(() => this.host.statusBar?.tick());
    if (patch.scaleMode !== undefined) {
      // Keep the legacy logScale flag mirrored so persisted layouts stay valid.
      this.settingsState = { ...this.settingsState, logScale: patch.scaleMode === 'logarithmic' };
      this.showScaleMode();
    } else if (patch.logScale !== undefined) {
      this.settingsState = { ...this.settingsState, scaleMode: patch.logScale ? 'logarithmic' : 'regular' };
      this.showScaleMode();
    }
    if (patch.numberLocale !== undefined) {
      this.host.chart.setNumberLocale(patch.numberLocale);
      this.host.watching.watchlist?.setLocale(patch.numberLocale || undefined);
    }
    if (patch.timezone !== undefined) {
      this.host.chart.setTimeZone(settingToTimezone(patch.timezone));
    }
    if (patch.highLowLines !== undefined) this.host.chart.setHighLowLines(patch.highLowLines);
    if (patch.extendedHours !== undefined) this.host.chart.setExtendedHours(patch.extendedHours);
    if (patch.mainSeriesVisible !== undefined) this.host.chart.setMainSeriesVisible(patch.mainSeriesVisible);
    if (patch.chartTypeOptions !== undefined) {
      // Every type: one left out goes back to its defaults (a reset).
      this.host.chart.setChartTypeOptions({ ...typesAtDefaults(), ...patch.chartTypeOptions });
    }
    // Kept and told once done: an open dialog's changes wait for its OK or Cancel.
    if (told && !this.settingsEdit) this.publishSettings();
  }

  resetSettings(): void {
    // The look goes back to the theme's (not to a theme's of its own); the rest to the defaults.
    const before = { ...this.settingsState };
    const beforeStyle = this.settingsStyle();
    const defaults = { ...this.settingsDefaults };
    this.touchSettings(Object.keys(defaults) as (keyof ChartSettingsState)[], SETTINGS_LOOK_KEYS);
    this.applySettings(defaults);
    this.host.chart.resetOverrides([...SETTINGS_LOOK_KEYS], { layer: 'user' });
    const after = { ...this.settingsState };
    const afterStyle = this.settingsStyle();
    this.host.settings?.refresh(this.shownSettings());
    // In the open settings, OK records it with the rest.
    if (this.settingsEdit || JSON.stringify([before, beforeStyle]) === JSON.stringify([after, afterStyle])) return;
    this.host.chart.recordUndo({ undo: () => this.restoreSettings(before, beforeStyle), redo: () => this.restoreSettings(after, afterStyle) });
  }

  /**
   * A change to the look in the settings: style keys on the user's layer (null
   * takes one away), kept with the theme they were picked on, and in the
   * chart's undo history. A burst on the same keys (a colour dragged across
   * the picker) is one step.
   */
  changeStyle(patch: SettingsStylePatch): void {
    // Only the keys it touched: an undo leaves the rest (the host's own user overrides) as they are.
    const keys = Object.keys(patch) as ChartStyleKey[];
    this.touchSettings([], keys);
    const before = this.settingsStyle(keys);
    this.host.chart.applyOverrides(patch, { layer: 'user' });
    const after = this.settingsStyle(keys);
    if (this.settingsEdit || JSON.stringify(before) === JSON.stringify(after)) return;
    this.host.chart.recordUndo({
      subject: `style:${Object.keys(patch).sort().join(',')}`,
      undo: () => this.restoreSettings({}, before),
      redo: () => this.restoreSettings({}, after),
    });
  }

  /**
   * A settings change the user made: applied, and put in the chart's undo
   * history with its drawings and indicators. A burst on the same settings
   * (a colour dragged across the picker) is one step.
   */
  changeSettings(patch: Partial<ChartSettingsState>): void {
    const keys = Object.keys(patch) as (keyof ChartSettingsState)[];
    // The scale mode and the legacy log flag move together.
    if (keys.includes('scaleMode') || keys.includes('logScale')) {
      for (const k of ['scaleMode', 'logScale'] as const) if (!keys.includes(k)) keys.push(k);
    }
    const pick = (): Partial<ChartSettingsState> => Object.fromEntries(keys.map((k) => [k, this.settingsState[k]]));
    this.touchSettings(keys);
    const before = pick();
    const scale = keys.includes('scaleMode');
    const heldBefore = this.host.comparing.compareScaleHeld;
    // A scale the user picks while comparing is theirs, the last compare gone too.
    if (scale) this.host.comparing.compareScaleHeld = false;
    this.applySettings(patch);
    const after = pick();
    if (this.settingsEdit || (JSON.stringify(before) === JSON.stringify(after) && heldBefore === this.host.comparing.compareScaleHeld)) return;
    // Undone, a pick made while comparing gives the percent scale back.
    this.host.chart.recordUndo({
      subject: `settings:${Object.keys(patch).sort().join(',')}`,
      undo: () => this.restoreSettings(before, null, scale ? heldBefore : undefined),
      redo: () => this.restoreSettings(after, null, scale ? false : undefined),
    });
  }

  /**
   * The user's overrides on `keys` (null: none set), with the theme they go
   * with: what an undo of the look puts back.
   */
  private settingsStyle(keys: readonly ChartStyleKey[] = SETTINGS_LOOK_KEYS): { theme: string; overrides: SettingsStylePatch } {
    const user = (this.host.chart.getOverrides?.({ layer: 'user' }) ?? {}) as Record<string, unknown>;
    const overrides = Object.fromEntries(keys.map((key) => {
      const value = user[key];
      return [key, typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' ? value : null];
    })) as SettingsStylePatch;
    return { theme: this.host.chart.getTheme()?.name ?? '', overrides };
  }

  /**
   * Settings back as they were (an undo or redo), shown in the settings if
   * they're open; `held` puts back whether percent compares held the scale.
   */
  private restoreSettings(values: Partial<ChartSettingsState>, style: { theme: string; overrides: SettingsStylePatch } | null = null, held?: boolean): void {
    if (held !== undefined) this.host.comparing.compareScaleHeld = held && this.host.comparing.compares.length > 0;
    this.applySettings(values);
    // The look picked on another theme stays with that theme.
    if (style && style.theme === (this.host.chart.getTheme()?.name ?? '')) {
      this.host.chart.applyOverrides(style.overrides, { layer: 'user' });
    }
    this.host.settings?.refresh(this.shownSettings());
  }
}

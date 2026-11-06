import { CHART_TYPES, DRAWING_TOOL_GROUPS } from './widgetConfig.js';
import { MOD_KEY } from './platformKeys.js';
import { toolShortcuts } from './drawingHotkeys.js';
import { timeframeLabel } from './widgetTimeframes.js';
import type { CommandItem } from './WidgetCommandPalette.js';
import { chartTypeLabel, localizeToolGroups } from './widgetLocales.js';
import { commandFeature } from './widgetFeatures.js';
import type { ChartWidget } from './ChartWidget.js';

/** What the commands read of the widget around them, and ask of them. */
export interface CommandsHost {
  readonly adapter: ChartWidget['adapter'];
  cancelWaiting: ChartWidget['cancelWaiting'];
  changeSettings: ChartWidget['changeSettings'];
  readonly chart: ChartWidget['chart'];
  readonly commandPalette: ChartWidget['commandPalette'];
  readonly commandPalettePart: ChartWidget['commandPalettePart'];
  readonly comparing: ChartWidget['comparing'];
  copyChartImage: ChartWidget['copyChartImage'];
  copyShareLink: ChartWidget['layouts']['copyShareLink'];
  readonly featureState: ChartWidget['featureState'];
  handleToggleTheme: ChartWidget['handleToggleTheme'];
  indicatorPickerItems: ChartWidget['indicatorPickerItems'];
  keysShown: ChartWidget['keysShown'];
  readonly layoutSession: ChartWidget['layouts']['layoutSession'];
  readonly menus: ChartWidget['menus'];
  openHotkeySheet: ChartWidget['openHotkeySheet'];
  openPanel: ChartWidget['docking']['openPanel'];
  openSettings: ChartWidget['openSettings'];
  openSymbolSearch: ChartWidget['openSymbolSearch'];
  readonly options: ChartWidget['options'];
  resetView: ChartWidget['resetView'];
  saveLayout: ChartWidget['layouts']['saveLayout'];
  say: ChartWidget['say'];
  readonly settings: ChartWidget['settings'];
  readonly settingsState: ChartWidget['settingsState'];
  shownSettings: ChartWidget['shownSettings'];
  readonly state: ChartWidget['state'];
  readonly t: ChartWidget['t'];
  readonly timeframes: ChartWidget['timeframes'];
  toggleDataWindow: ChartWidget['docking']['toggleDataWindow'];
  toggleGoToDate: ChartWidget['toggleGoToDate'];
  toggleSymbolInfo: ChartWidget['toggleSymbolInfo'];
  readonly watching: ChartWidget['watching'];
  whenLoaded: ChartWidget['whenLoaded'];
}

/**
 * The widget's commands: the command palette and its entries (indicators, chart types, tools,
 * intervals, actions), which of them are on, the keys they show, and what each action does.
 */
export class WidgetCommands {
  constructor(private readonly host: CommandsHost) {}

  toggleCommandPalette(): void {
    if (this.host.commandPalette?.isOpen()) {
      this.host.commandPalette.close();
      return;
    }
    if (this.host.cancelWaiting(this.host.commandPalettePart)) return;
    this.host.whenLoaded(this.host.commandPalettePart, () => this.host.featureState.commandPalette, (palette) => {
      if (!palette.isOpen()) palette.open(this.buildCommandItems());
    });
  }

  private buildCommandItems(): CommandItem[] {
    const items: CommandItem[] = [];

    for (const ind of this.host.indicatorPickerItems()) {
      items.push({
        id: ind.id,
        label: ind.name,
        category: 'indicator',
        active: [...this.host.state.activeIndicators.values()].some((a) => a.id === ind.id),
      });
    }

    for (const ct of CHART_TYPES) {
      items.push({
        id: ct.value,
        label: chartTypeLabel(ct, this.host.t),
        category: 'chartType',
        active: this.host.state.chartType === ct.value,
      });
    }

    const toolKeys = toolShortcuts();
    for (const group of localizeToolGroups(DRAWING_TOOL_GROUPS, this.host.t)) {
      for (const tool of group.tools) {
        items.push({
          id: tool.value,
          label: tool.label,
          category: 'drawing',
          shortcut: toolKeys[tool.value] ? this.host.keysShown('hotkeys.tools', toolKeys[tool.value]!) : undefined,
          active: this.host.state.activeTool === tool.value,
        });
      }
    }

    for (const tf of this.host.timeframes) {
      items.push({
        id: tf,
        label: timeframeLabel(tf),
        category: 'timeframe',
        active: this.host.state.timeframe === tf,
      });
    }

    // The widget's own, with the keys the sheet lists for them.
    items.push(
      { id: 'symbolSearch', label: this.host.t('hotkeys.symbolSearch'), category: 'action', shortcut: this.host.keysShown('hotkeys.symbolSearch', `${MOD_KEY}+P`) },
      { id: 'compare', label: this.host.t('compare.title'), category: 'action' },
      { id: 'goToDate', label: this.host.t('hotkeys.goToDate'), category: 'action', shortcut: this.host.keysShown('hotkeys.goToDate', 'Alt+G') },
      { id: 'resetView', label: this.host.t('chartMenu.resetView'), category: 'action', shortcut: this.host.keysShown('hotkeys.resetView', 'Alt+R') },
      { id: 'invertScale', label: this.host.t('hotkeys.invertScale'), category: 'action', shortcut: this.host.keysShown('hotkeys.invertScale', 'Alt+I') },
      { id: 'saveLayout', label: this.host.t('hotkeys.saveLayout'), category: 'action', shortcut: this.host.keysShown('hotkeys.save', `${MOD_KEY}+S`) },
      { id: 'watchlist', label: this.host.t('watchlist.title'), category: 'action' },
      { id: 'alerts', label: this.host.t('alerts.title'), category: 'action' },
      { id: 'objectTree', label: this.host.t('objects.title'), category: 'action' },
      { id: 'dataWindow', label: this.host.t('action.dataWindow'), category: 'action' },
      { id: 'symbolInfo', label: this.host.t('action.symbolInfo'), category: 'action' },
      { id: 'screenshot', label: this.host.t('action.screenshot'), category: 'action' },
      { id: 'copyImage', label: this.host.t('action.copyImage'), category: 'action' },
      { id: 'shareView', label: this.host.t('action.shareView'), category: 'action' },
      { id: 'toggleTheme', label: this.host.t('action.toggleTheme'), category: 'action' },
      { id: 'settings', label: this.host.t('action.settings'), category: 'action' },
      { id: 'autoFib', label: this.host.t('action.autoFib'), category: 'action' },
      { id: 'clearDrawings', label: this.host.t('action.clearDrawings'), category: 'action' },
      { id: 'clearIndicators', label: this.host.t('clear.indicators'), category: 'action' },
      { id: 'clearAll', label: this.host.t('clear.all'), category: 'action' },
      { id: 'hotkeys', label: this.host.t('hotkeys.title'), category: 'action', shortcut: this.host.keysShown('hotkeys.help', '?') },
    );

    return items.filter((item) => item.category !== 'action' || (this.commandOn(item.id) && this.commandThere(item.id)));
  }

  /** Whether the widget has what a command works on: a watchlist, a feed to compare from, layouts to save to. */
  private commandThere(id: string): boolean {
    if (id === 'watchlist') return this.host.watching.watchlist !== null;
    if (id === 'compare') return this.host.adapter !== null && this.host.options.chartOptions?.features?.compareSymbols !== false;
    if (id === 'saveLayout') return this.host.layoutSession !== null;
    return true;
  }

  /** Whether a command's switch (when it has one) is on. */
  private commandOn(id: string): boolean {
    const name = commandFeature(id);
    return name === undefined || this.host.featureState[name];
  }

  handleAction(id: string): void {
    if (!this.commandOn(id)) return;
    switch (id) {
      case 'symbolSearch':
        this.host.openSymbolSearch();
        break;
      case 'compare':
        void this.host.comparing.handleAddCompare();
        break;
      case 'goToDate':
        this.host.toggleGoToDate();
        break;
      case 'resetView':
        this.host.resetView();
        break;
      case 'invertScale':
        this.host.changeSettings({ invertScale: !this.host.settingsState.invertScale });
        this.host.settings?.refresh(this.host.shownSettings());
        break;
      case 'saveLayout':
        void this.host.saveLayout();
        break;
      case 'watchlist':
      case 'alerts':
      case 'objectTree':
        this.host.openPanel(id);
        break;
      case 'hotkeys':
        this.host.openHotkeySheet();
        break;
      case 'screenshot':
        this.host.chart.screenshot();
        break;
      case 'toggleTheme':
        this.host.handleToggleTheme();
        break;
      case 'settings':
        this.host.openSettings();
        break;
      case 'copyImage':
        void this.host.copyChartImage();
        break;
      case 'shareView':
        void this.host.copyShareLink();
        break;
      case 'autoFib': {
        const id = this.host.chart.autoFib();
        this.host.say(id ? this.host.t('toast.autoFibAdded') : this.host.t('toast.noSwing'));
        break;
      }
      case 'dataWindow':
        this.host.toggleDataWindow();
        break;
      case 'symbolInfo':
        this.host.toggleSymbolInfo();
        break;
      case 'clearDrawings':
        this.host.menus.removeAll('drawings');
        break;
      case 'clearIndicators':
        this.host.menus.removeAll('indicators');
        break;
      case 'clearAll':
        this.host.menus.removeAll('all');
        break;
    }
  }
}

import type {
  Theme,
  ThemeName,
  ChartType,
  TimeFrame,
  DrawingToolType,
  DataAdapter,
  ChartOptions,
} from '@tradecanvas/commons';
import type { Chart } from '../Chart.js';

export interface ChartWidgetOptions {
  symbol?: string;
  timeframe?: TimeFrame;
  theme?: ThemeName | Theme;

  // UI toggles (default true)
  toolbar?: boolean;
  drawingTools?: boolean;
  settings?: boolean;
  trading?: boolean;
  statusBar?: boolean;

  // Config
  symbols?: string[];
  timeframes?: TimeFrame[];
  chartTypes?: ChartType[];

  // Data
  adapter?: DataAdapter;
  historyLimit?: number;

  // Chart pass-through
  chartOptions?: Partial<ChartOptions>;

  // Callbacks
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (tf: TimeFrame) => void;
  onReady?: (chart: Chart) => void;
}

export interface WidgetState {
  symbol: string;
  timeframe: TimeFrame;
  chartType: ChartType;
  isDark: boolean;
  activeIndicators: Map<string, string>; // indicatorId -> instanceId
  activeTool: DrawingToolType | null;
  magnetEnabled: boolean;
  connectionState: string;
  connectionMessage: string;
}

export interface ToolbarConfig {
  symbols: string[];
  timeframes: { label: string; value: TimeFrame }[];
  chartTypes: { label: string; value: ChartType }[];
  indicators: IndicatorDef[];
  popularIndicatorIds: string[];
}

export interface ToolbarCallbacks {
  onSymbolClick: () => void;
  onTimeframe: (tf: TimeFrame) => void;
  onChartType: (type: ChartType) => void;
  onAddIndicator: (id: string) => void;
  onRemoveIndicator: (instanceId: string) => void;
  onScreenshot: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
}

export interface SidebarConfig {
  drawingToolGroups: DrawingToolGroupDef[];
}

export interface SidebarCallbacks {
  onDrawingTool: (tool: DrawingToolType) => void;
  onCancelDrawing: () => void;
  onToggleMagnet: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearDrawings: () => void;
}

export interface SettingsCallbacks {
  onChange: (patch: Partial<ChartSettingsState>) => void;
  onReset: () => void;
  onClose: () => void;
}

export interface ChartSettingsState {
  candleUpColor: string;
  candleDownColor: string;
  candleUpWick: string;
  candleDownWick: string;
  backgroundColor: string;
  gridColor: string;
  gridVisible: boolean;
  volumeVisible: boolean;
  legendVisible: boolean;
  barCountdown: boolean;
  logScale: boolean;
  autoScale: boolean;
  crosshairMode: 'normal' | 'magnet' | 'hidden';
  numberLocale: string;
}

export interface IndicatorDef {
  id: string;
  name: string;
  type: 'overlay' | 'panel';
}

export interface DrawingToolGroupDef {
  label: string;
  tools: { label: string; value: DrawingToolType }[];
}

export interface ActiveIndicator {
  instanceId: string;
  id: string;
  label: string;
}

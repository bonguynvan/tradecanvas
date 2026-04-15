import {
  Chart,
  BinanceAdapter,
  DARK_THEME,
  LIGHT_THEME,
} from '@tradecanvas/chart';
import type { ChartType, DrawingToolType, TimeFrame, Theme } from '@tradecanvas/chart';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChartTypeOption {
  readonly value: ChartType;
  readonly label: string;
}

interface IndicatorDef {
  readonly id: string;
  readonly name: string;
  readonly type: 'overlay' | 'panel';
}

interface DrawingToolGroup {
  readonly name: string;
  readonly icon: string;
  readonly tools: ReadonlyArray<{ readonly type: DrawingToolType; readonly label: string }>;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CHART_TYPES: ReadonlyArray<ChartTypeOption> = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'hollowCandle', label: 'Hollow Candle' },
  { value: 'heikinAshi', label: 'Heikin-Ashi' },
  { value: 'bar', label: 'Bar' },
];

const INDICATORS: ReadonlyArray<IndicatorDef> = [
  { id: 'sma', name: 'SMA', type: 'overlay' },
  { id: 'ema', name: 'EMA', type: 'overlay' },
  { id: 'bollinger', name: 'Bollinger Bands', type: 'overlay' },
  { id: 'vwap', name: 'VWAP', type: 'overlay' },
  { id: 'ichimoku', name: 'Ichimoku Cloud', type: 'overlay' },
  { id: 'parabolicsar', name: 'Parabolic SAR', type: 'overlay' },
  { id: 'supertrend', name: 'Supertrend', type: 'overlay' },
  { id: 'keltner', name: 'Keltner Channel', type: 'overlay' },
  { id: 'donchian', name: 'Donchian Channel', type: 'overlay' },
  { id: 'rsi', name: 'RSI', type: 'panel' },
  { id: 'macd', name: 'MACD', type: 'panel' },
  { id: 'stochastic', name: 'Stochastic', type: 'panel' },
  { id: 'atr', name: 'ATR', type: 'panel' },
  { id: 'adx', name: 'ADX', type: 'panel' },
  { id: 'obv', name: 'OBV', type: 'panel' },
  { id: 'williamsr', name: 'Williams %R', type: 'panel' },
  { id: 'cci', name: 'CCI', type: 'panel' },
  { id: 'mfi', name: 'MFI', type: 'panel' },
  { id: 'roc', name: 'ROC', type: 'panel' },
  { id: 'tsi', name: 'TSI', type: 'panel' },
  { id: 'cmf', name: 'CMF', type: 'panel' },
];

const DRAWING_GROUPS: ReadonlyArray<DrawingToolGroup> = [
  {
    name: 'Lines',
    icon: '\u2571',  // /
    tools: [
      { type: 'trendLine', label: 'Trend Line' },
      { type: 'ray', label: 'Ray' },
      { type: 'extendedLine', label: 'Extended Line' },
    ],
  },
  {
    name: 'Horizontal / Vertical',
    icon: '\u2500',  // ─
    tools: [
      { type: 'horizontalLine', label: 'Horizontal Line' },
      { type: 'verticalLine', label: 'Vertical Line' },
    ],
  },
  {
    name: 'Channels',
    icon: '\u2550',  // ═
    tools: [
      { type: 'parallelChannel', label: 'Parallel Channel' },
      { type: 'regressionChannel', label: 'Regression Channel' },
    ],
  },
  {
    name: 'Fibonacci',
    icon: 'F',
    tools: [
      { type: 'fibRetracement', label: 'Fib Retracement' },
      { type: 'fibExtension', label: 'Fib Extension' },
    ],
  },
  {
    name: 'Shapes',
    icon: '\u25A1',  // □
    tools: [
      { type: 'rectangle', label: 'Rectangle' },
      { type: 'ellipse', label: 'Ellipse' },
      { type: 'triangle', label: 'Triangle' },
    ],
  },
  {
    name: 'Advanced',
    icon: 'G',
    tools: [
      { type: 'pitchfork', label: 'Pitchfork' },
      { type: 'gannFan', label: 'Gann Fan' },
      { type: 'gannBox', label: 'Gann Box' },
      { type: 'elliottWave', label: 'Elliott Wave' },
    ],
  },
  {
    name: 'Measure',
    icon: 'M',
    tools: [
      { type: 'measure', label: 'Measure' },
      { type: 'dateRange', label: 'Date Range' },
      { type: 'priceRange', label: 'Price Range' },
    ],
  },
  {
    name: 'Annotation',
    icon: 'T',
    tools: [
      { type: 'text', label: 'Text Annotation' },
      { type: 'arrow', label: 'Arrow' },
    ],
  },
];

const SYMBOLS: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'BTCUSDT', label: 'BTCUSDT' },
  { value: 'ETHUSDT', label: 'ETHUSDT' },
  { value: 'SOLUSDT', label: 'SOLUSDT' },
  { value: 'BNBUSDT', label: 'BNBUSDT' },
];

// ─── State ─────────────────────────────────────────────────────────────────

let currentSymbol = 'BTCUSDT';
let currentTf: TimeFrame = '5m';
let currentChartType: ChartType = 'candlestick';
let isDark = true;
let magnetEnabled = true;
let activeDrawingTool: DrawingToolType | null = null;
const activeIndicators = new Map<string, string>(); // indicatorId -> instanceId

// ─── DOM Helpers ───────────────────────────────────────────────────────────

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Chart Init ────────────────────────────────────────────────────────────

const container = $('chart-container');
const chart = new Chart(container, {
  chartType: 'candlestick',
  theme: DARK_THEME,
  autoScale: true,
  rightMargin: 5,
  crosshair: { mode: 'magnet' },
  watermark: {
    text: 'TradeCanvas',
    fontSize: 48,
    color: 'rgba(255,255,255,0.03)',
  },
  features: {
    drawings: true,
    drawingMagnet: true,
    drawingUndoRedo: true,
    indicators: true,
    trading: true,
    volume: true,
    legend: true,
    crosshair: true,
    keyboard: true,
    screenshot: true,
    alerts: true,
    barCountdown: true,
    logScale: true,
    watermark: true,
  },
});

// ─── Connection ────────────────────────────────────────────────────────────

const statusDot = $('status-dot');
const statusText = $('status-text');
const statusSymbol = $('status-symbol');

function setStatus(state: 'connecting' | 'connected' | 'error', message: string): void {
  statusDot.className = 'status-dot';
  if (state === 'connected') {
    statusDot.classList.add('connected');
  } else if (state === 'error') {
    statusDot.classList.add('error');
  }
  statusText.textContent = message;
}

async function connectStream(): Promise<void> {
  setStatus('connecting', 'Connecting...');
  statusSymbol.textContent = `${currentSymbol} ${currentTf}`;
  $('toolbar-symbol').textContent = currentSymbol;

  try {
    chart.disconnectStream();
    const adapter = new BinanceAdapter();
    await chart.connect({
      adapter,
      symbol: currentSymbol,
      timeframe: currentTf,
      historyLimit: 500,
    });

    chart.setWatermark(currentSymbol.replace('USDT', ' / USDT'), {
      fontSize: 48,
      color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    });

    setStatus('connected', 'Live');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    setStatus('error', message);
  }
}

// ─── Dropdown Manager ──────────────────────────────────────────────────────

let openDropdownId: string | null = null;

function closeAllDropdowns(): void {
  document.querySelectorAll('.dropdown-panel.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.tb-dropdown.open').forEach(el => el.classList.remove('open'));
  openDropdownId = null;
}

function toggleDropdown(btnId: string, panelId: string): void {
  const panel = $(panelId);
  const btn = $(btnId);
  const isOpen = panel.classList.contains('open');

  closeAllDropdowns();

  if (!isOpen) {
    panel.classList.add('open');
    btn.classList.add('open');
    openDropdownId = panelId;
  }
}

document.addEventListener('click', (e: MouseEvent) => {
  if (openDropdownId === null) return;
  const target = e.target as HTMLElement;
  const panel = $(openDropdownId);
  const btnId = openDropdownId.replace('-dropdown', '-btn');
  const btn = document.getElementById(btnId);
  if (!panel.contains(target) && btn !== target && !btn?.contains(target)) {
    closeAllDropdowns();
  }
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeAllDropdowns();
});

// ─── Symbol Selector (click on symbol label cycles) ────────────────────────

let symbolIndex = 0;
$('toolbar-symbol').style.cursor = 'pointer';
$('toolbar-symbol').addEventListener('click', () => {
  symbolIndex = (symbolIndex + 1) % SYMBOLS.length;
  currentSymbol = SYMBOLS[symbolIndex].value;
  connectStream();
});

// ─── Timeframe Buttons ─────────────────────────────────────────────────────

$('timeframes').addEventListener('click', (e: Event) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const tf = (btn as HTMLElement).dataset.tf;
  if (!tf) return;

  $('timeframes').querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTf = tf as TimeFrame;
  connectStream();
});

// ─── Chart Type Dropdown ───────────────────────────────────────────────────

function buildChartTypeDropdown(): void {
  const panel = $('charttype-dropdown');
  panel.innerHTML = CHART_TYPES.map(ct => {
    const activeClass = ct.value === currentChartType ? ' active' : '';
    return `<div class="dropdown-item${activeClass}" data-ct="${ct.value}">${escapeHtml(ct.label)}</div>`;
  }).join('');

  panel.addEventListener('click', (e: Event) => {
    const item = (e.target as HTMLElement).closest('.dropdown-item') as HTMLElement | null;
    if (!item) return;
    const ct = item.dataset.ct as ChartType;
    currentChartType = ct;
    chart.setChartType(ct);

    const label = CHART_TYPES.find(c => c.value === ct)?.label ?? ct;
    $('charttype-label').textContent = label;

    panel.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    closeAllDropdowns();
  });
}

$('charttype-btn').addEventListener('click', (e: Event) => {
  e.stopPropagation();
  toggleDropdown('charttype-btn', 'charttype-dropdown');
});

buildChartTypeDropdown();

// ─── Indicators Dropdown ───────────────────────────────────────────────────

function updateIndicatorBadge(): void {
  const count = activeIndicators.size;
  $('indicators-badge').textContent = count > 0 ? `(${count})` : '';
}

function updateIndicatorChips(): void {
  const chipsEl = $('indicator-chips');
  const entries = Array.from(activeIndicators.entries());
  chipsEl.innerHTML = entries.map(([indId]) => {
    const def = INDICATORS.find(i => i.id === indId);
    const name = def?.name ?? indId.toUpperCase();
    return `<span class="indicator-chip" data-ind="${indId}">${escapeHtml(name)}<span class="chip-remove" data-remove-ind="${indId}">x</span></span>`;
  }).join('');
}

function buildIndicatorsDropdown(): void {
  const panel = $('indicators-dropdown');
  panel.innerHTML = INDICATORS.map(ind => {
    const activeClass = activeIndicators.has(ind.id) ? ' active' : '';
    return `<div class="dropdown-item${activeClass}" data-ind="${ind.id}">
      <span>${escapeHtml(ind.name)}</span>
      <span class="tag">${ind.type}</span>
    </div>`;
  }).join('');
}

function toggleIndicator(indId: string): void {
  if (activeIndicators.has(indId)) {
    const instanceId = activeIndicators.get(indId)!;
    chart.removeIndicator(instanceId);
    activeIndicators.delete(indId);
  } else {
    const instanceId = chart.addIndicator(indId);
    if (instanceId) {
      activeIndicators.set(indId, instanceId);
    }
  }
  updateIndicatorBadge();
  updateIndicatorChips();
  buildIndicatorsDropdown();
}

$('indicators-btn').addEventListener('click', (e: Event) => {
  e.stopPropagation();
  toggleDropdown('indicators-btn', 'indicators-dropdown');
});

$('indicators-dropdown').addEventListener('click', (e: Event) => {
  const item = (e.target as HTMLElement).closest('.dropdown-item') as HTMLElement | null;
  if (!item) return;
  const indId = item.dataset.ind;
  if (!indId) return;
  toggleIndicator(indId);
});

$('indicator-chips').addEventListener('click', (e: Event) => {
  const removeBtn = (e.target as HTMLElement).closest('[data-remove-ind]') as HTMLElement | null;
  if (!removeBtn) return;
  const indId = removeBtn.dataset.removeInd;
  if (!indId) return;
  toggleIndicator(indId);
});

buildIndicatorsDropdown();
updateIndicatorBadge();

// ─── Drawing Sidebar ───────────────────────────────────────────────────────

function clearActiveDrawingSidebar(): void {
  document.querySelectorAll('.drawing-sidebar .sidebar-btn').forEach(b => b.classList.remove('active'));
}

function setActiveTool(type: DrawingToolType | null): void {
  activeDrawingTool = type;
  chart.setDrawingTool(type);
  clearActiveDrawingSidebar();

  if (type === null) {
    $('cursor-btn').classList.add('active');
  } else {
    const toolBtn = document.querySelector(`[data-tool="${type}"]`) as HTMLElement | null;
    if (toolBtn) toolBtn.classList.add('active');
    const groupBtn = document.querySelector(`[data-group-default="${type}"]`) as HTMLElement | null;
    if (groupBtn) groupBtn.classList.add('active');
  }
}

function buildDrawingSidebar(): void {
  const sidebar = $('drawing-sidebar');
  let html = '';

  // Cursor button
  html += `<button class="sidebar-btn active" id="cursor-btn" title="Select"><span class="tooltip">Select</span>/</button>`;
  html += `<div class="sidebar-divider"></div>`;

  // Tool groups
  for (const group of DRAWING_GROUPS) {
    const defaultTool = group.tools[0];
    const hasMultiple = group.tools.length > 1;
    const multiDot = hasMultiple ? '<span class="multi-dot"></span>' : '';

    html += `<button class="sidebar-btn" data-group-default="${defaultTool.type}" title="${group.name}">`;
    html += escapeHtml(group.icon);
    html += multiDot;

    if (hasMultiple) {
      html += `<div class="flyout-menu">`;
      html += `<div class="flyout-header">${escapeHtml(group.name)}</div>`;
      for (const tool of group.tools) {
        html += `<button class="flyout-item" data-tool="${tool.type}">${escapeHtml(tool.label)}</button>`;
      }
      html += `</div>`;
      html += `<span class="tooltip">${escapeHtml(group.name)}</span>`;
    } else {
      html += `<span class="tooltip">${escapeHtml(defaultTool.label)}</span>`;
    }
    html += `</button>`;
  }

  // Spacer
  html += `<div class="sidebar-spacer"></div>`;
  html += `<div class="sidebar-divider"></div>`;

  // Bottom actions
  html += `<button class="sidebar-btn" id="btn-magnet" title="Magnet Snap"><span style="font-size:13px">\u2299</span><span class="tooltip">Magnet Snap</span></button>`;
  html += `<button class="sidebar-btn" id="btn-undo" title="Undo"><span style="font-size:13px">\u21B6</span><span class="tooltip">Undo</span></button>`;
  html += `<button class="sidebar-btn" id="btn-redo" title="Redo"><span style="font-size:13px">\u21B7</span><span class="tooltip">Redo</span></button>`;
  html += `<button class="sidebar-btn" id="btn-clear-drawings" title="Clear Drawings"><span style="font-size:13px">\u2715</span><span class="tooltip">Clear Drawings</span></button>`;

  sidebar.innerHTML = html;

  // Set magnet initial state
  if (magnetEnabled) {
    $('btn-magnet').classList.add('active');
  }

  // Event: cursor button
  $('cursor-btn').addEventListener('click', () => setActiveTool(null));

  // Event: group default buttons
  sidebar.querySelectorAll('[data-group-default]').forEach(btn => {
    btn.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      // Ignore if click was inside flyout
      if (target.closest('.flyout-item')) return;
      const toolType = (btn as HTMLElement).dataset.groupDefault as DrawingToolType;
      setActiveTool(activeDrawingTool === toolType ? null : toolType);
    });
  });

  // Event: flyout items
  sidebar.querySelectorAll('.flyout-item').forEach(item => {
    item.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const toolType = (item as HTMLElement).dataset.tool as DrawingToolType;
      setActiveTool(toolType);

      // Update the group button's default to this tool
      const groupBtn = (item as HTMLElement).closest('.sidebar-btn') as HTMLElement;
      if (groupBtn) {
        groupBtn.dataset.groupDefault = toolType;
      }
    });
  });

  // Event: magnet toggle
  $('btn-magnet').addEventListener('click', () => {
    magnetEnabled = !magnetEnabled;
    chart.setDrawingMagnet(magnetEnabled);
    $('btn-magnet').classList.toggle('active', magnetEnabled);
  });

  // Event: undo
  $('btn-undo').addEventListener('click', () => chart.undo());

  // Event: redo
  $('btn-redo').addEventListener('click', () => chart.redo());

  // Event: clear drawings
  $('btn-clear-drawings').addEventListener('click', () => {
    chart.clearDrawings();
    setActiveTool(null);
  });
}

buildDrawingSidebar();

// ─── Theme Toggle ──────────────────────────────────────────────────────────

$('btn-theme').addEventListener('click', () => {
  isDark = !isDark;
  chart.setTheme(isDark ? DARK_THEME : LIGHT_THEME);
  document.body.classList.toggle('light', !isDark);
  chart.setWatermark(currentSymbol.replace('USDT', ' / USDT'), {
    fontSize: 48,
    color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  });
  // Sync settings modal colors
  syncSettingsToTheme();
});

// ─── Screenshot ────────────────────────────────────────────────────────────

$('btn-screenshot').addEventListener('click', () => chart.screenshot());

// ─── Settings Modal ────────────────────────────────────────────────────────

const backdrop = $('settings-backdrop');
const modal = $('settings-modal');

function openSettings(): void {
  syncSettingsToTheme();
  backdrop.classList.add('open');
}

function closeSettings(): void {
  backdrop.classList.remove('open');
}

$('btn-settings').addEventListener('click', () => openSettings());
$('settings-close').addEventListener('click', () => closeSettings());
$('settings-done').addEventListener('click', () => closeSettings());

backdrop.addEventListener('click', (e: Event) => {
  if (e.target === backdrop) closeSettings();
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && backdrop.classList.contains('open')) {
    closeSettings();
  }
});

// Settings tabs
$('settings-modal').querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = (tab as HTMLElement).dataset.tab;
    if (!tabName) return;

    modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const content = modal.querySelector(`[data-tab-content="${tabName}"]`);
    if (content) content.classList.add('active');
  });
});

// Color pickers
function setupColorPicker(inputId: string, hexId: string, themeKey: keyof Theme): void {
  const input = $(inputId) as HTMLInputElement;
  const hex = $(hexId);

  input.addEventListener('input', () => {
    hex.textContent = input.value.toUpperCase();
    applyThemeColor(themeKey, input.value);
  });
}

function applyThemeColor(key: keyof Theme, value: string): void {
  const baseTheme = isDark ? DARK_THEME : LIGHT_THEME;
  const updatedTheme: Theme = { ...baseTheme, [key]: value };
  chart.setTheme(updatedTheme);
}

setupColorPicker('color-up-body', 'hex-up-body', 'candleUp');
setupColorPicker('color-down-body', 'hex-down-body', 'candleDown');
setupColorPicker('color-up-wick', 'hex-up-wick', 'candleUpWick');
setupColorPicker('color-down-wick', 'hex-down-wick', 'candleDownWick');
setupColorPicker('color-background', 'hex-background', 'background');
setupColorPicker('color-grid', 'hex-grid', 'grid');

function syncSettingsToTheme(): void {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  function setColorInput(inputId: string, hexId: string, value: string): void {
    const colorVal = value.startsWith('#') ? value : '#000000';
    ($(inputId) as HTMLInputElement).value = colorVal;
    $(hexId).textContent = colorVal.toUpperCase();
  }

  setColorInput('color-up-body', 'hex-up-body', theme.candleUp);
  setColorInput('color-down-body', 'hex-down-body', theme.candleDown);
  setColorInput('color-up-wick', 'hex-up-wick', theme.candleUpWick);
  setColorInput('color-down-wick', 'hex-down-wick', theme.candleDownWick);
  setColorInput('color-background', 'hex-background', theme.background);
  setColorInput('color-grid', 'hex-grid', theme.grid);
}

// Toggle switches
document.querySelectorAll('.toggle-switch').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('on');
  });
});

// Reset to defaults
$('settings-reset').addEventListener('click', () => {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  chart.setTheme(theme);
  syncSettingsToTheme();

  // Reset toggles
  $('toggle-grid').classList.add('on');
  $('toggle-volume').classList.add('on');
  $('toggle-legend').classList.add('on');
  $('toggle-countdown').classList.add('on');
  $('toggle-autoscale').classList.add('on');
  $('toggle-logscale').classList.remove('on');
  ($('select-crosshair') as HTMLSelectElement).value = 'magnet';
});

// ─── Copy install command ──────────────────────────────────────────────────

const installBtn = $('install-btn');
installBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('npm install @tradecanvas/chart');
    installBtn.classList.add('copied');
    const icon = installBtn.querySelector('.copy-icon') as HTMLElement;
    const originalText = icon.textContent;
    icon.textContent = 'COPIED';
    setTimeout(() => {
      installBtn.classList.remove('copied');
      icon.textContent = originalText;
    }, 2000);
  } catch {
    // Clipboard API not available
  }
});

// ─── Copy quick-start code ─────────────────────────────────────────────────

const QUICK_START_CODE = `import { Chart, BinanceAdapter } from '@tradecanvas/chart'

// Create a chart
const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,
    volume: true,
  },
})

// Connect to live Binance data
const adapter = new BinanceAdapter()
chart.connect({
  adapter,
  symbol: 'BTCUSDT',
  timeframe: '5m',
  historyLimit: 300,
})`;

const copyCodeBtn = $('copy-code');
copyCodeBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(QUICK_START_CODE);
    const original = copyCodeBtn.textContent;
    copyCodeBtn.textContent = 'Copied';
    setTimeout(() => {
      copyCodeBtn.textContent = original;
    }, 2000);
  } catch {
    // Clipboard API not available
  }
});

// ─── Docs Sidebar: active section highlight ───────────────────────────────

const docSections = document.querySelectorAll('.doc-section');
const docsSidebarLinks = document.querySelectorAll<HTMLAnchorElement>('.docs-sidebar-link');

if (docSections.length > 0 && docsSidebarLinks.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = (entry.target as HTMLElement).id;
          docsSidebarLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
  );
  docSections.forEach(section => sectionObserver.observe(section));
}

// ─── Docs Sidebar: smooth anchor scrolling ────────────────────────────────

docsSidebarLinks.forEach(link => {
  link.addEventListener('click', (e: Event) => {
    e.preventDefault();
    const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
    if (!href) return;
    const target = document.querySelector(href);
    if (target) {
      const y = target.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});

// ─── Tab switching for code blocks ────────────────────────────────────────

document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(tabContainer => {
  const buttons = tabContainer.querySelectorAll<HTMLButtonElement>('.code-tab-btn');
  const panels = tabContainer.querySelectorAll<HTMLElement>('.code-tab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tabTarget;
      if (!targetId) return;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      panels.forEach(p => {
        p.classList.toggle('active', p.id === targetId);
      });
    });
  });
});

// ─── Copy buttons for all doc code blocks ─────────────────────────────────

function getCodeTextFromBlock(btn: HTMLElement): string {
  const container = btn.closest('.code-tabs') ?? btn.closest('.code-block');
  if (!container) return '';

  let codeBody: HTMLElement | null;
  if (container.classList.contains('code-tabs')) {
    const activePanel = container.querySelector('.code-tab-panel.active');
    codeBody = activePanel?.querySelector('.code-body') ?? null;
  } else {
    codeBody = container.querySelector('.code-body');
  }

  if (!codeBody) return '';
  const pre = codeBody.querySelector('pre');
  return pre?.textContent ?? '';
}

function handleCopyClick(btn: HTMLElement): void {
  const text = getCodeTextFromBlock(btn);
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Clipboard API not available
  });
}

document.querySelectorAll<HTMLElement>('[data-copy-block], [data-copy-tabs]').forEach(btn => {
  btn.addEventListener('click', () => handleCopyClick(btn));
});

// ─── Boot ──────────────────────────────────────────────────────────────────

connectStream();

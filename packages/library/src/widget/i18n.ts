/**
 * i18n for ChartWidget's own chrome (toolbar, watchlist, indicator picker,
 * status bar, settings panel, hotkey sheet). This does NOT translate
 * data-driven labels sourced from `widgetConfig.ts` (the 69 indicator
 * display names, drawing-tool names, timezone/locale option labels) — those
 * stay in English for now; see README "Widget i18n" for the current
 * coverage and how to extend it via `messages`.
 */

export type MessageKey = typeof EN_MESSAGES extends Record<infer K, string> ? K : never;

export const EN_MESSAGES = {
  // Toolbar
  'toolbar.indicators': 'Indicators',
  'toolbar.indicators.popular': 'Popular',
  'toolbar.indicators.all': 'All',
  'indicatorType.overlay': 'overlay',
  'indicatorType.panel': 'panel',
  'toolbar.replay': 'Bar replay',
  'replay.selectHint': 'Click a bar to start the replay',
  'replay.random': 'Random bar',
  'replay.realtime': 'Back to realtime',
  'replay.barsPerSecond': 'bars/s',
  'replay.play': 'Play',
  'replay.pause': 'Pause',
  'replay.stepBack': 'Step back (Shift+←)',
  'replay.stepForward': 'Step forward (Shift+→)',
  'toolbar.longBracket': 'Long bracket',
  'toolbar.shortBracket': 'Short bracket',
  'toolbar.depthLadder': 'Depth ladder',
  'toolbar.objects': 'Objects',
  'toolbar.priceAlerts': 'Price alerts',
  'toolbar.screenshot': 'Screenshot',
  'toolbar.settings': 'Chart Settings',
  'toolbar.toggleTheme': 'Toggle theme',
  'toolbar.timeframes': 'Timeframes',
  'toolbar.timeframes.pin': 'Pin to toolbar',
  'toolbar.fullscreen': 'Fullscreen',
  'legend.show': 'Show',
  'legend.hide': 'Hide',
  'legend.settings': 'Settings',
  'legend.remove': 'Remove',
  'legend.collapse': 'Collapse indicators',
  'legend.expand': 'Show indicators',
  'toolbar.exitFullscreen': 'Exit fullscreen',
  'range.presets': 'Visible range',
  'range.all': 'All',
  'range.goTo': 'Go to date',
  'range.goToSubmit': 'Go to',
  'range.date': 'Date',
  'range.time': 'Time',
  'range.cancel': 'Cancel',
  'range.beforeData': 'Showing the earliest loaded bar',

  // Chart types
  'chartType.candlestick': 'Candlestick',
  'chartType.line': 'Line',
  'chartType.area': 'Area',
  'chartType.bar': 'Bar',
  'chartType.heikinAshi': 'Heikin-Ashi',
  'chartType.hollowCandle': 'Hollow Candle',
  'chartType.baseline': 'Baseline',
  'chartType.volumeCandles': 'Volume Candles',
  'chartType.equivolume': 'Equivolume',
  'chartType.hlcArea': 'HLC Area',
  'chartType.stepLine': 'Step Line',
  'chartType.lineWithMarkers': 'Line + Markers',

  // Watchlist
  'watchlist.title': 'Watchlist',

  // Status bar / connection
  'status.connecting': 'Connecting...',
  'status.live': 'Live',
  'status.connectionFailed': 'Connection failed',
  'status.loading': 'Loading chart...',

  // Settings panel
  'settings.title': 'Chart Settings',
  'settings.tab.style': 'style',
  'settings.tab.display': 'display',
  'settings.tab.scale': 'scale',
  'settings.resetToDefaults': 'Reset to defaults',
  'settings.done': 'Done',
  'settings.section.candleColors': 'Candle Colors',
  'settings.section.background': 'Background',

  // Hotkey sheet
  'hotkeys.title': 'Keyboard shortcuts',
  'hotkeys.close': 'Close',
  'hotkeys.gotIt': 'Got it',
  'hotkeys.group.searchNavigation': 'Search & navigation',
  'hotkeys.group.chartManipulation': 'Chart manipulation',
  'hotkeys.group.touch': 'Touch (mobile / tablet)',
  'hotkeys.group.keyboard': 'Keyboard',
  'hotkeys.group.drawing': 'Drawing',
} as const;

export const VI_MESSAGES: Partial<Record<MessageKey, string>> = {
  'toolbar.indicators': 'Chỉ báo',
  'toolbar.indicators.popular': 'Phổ biến',
  'toolbar.indicators.all': 'Tất cả',
  'indicatorType.overlay': 'phủ lên',
  'indicatorType.panel': 'bảng riêng',
  'toolbar.replay': 'Phát lại',
  'replay.selectHint': 'Bấm vào một nến để bắt đầu phát lại',
  'replay.random': 'Nến ngẫu nhiên',
  'replay.realtime': 'Về thời gian thực',
  'replay.barsPerSecond': 'nến/giây',
  'replay.play': 'Phát',
  'replay.pause': 'Tạm dừng',
  'replay.stepBack': 'Lùi một nến (Shift+←)',
  'replay.stepForward': 'Tiến một nến (Shift+→)',
  'toolbar.longBracket': 'Lệnh Long',
  'toolbar.shortBracket': 'Lệnh Short',
  'toolbar.depthLadder': 'Sổ lệnh',
  'toolbar.objects': 'Đối tượng',
  'toolbar.priceAlerts': 'Cảnh báo giá',
  'toolbar.screenshot': 'Chụp màn hình',
  'toolbar.settings': 'Cài đặt biểu đồ',
  'toolbar.toggleTheme': 'Đổi giao diện',
  'toolbar.timeframes': 'Khung thời gian',
  'toolbar.timeframes.pin': 'Ghim lên thanh công cụ',
  'toolbar.fullscreen': 'Toàn màn hình',
  'legend.show': 'Hiện',
  'legend.hide': 'Ẩn',
  'legend.settings': 'Cài đặt',
  'legend.remove': 'Xoá',
  'legend.collapse': 'Thu gọn chỉ báo',
  'legend.expand': 'Hiện chỉ báo',
  'toolbar.exitFullscreen': 'Thoát toàn màn hình',
  'range.presets': 'Khoảng hiển thị',
  'range.all': 'Tất cả',
  'range.goTo': 'Đi tới ngày',
  'range.goToSubmit': 'Đi tới',
  'range.date': 'Ngày',
  'range.time': 'Giờ',
  'range.cancel': 'Huỷ',
  'range.beforeData': 'Đang hiện nến sớm nhất đã tải',

  'chartType.candlestick': 'Nến',
  'chartType.line': 'Đường',
  'chartType.area': 'Vùng',
  'chartType.bar': 'Thanh',
  'chartType.heikinAshi': 'Heikin-Ashi',
  'chartType.hollowCandle': 'Nến rỗng',
  'chartType.baseline': 'Đường cơ sở',
  'chartType.volumeCandles': 'Nến khối lượng',
  'chartType.equivolume': 'Equivolume',
  'chartType.hlcArea': 'Vùng HLC',
  'chartType.stepLine': 'Đường bậc thang',
  'chartType.lineWithMarkers': 'Đường + điểm đánh dấu',

  'watchlist.title': 'Danh mục theo dõi',

  'status.connecting': 'Đang kết nối...',
  'status.live': 'Trực tiếp',
  'status.connectionFailed': 'Kết nối thất bại',
  'status.loading': 'Đang tải biểu đồ...',

  'settings.title': 'Cài đặt biểu đồ',
  'settings.tab.style': 'Giao diện',
  'settings.tab.display': 'Hiển thị',
  'settings.tab.scale': 'Thang giá',
  'settings.resetToDefaults': 'Khôi phục mặc định',
  'settings.done': 'Xong',
  'settings.section.candleColors': 'Màu nến',
  'settings.section.background': 'Nền',

  'hotkeys.title': 'Phím tắt',
  'hotkeys.close': 'Đóng',
  'hotkeys.gotIt': 'Đã hiểu',
  'hotkeys.group.searchNavigation': 'Tìm kiếm & điều hướng',
  'hotkeys.group.chartManipulation': 'Thao tác biểu đồ',
  'hotkeys.group.touch': 'Cảm ứng (di động / máy tính bảng)',
  'hotkeys.group.keyboard': 'Bàn phím',
  'hotkeys.group.drawing': 'Vẽ',
};

export const BUILTIN_LOCALES: Record<string, Partial<Record<MessageKey, string>>> = {
  en: EN_MESSAGES,
  vi: VI_MESSAGES,
};

/**
 * Resolve the widget's message table: built-in English as the base, the
 * requested built-in locale layered on top (falling back key-by-key to
 * English for anything that locale hasn't translated yet), then host
 * `messages` overrides layered last so they always win.
 */
export function resolveMessages(
  locale: string | undefined,
  overrides: Partial<Record<MessageKey, string>> | undefined,
): Record<MessageKey, string> {
  const base = { ...EN_MESSAGES } as Record<MessageKey, string>;
  const localeTable = locale ? BUILTIN_LOCALES[locale] : undefined;
  if (localeTable) Object.assign(base, localeTable);
  if (overrides) Object.assign(base, overrides);
  return base;
}

export type Translator = (key: MessageKey) => string;

export function createTranslator(messages: Record<MessageKey, string>): Translator {
  return (key: MessageKey) => messages[key] ?? EN_MESSAGES[key] ?? key;
}

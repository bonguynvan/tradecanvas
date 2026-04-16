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

export const DEFAULT_SETTINGS: ChartSettingsState = {
  candleUpColor: '#26A69A',
  candleDownColor: '#EF5350',
  candleUpWick: '#26A69A',
  candleDownWick: '#EF5350',
  backgroundColor: '#131722',
  gridColor: '#1E222D',
  gridVisible: true,
  volumeVisible: true,
  legendVisible: true,
  barCountdown: true,
  logScale: false,
  autoScale: true,
  crosshairMode: 'magnet',
  numberLocale: 'en-US',
};

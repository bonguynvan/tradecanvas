export type ThemeName = 'dark' | 'light';

export interface FontConfig {
  family: string;
  sizeSmall: number;
  sizeMedium: number;
  sizeLarge: number;
}

export interface Theme {
  name: string;
  background: string;
  text: string;
  textSecondary: string;
  grid: string;
  crosshair: string;
  candleUp: string;
  candleDown: string;
  candleUpWick: string;
  candleDownWick: string;
  lineColor: string;
  areaTopColor: string;
  areaBottomColor: string;
  volumeUp: string;
  volumeDown: string;
  axisLine: string;
  axisLabel: string;
  axisLabelBackground: string;
  font: FontConfig;
}

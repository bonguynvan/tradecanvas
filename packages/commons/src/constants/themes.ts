import type { Theme } from '../types/theme.js';

const DEFAULT_FONT = {
  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sizeSmall: 10,
  sizeMedium: 12,
  sizeLarge: 14,
};

export const DARK_THEME: Theme = {
  name: 'dark',
  background: '#131722',
  text: '#D1D4DC',
  textSecondary: '#787B86',
  grid: '#1E222D',
  crosshair: '#9598A1',
  candleUp: '#26A69A',
  candleDown: '#EF5350',
  candleUpWick: '#26A69A',
  candleDownWick: '#EF5350',
  lineColor: '#2196F3',
  areaTopColor: 'rgba(33, 150, 243, 0.4)',
  areaBottomColor: 'rgba(33, 150, 243, 0.0)',
  volumeUp: 'rgba(38, 166, 154, 0.3)',
  volumeDown: 'rgba(239, 83, 80, 0.3)',
  axisLine: '#2A2E39',
  axisLabel: '#D1D4DC',
  axisLabelBackground: '#2A2E39',
  font: DEFAULT_FONT,
};

export const LIGHT_THEME: Theme = {
  name: 'light',
  background: '#FFFFFF',
  text: '#131722',
  textSecondary: '#787B86',
  grid: '#F0F3FA',
  crosshair: '#9598A1',
  candleUp: '#26A69A',
  candleDown: '#EF5350',
  candleUpWick: '#26A69A',
  candleDownWick: '#EF5350',
  lineColor: '#2196F3',
  areaTopColor: 'rgba(33, 150, 243, 0.4)',
  areaBottomColor: 'rgba(33, 150, 243, 0.0)',
  volumeUp: 'rgba(38, 166, 154, 0.3)',
  volumeDown: 'rgba(239, 83, 80, 0.3)',
  axisLine: '#E0E3EB',
  axisLabel: '#131722',
  axisLabelBackground: '#F0F3FA',
  font: DEFAULT_FONT,
};

import type { OHLCBar } from '@chart-lib/commons';

export class DataExporter {
  static toCSV(data: ReadonlyArray<OHLCBar>): string {
    const header = 'Time,Open,High,Low,Close,Volume';
    const rows = data.map(bar => {
      const time = new Date(bar.time).toISOString();
      return `${time},${bar.open},${bar.high},${bar.low},${bar.close},${bar.volume}`;
    });
    return [header, ...rows].join('\n');
  }

  static toJSON(data: ReadonlyArray<OHLCBar>): string {
    return JSON.stringify(data.map(bar => ({
      time: new Date(bar.time).toISOString(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    })), null, 2);
  }

  static download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

import type { OHLCBar } from '@tradecanvas/commons';
import { normalizeBarTime } from '@tradecanvas/commons';

/** One more column next to the bars: an indicator line, one value per bar. */
export interface ExportColumn {
  name: string;
  values: ReadonlyArray<number | null | undefined>;
}

const BAR_COLUMNS = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume'];

/** A bar's time as an ISO date (bars timed in seconds as well as milliseconds). */
function isoTime(time: number): string {
  return new Date(normalizeBarTime(time)).toISOString();
}

/**
 * A CSV cell: quoted when it holds a comma, quote or line break, and never
 * read as a formula by a spreadsheet (a leading = + - @ gets an apostrophe).
 */
function csvCell(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const valueText = (v: number | null | undefined): string => (v === null || v === undefined || !Number.isFinite(v) ? '' : String(v));

export class DataExporter {
  static toCSV(data: ReadonlyArray<OHLCBar>, columns: readonly ExportColumn[] = []): string {
    const header = [...BAR_COLUMNS, ...columns.map((c) => csvCell(c.name))].join(',');
    const rows = data.map((bar, i) => [
      isoTime(bar.time), bar.open, bar.high, bar.low, bar.close, bar.volume,
      ...columns.map((c) => valueText(c.values[i])),
    ].join(','));
    return [header, ...rows].join('\n');
  }

  static toJSON(data: ReadonlyArray<OHLCBar>, columns: readonly ExportColumn[] = []): string {
    return JSON.stringify(data.map((bar, i) => {
      const row: Record<string, string | number | null> = {
        time: isoTime(bar.time),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      };
      for (const c of columns) {
        const v = c.values[i];
        row[c.name] = v === null || v === undefined || !Number.isFinite(v) ? null : v;
      }
      return row;
    }), null, 2);
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

import type { OHLCBar } from '@tradecanvas/commons';
import { barTimeUnit, normalizeBarTime, type BarTimeUnit } from '@tradecanvas/commons';

/** One more column next to the bars: an indicator line, one value per bar. */
export interface ExportColumn {
  name: string;
  values: ReadonlyArray<number | null | undefined>;
}

const BAR_COLUMNS = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume'];

/** A bar's time as an ISO date, in its series' unit (`barTimeUnit`). */
function isoTime(time: number, unit: BarTimeUnit): string {
  return new Date(normalizeBarTime(time, unit)).toISOString();
}

/**
 * A CSV cell: quoted when it holds a comma, quote or line break, and never
 * read as a formula by a spreadsheet (a leading = + - @ gets an apostrophe).
 */
function csvCell(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * The significant digits kept of a number with a fraction. A double holds 15
 * exactly, so every digit of a number up to 15 significant digits comes
 * through and the binary dust past them goes; a 16th digit a feed did send
 * (12345678.12345678) goes with it.
 */
const EXPORT_SIGNIFICANT_DIGITS = 15;
/** From here on a double's fraction is eighths at most, too coarse to carry dust, and its 16th digit is real. */
const EXACT_ABOVE = 1e15;

/**
 * A number as the export writes it. Volumes summed from trades or smaller
 * bars pick up binary dust (20.17 + 20.2 is 40.370000000000005), so a
 * fraction is cut to 15 significant digits, which keeps every digit of a
 * number up to 15 significant digits. Whole numbers and huge values are left
 * alone: they carry no dust, and cutting them would lose the 16th digit. Not
 * a number gives null.
 */
function exportNumber(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  // A negative zero is whole and returns here as it is: String and
  // JSON.stringify both write it as 0. The rounding below never makes a zero.
  if (Number.isInteger(v) || Math.abs(v) >= EXACT_ABOVE) return v;
  return Number(v.toPrecision(EXPORT_SIGNIFICANT_DIGITS));
}

const valueText = (v: number | null | undefined): string => {
  const n = exportNumber(v);
  return n === null ? '' : String(n);
};

export class DataExporter {
  static toCSV(data: ReadonlyArray<OHLCBar>, columns: readonly ExportColumn[] = []): string {
    const header = [...BAR_COLUMNS, ...columns.map((c) => csvCell(c.name))].join(',');
    const unit = barTimeUnit(data);
    const rows = data.map((bar, i) => [
      isoTime(bar.time, unit),
      ...[bar.open, bar.high, bar.low, bar.close, bar.volume].map(valueText),
      ...columns.map((c) => valueText(c.values[i])),
    ].join(','));
    return [header, ...rows].join('\n');
  }

  static toJSON(data: ReadonlyArray<OHLCBar>, columns: readonly ExportColumn[] = []): string {
    const unit = barTimeUnit(data);
    return JSON.stringify(data.map((bar, i) => {
      const row: Record<string, string | number | null> = {
        time: isoTime(bar.time, unit),
        open: exportNumber(bar.open),
        high: exportNumber(bar.high),
        low: exportNumber(bar.low),
        close: exportNumber(bar.close),
        volume: exportNumber(bar.volume),
      };
      for (const c of columns) row[c.name] = exportNumber(c.values[i]);
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

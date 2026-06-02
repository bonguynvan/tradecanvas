import type { OHLCBar, DataSeries } from '@tradecanvas/commons';

/**
 * Best-effort parser for OHLCV CSV / JSON drops.
 *
 * Recognises:
 *   - CSV (header-driven, comma / semicolon / tab delimiters)
 *   - JSON array of objects (`[{ time, open, high, low, close, volume }]`)
 *   - JSON array of arrays  (`[[time, open, high, low, close, volume]]`)
 *
 * Time columns auto-detect ISO strings, unix-seconds, and unix-ms. Returned
 * bars are sorted ascending by time and de-duplicated on collision.
 */
export interface ParseResult {
  data: DataSeries;
  /** Total rows seen — useful for "imported 4321 of 5000 rows" style toasts. */
  rowCount: number;
  /** Rows skipped because of missing/invalid required fields. */
  skipped: number;
}

const TIME_KEYS = ['time', 'timestamp', 'date', 'datetime', 't'];
const OPEN_KEYS = ['open', 'o'];
const HIGH_KEYS = ['high', 'h'];
const LOW_KEYS = ['low', 'l'];
const CLOSE_KEYS = ['close', 'c'];
const VOL_KEYS = ['volume', 'vol', 'v'];

export function parseOHLCV(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { data: [], rowCount: 0, skipped: 0 };

  if (trimmed[0] === '[' || trimmed[0] === '{') {
    return parseJson(trimmed);
  }
  return parseCsv(trimmed);
}

function parseJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  if (!Array.isArray(raw)) {
    throw new Error('Expected a JSON array of OHLCV rows');
  }
  const bars: OHLCBar[] = [];
  let skipped = 0;
  for (const row of raw) {
    const bar = Array.isArray(row) ? coerceArrayRow(row) : coerceObjectRow(row as Record<string, unknown>);
    if (bar) bars.push(bar); else skipped++;
  }
  return finalize(bars, raw.length, skipped);
}

function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { data: [], rowCount: 0, skipped: 0 };

  const delimiter = detectDelimiter(lines[0]);
  const header = splitLine(lines[0], delimiter).map(h => h.trim().toLowerCase());

  // If the first row doesn't look like a header (all numeric), assume the
  // canonical order: time, open, high, low, close, volume.
  const looksLikeHeader = header.some(h => isNaN(Number(h)) && h.length > 0);
  const colIdx = looksLikeHeader
    ? buildColumnMap(header)
    : { time: 0, open: 1, high: 2, low: 3, close: 4, volume: 5 };

  if (colIdx.time < 0 || colIdx.open < 0 || colIdx.high < 0 || colIdx.low < 0 || colIdx.close < 0) {
    throw new Error('CSV is missing required column(s): time, open, high, low, close');
  }

  const bars: OHLCBar[] = [];
  let skipped = 0;
  for (let i = looksLikeHeader ? 1 : 0; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter);
    const time = parseTimeCell(cols[colIdx.time]);
    // Empty cells parse to `Number('') === 0`, which would silently produce
    // bogus zero bars. Treat empty as invalid up-front so the row gets
    // skipped instead of polluting the series.
    const open = numCell(cols[colIdx.open]);
    const high = numCell(cols[colIdx.high]);
    const low = numCell(cols[colIdx.low]);
    const close = numCell(cols[colIdx.close]);
    const volume = colIdx.volume >= 0 ? Number(cols[colIdx.volume]) : 0;
    if (time === null || ![open, high, low, close].every(Number.isFinite)) {
      skipped++;
      continue;
    }
    bars.push({ time, open: open!, high: high!, low: low!, close: close!, volume: Number.isFinite(volume) ? volume : 0 });
  }

  return finalize(bars, lines.length - (looksLikeHeader ? 1 : 0), skipped);
}

function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const ch of headerLine) {
    if (ch in counts) counts[ch]++;
  }
  let best = ',';
  let bestCount = 0;
  for (const [d, n] of Object.entries(counts)) {
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

/** Minimal CSV splitter — handles double-quoted fields, doesn't try to be RFC-perfect. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { buf += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === delimiter && !inQuote) {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  out.push(buf);
  return out;
}

function buildColumnMap(header: string[]): { time: number; open: number; high: number; low: number; close: number; volume: number } {
  const find = (keys: string[]) => header.findIndex(h => keys.includes(h));
  return {
    time: find(TIME_KEYS),
    open: find(OPEN_KEYS),
    high: find(HIGH_KEYS),
    low: find(LOW_KEYS),
    close: find(CLOSE_KEYS),
    volume: find(VOL_KEYS),
  };
}

function coerceObjectRow(row: Record<string, unknown>): OHLCBar | null {
  const get = (keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
      const upper = k.toUpperCase();
      if (row[upper] !== undefined) return row[upper];
    }
    return undefined;
  };
  const time = parseTimeCell(String(get(TIME_KEYS) ?? ''));
  const open = Number(get(OPEN_KEYS));
  const high = Number(get(HIGH_KEYS));
  const low = Number(get(LOW_KEYS));
  const close = Number(get(CLOSE_KEYS));
  const volume = Number(get(VOL_KEYS) ?? 0);
  if (time === null || ![open, high, low, close].every(Number.isFinite)) return null;
  return { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
}

function coerceArrayRow(row: unknown[]): OHLCBar | null {
  if (row.length < 5) return null;
  const time = parseTimeCell(String(row[0]));
  const open = Number(row[1]);
  const high = Number(row[2]);
  const low = Number(row[3]);
  const close = Number(row[4]);
  const volume = row.length >= 6 ? Number(row[5]) : 0;
  if (time === null || ![open, high, low, close].every(Number.isFinite)) return null;
  return { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
}

/**
 * Returns milliseconds since epoch, or null if unparseable. Heuristic:
 *   - numeric < 1e12 → seconds, multiply by 1000
 *   - numeric >= 1e12 → already ms
 *   - non-numeric → Date.parse fallback (handles ISO, RFC 2822, etc.)
 */
function numCell(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return NaN;
  return Number(raw);
}

function parseTimeCell(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum > 0) {
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function finalize(bars: OHLCBar[], rowCount: number, skipped: number): ParseResult {
  bars.sort((a, b) => a.time - b.time);
  // De-dup on identical time — keep the last (later rows are typically more
  // authoritative if the source updated a bar after publishing it).
  const out: OHLCBar[] = [];
  for (const bar of bars) {
    if (out.length > 0 && out[out.length - 1].time === bar.time) {
      out[out.length - 1] = bar;
    } else {
      out.push(bar);
    }
  }
  return { data: out, rowCount, skipped };
}

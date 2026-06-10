import type { ChartType, TimeFrame, DrawingState, PriceScaleMode } from '@tradecanvas/commons';

export interface ShareableIndicator {
  id: string;
  params: Record<string, number | string | boolean>;
}

export interface ShareableWidgetState {
  v: 1;
  symbol: string;
  timeframe: TimeFrame;
  chartType: ChartType;
  scaleMode: PriceScaleMode;
  indicators: ShareableIndicator[];
  drawings: DrawingState[];
}

interface NodeBufferCtor {
  from(input: string, encoding: string): { toString(encoding: string): string };
}
const nodeBuffer = (globalThis as { Buffer?: NodeBufferCtor }).Buffer;

function utf8ToBase64(str: string): string {
  if (nodeBuffer) return nodeBuffer.from(str, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  if (nodeBuffer) return nodeBuffer.from(b64, 'base64').toString('utf8');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return b64 + pad;
}

/** Encode a shareable widget state to a compact, URL-safe string. */
export function encodeWidgetState(state: ShareableWidgetState): string {
  return toBase64Url(utf8ToBase64(JSON.stringify(state)));
}

/**
 * Decode a shareable-state string. Returns null for anything malformed or of an
 * unknown version — callers should treat null as "ignore and keep current view".
 */
export function decodeWidgetState(encoded: string): ShareableWidgetState | null {
  if (!encoded) return null;
  try {
    const json = base64ToUtf8(fromBase64Url(encoded));
    const obj = JSON.parse(json);
    if (!obj || obj.v !== 1 || typeof obj.symbol !== 'string') return null;
    return {
      v: 1,
      symbol: obj.symbol,
      timeframe: obj.timeframe,
      chartType: obj.chartType,
      scaleMode: obj.scaleMode ?? 'regular',
      indicators: Array.isArray(obj.indicators) ? obj.indicators : [],
      drawings: Array.isArray(obj.drawings) ? obj.drawings : [],
    };
  } catch {
    return null;
  }
}

const HASH_KEY = 'tcw';

/** Read a `#tcw=<encoded>` fragment from a URL hash, or null. */
export function readShareHash(hash: string): string | null {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const part of clean.split('&')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === HASH_KEY) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

/** Build a shareable URL by replacing the `tcw` hash param on `base`. */
export function buildShareUrl(base: string, encoded: string): string {
  const [withoutHash] = base.split('#');
  return `${withoutHash}#${HASH_KEY}=${encoded}`;
}

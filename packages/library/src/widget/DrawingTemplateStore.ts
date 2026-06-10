import type { DrawingStyle } from '@tradecanvas/commons';

export interface DrawingStyleTemplate {
  name: string;
  style: Partial<DrawingStyle>;
}

/** Minimal storage surface — satisfied by `localStorage` and easy to mock. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const STYLE_KEYS: (keyof DrawingStyle)[] = [
  'color', 'lineWidth', 'lineStyle', 'fillColor', 'fillOpacity', 'fontSize',
];

/** Keep only known style keys — guards against junk persisted by older builds. */
function sanitizeStyle(raw: unknown): Partial<DrawingStyle> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<DrawingStyle> = {};
  const obj = raw as Record<string, unknown>;
  for (const key of STYLE_KEYS) {
    if (obj[key] !== undefined) (out as Record<string, unknown>)[key] = obj[key];
  }
  return out;
}

/**
 * Named drawing-style presets, persisted to a key-value store. Templates are
 * upserted by name (case-sensitive) and ordered most-recently-saved last.
 */
export class DrawingTemplateStore {
  private templates: DrawingStyleTemplate[] = [];

  constructor(
    private storageKey = 'tcw:draw-templates',
    private storage: KeyValueStorage | null = defaultStorage(),
  ) {
    this.load();
  }

  list(): DrawingStyleTemplate[] {
    return this.templates.map((t) => ({ name: t.name, style: { ...t.style } }));
  }

  get(name: string): DrawingStyleTemplate | null {
    const t = this.templates.find((x) => x.name === name);
    return t ? { name: t.name, style: { ...t.style } } : null;
  }

  /** Insert or replace a template by name. */
  save(name: string, style: Partial<DrawingStyle>): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const clean = sanitizeStyle(style);
    this.templates = this.templates.filter((t) => t.name !== trimmed);
    this.templates.push({ name: trimmed, style: clean });
    this.persist();
  }

  remove(name: string): void {
    const next = this.templates.filter((t) => t.name !== name);
    if (next.length === this.templates.length) return;
    this.templates = next;
    this.persist();
  }

  clear(): void {
    this.templates = [];
    this.persist();
  }

  private load(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.templates = parsed
        .filter((t) => t && typeof t.name === 'string')
        .map((t) => ({ name: t.name, style: sanitizeStyle(t.style) }));
    } catch {
      // Corrupt or unavailable storage — start empty.
    }
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.templates));
    } catch {
      // Storage full or blocked — keep the in-memory copy.
    }
  }
}

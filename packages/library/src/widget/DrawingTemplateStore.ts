import type { DrawingOptions, DrawingStyle, DrawingToolType } from '@tradecanvas/commons';

export interface DrawingStyleTemplate {
  name: string;
  style: Partial<DrawingStyle>;
  /** The tool it was saved from, with that tool's options; absent for a style-only template. */
  type?: DrawingToolType;
  options?: DrawingOptions;
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

function copyTemplate(t: DrawingStyleTemplate): DrawingStyleTemplate {
  const out: DrawingStyleTemplate = { name: t.name, style: { ...t.style } };
  if (t.type) out.type = t.type;
  if (t.options) out.options = structuredClone(t.options);
  return out;
}

/**
 * Named drawing presets, persisted to a key-value store: a style, and for a
 * template saved from a tool, that tool's options. Templates are upserted by
 * name and tool (case-sensitive) and ordered most-recently-saved last.
 */
export class DrawingTemplateStore {
  private templates: DrawingStyleTemplate[] = [];

  constructor(
    private storageKey = 'tcw:draw-templates',
    private storage: KeyValueStorage | null = defaultStorage(),
  ) {
    this.load();
  }

  /** Style-only templates, plus with `type` the ones saved from that tool. */
  list(type?: DrawingToolType): DrawingStyleTemplate[] {
    return this.templates.filter((t) => !t.type || t.type === type).map(copyTemplate);
  }

  get(name: string, type?: DrawingToolType): DrawingStyleTemplate | null {
    const t = this.templates.find((x) => x.name === name && x.type === type);
    return t ? copyTemplate(t) : null;
  }

  /** Insert or replace a template by name (and tool, when it is saved with one). */
  save(name: string, style: Partial<DrawingStyle>, tool?: { type: DrawingToolType; options: DrawingOptions }): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const template: DrawingStyleTemplate = { name: trimmed, style: sanitizeStyle(style) };
    if (tool) {
      template.type = tool.type;
      template.options = structuredClone(tool.options);
    }
    this.templates = this.templates.filter((t) => !(t.name === trimmed && t.type === template.type));
    this.templates.push(template);
    this.persist();
  }

  remove(name: string, type?: DrawingToolType): void {
    this.templates = this.templates.filter((t) => !(t.name === name && t.type === type));
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
        .map((t) => {
          const template: DrawingStyleTemplate = { name: t.name, style: sanitizeStyle(t.style) };
          // Options are checked against the tool when they are applied.
          if (typeof t.type === 'string') template.type = t.type as DrawingToolType;
          if (t.options && typeof t.options === 'object' && !Array.isArray(t.options)) template.options = t.options;
          return template;
        });
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

/**
 * The options each drawing tool starts with ("save as default"), persisted to
 * a key-value store. Values are checked by the chart when they are applied.
 */
export class DrawingDefaultsStore {
  private defaults: Partial<Record<DrawingToolType, DrawingOptions>> = {};

  constructor(
    private storageKey = 'tcw:drawing-defaults',
    private storage: KeyValueStorage | null = defaultStorage(),
  ) {
    try {
      const raw = this.storage?.getItem(this.storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [type, options] of Object.entries(parsed)) {
          if (options && typeof options === 'object' && !Array.isArray(options)) {
            this.defaults[type as DrawingToolType] = options as DrawingOptions;
          }
        }
      }
    } catch {
      // Corrupt or unavailable storage — no defaults.
    }
  }

  all(): Partial<Record<DrawingToolType, DrawingOptions>> {
    return structuredClone(this.defaults);
  }

  /** Remember a tool's default options; null forgets them. */
  set(type: DrawingToolType, options: DrawingOptions | null): void {
    if (options && Object.keys(options).length > 0) this.defaults[type] = structuredClone(options);
    else delete this.defaults[type];
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.defaults));
    } catch {
      // Storage full or blocked — keep the in-memory copy.
    }
  }
}

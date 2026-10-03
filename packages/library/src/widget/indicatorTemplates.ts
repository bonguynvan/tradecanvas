import { ChartStateManager, type SnapshotIndicator } from '@tradecanvas/core';

/** A named set of indicators: their inputs, style, levels and panes. */
export interface IndicatorTemplate {
  name: string;
  indicators: SnapshotIndicator[];
}

/** The longest a template's name may be. */
export const MAX_TEMPLATE_NAME = 60;

/**
 * Indicator templates kept in this browser's `localStorage`. What is read
 * back is checked as a saved layout's indicators are; entries it cannot read
 * are left out.
 */
export class IndicatorTemplateStore {
  constructor(private readonly key = 'tcw:indicator-templates') {}

  /** Every template, by name. */
  list(): IndicatorTemplate[] {
    let raw: unknown;
    try {
      raw = JSON.parse(localStorage.getItem(this.key) ?? '[]');
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    const out: IndicatorTemplate[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { name, indicators } = entry as Record<string, unknown>;
      if (typeof name !== 'string' || !name.trim() || !Array.isArray(indicators)) continue;
      // The same checks as a saved layout's indicators.
      const checked = ChartStateManager.deserialize(JSON.stringify({ version: 2, indicators })).indicators;
      if (checked.length > 0) out.push({ name: name.slice(0, MAX_TEMPLATE_NAME), indicators: checked });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  get(name: string): IndicatorTemplate | null {
    return this.list().find((t) => t.name === name) ?? null;
  }

  /** Save under `name`, replacing a template of that name. Throws when storage refuses. */
  save(name: string, indicators: readonly SnapshotIndicator[]): void {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_TEMPLATE_NAME);
    if (!clean) throw new Error('A template needs a name');
    const next = [...this.list().filter((t) => t.name !== clean), { name: clean, indicators: [...indicators] }];
    localStorage.setItem(this.key, JSON.stringify(next));
  }

  remove(name: string): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.list().filter((t) => t.name !== name)));
    } catch {
      // Storage unavailable: nothing was kept to remove.
    }
  }
}

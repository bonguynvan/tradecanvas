/** Helpers for the landing page's ticker tape and open-source band. */

/** A price as a trader reads it: cents for big ones, more digits for small ones. */
export function tapePrice(v: number): string {
  const digits = v >= 1000 ? 2 : v >= 1 ? 3 : v >= 0.01 ? 4 : 6;
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** The day's change in percent, signed with a real minus; empty without one. */
export function tapeChange(v: number | null): string {
  if (v === null) return '';
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`;
}

/**
 * A fact's words either side of its figure (`{n}` in the template), so each
 * language puts the figure where it goes. Without `{n}` the figure leads.
 */
export function aroundFigure(template: string): [string, string] {
  const at = template.indexOf('{n}');
  return at < 0 ? ['', ` ${template}`] : [template.slice(0, at), template.slice(at + 3)];
}

/** The open-source band's counts. */
export interface Figures {
  stars: number;
  downloads: number;
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Figures kept from earlier in the visit, or null if there are none or they don't read as counts. */
export function parseFigures(raw: string | null): Figures | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { stars, downloads } = value as Record<string, unknown>;
    return isCount(stars) && isCount(downloads) ? { stars, downloads } : null;
  } catch {
    return null;
  }
}

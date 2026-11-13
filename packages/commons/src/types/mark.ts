/** What a mark on the chart is about: sets its letter and its colour. */
export type ChartMarkKind = 'news' | 'earnings' | 'dividend' | 'split' | 'event';

/**
 * Something that happened at a time, marked on the chart: a headline, an
 * earnings date, a dividend. Drawn as a small badge at the foot of the price
 * pane, on the bar that holds its time; the pointer over it reads its title.
 */
export interface ChartMark {
  id: string;
  /** When it happened, in ms since the epoch. It is drawn on the bar that holds this time. */
  time: number;
  /** What it is about; an `'event'` without one. */
  kind?: ChartMarkKind;
  /** One or two characters in the badge; the kind's letter without one. */
  label?: string;
  /** What the pointer reads over it: a headline, "Q3 earnings". */
  title: string;
  /** A second line under the title: a source, a figure. */
  text?: string;
  /** Where a click on it leads; only http(s) links are kept. */
  url?: string;
  /** The badge's colour; the kind's without one. */
  color?: string;
}

const KINDS: readonly ChartMarkKind[] = ['news', 'earnings', 'dividend', 'split', 'event'];
const MAX_TITLE = 300;
const MAX_TEXT = 1000;
const MAX_LABEL = 2;
const MAX_COLOR = 64;
/** Most marks a chart keeps: more is a feed gone wrong, not a chart. */
export const MAX_CHART_MARKS = 2000;

const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

const webUrl = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Marks from untrusted input (a feed, a host): each needs a title and a
 * time. Links that aren't web pages, kinds it doesn't know and labels past
 * two characters are dropped or cut; one with no id is given one. Earliest
 * first, at most `limit`.
 */
export function readChartMarks(raw: unknown, limit = MAX_CHART_MARKS): ChartMark[] {
  if (!Array.isArray(raw)) return [];
  const marks: ChartMark[] = [];
  const taken = new Set<string>();
  raw.forEach((entry, index) => {
    if (marks.length >= limit || !entry || typeof entry !== 'object') return;
    const r = entry as Record<string, unknown>;
    const title = text(r.title, MAX_TITLE);
    if (!title || typeof r.time !== 'number' || !Number.isFinite(r.time)) return;
    // Its own id when it has one nobody else took, else one from where it stood in the list.
    const own = text(r.id, MAX_TITLE);
    let id = own !== undefined && !taken.has(own) ? own : `mark-${index}`;
    while (taken.has(id)) id = `${id}'`;
    taken.add(id);
    const mark: ChartMark = { id, time: r.time, title };
    if (typeof r.kind === 'string' && (KINDS as readonly string[]).includes(r.kind)) mark.kind = r.kind as ChartMarkKind;
    const label = text(r.label, MAX_TITLE);
    if (label) mark.label = [...label].slice(0, MAX_LABEL).join('');
    const body = text(r.text, MAX_TEXT);
    if (body) mark.text = body;
    const url = webUrl(r.url);
    if (url) mark.url = url;
    const color = text(r.color, MAX_COLOR);
    if (color) mark.color = color;
    marks.push(mark);
  });
  return marks.sort((a, b) => a.time - b.time);
}

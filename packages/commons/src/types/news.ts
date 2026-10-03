/** A news headline about a symbol. */
export interface NewsItem {
  title: string;
  /** When it was published, in ms since the epoch. */
  time: number;
  /** The article; only http(s) links are kept. */
  url?: string;
  source?: string;
  summary?: string;
  id?: string;
}

const MAX_TITLE = 300;
const MAX_TEXT = 1000;

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
 * Headlines from untrusted input (a feed, a host): each needs a title and a
 * time; links that aren't web pages are dropped. Newest first, at most
 * `limit`.
 */
export function readNews(raw: unknown, limit = 20): NewsItem[] {
  if (!Array.isArray(raw)) return [];
  const items: NewsItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;
    const title = text(r.title, MAX_TITLE);
    if (!title || typeof r.time !== 'number' || !Number.isFinite(r.time)) continue;
    const item: NewsItem = { title, time: r.time };
    const url = webUrl(r.url);
    if (url) item.url = url;
    const source = text(r.source, MAX_TITLE);
    if (source) item.source = source;
    const summary = text(r.summary, MAX_TEXT);
    if (summary) item.summary = summary;
    const id = text(r.id, MAX_TITLE);
    if (id) item.id = id;
    items.push(item);
  }
  return items.sort((a, b) => b.time - a.time).slice(0, Math.max(0, limit));
}

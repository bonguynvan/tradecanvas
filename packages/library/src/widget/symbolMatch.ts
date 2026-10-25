import { escapeHtml } from './escapeHtml.js';

/** A name that starts with what was typed, and one that holds it further in: below a ticker's own match. */
const NAME_START_SCORE = 180;
const NAME_HOLDS_SCORE = 150;
const NAME_DEPTH_PENALTY_MAX = 50;

/**
 * How well a given symbol matches what was typed (`query`, upper case), by
 * its ticker or its name, when there is no feed to search: a ticker that
 * starts with it ranks first, then one that holds it, then a name, then the
 * ticker's letters in order. 0 for no match.
 */
export function scoreSymbol(symbol: string, description: string | undefined, query: string): number {
  return Math.max(scoreMatch(symbol.toUpperCase(), query), nameScore(description, query));
}

/**
 * Cheap fuzzy score:
 *   exact match              → 1000
 *   starts-with              → 500 + tighter-prefix bonus
 *   holds it                 → 200 + tighter bonus
 *   subsequence match        → 100 − gap penalty
 *   no match                 → 0
 */
export function scoreMatch(symbol: string, query: string): number {
  if (symbol === query) return 1000;
  if (symbol.startsWith(query)) return 500 + (50 - Math.min(50, symbol.length - query.length));
  if (symbol.includes(query)) return 200 + (50 - Math.min(50, symbol.length - query.length));

  let qi = 0;
  let lastIdx = -1;
  let gapPenalty = 0;
  for (let i = 0; i < symbol.length && qi < query.length; i++) {
    if (symbol[i] === query[qi]) {
      if (lastIdx >= 0) gapPenalty += i - lastIdx - 1;
      lastIdx = i;
      qi++;
    }
  }
  if (qi < query.length) return 0;
  return 100 - Math.min(99, gapPenalty);
}

/** A name that holds what was typed, the nearer its start the better; marks and all, or without them. */
function nameScore(description: string | undefined, query: string): number {
  if (!description) return 0;
  const name = foldMarks(description);
  const typed = foldMarks(query);
  if (!typed) return 0;
  if (name.startsWith(typed)) return NAME_START_SCORE;
  const at = name.indexOf(typed);
  return at < 0 ? 0 : NAME_HOLDS_SCORE - Math.min(NAME_DEPTH_PENALTY_MAX, at);
}

/**
 * Words without their marks, in upper case: a Vietnamese name ("Ngân hàng")
 * is often typed without them ("ngan hang"). Đ has no mark to take off; it
 * reads as D.
 */
function foldMarks(text: string): string {
  return text.normalize('NFD').replace(/\p{M}+/gu, '').replace(/[đĐ]/g, 'D').toUpperCase();
}

/**
 * The symbol with the letters the query matched marked: the run of them where
 * the symbol holds the query whole, else each in order; nothing when the
 * symbol doesn't hold them all (a match on the name).
 */
export function highlight(symbol: string, query: string): string {
  if (!query) return escapeHtml(symbol);
  const upper = symbol.toUpperCase();
  const marked = new Set<number>();
  const run = upper.indexOf(query);
  if (run >= 0) {
    for (let i = run; i < run + query.length; i++) marked.add(i);
  } else {
    let qi = 0;
    for (let i = 0; i < upper.length && qi < query.length; i++) {
      if (upper[i] === query[qi]) {
        marked.add(i);
        qi++;
      }
    }
    if (qi < query.length) marked.clear();
  }
  let out = '';
  for (let i = 0; i < symbol.length; i++) {
    out += marked.has(i) ? `<mark>${escapeHtml(symbol[i])}</mark>` : escapeHtml(symbol[i]);
  }
  return out;
}

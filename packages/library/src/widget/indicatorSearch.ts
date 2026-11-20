/** What a search reads of an indicator. */
export interface SearchableIndicator {
  id: string;
  name: string;
  shortName: string;
  /** The app's own group it is in: a search for the start of the group's name, or of a word in it, finds it too. */
  group?: { readonly label: string };
}

/** Lower case without accents, so "mômentum" finds Momentum. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const WORD_BREAK = /[\s/()%-]+/;

/** How well an indicator matches `q` (folded): 0 best, null not at all. */
function score(item: SearchableIndicator, q: string): number | null {
  const short = fold(item.shortName);
  const name = fold(item.name);
  if (short === q || fold(item.id) === q) return 0;
  if (short.startsWith(q) || name.startsWith(q)) return 1;
  if ([...name.split(WORD_BREAK), ...short.split(WORD_BREAK)].some((word) => word.startsWith(q))) return 2;
  if (name.includes(q) || short.includes(q)) return 3;
  const group = item.group ? fold(item.group.label) : '';
  if (group && (group.startsWith(q) || group.split(WORD_BREAK).some((word) => word.startsWith(q)))) return 4;
  return null;
}

/**
 * The indicators matching `query`, best first: the short name typed in full
 * ("rsi"), then names starting with it, then a word starting with it, then
 * any containing it, then those in an app's group whose name starts with it.
 * Ties go by name. Nothing typed finds nothing.
 */
export function searchIndicators<T extends SearchableIndicator>(items: readonly T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return [];
  return items
    .map((item) => ({ item, rank: score(item, q) }))
    .filter((hit): hit is { item: T; rank: number } => hit.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .map((hit) => hit.item);
}

/** Edits (insert, delete, change one character) from `a` to `b`. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + change);
    }
    previous = row;
  }
  return previous[b.length];
}

/** A typo this far off still names the word: a third of it, at least two letters. */
const reach = (word: string) => Math.max(2, Math.floor(word.length / 3));

/**
 * The candidates closest to `word`, best first: the same word in another case,
 * then the fewest edits within reach, then candidates that contain it.
 */
export function closest(word: string, candidates: readonly string[], limit = 3): string[] {
  const lower = word.toLowerCase();
  const scored = candidates
    .map((candidate) => {
      const other = candidate.toLowerCase();
      if (other === lower) return { candidate, score: 0 };
      const edits = editDistance(lower, other);
      if (edits <= reach(word)) return { candidate, score: edits };
      if (lower.length >= 3 && (other.includes(lower) || lower.includes(other))) return { candidate, score: reach(word) + 1 };
      return null;
    })
    .filter((s): s is { candidate: string; score: number } => s !== null)
    .sort((a, b) => a.score - b.score || a.candidate.length - b.candidate.length);
  return scored.slice(0, limit).map((s) => s.candidate);
}

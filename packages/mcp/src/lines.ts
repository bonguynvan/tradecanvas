/**
 * The stdio transport sends one JSON message a line. Splits what has arrived
 * into whole lines (blank ones dropped, a `\r` before the `\n` too) and keeps
 * the unfinished end for the next chunk; at the end of input (`ended`) that
 * end is a message too, newline or not.
 */
export function splitLines(pending: string, chunk: string, ended = false): { lines: string[]; rest: string } {
  const parts = (pending + chunk).split('\n');
  const rest = ended ? '' : parts.pop() ?? '';
  const lines = parts.map((line) => line.replace(/\r$/, '')).filter((line) => line.trim() !== '');
  return { lines, rest };
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * A task file's settings and prompt: `key: value` lines between `---` fences
 * (numbers, quoted strings, `[a, b]` lists), then the prompt. Only the shapes
 * the task files use: no dependency for a YAML parser.
 */
export function parseFrontmatter(text) {
  const match = FENCE.exec(text);
  if (!match) return { meta: {}, body: text.trim() };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at < 0 || line.trimStart().startsWith('#')) continue;
    meta[line.slice(0, at).trim()] = value(line.slice(at + 1).trim());
  }
  return { meta, body: text.slice(match[0].length).trim() };
}

function value(raw) {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map((item) => value(item.trim())).filter((item) => item !== '');
  }
  if (/^".*"$|^'.*'$/.test(raw)) return raw.slice(1, -1);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (raw !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return raw;
}

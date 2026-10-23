// The old demo site on GitHub Pages moved to tradecanvas.dev. Pages cannot
// answer with a real redirect, so this writes one small page per old address
// that sends the reader on at once (a refresh meta for crawlers, a script that
// keeps the query and the #anchor), and a 404.html that does the same for any
// address it did not know. The llms files stay where agents fetch them.
//
//   node scripts/redirects.mjs <out dir>       (after `pnpm docs:gen`)
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The docs pages, one file per slug in the English docs. */
export const DOC_SLUGS = readdirSync(join(ROOT, 'demo/src/lib/docs/en'))
  .filter((f) => f.endsWith('.svelte'))
  .map((f) => f.slice(0, -'.svelte'.length))
  .sort();

/** The old site's languages, English (no prefix) first. */
export const OLD_LANGS = [...readFileSync(join(ROOT, 'demo/src/lib/i18n/languages.ts'), 'utf8').matchAll(/\{ code: '([a-z-]+)'/g)]
  .map((m) => m[1]);

/** The new address for an old one. Self-contained: 404.html runs it in the browser. */
export function targetFor(pathname, search = '', hash = '', slugs = DOC_SLUGS) {
  const SITE = 'https://tradecanvas.dev';
  const SITE_LANGS = ['vi', 'zh', 'ja', 'ko', 'es'];
  const OLD_LANG = /^(vi|zh|zh-hant|ja|ko|es|pt|fr|de|ru|tr|id|th)$/;
  const PAGES = ['examples', 'audit', 'business', 'changelog'];
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'tradecanvas') return SITE + '/';
  parts.shift();
  if (parts[0] === 'embed') return SITE + '/embed/' + search + hash;
  const lang = parts[0] && OLD_LANG.test(parts[0]) ? parts.shift() : '';
  // Traditional Chinese had no docs of its own; Simplified reads closer than English.
  const site = lang === 'zh-hant' ? 'zh' : lang;
  const prefix = SITE_LANGS.includes(site) ? '/' + site : '';
  let page = '';
  if (parts[0] === 'playground') page = 'examples';
  else if (PAGES.includes(parts[0])) page = parts[0];
  else if (parts[0] === 'docs') page = parts[1] && slugs.includes(parts[1]) ? 'docs/' + parts[1] : 'docs';
  const known = page !== '' || parts.length === 0;
  return SITE + prefix + (page ? '/' + page + '/' : '/') + (known ? hash : '');
}

/** One file per old page in every old language: [{ file, to }]. */
export function redirectPages(slugs = DOC_SLUGS, langs = OLD_LANGS) {
  const pages = ['', 'docs', ...slugs.map((s) => `docs/${s}`), 'examples', 'playground', 'audit', 'business', 'changelog'];
  const out = [{ file: 'embed/index.html', to: targetFor('/tradecanvas/embed/') }];
  for (const lang of langs) {
    for (const page of pages) {
      const path = [lang === 'en' ? '' : lang, page].filter(Boolean).join('/');
      out.push({
        file: path ? `${path}/index.html` : 'index.html',
        to: targetFor(`/tradecanvas/${path}`, '', '', slugs),
      });
    }
  }
  return out;
}

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function redirectHtml(to) {
  const url = escapeAttr(to);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>TradeCanvas moved to tradecanvas.dev</title>
<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0; url=${url}">
<script>location.replace(${JSON.stringify(to)}.replace(/[?#].*$/, '') + location.search + location.hash);</script>
</head>
<body>
<p>TradeCanvas moved to <a href="${url}">${url}</a>.</p>
</body>
</html>
`;
}

/** For addresses no page was written for: the same mapping, run in the browser. */
export function notFoundHtml(slugs = DOC_SLUGS) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>TradeCanvas moved to tradecanvas.dev</title>
<meta name="robots" content="noindex">
<script>
const DOC_SLUGS = ${JSON.stringify(slugs)};
const targetFor = ${targetFor.toString()};
location.replace(targetFor(location.pathname, location.search, location.hash));
</script>
</head>
<body>
<p>TradeCanvas moved to <a href="https://tradecanvas.dev/">tradecanvas.dev</a>.</p>
</body>
</html>
`;
}

function build(outDir) {
  for (const { file, to } of redirectPages()) {
    const path = join(outDir, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, redirectHtml(to));
  }
  writeFileSync(join(outDir, '404.html'), notFoundHtml());
  for (const file of ['llms.txt', 'llms-full.txt']) copyFileSync(join(ROOT, 'demo/static', file), join(outDir, file));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = resolve(process.argv[2] ?? join(ROOT, '.tmp/redirects'));
  mkdirSync(outDir, { recursive: true });
  build(outDir);
  console.log(`redirect pages written to ${outDir}`);
}

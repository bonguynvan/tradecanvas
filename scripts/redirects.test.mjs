import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { targetFor, redirectPages, redirectHtml, notFoundHtml } from './redirects.mjs';

const SLUGS = ['api', 'getting-started', 'styling'];

test('the home page and the pages the site kept move one to one', () => {
  assert.equal(targetFor('/tradecanvas/'), 'https://tradecanvas.dev/');
  assert.equal(targetFor('/tradecanvas'), 'https://tradecanvas.dev/');
  assert.equal(targetFor('/tradecanvas/docs/api'), 'https://tradecanvas.dev/docs/api/');
  assert.equal(targetFor('/tradecanvas/docs/api/'), 'https://tradecanvas.dev/docs/api/');
  assert.equal(targetFor('/tradecanvas/examples/'), 'https://tradecanvas.dev/examples/');
  assert.equal(targetFor('/tradecanvas/changelog'), 'https://tradecanvas.dev/changelog/');
  assert.equal(targetFor('/tradecanvas/audit/'), 'https://tradecanvas.dev/audit/');
  assert.equal(targetFor('/tradecanvas/business/'), 'https://tradecanvas.dev/business/');
});

test('the playground, a sandbox launcher, goes to the examples', () => {
  assert.equal(targetFor('/tradecanvas/playground/'), 'https://tradecanvas.dev/examples/');
  assert.equal(targetFor('/tradecanvas/vi/playground'), 'https://tradecanvas.dev/vi/examples/');
});

test('every old language keeps its prefix: the site has all fourteen', () => {
  assert.equal(targetFor('/tradecanvas/vi/docs/api/'), 'https://tradecanvas.dev/vi/docs/api/');
  assert.equal(targetFor('/tradecanvas/ja/'), 'https://tradecanvas.dev/ja/');
  assert.equal(targetFor('/tradecanvas/ko/examples/'), 'https://tradecanvas.dev/ko/examples/');
  assert.equal(targetFor('/tradecanvas/zh/docs/api/'), 'https://tradecanvas.dev/zh/docs/api/');
  assert.equal(targetFor('/tradecanvas/es/changelog/'), 'https://tradecanvas.dev/es/changelog/');
  assert.equal(targetFor('/tradecanvas/zh-hant/docs/api/'), 'https://tradecanvas.dev/zh-hant/docs/api/');
  assert.equal(targetFor('/tradecanvas/de/docs/api/'), 'https://tradecanvas.dev/de/docs/api/');
  assert.equal(targetFor('/tradecanvas/th/business/'), 'https://tradecanvas.dev/th/business/');
  for (const lang of ['pt', 'fr', 'ru', 'tr', 'id']) {
    assert.equal(targetFor(`/tradecanvas/${lang}/audit/`), `https://tradecanvas.dev/${lang}/audit/`, lang);
  }
});

test('the embed keeps its query and hash, which carry the chart it shows', () => {
  assert.equal(
    targetFor('/tradecanvas/embed/', '?symbol=ETHUSDT&theme=light', '#x'),
    'https://tradecanvas.dev/embed/?symbol=ETHUSDT&theme=light#x',
  );
  assert.equal(targetFor('/tradecanvas/docs/api', '', '#methods'), 'https://tradecanvas.dev/docs/api/#methods');
});

test('a page the site does not have lands on the home page of its language', () => {
  assert.equal(targetFor('/tradecanvas/no-such-page'), 'https://tradecanvas.dev/');
  assert.equal(targetFor('/tradecanvas/vi/docs/no-such-doc'), 'https://tradecanvas.dev/vi/docs/');
  assert.equal(targetFor('/somewhere/else'), 'https://tradecanvas.dev/');
});

test('every old page gets a file of its own, in every old language', () => {
  const pages = redirectPages(SLUGS, ['en', 'vi', 'zh', 'th']);
  const files = pages.map((p) => p.file);
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('docs/api/index.html'));
  assert.ok(files.includes('vi/docs/styling/index.html'));
  assert.ok(files.includes('zh/playground/index.html'));
  assert.ok(files.includes('embed/index.html'));
  assert.ok(!files.includes('en/index.html'), 'English never had a prefix');
  assert.equal(new Set(files).size, files.length);
  assert.equal(pages.find((p) => p.file === 'zh/docs/api/index.html').to, 'https://tradecanvas.dev/zh/docs/api/');
  assert.equal(pages.find((p) => p.file === 'th/docs/api/index.html').to, 'https://tradecanvas.dev/th/docs/api/');
});

test('404.html maps an address it was not written for, in the browser', () => {
  const html = notFoundHtml(SLUGS);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const visit = (pathname, search = '', hash = '') => {
    let went = '';
    const location = { pathname, search, hash, replace: (url) => { went = url; } };
    runInNewContext(script, { location });
    return went;
  };
  assert.equal(visit('/tradecanvas/vi/docs/styling/', '', '#controls'), 'https://tradecanvas.dev/vi/docs/styling/#controls');
  assert.equal(visit('/tradecanvas/embed', '?symbol=SOLUSDT'), 'https://tradecanvas.dev/embed/?symbol=SOLUSDT');
  assert.equal(visit('/tradecanvas/old/thing'), 'https://tradecanvas.dev/');
});

test('a redirect page moves at once, keeps the query and hash, and names the new page', () => {
  const html = redirectHtml('https://tradecanvas.dev/docs/api/');
  assert.match(html, /<meta http-equiv="refresh" content="0; url=https:\/\/tradecanvas\.dev\/docs\/api\/">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradecanvas\.dev\/docs\/api\/">/);
  assert.match(html, /location\.replace\(/);
  assert.match(html, /location\.search \+ location\.hash/);
  assert.match(html, /<a href="https:\/\/tradecanvas\.dev\/docs\/api\/">/);
});

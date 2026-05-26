export const prerender = true;

const BASE_URL = 'https://bonguynvan.github.io/tradecanvas';

const PATHS = [
  '/',
  '/docs/getting-started/',
  '/docs/api/',
  '/docs/chart-types/',
  '/docs/indicators/',
  '/docs/drawing-tools/',
  '/docs/trading/',
  '/docs/finance/',
  '/docs/realtime/',
  '/docs/analytics/',
  '/docs/frameworks/',
  '/docs/embed/',
  '/examples/',
  '/playground/',
  '/changelog/',
];

export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PATHS.map(
    (path) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`,
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

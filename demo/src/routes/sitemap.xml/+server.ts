import { DOC_SLUGS } from '$lib/docs';
import { SITE_LANGUAGES } from '$lib/i18n/languages';
import { localizePath } from '$lib/i18n/paths';
import { SITE_URL } from '$lib/site';

export const prerender = true;

const PAGES = ['/', '/examples/', '/playground/', '/changelog/'];

/** Each page in every language it has; docs only where they are translated. */
function urls(): { loc: string; alternates: { tag: string; href: string }[] }[] {
  const docs = DOC_SLUGS.map((slug) => `/docs/${slug}/`);
  return [...PAGES, ...docs].flatMap((path) => {
    const languages = SITE_LANGUAGES.filter((language) => language.docs || !path.startsWith('/docs/'));
    const alternates = languages.map((language) => ({ tag: language.tag, href: SITE_URL + localizePath(language.code, path) }));
    return alternates.map((alternate) => ({ loc: alternate.href, alternates }));
  });
}

export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const body = urls()
    .map(({ loc, alternates }) => {
      const links = alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.tag}" href="${a.href}"/>`)
        .join('\n');
      return `  <url>
    <loc>${loc}</loc>
${links}
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

import type { WidgetMessages } from '@tradecanvas/chart/widget';
import { DEFAULT_LANG } from './languages';

// One chunk per widget language. The public `@tradecanvas/chart/widget/locales`
// entry bundles all fourteen; the site only needs the page's own.
const locales = import.meta.glob<Record<string, WidgetMessages>>([
  '$widget-locales/*.ts',
  '!$widget-locales/index.ts',
]);

/** The widget's file and `locale` code for a site language. */
const WIDGET_FILES: Record<string, { file: string; locale: string }> = {
  'zh-hant': { file: 'zhHant', locale: 'zh-Hant' },
};

/**
 * ChartWidget options that show it in the site's language. English and
 * Vietnamese are built into the widget; the others load their own file.
 */
export async function widgetLanguage(lang: string): Promise<{ locale?: string; messages?: WidgetMessages }> {
  if (lang === DEFAULT_LANG) return {};
  if (lang === 'vi') return { locale: 'vi' };
  const { file, locale } = WIDGET_FILES[lang] ?? { file: lang, locale: lang };
  const load = Object.entries(locales).find(([path]) => path.endsWith(`/${file}.ts`))?.[1];
  if (!load) return {};
  // Each file has one export: its message table.
  const messages = Object.values(await load()).find((value) => typeof value === 'object' && value !== null);
  return messages ? { locale, messages } : {};
}

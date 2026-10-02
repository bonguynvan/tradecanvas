import type { WidgetMessages } from '@tradecanvas/chart/widget';
import { DEFAULT_LANG } from './languages';

/**
 * ChartWidget options that show it in the site's language. English and
 * Vietnamese are built into the widget; the others load from its locales
 * entry, only on pages in those languages.
 */
export async function widgetLanguage(lang: string): Promise<{ locale?: string; messages?: WidgetMessages }> {
  if (lang === DEFAULT_LANG) return {};
  if (lang === 'vi') return { locale: 'vi' };
  const { WIDGET_LANGUAGES } = await import('@tradecanvas/chart/widget/locales');
  const language = WIDGET_LANGUAGES.find((l) => l.code.toLowerCase() === lang);
  return language ? { locale: language.code, messages: language.messages } : {};
}

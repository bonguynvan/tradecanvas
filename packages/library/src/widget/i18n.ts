/**
 * i18n for ChartWidget's own chrome: toolbar, legend, settings, drawing tools,
 * panels, dialogs, hotkey sheet and toasts. Indicator names stay as they are
 * (mostly acronyms). English and Vietnamese are built in; other languages
 * come from `@tradecanvas/chart/widget/locales` — pass one as `messages`, or
 * register it once with `registerWidgetLocale`.
 */
import { EN_MESSAGES, type MessageKey, type WidgetMessages } from './locales/en.js';
import { VI_MESSAGES } from './locales/vi.js';

export { EN_MESSAGES, VI_MESSAGES };
export type { MessageKey, WidgetMessages };

const registry = new Map<string, Partial<WidgetMessages>>([
  ['en', EN_MESSAGES],
  ['vi', VI_MESSAGES],
]);

/** The locales registered so far: English, Vietnamese and any added with `registerWidgetLocale`. */
export const BUILTIN_LOCALES: Readonly<Record<string, Partial<WidgetMessages>>> = new Proxy({}, {
  get: (_t, key) => (typeof key === 'string' ? registry.get(key.toLowerCase()) : undefined),
  has: (_t, key) => typeof key === 'string' && registry.has(key.toLowerCase()),
  ownKeys: () => [...registry.keys()],
  getOwnPropertyDescriptor: (_t, key) =>
    typeof key === 'string' && registry.has(key.toLowerCase())
      ? { enumerable: true, configurable: true, value: registry.get(key.toLowerCase()) }
      : undefined,
});

/**
 * Make a language available to `locale` on every ChartWidget, e.g.
 * `registerWidgetLocale('ja', ja)` with `ja` from
 * `@tradecanvas/chart/widget/locales`. Codes match case-insensitively.
 */
export function registerWidgetLocale(code: string, messages: Partial<WidgetMessages>): void {
  registry.set(code.toLowerCase(), messages);
}

/** Codes to try for `locale`, most specific first: `zh-TW` → `zh-tw`, `zh-hant`, `zh`. */
function localeCandidates(locale: string): string[] {
  const lower = locale.toLowerCase().replace('_', '-');
  const out = [lower];
  if (/^zh-(tw|hk|mo|hant)/.test(lower)) out.push('zh-hant');
  const language = lower.split('-')[0];
  if (language !== lower) out.push(language);
  return out;
}

/** The table for `locale`, if one is registered for it or its language. */
export function findWidgetLocale(locale: string): Partial<WidgetMessages> | undefined {
  for (const code of localeCandidates(locale)) {
    const table = registry.get(code);
    if (table) return table;
  }
  return undefined;
}

const warned = new Set<string>();

/**
 * Resolve the widget's message table: built-in English as the base, the
 * table for `locale` (or its language) on top, falling back key by key to
 * English, then the host's `messages` last so they always win.
 */
export function resolveMessages(
  locale: string | undefined,
  overrides: Partial<WidgetMessages> | undefined,
): WidgetMessages {
  const base: WidgetMessages = { ...EN_MESSAGES };
  const table = locale ? findWidgetLocale(locale) : undefined;
  if (table) Object.assign(base, table);
  else if (locale && !overrides && !warned.has(locale)) {
    warned.add(locale);
    console.warn(
      `[ChartWidget] No strings for locale "${locale}"; showing English. `
      + "Import the language from '@tradecanvas/chart/widget/locales' and pass it as `messages`.",
    );
  }
  if (overrides) Object.assign(base, overrides);
  return base;
}

export type Translator = (key: MessageKey) => string;

export function createTranslator(messages: WidgetMessages): Translator {
  return (key: MessageKey) => messages[key] ?? EN_MESSAGES[key] ?? key;
}

/** English strings, for components used without a widget. */
export const EN_TRANSLATOR: Translator = createTranslator(EN_MESSAGES);

/** Fill `{name}` placeholders: `fill('Comparing {symbol}', { symbol: 'ETH' })`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

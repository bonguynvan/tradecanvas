/**
 * ChartWidget's translations, a separate entry so a page loads only the
 * languages it imports:
 *
 * ```ts
 * import { ChartWidget } from '@tradecanvas/chart/widget';
 * import { ja } from '@tradecanvas/chart/widget/locales';
 * new ChartWidget(el, { locale: 'ja', messages: ja });
 * ```
 *
 * Or make every language available to `locale` at once with
 * `registerWidgetLocales()`.
 */
import { registerWidgetLocale, type WidgetMessages } from '../i18n.js';
import { EN_MESSAGES } from './en.js';
import { VI_MESSAGES } from './vi.js';
import { ZH_MESSAGES } from './zh.js';
import { ZH_HANT_MESSAGES } from './zhHant.js';
import { JA_MESSAGES } from './ja.js';
import { KO_MESSAGES } from './ko.js';
import { ES_MESSAGES } from './es.js';
import { PT_MESSAGES } from './pt.js';
import { FR_MESSAGES } from './fr.js';
import { DE_MESSAGES } from './de.js';
import { RU_MESSAGES } from './ru.js';
import { TR_MESSAGES } from './tr.js';
import { ID_MESSAGES } from './id.js';
import { TH_MESSAGES } from './th.js';

export {
  EN_MESSAGES as en,
  VI_MESSAGES as vi,
  ZH_MESSAGES as zh,
  ZH_HANT_MESSAGES as zhHant,
  JA_MESSAGES as ja,
  KO_MESSAGES as ko,
  ES_MESSAGES as es,
  PT_MESSAGES as pt,
  FR_MESSAGES as fr,
  DE_MESSAGES as de,
  RU_MESSAGES as ru,
  TR_MESSAGES as tr,
  ID_MESSAGES as id,
  TH_MESSAGES as th,
};
export type { WidgetMessages };

export interface WidgetLanguage {
  /** The `locale` code: `'ja'`, `'zh-Hant'`… */
  code: string;
  /** The language's own name. */
  name: string;
  /** A number format that suits it, for `chartOptions.numberLocale`. */
  numberLocale: string;
  messages: WidgetMessages;
}

/** Every built-in language, in the order a language menu would list them. */
export const WIDGET_LANGUAGES: readonly WidgetLanguage[] = [
  { code: 'en', name: 'English', numberLocale: 'en-US', messages: EN_MESSAGES },
  { code: 'vi', name: 'Tiếng Việt', numberLocale: 'vi-VN', messages: VI_MESSAGES },
  { code: 'zh', name: '简体中文', numberLocale: 'zh-CN', messages: ZH_MESSAGES },
  { code: 'zh-Hant', name: '繁體中文', numberLocale: 'zh-TW', messages: ZH_HANT_MESSAGES },
  { code: 'ja', name: '日本語', numberLocale: 'ja-JP', messages: JA_MESSAGES },
  { code: 'ko', name: '한국어', numberLocale: 'ko-KR', messages: KO_MESSAGES },
  { code: 'es', name: 'Español', numberLocale: 'es-ES', messages: ES_MESSAGES },
  { code: 'pt', name: 'Português', numberLocale: 'pt-BR', messages: PT_MESSAGES },
  { code: 'fr', name: 'Français', numberLocale: 'fr-FR', messages: FR_MESSAGES },
  { code: 'de', name: 'Deutsch', numberLocale: 'de-DE', messages: DE_MESSAGES },
  { code: 'ru', name: 'Русский', numberLocale: 'ru-RU', messages: RU_MESSAGES },
  { code: 'tr', name: 'Türkçe', numberLocale: 'tr-TR', messages: TR_MESSAGES },
  { code: 'id', name: 'Bahasa Indonesia', numberLocale: 'id-ID', messages: ID_MESSAGES },
  { code: 'th', name: 'ไทย', numberLocale: 'th-TH', messages: TH_MESSAGES },
];

/** Make every built-in language available to ChartWidget's `locale` option. */
export function registerWidgetLocales(): void {
  for (const language of WIDGET_LANGUAGES) registerWidgetLocale(language.code, language.messages);
}

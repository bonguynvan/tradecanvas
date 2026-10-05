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
import { AR_MESSAGES } from './ar.js';
import { HE_MESSAGES } from './he.js';
import { IT_MESSAGES } from './it.js';
import { NL_MESSAGES } from './nl.js';
import { PL_MESSAGES } from './pl.js';
import { CS_MESSAGES } from './cs.js';
import { SK_MESSAGES } from './sk.js';
import { HU_MESSAGES } from './hu.js';
import { RO_MESSAGES } from './ro.js';
import { EL_MESSAGES } from './el.js';
import { SV_MESSAGES } from './sv.js';
import { DA_MESSAGES } from './da.js';
import { NB_MESSAGES } from './nb.js';
import { ET_MESSAGES } from './et.js';
import { MS_MESSAGES } from './ms.js';
import { FA_MESSAGES } from './fa.js';

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
  AR_MESSAGES as ar,
  HE_MESSAGES as he,
  IT_MESSAGES as it,
  NL_MESSAGES as nl,
  PL_MESSAGES as pl,
  CS_MESSAGES as cs,
  SK_MESSAGES as sk,
  HU_MESSAGES as hu,
  RO_MESSAGES as ro,
  EL_MESSAGES as el,
  SV_MESSAGES as sv,
  DA_MESSAGES as da,
  NB_MESSAGES as nb,
  ET_MESSAGES as et,
  MS_MESSAGES as ms,
  FA_MESSAGES as fa,
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
  { code: 'it', name: 'Italiano', numberLocale: 'it-IT', messages: IT_MESSAGES },
  { code: 'nl', name: 'Nederlands', numberLocale: 'nl-NL', messages: NL_MESSAGES },
  { code: 'pl', name: 'Polski', numberLocale: 'pl-PL', messages: PL_MESSAGES },
  { code: 'cs', name: 'Čeština', numberLocale: 'cs-CZ', messages: CS_MESSAGES },
  { code: 'sk', name: 'Slovenčina', numberLocale: 'sk-SK', messages: SK_MESSAGES },
  { code: 'hu', name: 'Magyar', numberLocale: 'hu-HU', messages: HU_MESSAGES },
  { code: 'ro', name: 'Română', numberLocale: 'ro-RO', messages: RO_MESSAGES },
  { code: 'el', name: 'Ελληνικά', numberLocale: 'el-GR', messages: EL_MESSAGES },
  { code: 'sv', name: 'Svenska', numberLocale: 'sv-SE', messages: SV_MESSAGES },
  { code: 'da', name: 'Dansk', numberLocale: 'da-DK', messages: DA_MESSAGES },
  { code: 'nb', name: 'Norsk bokmål', numberLocale: 'nb-NO', messages: NB_MESSAGES },
  { code: 'et', name: 'Eesti', numberLocale: 'et-EE', messages: ET_MESSAGES },
  { code: 'ms', name: 'Bahasa Melayu', numberLocale: 'ms-MY', messages: MS_MESSAGES },
  // Right to left; numbers in Latin digits, as the strings write them, and
  // dates by the Gregorian calendar the bars are in.
  { code: 'ar', name: 'العربية', numberLocale: 'ar-u-nu-latn', messages: AR_MESSAGES },
  { code: 'he', name: 'עברית', numberLocale: 'he-IL', messages: HE_MESSAGES },
  { code: 'fa', name: 'فارسی', numberLocale: 'fa-u-ca-gregory-nu-latn', messages: FA_MESSAGES },
];

/** Make every built-in language available to ChartWidget's `locale` option. */
export function registerWidgetLocales(): void {
  for (const language of WIDGET_LANGUAGES) registerWidgetLocale(language.code, language.messages);
}

import type { DrawingToolGroupDef } from './types.js';
import type { MessageKey, Translator } from './i18n.js';

/** Number formats the settings offer, by locale tag. */
export const NUMBER_LOCALES: readonly string[] = [
  'en-US', 'en-GB', 'en-IN', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ru-RU', 'tr-TR',
  'vi-VN', 'id-ID', 'th-TH', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR',
];

const SAMPLE = 65234;

/** "de-DE (65.234,00)": each format with a sample number; the current one stays listed. */
export function numberLocaleOptions(current: string): { value: string; label: string }[] {
  const codes = current && !NUMBER_LOCALES.includes(current) ? [current, ...NUMBER_LOCALES] : NUMBER_LOCALES;
  return codes.map((code) => {
    let sample: string;
    try {
      sample = new Intl.NumberFormat(code, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(SAMPLE);
    } catch {
      sample = '';
    }
    return { value: code, label: sample ? `${code} (${sample})` : code };
  });
}

/** Message key of each built-in drawing-tool group, by its English name. */
const TOOL_GROUP_KEYS: Readonly<Record<string, MessageKey>> = {
  Lines: 'toolGroup.lines',
  'Horizontal/Vertical': 'toolGroup.horizontalVertical',
  Channels: 'toolGroup.channels',
  Fibonacci: 'toolGroup.fibonacci',
  Shapes: 'toolGroup.shapes',
  'Gann & Pitchforks': 'toolGroup.gannPitchforks',
  Patterns: 'toolGroup.patterns',
  Measure: 'toolGroup.measure',
  Annotation: 'toolGroup.annotation',
  Forecasting: 'toolGroup.forecasting',
};

/** A chart type's name in the widget's language (an unknown type keeps its own). */
export function chartTypeLabel(ct: { value: string; label: string }, t: Translator): string {
  const key = `chartType.${ct.value}` as MessageKey;
  const translated = t(key);
  return translated === key ? ct.label : translated;
}

/** The drawing-tool groups with names in the widget's language (unknown tools keep theirs). */
export function localizeToolGroups(groups: readonly DrawingToolGroupDef[], t: Translator): DrawingToolGroupDef[] {
  return groups.map((group) => ({
    label: TOOL_GROUP_KEYS[group.label] ? t(TOOL_GROUP_KEYS[group.label]) : group.label,
    tools: group.tools.map((tool) => {
      const key = `tool.${tool.value}` as MessageKey;
      const label = t(key);
      return { ...tool, label: label === key ? tool.label : label };
    }),
  }));
}

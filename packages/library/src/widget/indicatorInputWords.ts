import type { IndicatorDescriptor } from '@tradecanvas/commons';
import { indicatorChipLabel } from '../indicatorLabel.js';
import { EN_MESSAGES, type MessageKey, type Translator } from './i18n.js';

/**
 * Words for an indicator's inputs in the widget's language: an input named
 * `anchor` is `indicatorInput.anchor`, its choice `'week'` is
 * `indicatorInput.anchor.week`. Only inputs the widget has words for; any
 * other keeps its own label and its values as they are.
 */

/** Whether the widget has a message under `key`, one built from an input's name. */
function isMessageKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(EN_MESSAGES, key);
}

/** An input's label in the widget's language, or null for one it has no word for. */
export function inputLabel(name: string, t: Translator): string | null {
  const key = `indicatorInput.${name}`;
  return isMessageKey(key) ? t(key) : null;
}

/** A choice of an input in the widget's language, or null for one it has no word for. */
export function choiceLabel(name: string, choice: string | number, t: Translator): string | null {
  const key = `indicatorInput.${name}.${choice}`;
  return isMessageKey(key) ? t(key) : null;
}

/** An indicator on the chart, as the widget names it. */
export interface NamedIndicator {
  id: string;
  params: Record<string, unknown>;
  descriptor: Pick<IndicatorDescriptor, 'defaultConfig' | 'shortName' | 'inputs'>;
}

/**
 * The indicator's name in the legend, the chips and the Objects panel: its
 * chip label ('EMA 21'), then the word for each choice off its default, so
 * two read apart ('VWAP', 'VWAP Week'). The CSV column keeps the chip label.
 */
export function widgetIndicatorLabel(ind: NamedIndicator, t: Translator): string {
  const { defaultConfig, shortName, inputs } = ind.descriptor;
  const words = Object.entries(inputs ?? {}).flatMap(([name, spec]) => {
    const value = ind.params[name];
    if (!spec.options || (typeof value !== 'string' && typeof value !== 'number') || value === defaultConfig[name]) return [];
    return choiceLabel(name, value, t) ?? [];
  });
  return [indicatorChipLabel(ind.id, ind.params, defaultConfig, shortName), ...words].join(' ');
}

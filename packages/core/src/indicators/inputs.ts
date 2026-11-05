import type { IndicatorDescriptor, IndicatorInputKind, IndicatorInputSpec } from '@tradecanvas/commons';

/** A `#rgb` or `#rrggbb` colour, which a text input defaulting to one is edited as. */
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** How far a number with no step of its own moves: whole numbers by 1, others by a tenth. */
const INT_STEP = 1;
const FRACTION_STEP = 0.1;

/** One input of an indicator, as its settings, docs and catalog show it. */
export interface IndicatorInputInfo {
  /** The parameter's name (`'period'`). */
  name: string;
  /** What kind of value it takes: declared, or read from the spec and the default. */
  kind: IndicatorInputKind;
  /** Its default, from the descriptor's `defaultConfig`. */
  default: unknown;
  /** The spec's own label; unset leaves the wording to the caller. */
  label?: string;
  /** Its lowest value, when declared. */
  min?: number;
  /** Its highest value, when declared. */
  max?: number;
  /** For `'int'` and `'number'`: the step, declared or the usual one. */
  step?: number;
  /** For `'choice'`: the values to choose from. */
  options?: readonly (string | number)[];
}

function kindOf(value: unknown, spec: IndicatorInputSpec | undefined): IndicatorInputKind {
  if (spec?.kind) return spec.kind;
  if (spec?.source) return 'source';
  if (spec?.options) return 'choice';
  if (typeof value === 'boolean') return 'boolean';
  // Only a declared `'int'` is rounded: a plugin's number with a whole default may still take fractions.
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && HEX_COLOR.test(value)) return 'color';
  return 'text';
}

/**
 * An indicator's inputs, in the order of its `defaultConfig`, each with the
 * kind of value it takes and its limits: what the settings dialog edits and
 * what the docs and the MCP catalog list. A spec for a name with no default
 * is left out, since nothing would show it.
 */
export function describeInputs(descriptor: Pick<IndicatorDescriptor, 'defaultConfig' | 'inputs'>): IndicatorInputInfo[] {
  return Object.entries(descriptor.defaultConfig).map(([name, value]) => {
    const spec = descriptor.inputs?.[name];
    const kind = kindOf(value, spec);
    const info: IndicatorInputInfo = { name, kind, default: value };
    if (spec?.label !== undefined) info.label = spec.label;
    if (spec?.min !== undefined) info.min = spec.min;
    if (spec?.max !== undefined) info.max = spec.max;
    if (kind === 'int') info.step = spec?.step ?? INT_STEP;
    if (kind === 'number') info.step = spec?.step ?? (Number.isInteger(value) ? INT_STEP : FRACTION_STEP);
    if (kind === 'choice' && spec?.options) info.options = spec.options;
    return info;
  });
}

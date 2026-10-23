import type { IndicatorIntervals, IndicatorPlot, IndicatorPlotStyle, IntervalUnit, LineStyle } from '@tradecanvas/commons';
import { INTERVAL_LIMITS, INTERVAL_UNITS } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import { colorInput, numberInput, selectInput, settingsRow } from './settingsControls.js';
import type { MessageKey, Translator } from './i18n.js';

const LINE_WIDTHS = [1, 1.5, 2, 3, 4];
const LINE_STYLES: readonly LineStyle[] = ['solid', 'dashed', 'dotted'];
/** A line's colour where the indicator gives none (a colour field needs one; not a token, which it can't read). */
const FALLBACK_COLOR = '#4c8dff';
/** A new level sits this far above the last one. */
const LEVEL_STEP = 10;

const UNIT_LABELS: Record<IntervalUnit, MessageKey> = {
  ticks: 'toolbar.timeframes.ticks',
  seconds: 'toolbar.timeframes.seconds',
  minutes: 'toolbar.timeframes.minutes',
  hours: 'toolbar.timeframes.hours',
  days: 'toolbar.timeframes.days',
  weeks: 'toolbar.timeframes.weeks',
  months: 'toolbar.timeframes.months',
};

/** What the Style tab shows. */
export interface StyleTabState {
  plots: readonly IndicatorPlot[];
  colors: readonly string[];
  plotStyles: Readonly<Record<string, IndicatorPlotStyle>>;
  lineWidth: number;
  /** The price scale of a price-pane overlay; unset for the rest. */
  scale?: 'right' | 'left';
  /** Its levels; unset: it has none to edit. */
  levels?: readonly number[];
}

/** What the Style tab changes. */
export interface StyleTabActions {
  color(index: number, value: string): void;
  plot(key: string, patch: IndicatorPlotStyle): void;
  lineWidth(width: number): void;
  scale?(scale: 'right' | 'left'): void;
  levels?(levels: number[]): void;
}

/**
 * The Style tab: a row per line (shown or not, its colours, its dash), the
 * line width, the price scale of an overlay, and the levels under them.
 */
export function renderStyleTab(body: HTMLElement, state: StyleTabState, actions: StyleTabActions, t: Translator, uid: number): void {
  const lines = section();
  // In the order of their colours: a two-tone plot's up and down sit together.
  for (const plot of [...state.plots].sort((a, b) => a.color - b.color)) lines.appendChild(plotRow(plot, state, actions, t));
  const width = selectInput(LINE_WIDTHS.map((w) => ({ value: String(w), label: `${w} px` })), String(state.lineWidth), (v) => actions.lineWidth(Number(v)));
  width.dataset.role = 'line-width';
  lines.appendChild(settingsRow(t('indicatorSettings.lineWidth'), width));
  if (state.scale && actions.scale) {
    const scale = selectInput([
      { value: 'right', label: t('indicatorSettings.scale.right') },
      { value: 'left', label: t('indicatorSettings.scale.left') },
    ], state.scale, (v) => actions.scale?.(v === 'left' ? 'left' : 'right'));
    scale.dataset.role = 'scale';
    lines.appendChild(settingsRow(t('indicatorSettings.scale'), scale));
  }
  body.appendChild(lines);
  if (state.levels && actions.levels) body.appendChild(levelsSection([...state.levels], actions.levels, t, uid));
}

function plotRow(plot: IndicatorPlot, state: StyleTabState, actions: StyleTabActions, t: Translator): HTMLDivElement {
  const own = state.plotStyles[plot.key] ?? {};
  const row = document.createElement('div');
  row.className = 'tcw-settings-row tcw-indi-plot';
  row.dataset.plot = plot.key;
  const name = document.createElement('label');
  name.className = 'tcw-indi-plot-name';
  const shown = document.createElement('input');
  shown.type = 'checkbox';
  shown.checked = own.visible !== false;
  shown.addEventListener('change', () => actions.plot(plot.key, { visible: shown.checked }));
  const text = document.createElement('span');
  text.className = 'tcw-settings-label';
  text.textContent = plot.title;
  name.append(shown, text);

  const controls = document.createElement('span');
  controls.className = 'tcw-indi-plot-controls';
  const swatch = (index: number, label: string) => {
    const input = colorInput(state.colors[index] ?? state.colors[0] ?? FALLBACK_COLOR, (v) => actions.color(index, v));
    input.setAttribute('aria-label', label);
    return input;
  };
  const twoTone = plot.tone !== undefined && plot.downColor !== undefined;
  if (twoTone) {
    controls.append(
      swatch(plot.color, `${plot.title} ${t('indicatorSettings.up')}`),
      swatch(plot.downColor!, `${plot.title} ${t('indicatorSettings.down')}`),
    );
  } else {
    controls.appendChild(swatch(plot.color, plot.title));
  }
  // Bars and dots have no dash.
  if ((plot.kind ?? 'line') === 'line' || plot.kind === 'step') {
    const dash = selectInput(
      LINE_STYLES.map((s) => ({ value: s, label: t(`drawingSettings.lineStyle.${s}`) })),
      own.lineStyle ?? 'solid',
      (v) => actions.plot(plot.key, { lineStyle: v as LineStyle }),
    );
    dash.setAttribute('aria-label', `${plot.title}: ${t('drawingSettings.lineStyle')}`);
    controls.appendChild(dash);
  }
  row.append(name, controls);
  return row;
}

/** The levels, each with its remove button, and Add; it redraws itself and keeps the keyboard nearby. */
function levelsSection(start: number[], onChange: (levels: number[]) => void, t: Translator, uid: number): HTMLElement {
  const block = section();
  let levels = start;
  const draw = () => {
    const title = document.createElement('div');
    title.className = 'tcw-settings-section-title';
    title.textContent = t('indicatorSettings.tab.levels');
    const rows = levels.map((level, i) => levelRow(level, i));
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'tcw-reset-link tcw-indi-add';
    add.textContent = `+ ${t('indicatorSettings.addLevel')}`;
    add.addEventListener('click', () => {
      const last = levels[levels.length - 1];
      set([...levels, last === undefined ? 0 : last + LEVEL_STEP]);
      const inputs = block.querySelectorAll<HTMLInputElement>('.tcw-indi-level input');
      inputs[inputs.length - 1]?.focus();
    });
    block.replaceChildren(title, ...(levels.length === 0 ? [note(t('indicatorSettings.noLevels'))] : rows), add);
  };
  const set = (next: number[]) => {
    levels = next;
    onChange([...next]);
    draw();
  };
  const levelRow = (level: number, i: number): HTMLElement => {
    const input = numberInput(level, { step: 'any' }, (n) => {
      levels = levels.map((v, j) => (j === i ? n : v));
      onChange([...levels]);
    });
    input.id = `tcw-indi-level-${uid}-${i}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tcw-indi-remove';
    remove.innerHTML = createIcon('x', 12);
    const label = t('indicatorSettings.removeLevel');
    remove.title = label;
    remove.setAttribute('aria-label', `${label} ${i + 1}`);
    remove.addEventListener('click', () => {
      set(levels.filter((_, j) => j !== i));
      (block.querySelectorAll<HTMLElement>('.tcw-indi-remove')[i] ?? block.querySelector<HTMLElement>('.tcw-indi-add'))?.focus();
    });
    const controls = document.createElement('span');
    controls.className = 'tcw-indi-level';
    controls.append(input, remove);
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';
    const text = document.createElement('label');
    text.className = 'tcw-settings-label';
    text.htmlFor = input.id;
    text.textContent = `${t('indicatorSettings.level')} ${i + 1}`;
    row.append(text, controls);
    return row;
  };
  draw();
  return block;
}

/** One kind of interval as the Visibility tab edits it: shown at all, and from which count to which. */
interface UnitState {
  on: boolean;
  from: number;
  to: number;
}

/**
 * The Visibility tab: a row per kind of interval, ticked where the indicator
 * shows, with the range of counts it shows on (ticks: on or off).
 */
export function renderVisibilityTab(body: HTMLElement, start: IndicatorIntervals | null, onChange: (intervals: IndicatorIntervals | null) => void, t: Translator): void {
  const state = new Map<IntervalUnit, UnitState>(INTERVAL_UNITS.map((unit) => {
    const rule = start?.[unit];
    const range = Array.isArray(rule) ? rule : [1, INTERVAL_LIMITS[unit]];
    return [unit, { on: rule !== false, from: range[0], to: range[1] }];
  }));
  const commit = () => {
    const rules: { -readonly [U in IntervalUnit]?: false | readonly [number, number] } = {};
    for (const [unit, { on, from, to }] of state) {
      const [lo, hi] = [Math.min(from, to), Math.max(from, to)];
      if (!on) rules[unit] = false;
      else if (lo > 1 || hi < INTERVAL_LIMITS[unit]) rules[unit] = [lo, hi];
    }
    onChange(Object.keys(rules).length > 0 ? rules : null);
  };
  const block = section();
  for (const unit of INTERVAL_UNITS) block.appendChild(unitRow(unit, state.get(unit)!, commit, t));
  body.appendChild(block);
}

function unitRow(unit: IntervalUnit, unitState: UnitState, commit: () => void, t: Translator): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tcw-settings-row tcw-indi-unit';
  row.dataset.unit = unit;
  const name = document.createElement('label');
  name.className = 'tcw-indi-plot-name';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = unitState.on;
  const text = document.createElement('span');
  text.className = 'tcw-settings-label';
  text.textContent = t(UNIT_LABELS[unit]);
  name.append(box, text);
  row.appendChild(name);
  const fields: HTMLInputElement[] = [];
  if (unit !== 'ticks') {
    const field = (key: 'from' | 'to', label: MessageKey) => {
      const input: HTMLInputElement = numberInput(unitState[key], { min: 1, max: INTERVAL_LIMITS[unit], step: 1 }, (n) => {
        // A count of intervals is whole: 2.5 hours reads 3.
        unitState[key] = Math.round(n);
        input.value = String(unitState[key]);
        commit();
      });
      input.setAttribute('aria-label', `${t(UNIT_LABELS[unit])}: ${t(label)}`);
      input.disabled = !unitState.on;
      fields.push(input);
      return input;
    };
    const range = document.createElement('span');
    range.className = 'tcw-indi-range';
    const dash = document.createElement('span');
    dash.setAttribute('aria-hidden', 'true');
    dash.textContent = '–';
    range.append(field('from', 'indicatorSettings.rangeFrom'), dash, field('to', 'indicatorSettings.rangeTo'));
    row.appendChild(range);
  }
  box.addEventListener('change', () => {
    unitState.on = box.checked;
    for (const input of fields) input.disabled = !box.checked;
    commit();
  });
  return row;
}

function section(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'tcw-settings-section';
  return el;
}

function note(text: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'tcw-settings-label';
  el.textContent = text;
  return el;
}

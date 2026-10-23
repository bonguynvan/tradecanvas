import type { AnchorPoint, DrawingLevel, DrawingOptionDef, DrawingOptionDefs, DrawingOptions, DrawingStyle } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { fill, type MessageKey, type Translator } from './i18n.js';
import { checkRow, colorAlpha, colorInput, numberInput, selectInput, settingsRow, toHex, withAlpha } from './settingsControls.js';

const LINE_WIDTHS = [1, 2, 3, 4];
const LINE_STYLES: DrawingStyle['lineStyle'][] = ['solid', 'dashed', 'dotted'];
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32];
/** Most levels the editor offers to add, like the chart keeps. */
const MAX_LEVELS = 48;
/** A new level sits this far past the last one. */
const LEVEL_STEP = 0.5;
/** The fill's opacity a drawing without one starts from. */
const DEFAULT_FILL_ALPHA = 0.1;
/** Options set in the line's own row, not listed with the tool's others. */
const END_KEYS = ['leftEnd', 'rightEnd'] as const;

/** What the Style tab shows. */
export interface StyleTabModel {
  /** The style and the options as they are now (a row edits what the last edit left). */
  style: () => DrawingStyle;
  options: () => DrawingOptions;
  defs: DrawingOptionDefs;
  /** Whether the tool fills an area (the Fill row). */
  fill: boolean;
}

/** What the Style tab changes. */
export interface StyleTabActions {
  style(patch: Partial<DrawingStyle>): void;
  options(patch: DrawingOptions): void;
  /** Draw the tab again (a level added or removed), the keyboard on the first of `focus` there is. */
  redraw(focus?: readonly string[]): void;
}

/** Told the line's new colour: what takes it while it has none of its own (the fill, a level). */
type ColorFollower = (color: string) => void;

/** A label from the widget's strings (`drawingOption.<key>`), else the tool's own. */
function optionLabel(t: Translator, key: string, fallback: string): string {
  const messageKey = `drawingOption.${key}` as MessageKey;
  const text = t(messageKey);
  return text === messageKey ? fallback : text;
}

function section(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'tcw-settings-section';
  return el;
}

/** A row of several controls after a label (a `<label>` would only reach the first). */
function controlsRow(label: string, ...controls: HTMLElement[]): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tcw-settings-row';
  const text = document.createElement('span');
  text.className = 'tcw-settings-label';
  text.textContent = label;
  const box = document.createElement('span');
  box.className = 'tcw-indi-plot-controls';
  box.append(...controls);
  row.append(text, box);
  return row;
}

function named<T extends HTMLElement>(el: T, label: string): T {
  el.setAttribute('aria-label', label);
  return el;
}

/**
 * The Style tab: the line (colour, width, dash), its ends, the fill, then
 * the tool's own switches and choices, and its levels last.
 */
export function renderStyleTab(body: HTMLElement, model: StyleTabModel, actions: StyleTabActions, t: Translator): void {
  const followers: ColorFollower[] = [];
  const look = section();
  look.appendChild(lineRow(model.style(), actions, followers, t));
  // A tool's ends only when they are the choice of plain or arrow; another option of that name is listed with the rest.
  const ends: string[] = END_KEYS.filter((key) => model.defs[key]?.kind === 'choice');
  if (ends.length > 0) {
    look.appendChild(controlsRow(t('drawingSettings.lineEnds'), ...ends.map((key) => named(selectInput(
      [{ value: 'normal', label: t('drawingSettings.lineEnd.normal') }, { value: 'arrow', label: t('drawingSettings.lineEnd.arrow') }],
      String(model.options()[key] ?? 'normal'),
      (v) => actions.options({ [key]: v }),
    ), optionLabel(t, key, model.defs[key].label)))));
  }
  if (model.fill) look.appendChild(fillRow(model.style(), actions, followers, t));
  body.appendChild(look);

  const rest = Object.entries(model.defs).filter(([key, def]) => def.kind !== 'levels' && !ends.includes(key));
  if (rest.length > 0) {
    const own = section();
    for (const [key, def] of rest) own.appendChild(optionRow(key, def as Exclude<DrawingOptionDef, { kind: 'levels' }>, model.options(), actions, t));
    body.appendChild(own);
  }
  for (const [key, def] of Object.entries(model.defs)) {
    if (def.kind === 'levels') body.appendChild(levelsEditor(key, def, model, actions, followers, t));
  }
}

function lineRow(style: DrawingStyle, actions: StyleTabActions, followers: readonly ColorFollower[], t: Translator): HTMLDivElement {
  const color = named(colorInput(style.color, (v) => {
    actions.style({ color: v });
    for (const follow of followers) follow(v);
  }), t('drawingSettings.color'));
  const width = named(selectInput(
    LINE_WIDTHS.map((w) => ({ value: String(w), label: `${w} px` })),
    String(style.lineWidth),
    (v) => actions.style({ lineWidth: Number(v) }),
  ), t('drawingSettings.lineWidth'));
  const dash = named(selectInput(
    LINE_STYLES.map((s) => ({ value: s, label: t(`drawingSettings.lineStyle.${s}`) })),
    style.lineStyle,
    (v) => actions.style({ lineStyle: v as DrawingStyle['lineStyle'] }),
  ), t('drawingSettings.lineStyle'));
  return controlsRow(t('drawingSettings.line'), color, width, dash);
}

function fillRow(style: DrawingStyle, actions: StyleTabActions, followers: ColorFollower[], t: Translator): HTMLDivElement {
  const current = style.fillColor ?? withAlpha(style.color, DEFAULT_FILL_ALPHA);
  let hex = toHex(current);
  let alpha = colorAlpha(current);
  // Without a fill of its own the drawing fills in its line's colour, until one is set here.
  let own = style.fillColor !== undefined;
  const apply = () => {
    own = true;
    actions.style({ fillColor: withAlpha(hex, alpha), fillOpacity: alpha });
  };
  const color = named(colorInput(hex, (v) => {
    hex = v;
    apply();
  }), t('drawingSettings.fill'));
  followers.push((line) => {
    if (own) return;
    hex = toHex(line);
    color.value = hex;
  });
  const opacity = named(numberInput(Math.round(alpha * 100), { min: 0, max: 100, step: 5 }, (v) => {
    alpha = v / 100;
    apply();
  }), t('drawingSettings.opacity'));
  const percent = document.createElement('span');
  percent.className = 'tcw-unit';
  percent.setAttribute('aria-hidden', 'true');
  percent.textContent = '%';
  return controlsRow(t('drawingSettings.fill'), color, opacity, percent);
}

function optionRow(
  key: string,
  def: Exclude<DrawingOptionDef, { kind: 'levels' }>,
  options: DrawingOptions,
  actions: StyleTabActions,
  t: Translator,
): HTMLElement {
  const label = optionLabel(t, key, def.label);
  const value = options[key];
  switch (def.kind) {
    case 'boolean':
      return checkRow(label, Boolean(value), (v) => actions.options({ [key]: v }));
    case 'number':
      return settingsRow(label, numberInput(Number(value), { min: def.min, max: def.max, step: def.step }, (v) => actions.options({ [key]: v })));
    case 'choice':
      return settingsRow(label, selectInput(
        def.choices.map((c) => ({ value: c.value, label: optionLabel(t, `${key}.${c.value}`, c.label) })),
        String(value),
        (v) => actions.options({ [key]: v }),
      ));
    case 'text': {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tcw-indi-input';
      input.value = String(value ?? '');
      input.addEventListener('change', () => actions.options({ [key]: input.value }));
      return settingsRow(label, input);
    }
  }
}

/** One row per level: shown or not, its ratio, its colour, remove; and a button to add one. */
function levelsEditor(
  key: string,
  def: Extract<DrawingOptionDef, { kind: 'levels' }>,
  model: StyleTabModel,
  actions: StyleTabActions,
  followers: ColorFollower[],
  t: Translator,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'tcw-settings-section tcw-levels-editor';
  const head = document.createElement('div');
  head.className = 'tcw-settings-section-title';
  head.textContent = optionLabel(t, key, def.label);
  wrap.appendChild(head);

  const levels = (): DrawingLevel[] => {
    const value = model.options()[key];
    return Array.isArray(value) ? (value as DrawingLevel[]) : [];
  };
  const commit = (next: DrawingLevel[]) => actions.options({ [key]: next });
  const grid = document.createElement('div');
  grid.className = 'tcw-levels-grid';
  levels().forEach((level, index) => {
    const row = document.createElement('div');
    row.className = 'tcw-level-row';
    const nth = ` ${index + 1}`; // rows share labels; the number tells them apart
    const visible = document.createElement('input');
    visible.type = 'checkbox';
    visible.checked = level.visible;
    visible.setAttribute('aria-label', t('drawingSettings.levelVisible') + nth);
    visible.addEventListener('change', () => commit(levels().map((l, i) => (i === index ? { ...l, visible: visible.checked } : l))));
    const value = named(numberInput(level.value, { step: 0.001 }, (v) => commit(levels().map((l, i) => (i === index ? { ...l, value: v } : l)))), t('drawingSettings.levelValue') + nth);
    const color = named(colorInput(level.color ?? model.style().color, (v) => commit(levels().map((l, i) => (i === index ? { ...l, color: v } : l)))), t('drawingSettings.levelColor') + nth);
    // A level without a colour of its own is drawn in the line's.
    followers.push((line) => {
      if (levels()[index]?.color === undefined) color.value = toHex(line);
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tcw-level-remove';
    remove.setAttribute('aria-label', t('drawingSettings.removeLevel') + nth);
    remove.innerHTML = createIcon('x', 12);
    remove.addEventListener('click', () => {
      commit(levels().filter((_, i) => i !== index));
      // The keyboard stays where it was: on the next level's remove button, else the last one's, else Add.
      actions.redraw([
        `.tcw-level-row:nth-child(${index + 1}) .tcw-level-remove`,
        '.tcw-level-row:last-child .tcw-level-remove',
        '.tcw-level-add',
      ]);
    });
    row.append(visible, value, color, remove);
    grid.appendChild(row);
  });
  wrap.appendChild(grid);

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'tcw-reset-link tcw-level-add';
  add.textContent = t('drawingSettings.addLevel');
  add.disabled = levels().length >= MAX_LEVELS;
  add.addEventListener('click', () => {
    const last = levels().at(-1)?.value ?? 0;
    commit([...levels(), { value: Math.round((last + LEVEL_STEP) * 1000) / 1000, visible: true }]);
    actions.redraw(['.tcw-level-row:last-child input[type="number"]']);
  });
  wrap.appendChild(add);
  return wrap;
}

/** The Text tab: what the drawing writes, and how large. */
export function renderTextTab(body: HTMLElement, style: DrawingStyle, onStyle: (patch: Partial<DrawingStyle>) => void, t: Translator): void {
  const block = section();
  const text = document.createElement('textarea');
  text.className = 'tcw-indi-input tcw-drawing-text';
  text.rows = 3;
  text.value = style.text ?? '';
  text.addEventListener('input', () => onStyle({ text: text.value }));
  const textRow = settingsRow(t('drawingSettings.text'), text);
  textRow.classList.add('tcw-text-row');
  block.appendChild(textRow);
  block.appendChild(settingsRow(t('drawingSettings.fontSize'), selectInput(
    FONT_SIZES.map((s) => ({ value: String(s), label: `${s} px` })),
    String(style.fontSize ?? 12),
    (v) => onStyle({ fontSize: Number(v) }),
  )));
  body.appendChild(block);
}

/** What the Coordinates tab reads and changes. */
export interface CoordinatesTabActions {
  /** An anchor's time as the date and time fields show it (the chart's zone), and back. */
  toWallTime(time: number): { date: string; time: string };
  fromWallTime(date: string, time: string): number | null;
  /** A price on the market's grid. */
  roundPrice?(price: number): number;
  /** The market's smallest price step, for the price fields' arrows. */
  priceStep?(): number;
  move(index: number, patch: Partial<AnchorPoint>): void;
}

/** The Coordinates tab: a row per point, its price, date and time. */
export function renderCoordinatesTab(body: HTMLElement, anchors: readonly AnchorPoint[], actions: CoordinatesTabActions, t: Translator): void {
  const block = section();
  anchors.forEach((anchor, index) => {
    const point = fill(t('drawingSettings.point'), { n: index + 1 });
    const wall = actions.toWallTime(anchor.time);
    const date = document.createElement('input');
    date.type = 'date';
    date.className = 'tcw-indi-input';
    date.value = wall.date;
    const time = document.createElement('input');
    time.type = 'time';
    time.className = 'tcw-indi-input';
    time.value = wall.time;
    const onTime = () => {
      const at = actions.fromWallTime(date.value, time.value);
      if (at !== null) actions.move(index, { time: at });
    };
    date.addEventListener('change', onTime);
    time.addEventListener('change', onTime);
    const price = priceInput(anchor.price, actions, (p) => actions.move(index, { price: p }));
    const row = controlsRow(point,
      named(price, `${point}: ${t('drawingSettings.price')}`),
      named(date, `${point}: ${t('drawingSettings.date')}`),
      named(time, `${point}: ${t('drawingSettings.time')}`));
    row.classList.add('tcw-draw-point');
    block.appendChild(row);
  });
  body.appendChild(block);
}

/**
 * A price field on the market's grid. It shows the price rounded, and leaves
 * the point where it is until the field is edited.
 */
function priceInput(price: number, actions: CoordinatesTabActions, onChange: (price: number) => void): HTMLInputElement {
  const round = actions.roundPrice ?? ((p: number) => p);
  const step = actions.priceStep?.();
  const input = numberInput(round(price), { step: step !== undefined && step > 0 ? step : 'any' }, (typed) => {
    const onGrid = round(typed);
    input.value = String(onGrid);
    onChange(onGrid);
  });
  return input;
}

import { WidgetSelectionToolbar } from './WidgetSelectionToolbar.js';
import { DrawingTemplateStore } from './DrawingTemplateStore.js';
import type { WidgetDrawingSettings, DrawingTemplateLook } from './WidgetDrawingSettings.js';
import { TEXT_COLORS, TEXT_LAYOUTS, TEXT_PLACES } from './drawingText.js';
import { WidgetInlineText } from './WidgetInlineText.js';
import { WidgetNamePrompt } from './WidgetNamePrompt.js';
import { fill } from './i18n.js';
import type { ChartWidget } from './ChartWidget.js';

/** A text drawing's size when neither it nor its tool sets one. */
const DEFAULT_TEXT_SIZE = 13;

/** The box around all the given boxes (nulls skipped); null when there are none. */
function unionRects(rects: (Box | null)[]): Box | null {
  const boxes = rects.filter((r): r is Box => r !== null);
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((r) => r.x));
  const y = Math.min(...boxes.map((r) => r.y));
  const right = Math.max(...boxes.map((r) => r.x + r.width));
  const bottom = Math.max(...boxes.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

type Box = { x: number; y: number; width: number; height: number };

/** What editing a drawing reads of the widget around it, and asks of it. */
export interface DrawingEditHost {
  readonly chart: ChartWidget['chart'];
  readonly chartContainer: ChartWidget['chartContainer'];
  chartOffset: ChartWidget['chartOffset'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly docking: ChartWidget['docking'];
  readonly drawingSettingsPart: ChartWidget['drawingSettingsPart'];
  drawingToolName: ChartWidget['drawingToolName'];
  readonly featureState: ChartWidget['featureState'];
  readonly root: ChartWidget['root'];
  say: ChartWidget['say'];
  readonly t: ChartWidget['t'];
  readonly ui: ChartWidget['ui'];
  whenLoaded: ChartWidget['whenLoaded'];
}

/**
 * Editing a drawing in the widget: the toolbar over the one selected, the words of a text
 * typed in place on the chart, its settings dialog (a text just drawn taken back on Cancel),
 * and saving its look as a template.
 */
export class WidgetDrawingEdit {
  constructor(private readonly host: DrawingEditHost) {}

  /** A text drawn just now whose words the settings ask for: Cancel there takes it back. */
  justDrawnText: string | null = null;

  /** A text drawing's words typed in place over it. */
  inlineText: WidgetInlineText | null = null;

  /** The drawing whose words are being typed in place, and whether it was just drawn. */
  inlineTextId: string | null = null;

  inlineTextNew = false;

  /** The chart's type sizes the look last wrote: a host's own change since makes them the new base. */
  chartFontWritten: { sizeSmall: number; sizeMedium: number; sizeLarge: number } | null = null;

  /** Stops waiting to ask for a just-drawn text's words (the widget goes, or another text is drawn first). */
  cancelTextPrompt: (() => void) | null = null;

  selectionToolbar: WidgetSelectionToolbar | null = null;

  selectionToolbarFrame: number | null = null;

  /** Asks a drawing template's name, over the drawing's settings. */
  drawingTemplatePrompt: WidgetNamePrompt | null = null;

  /** `updateSelectionToolbar` on the next frame, once, while the toolbar shows. */
  scheduleSelectionToolbar(): void {
    if (this.selectionToolbarFrame !== null || !this.selectionToolbar?.isOpen()) return;
    this.selectionToolbarFrame = requestAnimationFrame(() => {
      this.selectionToolbarFrame = null;
      this.updateSelectionToolbar();
    });
  }

  /**
   * Show the selection toolbar over the selected drawings, or hide it: when
   * nothing is selected, or while a tool, the eraser or the zoom area is on.
   */
  updateSelectionToolbar(): void {
    const toolbar = this.selectionToolbar;
    if (!toolbar || this.host.destroyed) return;
    const selected = this.host.chart.getSelectedDrawingIds();
    if (!this.host.featureState.selectionToolbar || !selected?.length) {
      toolbar.hide();
      return;
    }
    const ids = new Set(selected);
    const drawings = this.host.chart.getDrawings().filter((d) => ids.has(d.id) && this.host.chart.isDrawingShown(d.id));
    const busy = this.host.chart.getDrawingTool() !== null || this.host.chart.isEraserMode() || this.host.chart.isZoomAreaMode();
    if (busy || drawings.length === 0) {
      toolbar.hide();
      return;
    }
    const offset = this.host.chartOffset();
    const primary = drawings[0];
    // Kept within the pane the drawing is on: the price plot, or an indicator pane.
    const plot = (primary.paneId !== undefined
      ? this.host.chart.getIndicatorPanes().find((pane) => pane.instanceId === primary.paneId)?.rect
      : undefined) ?? this.host.chart.getPlotRect();
    // Over all of them; at the top of the plot when none is on screen (an
    // extended line crossing it far from its anchors).
    // A text's box with it, so the toolbar never covers the words a double-click is for.
    const rect = unionRects(drawings.flatMap((d) => [this.host.chart.getDrawingRect(d.id), this.host.chart.getDrawingTextRect?.(d.id) ?? null]))
      ?? { x: plot.x + plot.width / 2, y: plot.y, width: 0, height: 0 };
    toolbar.show({
      rect: { x: rect.x + offset.x, y: rect.y + offset.y, width: rect.width, height: rect.height },
      bounds: { x: plot.x + offset.x, y: plot.y + offset.y, width: plot.width, height: plot.height },
      style: primary.style,
      locked: drawings.every((d) => d.locked),
      canDelete: drawings.some((d) => !d.locked),
      canSettings: this.host.featureState.drawingSettings && drawings.length === 1,
      canAlert: this.host.featureState.alerts && drawings.length === 1 && this.host.chart.canAddDrawingAlert(primary.id),
      canFill: this.host.chart.getDrawingToolDescriptor(primary.type)?.fill === true,
      canText: this.host.chart.getDrawingToolDescriptor(primary.type)?.text === true,
    });
  }

  /**
   * Type a text drawing's words in place, over its box: Enter or a click away
   * keeps them, Escape puts them back. One just drawn (`justDrawn`) is taken
   * back on Escape or with no words. False when its box is not on the chart
   * (hidden, its text turned off): the settings ask for the words instead.
   */
  editTextInPlace(id: string, justDrawn: boolean): boolean {
    // Already being typed in: the box is open.
    if (id === this.inlineTextId && this.inlineText?.isOpen()) return true;
    const drawing = this.host.chart.getDrawings().find((d) => d.id === id);
    const editor = this.inlineText;
    // A text just drawn takes its words into the step that made it; an old one's edit is a step of its own.
    if (!drawing || !editor || drawing.locked || (!justDrawn && !this.host.chart.beginDrawingEdit(id))) return false;
    const layout = TEXT_LAYOUTS[drawing.type];
    const style = drawing.style;
    const before = style.text ?? '';
    const end = (keep: boolean) => {
      this.inlineTextId = null;
      if (justDrawn) {
        if (!keep) this.host.chart.takeBackDrawing(id);
      } else {
        this.host.chart.endDrawingEdit(id, { cancel: !keep });
      }
      this.host.docking.refreshObjects();
    };
    const opened = editor.open({
      rect: () => {
        const box = this.host.chart.getDrawingTextRect(id);
        if (!box) return null;
        const at = this.host.chartContainer.getBoundingClientRect();
        return { x: at.left + box.x, y: at.top + box.y, width: box.width, height: box.height };
      },
      text: before,
      font: {
        size: style.fontSize || layout?.fontSize || DEFAULT_TEXT_SIZE,
        bold: style.bold === true,
        italic: style.italic === true,
        family: this.host.chart.getFont?.()?.family ?? this.host.ui.font.family,
      },
      color: style.textColor ?? TEXT_COLORS[drawing.type] ?? style.color,
      label: this.host.t('drawingSettings.text'),
      onInput: (text) => (justDrawn ? this.host.chart.amendNewDrawing(id, { style: { text } }) : this.host.chart.updateDrawing(id, { style: { text } })),
      // No words: a text just drawn goes, an old one keeps what it said. Blank lines at the end go.
      onCommit: (text) => {
        const kept = text.replace(/\s+$/, '');
        if (kept && kept !== text) {
          if (justDrawn) this.host.chart.amendNewDrawing(id, { style: { text: kept } });
          else this.host.chart.updateDrawing(id, { style: { text: kept } });
        }
        end(kept.length > 0);
      },
      onCancel: () => end(false),
      returnFocus: () => this.host.chartContainer.querySelector<HTMLElement>('[tabindex]') ?? this.host.chartContainer,
    });
    if (!opened) {
      if (!justDrawn) this.host.chart.endDrawingEdit(id, { cancel: true });
      return false;
    }
    this.inlineTextId = id;
    this.inlineTextNew = justDrawn;
    return true;
  }

  /** Open a drawing's settings (double-click on it, or the object tree's settings button). */
  openDrawingSettings(id: string, how: { tab?: 'text'; justDrawn?: boolean } = {}): void {
    this.host.whenLoaded(this.host.drawingSettingsPart, () => this.host.featureState.drawingSettings, (dialog) => this.showDrawingSettings(dialog, id, how));
  }

  private showDrawingSettings(dialog: WidgetDrawingSettings, id: string, how: { tab?: 'text'; justDrawn?: boolean }): void {
    // Looked up once the dialog is in: the drawing may have gone while its code loaded.
    const drawing = this.host.chart.getDrawings().find((d) => d.id === id);
    const descriptor = drawing ? this.host.chart.getDrawingToolDescriptor(drawing.type) : null;
    if (!drawing || !descriptor) return;
    dialog.open({
      id,
      type: drawing.type,
      name: this.host.drawingToolName(drawing.type),
      style: { ...drawing.style },
      options: this.host.chart.getDrawingOptions(id),
      defs: descriptor.options ?? {},
      anchors: drawing.anchors.map((a) => ({ ...a })),
      fill: descriptor.fill === true,
      text: descriptor.text === true,
      textLayout: TEXT_LAYOUTS[drawing.type],
      textColor: TEXT_COLORS[drawing.type],
      textPlace: TEXT_PLACES.has(drawing.type),
      coordinates: descriptor.anchoring !== 'screen',
      intervals: drawing.intervals ?? null,
    }, { tab: how.tab });
    // Set once it is open (opening ends the edit before it): a Cancel on the words of a text just drawn takes the text back.
    if (how.justDrawn && dialog.isOpen()) this.justDrawnText = id;
  }

  /** Save a drawing's look as a template of its tool, asking for its name over the drawing's settings. */
  promptSaveDrawingTemplate(templates: DrawingTemplateStore, look: DrawingTemplateLook): void {
    this.drawingTemplatePrompt ??= new WidgetNamePrompt(this.host.root, this.host.t);
    this.drawingTemplatePrompt.open({
      title: this.host.t('drawingSettings.saveTemplateTitle'),
      submitLabel: this.host.t('common.save'),
      placeholder: this.host.drawingToolName(look.type),
      onSubmit: (name) => {
        templates.save(name, look.style, { type: look.type, options: look.options });
        this.host.say(fill(this.host.t('templates.saved'), { name: name.trim() }));
      },
    });
  }
}

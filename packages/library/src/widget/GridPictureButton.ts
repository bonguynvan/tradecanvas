import type { ChartPdfOptions, ChartPrintOptions } from '@tradecanvas/commons';
import { downloadBlob, fileNamePart, imageFileName } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import type { Translator } from './i18n.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';

/** A picture of more symbols than this is not named after them all. */
const NAMED_SYMBOLS = 3;
/** What a file of too many symbols, or of none, is called. */
const PLAIN_NAME = 'charts';
/** What follows the symbols a paper's title has room for. */
const AND_MORE = '…';
const ICON_SIZE = 14;

/** What the picture button reads of its grid, and asks of it. */
export interface GridPictureHost {
  /** Where the menu opens (the grid's root). */
  root: HTMLElement;
  t: Translator;
  /** The symbols of the charts a picture shows, each once, in the charts' order. */
  symbols: () => string[];
  /** Whether every chart's widget has a part switched on. */
  isOn: (feature: 'screenshot' | 'copyImage') => boolean;
  screenshot: (filename: string) => void;
  copyScreenshot: () => Promise<boolean>;
  print: (options: ChartPrintOptions) => boolean;
  toPdf: (options: ChartPdfOptions) => Promise<Blob | null>;
  toast: (message: string, kind: 'info' | 'error') => void;
}

/**
 * The grid bar's picture button: a menu that saves the charts together as
 * an image, copies it, prints it or saves it as a PDF. What a chart's own
 * camera and commands do for one chart, for all of them as they stand in
 * the grid. It goes with those: hidden while a chart's screenshots are
 * switched off, and without its copy entry while copying is. The grid has
 * it look again (`render`) when its switches or its charts change; it looks
 * again itself when pressed, for a chart switched by its own widget.
 */
export class GridPictureButton {
  readonly button: HTMLButtonElement;
  private menu: WidgetContextMenu | null = null;

  constructor(private readonly host: GridPictureHost) {
    const label = host.t('grid.picture');
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'tcw-btn-icon tcw-grid-picture';
    this.button.innerHTML = createIcon('camera', ICON_SIZE);
    this.button.title = label;
    this.button.setAttribute('aria-label', label);
    this.button.setAttribute('aria-haspopup', 'menu');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.addEventListener('click', () => this.toggle());
  }

  /** Shown while the charts' own pictures are switched on. */
  render(): void {
    const on = this.host.isOn('screenshot');
    this.button.hidden = !on;
    if (!on) this.menu?.close();
  }

  destroy(): void {
    this.menu?.destroy();
    this.menu = null;
  }

  private toggle(): void {
    const { t, root } = this.host;
    if (this.menu?.isOpen()) {
      this.menu.close();
      return;
    }
    // A chart may have been switched since by its own widget.
    this.render();
    if (this.button.hidden) return;
    this.menu ??= new WidgetContextMenu(root, t('grid.picture'));
    const entries: ContextMenuEntry[] = [{ id: 'save', label: t('grid.picture.save'), icon: 'download' }];
    if (this.host.isOn('copyImage')) entries.push({ id: 'copy', label: t('grid.picture.copy'), icon: 'copy' });
    entries.push(
      { id: 'print', label: t('grid.picture.print'), icon: 'printer' },
      { id: 'pdf', label: t('grid.picture.pdf'), icon: 'file' },
    );
    // The button stands at the bar's end: the menu ends at its end edge.
    this.menu.openUnder(entries, this.button, (id) => this.take(id), 'end');
  }

  private take(id: string): void {
    if (id === 'save') this.host.screenshot(this.fileName());
    else if (id === 'copy') void this.copy();
    else if (id === 'print') this.print();
    else if (id === 'pdf') void this.savePdf();
  }

  /** A file's name: the charts' symbols as a file can carry them, each once, or `charts` for more of them than a name holds. */
  private fileName(): string {
    const names = [...new Set(this.host.symbols().map(fileNamePart))].filter((name) => name !== '');
    return names.length > 0 && names.length <= NAMED_SYMBOLS ? names.join('-') : PLAIN_NAME;
  }

  /** What the charts are called on paper: their symbols, the first few of many. */
  private paperTitle(): string {
    const symbols = this.host.symbols();
    const named = symbols.slice(0, NAMED_SYMBOLS).join(', ');
    return symbols.length > NAMED_SYMBOLS ? `${named}, ${AND_MORE}` : named;
  }

  private async copy(): Promise<void> {
    const { t } = this.host;
    const ok = await this.host.copyScreenshot();
    this.host.toast(t(ok ? 'toast.imageCopied' : 'toast.imageCopyFailed'), ok ? 'info' : 'error');
  }

  private print(): void {
    if (!this.host.print({ title: this.paperTitle() })) this.host.toast(this.host.t('toast.printFailed'), 'error');
  }

  private async savePdf(): Promise<void> {
    let pdf: Blob | null = null;
    try {
      pdf = await this.host.toPdf({ title: this.paperTitle() });
    } catch {
      // Too large for the browser to hold, or its canvas refused: said below, as no PDF.
      pdf = null;
    }
    if (!pdf) {
      this.host.toast(this.host.t('toast.pdfFailed'), 'error');
      return;
    }
    downloadBlob(pdf, imageFileName(this.fileName(), 'pdf'));
  }
}

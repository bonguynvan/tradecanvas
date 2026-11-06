import { lazyModule } from './lazyPart.js';

/**
 * The widget's dialogs whose code loads when one is first opened, or when the page has a moment
 * to spare once the chart is up. Shared by every widget on the page: loaded once, built per widget.
 */
export const DIALOGS = {
  settings: lazyModule(() => import('./WidgetSettings.js')),
  indicatorSettings: lazyModule(() => import('./WidgetIndicatorSettings.js')),
  drawingSettings: lazyModule(() => import('./WidgetDrawingSettings.js')),
  goToDate: lazyModule(() => import('./WidgetGoToDate.js')),
  hotkeySheet: lazyModule(() => import('./WidgetHotkeySheet.js')),
};

/** Loads every dialog's code; a failure is left for the dialog to report when it is opened. */
export async function preloadDialogs(): Promise<void> {
  await Promise.all(Object.values(DIALOGS).map((ref) => ref.load().catch(() => null)));
}

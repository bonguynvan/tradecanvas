import widgetCss from './WidgetStyles.css?raw';

let refCount = 0;
const STYLE_ID = 'tcw-styles';

/**
 * Inject the widget stylesheet into `document.head`. Reference-counted so
 * multiple `ChartWidget` instances share the same `<style>` tag and the last
 * to detach removes it. CSS lives in a sibling `.css` file and is inlined at
 * build time via Vite's `?raw` query — consumers see a plain string at runtime.
 */
export function injectWidgetStyles(): void {
  refCount++;
  if (refCount > 1) return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = widgetCss;
  document.head.appendChild(style);
}

export function removeWidgetStyles(): void {
  refCount--;
  if (refCount > 0) return;

  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.remove();
  }
}

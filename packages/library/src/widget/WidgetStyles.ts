import widgetCss from './WidgetStyles.css?raw';

let refCount = 0;
const STYLE_ID = 'tcw-styles';

/**
 * Inject the widget stylesheet at the top of `document.head`, so the page's
 * own CSS wins a tie of specificity (a `.tcw-root { --tcw-radius: 0 }` of
 * yours sets the token). Reference-counted so
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
  document.head.insertBefore(style, document.head.firstChild);
}

export function removeWidgetStyles(): void {
  refCount--;
  if (refCount > 0) return;

  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.remove();
  }
}

/**
 * Copy text to the clipboard. When the Clipboard API is refused (insecure
 * origin, embedded frame), select `fallbackEl`'s text so the user can press
 * Ctrl/⌘+C. Resolves `true` only when the text actually reached the clipboard.
 */
export async function copyText(text: string, fallbackEl?: HTMLElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) {
      const range = document.createRange();
      range.selectNodeContents(fallbackEl);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    return false;
  }
}

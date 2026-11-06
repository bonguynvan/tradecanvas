/** Whether the page is hidden: another tab, the app in the background. */
export const pageHidden = (): boolean => typeof document !== 'undefined' && document.hidden;

/** The page's local storage, or null where there is none or it is refused (a private window, a sandbox). */
export function browserStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

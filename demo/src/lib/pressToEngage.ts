/**
 * A chart on a scrolling page. A chart takes the wheel (to zoom) and, on a
 * touch screen, every swipe (to pan), so a page scrolled past a big one gets
 * stuck on it. With this action the chart's surface takes no pointer at all
 * until the node is clicked (a tap; a swipe the page scrolls with makes no
 * click): until then the wheel and swipes land on the node and scroll the
 * page, smooth scrolling included. It lets go when the mouse leaves (or a
 * drag that left ends outside), on a press elsewhere, on Escape, and when
 * scrolled out of view.
 *
 *   <div use:pressToEngage={{ surface: '.host', ignore: '.controls' }}>
 *
 * The node carries `data-engaged` while the chart has the pointer.
 */

export interface PressToEngageOptions {
  /** The chart's surface inside the node: it takes no pointer until the node is clicked. */
  surface?: string;
  /** Clicks inside these (the node's own controls) don't engage it. */
  ignore?: string;
  /** The chart's own pieces outside the node (a widget's dialogs): using them keeps hold. */
  outside?: string;
  /** Called when a click engages it. */
  onEngage?: () => void;
  /** Called when it lets go. */
  onRelease?: () => void;
}

export function pressToEngage(node: HTMLElement, initial: PressToEngageOptions = {}) {
  let options = initial;
  let engaged = false;
  /** The mouse left with a button down: a drag goes on, and lets go only if it ends outside. */
  let draggedOut = false;

  /** In one of the chart's pieces outside the node (a widget's dialog). */
  const inOutside = (target: EventTarget | null) =>
    !!options.outside && target instanceof Element && !node.contains(target) && target.closest(options.outside) !== null;
  /** Inside the node, or in one of the chart's pieces outside it. */
  const ours = (target: EventTarget | null) => (target instanceof Node && node.contains(target)) || inOutside(target);

  const applySurface = (passThrough: boolean) => {
    if (!options.surface) return;
    const surface = node.querySelector<HTMLElement>(options.surface);
    if (surface) surface.style.pointerEvents = passThrough ? 'none' : '';
  };

  const setEngaged = (next: boolean) => {
    if (next === engaged) return;
    engaged = next;
    draggedOut = false;
    node.toggleAttribute('data-engaged', next);
    applySurface(!next);
    if (next) options.onEngage?.();
    else options.onRelease?.();
  };

  const onClick = (e: MouseEvent) => {
    if (options.ignore && e.target instanceof Element && e.target.closest(options.ignore)) return;
    setEngaged(true);
  };
  // A finger lifting fires pointerleave too: only the mouse leaving lets go.
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || ours(e.relatedTarget)) return;
    if (e.buttons !== 0) draggedOut = true;
    else setEngaged(false);
  };
  const onRelease = (e: Event) => {
    if (!draggedOut) return;
    draggedOut = false;
    if (!ours(e.target)) setEngaged(false);
  };
  const onPressAnywhere = (e: Event) => {
    if (engaged && !ours(e.target)) setEngaged(false);
  };
  // Escape in one of its dialogs closes the dialog, not the chart's hold.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !inOutside(e.target)) setEngaged(false);
  };

  node.addEventListener('click', onClick);
  node.addEventListener('pointerleave', onLeave);
  document.addEventListener('pointerdown', onPressAnywhere, true);
  document.addEventListener('pointerup', onRelease, true);
  document.addEventListener('keydown', onKey);

  // The chart may mount after the action starts: its surface is looked up again on each change of view.
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          if (!entries[entries.length - 1]?.isIntersecting) setEngaged(false);
          else if (!engaged) applySurface(true);
        })
      : null;
  observer?.observe(node);
  applySurface(true);

  return {
    update(next: PressToEngageOptions) {
      options = next;
      applySurface(!engaged);
    },
    destroy() {
      observer?.disconnect();
      node.removeEventListener('click', onClick);
      node.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', onPressAnywhere, true);
      document.removeEventListener('pointerup', onRelease, true);
      document.removeEventListener('keydown', onKey);
      applySurface(false);
      engaged = false;
      node.removeAttribute('data-engaged');
    },
  };
}

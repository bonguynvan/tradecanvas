/**
 * Landing-page motion: Lenis smooth scrolling with GSAP ScrollTrigger reveals,
 * count-ups and a parallax hero grid. Loaded on the home page only and
 * skipped entirely when the visitor prefers reduced motion.
 *
 * Markup hooks:
 * - `data-reveal` — rises into place when scrolled to; with
 *   `data-reveal-stagger` its children rise one after another.
 * - `data-count="27"` — the number counts up from zero (decimals follow the
 *   attribute, e.g. "0.32").
 * - `data-parallax` — drifts slower than the page while the hero scrolls out.
 *
 * Anything already on screen (or scrolled past) when this starts is left as
 * the server rendered it, so nothing blinks out and back in.
 */

const REVEAL = { y: 28, duration: 0.9, stagger: 0.08, ease: 'power3.out' } as const;
/** Where a reveal or count-up starts, as a share of the viewport height. */
const TRIGGER_LINE = 0.88;
/** GSAP's default lag smoothing, restored on cleanup. */
const DEFAULT_LAG = [500, 33] as const;

/** Wheel and touch over a chart belong to the chart (zoom, pan), not the page. */
function isChartSurface(node: HTMLElement): boolean {
  return node.querySelector?.(':scope > canvas') != null;
}

/** On screen or already scrolled past: animating it now would only blink it. */
function alreadyReached(el: Element): boolean {
  return el.getBoundingClientRect().top < window.innerHeight * TRIGGER_LINE;
}

export async function initLandingMotion(root: HTMLElement): Promise<() => void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
    import('lenis'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    autoRaf: false,
    duration: 1.1,
    anchors: true,
    // Scrollable lists inside the widget (watchlist, menus) scroll natively.
    allowNestedScroll: true,
    prevent: isChartSurface,
  });
  const tick = (time: number) => lenis.raf(time * 1000);
  const cleanup = () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(...DEFAULT_LAG);
    lenis.destroy();
  };

  try {
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);

    const ctx = gsap.context(() => {
      for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]', root)) {
        if (alreadyReached(el)) continue;
        const targets = el.hasAttribute('data-reveal-stagger') ? Array.from(el.children) : [el];
        gsap.from(targets, {
          y: REVEAL.y,
          opacity: 0,
          duration: REVEAL.duration,
          ease: REVEAL.ease,
          stagger: REVEAL.stagger,
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: `top ${TRIGGER_LINE * 100}%`, once: true },
        });
      }

      for (const el of gsap.utils.toArray<HTMLElement>('[data-count]', root)) {
        if (alreadyReached(el)) continue;
        const raw = el.dataset.count ?? '0';
        const target = Number(raw);
        if (!Number.isFinite(target)) continue;
        const decimals = (raw.split('.')[1] ?? '').length;
        // Off screen, so starting at zero is never seen as a jump.
        el.textContent = (0).toFixed(decimals);
        const state = { value: 0 };
        gsap.to(state, {
          value: target,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: `top ${TRIGGER_LINE * 100}%`, once: true },
          onUpdate: () => {
            el.textContent = state.value.toFixed(decimals);
          },
        });
      }

      const parallax = root.querySelector<HTMLElement>('[data-parallax]');
      if (parallax) {
        gsap.to(parallax, {
          yPercent: 22,
          ease: 'none',
          scrollTrigger: { trigger: parallax.parentElement ?? parallax, start: 'top top', end: 'bottom top', scrub: true },
        });
      }
    }, root);

    // Web fonts change heights after first layout: re-measure the triggers.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
      cleanup();
    };
  } catch (err) {
    cleanup();
    throw err;
  }
}

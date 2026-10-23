/**
 * The golden ratio, which the built-in look keeps to. Sizes that sit together
 * stand in it (an icon, its button, the bar it sits in), spacing and corners
 * are Fibonacci numbers, whose neighbours approach it, and type climbs by its
 * cube root, so every third size is φ larger.
 */
export const PHI = (1 + Math.sqrt(5)) / 2;

/** Spacing and corners, px: each the sum of the two before, so neighbours stand near φ. */
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;

/**
 * `base` moved `steps` along a scale that reaches φ in `perPhi` steps, in
 * whole pixels: `phiStep(16, 2, 2)` is 26, `phiStep(13, 3, 3)` is 21.
 */
export function phiStep(base: number, steps: number, perPhi = 1): number {
  return Math.round(base * PHI ** (steps / perPhi));
}

// What a custom theme can take from the main package: compiled with the skill's
// examples (`pnpm docs:check`).
import {
  DARK_PRICE_LIMITS,
  LIGHT_PRICE_LIMITS,
  contrastRatio,
  readableOn,
  inkOn,
  type PriceLimitColors,
} from '@tradecanvas/chart';

const limits: PriceLimitColors = { ...LIGHT_PRICE_LIMITS, reference: DARK_PRICE_LIMITS.reference };
const ratio: number | null = contrastRatio('#ffffff', '#000000');
const shade: string = readableOn('#f0b90b', '#fffdf5', '#1a1a1a', 4.5);
const ink: string = inkOn('#f0b90b', '#000000', '#ffffff');

export { limits, ratio, shade, ink };

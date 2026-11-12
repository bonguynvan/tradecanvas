// The names 2.0 removed are gone from the published types: each line marked
// here must fail to compile (`pnpm docs:check`).
import * as tc from '@tradecanvas/chart';
import type { Chart, SymbolInfo, TimeFormatContext } from '@tradecanvas/chart';

declare const chart: Chart;

// @ts-expect-error setTimeZone
chart.setTimezone('exchange');
// @ts-expect-error getTimeZone
chart.getTimezone();
// @ts-expect-error getEffectiveTimeZone
chart.getEffectiveTimezone();
// @ts-expect-error getExchangeTimeZone
chart.getExchangeTimezone();
// @ts-expect-error setTimeZone takes minutes too
chart.setTimezoneOffset(420);
// @ts-expect-error EXCHANGE_TIME_ZONE
const zone = tc.EXCHANGE_TIMEZONE;
// @ts-expect-error MONO_FONT_FAMILY: the monospaced face is no longer the default one (FIGURES_FONT_FAMILY is)
const face = tc.DEFAULT_FONT_FAMILY;
// @ts-expect-error SymbolInfo.timeZone
const info: SymbolInfo = { symbol: 'AAPL', timezone: 'America/New_York' };
// @ts-expect-error the axis says 'year', 'month' or 'day'
const kind: TimeFormatContext['kind'] = 'date';

const now: SymbolInfo = { symbol: 'AAPL', timeZone: 'America/New_York' };
chart.setTimeZone(tc.EXCHANGE_TIME_ZONE);
chart.setFont({ family: tc.MONO_FONT_FAMILY });

export { zone, face, info, kind, now };

// What the types say about drawing tools of your own: compiled with the skill's
// examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart, positionLevels } from '@tradecanvas/chart';
import type { DrawingPlugin, DrawingToolType, BuiltInDrawingToolType, OrderSide, PositionLevels } from '@tradecanvas/chart';

declare const chart: Chart;
declare const draw: Omit<DrawingPlugin, 'descriptor'>;

// A plugin names its own tool, and the chart takes that name wherever it takes a built-in one.
const targetLine: DrawingPlugin = { ...draw, descriptor: { type: 'targetLine', name: 'Target Line', requiredAnchors: 1 } };
chart.registerDrawingTool(targetLine);
chart.setDrawingTool('targetLine');
chart.addDrawing({ type: 'targetLine', anchors: [{ time: 0, price: 1 }] });
chart.getDrawingToolDescriptor('targetLine');

// Built-in names still type as themselves, and a drawing's type is a tool's name.
const builtIn: BuiltInDrawingToolType = 'fibRetracement';
const any: DrawingToolType = builtIn;
chart.getDrawings().map((d) => d.type.length + any.length);

// @ts-expect-error A plugin's name is not one of the built-in tools.
const notBuiltIn: BuiltInDrawingToolType = 'targetLine';
// @ts-expect-error A tool's name is a string.
chart.setDrawingTool(42);

// A Long/Short Position drawing read as a trade: null for any other drawing, or none found.
const levels: PositionLevels | null = positionLevels(chart.getDrawings().find((d) => d.type === 'riskReward'));
if (levels) {
  const side: OrderSide = levels.side;
  const prices: number[] = [levels.entry, levels.stopLoss, levels.takeProfit, levels.quantity, levels.quantityDecimals];
  void side; void prices;
}
// @ts-expect-error The levels may be null: a drawing that is not a position has none.
positionLevels(chart.getDrawings()[0]).entry;

export { notBuiltIn };

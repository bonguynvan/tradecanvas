// What the types say about drawing tools of your own: compiled with the skill's
// examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart } from '@tradecanvas/chart';
import type { DrawingPlugin, DrawingToolType, BuiltInDrawingToolType } from '@tradecanvas/chart';

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

export { notBuiltIn };

import { describe, it, expect } from 'vitest';
import { DRAWING_TOOL_GROUPS } from '../widgetConfig.js';
import { TEXT_LAYOUTS } from '../drawingSettingsTabs.js';
import { EN_MESSAGES } from '../locales/en.js';
import { drawingTypeLabel } from '../WidgetObjectTree.js';
import { createToolIcon } from '../icons.js';

const NEW_TOOLS = ['signpost', 'balloon', 'anchoredText', 'anchoredNote'] as const;

describe('the marker tools in the widget', () => {
  it('sit in the annotation group of the drawing bar, each with its own icon and name', () => {
    const annotation = DRAWING_TOOL_GROUPS.find((g) => g.label === 'Annotation')!;
    const listed = annotation.tools.map((t) => t.value);
    for (const type of NEW_TOOLS) {
      expect(listed, type).toContain(type);
      expect(createToolIcon(type), type).not.toBe(createToolIcon('no-such-tool'));
      expect(EN_MESSAGES[`tool.${type}` as keyof typeof EN_MESSAGES], type).toBeTruthy();
      expect(drawingTypeLabel(type), type).not.toBe(type);
    }
  });

  it('ask for their words as soon as they are drawn', () => {
    for (const type of NEW_TOOLS) expect(TEXT_LAYOUTS[type], type).toBeDefined();
  });
});

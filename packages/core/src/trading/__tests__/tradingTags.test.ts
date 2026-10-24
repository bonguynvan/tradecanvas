import { describe, it, expect } from 'vitest';
import type { Theme } from '@tradecanvas/commons';
import { DARK_THEME, UI_ICONS } from '@tradecanvas/commons';
import { TAG_GAP, TAG_HEIGHT, drawTags, layoutTags, tagWidth, type TradingTag } from '../tradingTags.js';
import type { LineButton } from '../lineButtons.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
const plot = { left: 0, right: 1000 };
const xs = (places: { x: number }[]) => places.map((p) => p.x);

describe('layoutTags', () => {
  it('ends a tag a gap short of the price axis', () => {
    expect(xs(layoutTags([{ y: 50, width: 100 }], plot))).toEqual([1000 - TAG_GAP - 100]);
  });

  it('keeps tags on lines far enough apart at the axis', () => {
    expect(xs(layoutTags([{ y: 50, width: 100 }, { y: 50 + TAG_HEIGHT + 1, width: 80 }], plot))).toEqual([892, 912]);
  });

  it('moves a tag that would cover another to its left, a gap apart', () => {
    expect(xs(layoutTags([{ y: 50, width: 100 }, { y: 60, width: 80 }], plot))).toEqual([892, 892 - TAG_GAP - 80]);
  });

  it('moves on past every tag it would still cover', () => {
    // The third overlaps the first where it starts, then the second where it lands.
    const placed = xs(layoutTags([{ y: 50, width: 100 }, { y: 60, width: 80 }, { y: 70, width: 60 }], plot));
    expect(placed).toEqual([892, 804, 804 - TAG_GAP - 60]);
  });

  it('stops at the plot’s left edge', () => {
    expect(xs(layoutTags([{ y: 50, width: 600 }, { y: 50, width: 600 }], plot))).toEqual([392, 0]);
  });
});

describe('drawTags', () => {
  const tag: TradingTag = {
    y: 50,
    color: '#1fa874',
    cells: [
      { kind: 'stamp', text: '2' },
      { kind: 'text', text: 'Long' },
      { kind: 'button', icon: UI_ICONS.x, action: { type: 'closePosition', positionId: 'p1' } },
    ],
  };

  it('measures a cell by its text and a button as a square as high as the tag', () => {
    // The fixture's text is 6 px a character; a text cell has 5 px each side.
    const { ctx } = recordingCtx();
    expect(tagWidth(ctx, tag, theme)).toBe((6 + 10) + (24 + 10) + TAG_HEIGHT);
  });

  it('puts a button where its cell is, the tag centred on its line', () => {
    const { ctx } = recordingCtx();
    const buttons: LineButton[] = [];
    drawTags(ctx, [tag], unitViewport, theme, buttons);
    const width = 16 + 34 + TAG_HEIGHT;
    const x = 1000 - TAG_GAP - width;
    expect(buttons).toEqual([{ x: x + 16 + 34, y: 50 - Math.floor(TAG_HEIGHT / 2), size: TAG_HEIGHT, action: tag.cells[2].kind === 'button' ? tag.cells[2].action : null }]);
  });

  it('writes the stamp and the text; a button is an icon, not a glyph', () => {
    const { ctx, texts } = recordingCtx();
    drawTags(ctx, [tag], unitViewport, theme, []);
    expect(texts).toEqual(['2', 'Long']);
  });
});

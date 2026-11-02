import { describe, it, expect } from 'vitest';
import { sanitizeDrawingStyle } from '@tradecanvas/commons';
import { drawTextBox } from '../tools/textBox.js';
import { TextAnnotationTool } from '../tools/TextAnnotation.js';
import { NoteTool } from '../tools/annotations.js';
import { drawing, unitViewport } from './fixtures.js';

/** 6 px a character, as the other drawing tests measure. */
const CHAR = 6;

/** A canvas stand-in that keeps what was drawn: each text with its font, colour and x, and the boxes filled and stroked. */
function recorder() {
  const texts: { text: string; x: number; y: number; font: string; color: string }[] = [];
  const fills: number[][] = [];
  const strokes: number[][] = [];
  const props: Record<string, unknown> = { font: '', fillStyle: '', strokeStyle: '' };
  const methods: Record<string, (...args: never[]) => unknown> = {
    measureText: (t: string) => ({ width: t.length * CHAR }),
    fillText: (text: string, x: number, y: number) => { texts.push({ text, x, y, font: String(props.font), color: String(props.fillStyle) }); },
    fillRect: (...r: number[]) => { fills.push(r); },
    strokeRect: (...r: number[]) => { strokes.push(r); },
  };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, key: string) => (key in methods ? methods[key] : key in props ? props[key] : () => undefined),
    set: (_t, key: string, value) => { props[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, fills, strokes };
}

const style = (extra: Record<string, unknown> = {}) => ({ color: '#ff0000', lineWidth: 1, lineStyle: 'solid' as const, fontSize: 10, ...extra });

describe('a drawing’s text style', () => {
  it('keeps bold, italic, alignment, colours, background, border and wrap width, checked', () => {
    expect(sanitizeDrawingStyle({
      color: '#fff', bold: true, italic: true, textAlign: 'center', textColor: '#00ff00',
      textBackground: true, textBorder: true, borderColor: '#0000ff', textWrap: 300,
    })).toEqual({
      color: '#fff', bold: true, italic: true, textAlign: 'center', textColor: '#00ff00',
      textBackground: true, textBorder: true, borderColor: '#0000ff', textWrap: 300,
    });
    expect(sanitizeDrawingStyle({ bold: 'yes', textAlign: 'justify', textColor: '', textWrap: -5 })).toEqual({});
    expect(sanitizeDrawingStyle({ textWrap: 0 })).toEqual({ textWrap: 0 });
    expect(sanitizeDrawingStyle({ textVAlign: 'bottom' })).toEqual({ textVAlign: 'bottom' });
    expect(sanitizeDrawingStyle({ textVAlign: 'baseline' })).toEqual({});
  });
});

describe('drawTextBox', () => {
  it('writes in bold and italic', () => {
    const r = recorder();
    drawTextBox(r.ctx, 'hi', 0, 0, { fontSize: 14, color: '#000', maxWidth: 200, bold: true, italic: true });
    expect(r.texts[0].font).toMatch(/^italic bold 14px /);
  });

  it('lines each line up in the box: centred, or at its right', () => {
    const r = recorder();
    drawTextBox(r.ctx, 'ab\nabcd', 0, 0, { fontSize: 10, color: '#000', maxWidth: 200, align: 'center' });
    const [short, long] = r.texts;
    expect(short.x - long.x).toBe((4 - 2) * CHAR / 2);
    const right = recorder();
    drawTextBox(right.ctx, 'ab\nabcd', 0, 0, { fontSize: 10, color: '#000', maxWidth: 200, align: 'right' });
    expect(right.texts[0].x - right.texts[1].x).toBe((4 - 2) * CHAR);
  });

  it('keeps a long line whole when it is not to wrap', () => {
    const r = recorder();
    const text = 'one two three four five six seven eight nine ten';
    drawTextBox(r.ctx, text, 0, 0, { fontSize: 10, color: '#000', maxWidth: Infinity });
    expect(r.texts.map((t) => t.text)).toEqual([text]);
  });
});

describe('the Text tool', () => {
  const tool = new TextAnnotationTool();
  const at = [{ time: 10, price: 50 }];

  it('writes each line of its text, from its point', () => {
    const r = recorder();
    tool.render(r.ctx, drawing('text', at, { style: style({ text: 'first\nsecond' }) }), unitViewport, false);
    expect(r.texts.map((t) => t.text)).toEqual(['first', 'second']);
    expect(r.texts[0].x).toBe(105);
    expect(r.texts[0].y).toBe(50);
  });

  it('draws a box behind and round it only when asked, in its own colours', () => {
    const plain = recorder();
    tool.render(plain.ctx, drawing('text', at, { style: style({ text: 'x' }) }), unitViewport, false);
    expect(plain.fills).toEqual([]);
    expect(plain.strokes).toEqual([]);
    const boxed = recorder();
    tool.render(boxed.ctx, drawing('text', at, { style: style({ text: 'x', textBackground: true, fillColor: '#123456', textBorder: true, borderColor: '#654321', textColor: '#00ff00' }) }), unitViewport, false);
    expect(boxed.fills).toHaveLength(1);
    expect(boxed.strokes).toHaveLength(1);
    expect(boxed.texts[0].color).toBe('#00ff00');
  });

  it('is picked anywhere on its text as drawn, however long it is', () => {
    const r = recorder();
    const long = drawing('text', at, { id: 'long', style: style({ text: 'a rather long line of text to pick' }) });
    tool.render(r.ctx, long, unitViewport, false);
    // 34 characters: past the old 80 px guess.
    expect(tool.hitTest({ x: 105 + 30 * CHAR, y: 55 }, long, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 105 + 40 * CHAR, y: 55 }, long, unitViewport, 2)).toBe(false);
  });

  it('wraps at the width it is given', () => {
    const r = recorder();
    tool.render(r.ctx, drawing('text', at, { style: style({ text: 'aaaa bbbb cccc', textWrap: 9 * CHAR }) }), unitViewport, false);
    expect(r.texts.map((t) => t.text)).toEqual(['aaaa bbbb', 'cccc']);
  });
});

describe('a note’s text', () => {
  it('takes a colour of its own and can drop its box', () => {
    const r = recorder();
    new NoteTool().render(r.ctx, drawing('note', [{ time: 10, price: 50 }], { style: style({ text: 'n', textColor: '#00ff00', textBackground: false }) }), unitViewport, false);
    expect(r.texts[0].color).toBe('#00ff00');
    expect(r.fills).toEqual([]);
  });
});

describe('a price label’s text', () => {
  it('writes in bold, italics and a colour of its own, and is picked on its text as drawn', async () => {
    const { PriceLabelTool } = await import('../tools/PriceLabel.js');
    const tool = new PriceLabelTool();
    const label = drawing('priceLabel', [{ time: 10, price: 50 }], { id: 'pl', style: style({ text: 'a long label here', bold: true, italic: true, textColor: '#00ff00' }) });
    const r = recorder();
    tool.render(r.ctx, label, unitViewport, false);
    expect(r.texts[0]).toMatchObject({ text: 'a long label here', color: '#00ff00' });
    expect(r.texts[0].font).toMatch(/^italic bold /);
    const right = r.texts[0].x + 17 * CHAR - 2;
    expect(tool.hitTest({ x: right, y: r.texts[0].y }, label, unitViewport, 1)).toBe(true);
  });
});

describe('an arrow mark’s label', () => {
  it('writes in bold, italics and a colour of its own', async () => {
    const { ArrowMarkTool } = await import('../tools/annotations.js');
    const r = recorder();
    new ArrowMarkTool().render(r.ctx, drawing('arrowMark', [{ time: 10, price: 50 }], { style: style({ text: 'buy', bold: true, italic: true, textColor: '#00ff00' }) }), unitViewport, false);
    expect(r.texts[0]).toMatchObject({ text: 'buy', color: '#00ff00' });
    expect(r.texts[0].font).toMatch(/^italic bold /);
  });
});

describe('a text box’s colours and length', () => {
  it('fills with the colour as kept, its alpha included, whatever the line’s fill opacity', () => {
    const r = recorder();
    const fills: string[] = [];
    const ctx = new Proxy(r.ctx as unknown as Record<string, unknown>, {
      get: (t, key: string) => (key === 'fillRect' ? () => fills.push(String((t as Record<string, unknown>).fillStyle)) : (t as Record<string, unknown>)[key]),
      set: (t, key: string, v) => { (t as Record<string, unknown>)[key] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    new TextAnnotationTool().render(ctx, drawing('text', [{ time: 10, price: 50 }], { style: style({ text: 'x', textBackground: true, fillColor: '#123456', fillOpacity: 0.1 }) }), unitViewport, false);
    expect(fills).toEqual(['#123456']);
  });

  it('writes every line of a long text, not only the first twelve', () => {
    const r = recorder();
    const text = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`).join('\n');
    new TextAnnotationTool().render(r.ctx, drawing('text', [{ time: 10, price: 50 }], { style: style({ text }) }), unitViewport, false);
    expect(r.texts).toHaveLength(15);
  });

  it('keeps a wrap width a word fits in, and no wider than the screen could use', () => {
    expect(sanitizeDrawingStyle({ textWrap: 3 })).toEqual({ textWrap: 20 });
    expect(sanitizeDrawingStyle({ textWrap: 99999 })).toEqual({ textWrap: 4000 });
  });
});

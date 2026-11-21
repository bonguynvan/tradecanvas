import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { imagesToPdf, type PdfImage } from '../pdf.js';

const text = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);
/** A picture of `width` × `height` whose bytes count up, so that any byte out of place shows. */
const picture = (width: number, height: number): PdfImage => ({ width, height, rgb: Uint8Array.from({ length: width * height * 3 }, (_, i) => i % 251) });

/** The body of the object numbered `n`, between `n 0 obj` and `endobj`. */
function object(pdf: string, n: number): string {
  const start = pdf.indexOf(`\n${n} 0 obj\n`);
  expect(start, `object ${n}`).toBeGreaterThan(0);
  return pdf.slice(start + `\n${n} 0 obj\n`.length, pdf.indexOf('\nendobj', start));
}

/** The bytes of the stream of the object numbered `n`. */
function stream(bytes: Uint8Array, n: number): Uint8Array {
  const pdf = text(bytes);
  const at = pdf.indexOf(`\n${n} 0 obj\n`);
  const from = pdf.indexOf('stream\n', at) + 'stream\n'.length;
  const length = Number(/\/Length (\d+)/.exec(pdf.slice(at, from))![1]);
  expect(pdf.slice(from + length, from + length + '\nendstream'.length)).toBe('\nendstream');
  return bytes.slice(from, from + length);
}

/** The four numbers of a page's box, and the six of where its picture goes. */
function placed(bytes: Uint8Array, page = 0): { box: number[]; matrix: number[] } {
  const pdf = text(bytes);
  const box = /\/MediaBox \[([^\]]+)\]/.exec(object(pdf, 4 + page * 3))![1].split(' ').map(Number);
  const matrix = /q ([-\d. ]+) cm/.exec(text(stream(bytes, 6 + page * 3)))![1].split(' ').map(Number);
  return { box, matrix };
}

const MM = 72 / 25.4;

describe('a PDF of pictures, a page each', () => {
  it('is a file a reader can find its way in: every object where the table says it is', async () => {
    const bytes = await imagesToPdf([picture(4, 2)]);
    const pdf = text(bytes);
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    const table = Number(/startxref\n(\d+)\n%%EOF/.exec(pdf)![1]);
    expect(pdf.slice(table, table + 5)).toBe('xref\n');
    const rows = pdf.slice(table).split('\n');
    const count = Number(rows[1].split(' ')[1]);
    expect(count).toBe(7);
    expect(rows[2]).toBe('0000000000 65535 f ');
    for (let n = 1; n < count; n++) {
      const row = rows[2 + n];
      expect(row).toMatch(/^\d{10} 00000 n $/);
      const offset = Number(row.slice(0, 10));
      expect(pdf.slice(offset, offset + `${n} 0 obj`.length), `object ${n}`).toBe(`${n} 0 obj`);
    }
    expect(pdf).toContain(`/Size ${count}`);
    expect(pdf).toContain('/Root 1 0 R');
    expect(object(pdf, 1)).toContain('/Type /Catalog');
    expect(object(pdf, 2)).toContain('/Count 1');
  });

  it('keeps a picture’s pixels as they are: packed, and the same again unpacked', async () => {
    const image = picture(5, 3);
    const bytes = await imagesToPdf([image]);
    const dictionary = object(text(bytes), 5);
    expect(dictionary).toContain('/Subtype /Image');
    expect(dictionary).toContain('/Width 5');
    expect(dictionary).toContain('/Height 3');
    expect(dictionary).toContain('/ColorSpace /DeviceRGB');
    expect(dictionary).toContain('/BitsPerComponent 8');
    expect(dictionary).toContain('/Filter /FlateDecode');
    expect([...inflateSync(stream(bytes, 5))]).toEqual([...image.rgb!]);
  });

  it('takes a JPEG file as it is', async () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const bytes = await imagesToPdf([{ width: 8, height: 4, jpeg }]);
    expect(object(text(bytes), 5)).toContain('/Filter /DCTDecode');
    expect([...stream(bytes, 5)]).toEqual([...jpeg]);
  });

  it('is A4 on its side when nothing says, the picture across it within its margins and at the top', async () => {
    const { box, matrix } = placed(await imagesToPdf([picture(4, 2)]));
    expect(box).toEqual([0, 0, 841.89, 595.28]);
    const margin = 12 * MM;
    const width = 297 * MM - margin * 2;
    // Width, 0, 0, height, left, bottom.
    expect(matrix[0]).toBeCloseTo(width, 1);
    expect(matrix[3]).toBeCloseTo(width / 2, 1);
    expect(matrix[4]).toBeCloseTo(margin, 1);
    expect(matrix[5]).toBeCloseTo(210 * MM - margin - width / 2, 1);
    expect([matrix[1], matrix[2]]).toEqual([0, 0]);
  });

  it('fits a tall picture by its height, in the middle of the page’s width', async () => {
    const { box, matrix } = placed(await imagesToPdf([picture(2, 8)], { orientation: 'portrait', margin: 20 }));
    expect(box).toEqual([0, 0, 595.28, 841.89]);
    const height = (297 - 40) * MM;
    expect(matrix[3]).toBeCloseTo(height, 1);
    expect(matrix[0]).toBeCloseTo(height / 4, 1);
    expect(matrix[4]).toBeCloseTo((210 * MM - height / 4) / 2, 1);
    expect(matrix[5]).toBeCloseTo(20 * MM, 1);
  });

  it('takes a paper by its name or by its sides in millimetres', async () => {
    expect(placed(await imagesToPdf([picture(2, 2)], { pageSize: 'letter' })).box).toEqual([0, 0, 792, 612]);
    expect(placed(await imagesToPdf([picture(2, 2)], { pageSize: 'a3', orientation: 'portrait' })).box).toEqual([0, 0, 841.89, 1190.55]);
    expect(placed(await imagesToPdf([picture(2, 2)], { pageSize: 'legal', orientation: 'portrait' })).box).toEqual([0, 0, 612, 1008]);
    // The sides given are the paper's: on its side the longer one runs across.
    expect(placed(await imagesToPdf([picture(2, 2)], { pageSize: { width: 100, height: 200 } })).box).toEqual([0, 0, 566.93, 283.46]);
    expect(placed(await imagesToPdf([picture(2, 2)], { pageSize: { width: 100, height: 200 }, orientation: 'portrait' })).box).toEqual([0, 0, 283.46, 566.93]);
  });

  it('holds a margin to what leaves room for the picture, and takes one that is no number as its own', async () => {
    const whole = placed(await imagesToPdf([picture(4, 2)], { margin: 0 }));
    expect(whole.matrix[0]).toBeCloseTo(841.89, 1);
    expect(whole.matrix[4]).toBe(0);
    const tooMuch = placed(await imagesToPdf([picture(4, 2)], { margin: 500 }));
    expect(tooMuch.matrix[0]).toBeGreaterThan(50);
    expect(tooMuch.matrix[3]).toBeGreaterThan(25);
    const unset = placed(await imagesToPdf([picture(4, 2)], { margin: Number.NaN }));
    expect(unset.matrix[4]).toBeCloseTo(12 * MM, 1);
    expect(placed(await imagesToPdf([picture(4, 2)], { margin: -5 })).matrix[4]).toBe(0);
  });

  it('has a page for each picture, each with its own', async () => {
    const images = [picture(4, 2), picture(3, 3), picture(2, 6)];
    const bytes = await imagesToPdf(images);
    const pdf = text(bytes);
    expect(object(pdf, 2)).toContain('/Count 3');
    expect(object(pdf, 2)).toContain('/Kids [4 0 R 7 0 R 10 0 R]');
    images.forEach((image, i) => {
      expect(object(pdf, 4 + i * 3)).toContain(`/XObject << /Im0 ${5 + i * 3} 0 R >>`);
      expect(object(pdf, 4 + i * 3)).toContain(`/Contents ${6 + i * 3} 0 R`);
      expect(object(pdf, 5 + i * 3)).toContain(`/Width ${image.width}`);
      expect([...inflateSync(stream(bytes, 5 + i * 3))]).toEqual([...image.rgb!]);
    });
  });

  it('carries its title in any language, and none when none is given', async () => {
    const plain = text(await imagesToPdf([picture(2, 2)], { title: 'Returns (2026) \\ net' }));
    expect(object(plain, 3)).toContain('/Title (Returns \\(2026\\) \\\\ net)');
    expect(object(plain, 3)).toContain('/Producer (TradeCanvas)');
    const other = text(await imagesToPdf([picture(2, 2)], { title: 'Biểu đồ' }));
    // The byte order mark, then two bytes a letter: B, i, ể.
    expect(object(other, 3)).toContain('/Title <FEFF004200691EC3');
    expect(object(text(await imagesToPdf([picture(2, 2)])), 3)).not.toContain('/Title');
  });

  it('is the same file for the same pictures', async () => {
    const one = await imagesToPdf([picture(4, 2)], { title: 'Same' });
    const two = await imagesToPdf([picture(4, 2)], { title: 'Same' });
    expect([...one]).toEqual([...two]);
  });

  it('says what is wrong with a picture it cannot put on a page', async () => {
    await expect(imagesToPdf([])).rejects.toThrow(/no picture/);
    await expect(imagesToPdf([{ width: 0, height: 2, rgb: new Uint8Array(0) }])).rejects.toThrow(/size/);
    await expect(imagesToPdf([{ width: 2.5, height: 2, rgb: new Uint8Array(15) }])).rejects.toThrow(/size/);
    await expect(imagesToPdf([{ width: 2, height: 2, rgb: new Uint8Array(5) }])).rejects.toThrow(/12 bytes/);
    await expect(imagesToPdf([{ width: 2, height: 2 }])).rejects.toThrow(/neither/);
  });
});

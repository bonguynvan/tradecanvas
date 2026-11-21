import type { PdfPageOptions } from '@tradecanvas/commons';

/**
 * A picture for a page of a PDF: its pixels as red, green and blue, a byte
 * each, row by row from the top (`rgb`), or the bytes of a JPEG file
 * (`jpeg`). A JPEG is put in as it is: it has to be one in RGB (not grey,
 * not CMYK) of the `width` and `height` given.
 */
export interface PdfImage {
  width: number;
  height: number;
  rgb?: Uint8Array;
  jpeg?: Uint8Array;
}

/**
 * A page's picture, or a function that gives it when its page is written:
 * a large picture made on demand is let go of before the next one is made,
 * so a long report holds one page's pixels at a time.
 */
export type PdfPicture = PdfImage | (() => PdfImage | Promise<PdfImage>);

/** A PDF's unit, the point, to a millimetre. */
const POINTS_PER_MM = 72 / 25.4;
/** The papers known by name: their sides in millimetres, the shorter first. */
const PAPERS: Record<string, [number, number]> = {
  a3: [297, 420],
  a4: [210, 297],
  letter: [215.9, 279.4],
  legal: [215.9, 355.6],
};
const DEFAULT_PAPER = PAPERS.a4;
/** A page's side is held between these, mm: a centimetre, and the 200 inches past which readers refuse a page. */
const MIN_SIDE_MM = 10;
const MAX_SIDE_MM = 5080;
const DEFAULT_MARGIN_MM = 12;
/** No margin is more than this share of the page's shorter side: a fifth of the side is left for the picture. */
const MAX_MARGIN_SHARE = 0.4;
/** The objects before the pages' own: the catalog, the list of pages, and what the file says of itself. */
const CATALOG = 1;
const PAGES = 2;
const INFO = 3;
const FIRST_PAGE = 4;
/** A page's objects: the page, its picture, and the line that places the picture. */
const OBJECTS_PER_PAGE = 3;
/** Bytes over 127 on the file's second line tell a program that carries it that it is no text. */
const BINARY_MARK = Uint8Array.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
const PRODUCER = 'TradeCanvas';

const encoder = new TextEncoder();

/** A length as the file writes it: points with two decimals, and none it does not need. */
const points = (value: number): number => Number(value.toFixed(2));

/** A text as a PDF string: as it is where it is plain ASCII, else two bytes a letter after a byte order mark. */
function pdfString(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return `(${text.replace(/[\\()]/g, (mark) => `\\${mark}`)})`;
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
  return `<${hex}>`;
}

/** `bytes` packed the way a PDF unpacks them (`FlateDecode`), or null where the platform has nothing to pack with. */
async function pack(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream !== 'function') return null;
  const packer = new CompressionStream('deflate');
  const writer = packer.writable.getWriter();
  // Not waited for: the packed bytes are read as they come, and a write waited for would wait for its reader.
  // A write that fails fails the reading too, which is where it is reported.
  writer.write(bytes as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  const reader = packer.readable.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    total += value.length;
  }
  const packed = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    packed.set(part, at);
    at += part.length;
  }
  return packed;
}

function checked(image: PdfImage, page: number): void {
  const { width, height } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`imagesToPdf: picture ${page + 1} has no size it can be drawn at (${width} × ${height})`);
  }
  if (image.rgb) {
    if (image.rgb.length !== width * height * 3) throw new RangeError(`imagesToPdf: picture ${page + 1} is ${width} × ${height} and needs ${width * height * 3} bytes, not ${image.rgb.length}`);
  } else if (!image.jpeg) {
    throw new RangeError(`imagesToPdf: picture ${page + 1} has neither pixels nor a JPEG`);
  }
}

/** The page's sides in points, as it lies: on its side the longer one runs across. */
function pageSize(options: PdfPageOptions): { width: number; height: number } {
  const size = options.pageSize ?? 'a4';
  // By its own name only: every object has a `constructor`, and that is no paper.
  const named = typeof size === 'string' ? (Object.prototype.hasOwnProperty.call(PAPERS, size) ? PAPERS[size] : DEFAULT_PAPER) : [size?.width, size?.height];
  const usable = named.every((side) => Number.isFinite(side) && side > 0) ? named : DEFAULT_PAPER;
  const held = usable.map((side) => Math.min(MAX_SIDE_MM, Math.max(MIN_SIDE_MM, side)));
  const short = Math.min(held[0], held[1]) * POINTS_PER_MM;
  const long = Math.max(held[0], held[1]) * POINTS_PER_MM;
  return options.orientation === 'portrait' ? { width: short, height: long } : { width: long, height: short };
}

/**
 * A PDF with a page for each picture: the picture as large as fits within
 * the margins, across the middle of the page and at its top. The pixels are
 * kept as they are (packed without loss, where the platform can pack), so a
 * chart's lines stay sharp; a JPEG is put in as it is. No text is written on
 * the page, so no font is needed: a chart's words are in its picture, in any
 * language. A picture may be a function that gives it when its page comes.
 * Rejects with a RangeError for no pictures, or one with no size or data.
 */
export async function imagesToPdf(images: readonly PdfPicture[], options: PdfPageOptions = {}): Promise<Uint8Array> {
  if (images.length === 0) throw new RangeError('imagesToPdf: no picture to make a page of');
  // Those in hand are looked over before anything is written; one made on demand, when it is made.
  images.forEach((image, page) => {
    if (typeof image !== 'function') checked(image, page);
  });

  const page = pageSize(options);
  const asked = options.margin !== undefined && Number.isFinite(options.margin) ? options.margin : DEFAULT_MARGIN_MM;
  const margin = Math.min(Math.max(0, asked * POINTS_PER_MM), Math.min(page.width, page.height) * MAX_MARGIN_SHARE);

  const chunks: Uint8Array[] = [];
  /** Where each object starts, by its number. */
  const offsets: number[] = [];
  let length = 0;
  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const begin = (n: number) => {
    offsets[n] = length;
    write(`${n} 0 obj\n`);
  };
  const withStream = (n: number, dictionary: string, data: Uint8Array) => {
    begin(n);
    write(`<< ${dictionary} /Length ${data.length} >>\nstream\n`);
    write(data);
    write('\nendstream\nendobj\n');
  };

  write('%PDF-1.4\n');
  write(BINARY_MARK);
  const pageNumbers = images.map((_, i) => FIRST_PAGE + i * OBJECTS_PER_PAGE);
  begin(CATALOG);
  write(`<< /Type /Catalog /Pages ${PAGES} 0 R >>\nendobj\n`);
  begin(PAGES);
  write(`<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${images.length} >>\nendobj\n`);
  begin(INFO);
  write(`<< ${options.title ? `/Title ${pdfString(options.title)} ` : ''}/Producer (${PRODUCER}) >>\nendobj\n`);

  for (let i = 0; i < images.length; i++) {
    const source = images[i];
    const image = typeof source === 'function' ? await source() : source;
    if (typeof source === 'function') checked(image, i);
    const n = pageNumbers[i];
    const scale = Math.min((page.width - margin * 2) / image.width, (page.height - margin * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    begin(n);
    write(`<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 ${points(page.width)} ${points(page.height)}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>\nendobj\n`);

    const shape = `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8`;
    if (image.rgb) {
      const packed = await pack(image.rgb);
      withStream(n + 1, packed ? `${shape} /Filter /FlateDecode` : shape, packed ?? image.rgb);
    } else {
      withStream(n + 1, `${shape} /Filter /DCTDecode`, image.jpeg as Uint8Array);
    }
    // The picture is a unit square to a PDF: stretched to its size, and moved to its place from the page's bottom left.
    const place = `q ${points(width)} 0 0 ${points(height)} ${points((page.width - width) / 2)} ${points(page.height - margin - height)} cm /Im0 Do Q`;
    withStream(n + 2, '', encoder.encode(place));
  }

  const count = FIRST_PAGE + images.length * OBJECTS_PER_PAGE;
  const table = length;
  write(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) write(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  write(`trailer\n<< /Size ${count} /Root ${CATALOG} 0 R /Info ${INFO} 0 R >>\nstartxref\n${table}\n%%EOF\n`);

  const file = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    file.set(chunk, at);
    at += chunk.length;
  }
  return file;
}

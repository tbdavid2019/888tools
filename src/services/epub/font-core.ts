import { Font, woff2 } from 'fonteditor-core';

export interface DetectedFontFormat {
  ext: 'ttf' | 'otf' | 'woff' | 'woff2';
  mime: string;
  format: 'truetype' | 'opentype' | 'woff' | 'woff2';
}

export interface SubsetFontOutput {
  buffer: ArrayBuffer;
  family: string;
  ext: 'ttf';
  mime: 'font/ttf';
  format: 'truetype';
}

export function detectFontFormatFromBuffer(buffer: ArrayBuffer, fallbackName = ''): DetectedFontFormat {
  if (buffer.byteLength >= 4) {
    const view = new DataView(buffer);
    const sig = view.getUint32(0);
    if (sig === 0x774F4632) {
      return { ext: 'woff2', mime: 'font/woff2', format: 'woff2' };
    }
    if (sig === 0x774F4646) {
      return { ext: 'woff', mime: 'font/woff', format: 'woff' };
    }
    if (sig === 0x4F54544F) {
      return { ext: 'otf', mime: 'font/otf', format: 'opentype' };
    }
    if (sig === 0x00010000 || sig === 0x74727565) {
      return { ext: 'ttf', mime: 'font/ttf', format: 'truetype' };
    }
  }

  const lower = fallbackName.toLowerCase();
  if (lower.endsWith('.woff2')) {
    return { ext: 'woff2', mime: 'font/woff2', format: 'woff2' };
  }
  if (lower.endsWith('.woff')) {
    return { ext: 'woff', mime: 'font/woff', format: 'woff' };
  }
  if (lower.endsWith('.otf')) {
    return { ext: 'otf', mime: 'font/otf', format: 'opentype' };
  }
  return { ext: 'ttf', mime: 'font/ttf', format: 'truetype' };
}

const MAX_WOFF_TABLES = 256;
const MAX_WOFF_TABLE_SIZE = 128 * 1024 * 1024;

/**
 * Decompresses WOFF1 to raw SFNT (TTF/OTF) using native DecompressionStream with strict bounds validation.
 */
export async function safeDecompressWoff1(woffBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (woffBuffer.byteLength < 44) {
    throw new Error('WOFF 檔案過小，格式無效');
  }
  const view = new DataView(woffBuffer);
  const signature = view.getUint32(0);
  if (signature !== 0x774F4646) {
    throw new Error('不是合法的 WOFF 檔');
  }

  const flavor = view.getUint32(4);
  const numTables = view.getUint16(12);
  if (numTables === 0 || numTables > MAX_WOFF_TABLES || 44 + numTables * 20 > woffBuffer.byteLength) {
    throw new Error('WOFF 表目錄超出檔案邊界');
  }

  const tables: Array<{
    tag: number;
    offset: number;
    compLength: number;
    origLength: number;
    origChecksum: number;
    data?: Uint8Array;
  }> = [];

  let dirOffset = 44;
  for (let i = 0; i < numTables; i++) {
    const offset = view.getUint32(dirOffset + 4);
    const compLength = view.getUint32(dirOffset + 8);
    const origLength = view.getUint32(dirOffset + 12);
    if (
      offset + compLength > woffBuffer.byteLength
      || origLength > MAX_WOFF_TABLE_SIZE
      || compLength > origLength
    ) {
      throw new Error('WOFF 資料表偏移或大小超出合理邊界');
    }

    tables.push({
      tag: view.getUint32(dirOffset),
      offset,
      compLength,
      origLength,
      origChecksum: view.getUint32(dirOffset + 16),
    });
    dirOffset += 20;
  }

  const woffBytes = new Uint8Array(woffBuffer);
  for (const t of tables) {
    const slice = woffBytes.subarray(t.offset, t.offset + t.compLength);
    if (t.compLength < t.origLength) {
      const stream = new Response(new Blob([slice]).stream().pipeThrough(new DecompressionStream('deflate')));
      const buf = await stream.arrayBuffer();
      t.data = new Uint8Array(buf);
    }
    else {
      t.data = new Uint8Array(slice);
    }
  }

  const headerSize = 12 + numTables * 16;
  let bodySize = 0;
  for (const t of tables) {
    bodySize += t.data!.byteLength;
    bodySize += (4 - (t.data!.byteLength % 4)) % 4;
  }

  const sfnt = new ArrayBuffer(headerSize + bodySize);
  const sfntView = new DataView(sfnt);
  const sfntBytes = new Uint8Array(sfnt);

  sfntView.setUint32(0, flavor);
  sfntView.setUint16(4, numTables);

  let entrySelector = 0;
  let searchRange = 1;
  while (searchRange * 2 <= numTables) {
    searchRange *= 2;
    entrySelector++;
  }
  searchRange *= 16;
  sfntView.setUint16(6, searchRange);
  sfntView.setUint16(8, entrySelector);
  sfntView.setUint16(10, numTables * 16 - searchRange);

  let dataOffset = headerSize;
  let dirCursor = 12;
  for (const t of tables) {
    sfntView.setUint32(dirCursor, t.tag);
    sfntView.setUint32(dirCursor + 4, t.origChecksum);
    sfntView.setUint32(dirCursor + 8, dataOffset);
    sfntView.setUint32(dirCursor + 12, t.data!.byteLength);
    dirCursor += 16;
    sfntBytes.set(t.data!, dataOffset);
    dataOffset += t.data!.byteLength;
    dataOffset += (4 - (t.data!.byteLength % 4)) % 4;
  }

  return sfnt;
}

let woff2InitPromise: Promise<void> | null = null;
async function ensureWoff2Ready(wasmUrl: string): Promise<void> {
  if (woff2.isInited()) {
    return;
  }
  if (!woff2InitPromise) {
    woff2InitPromise = woff2.init(wasmUrl).then(() => undefined);
  }
  try {
    await woff2InitPromise;
  }
  catch (err) {
    woff2InitPromise = null;
    throw err;
  }
}

export function extractUniqueCodePoints(text: string): number[] {
  const baseChars = '。，、；：？！「」『』（）【】《》〈〉…—　 \n\r\t';
  const set = new Set<number>();
  for (let a = 0x20; a < 0x7F; a++) {
    set.add(a);
  }
  for (const ch of baseChars) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) {
      set.add(cp);
    }
  }
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) {
      set.add(cp);
    }
  }
  return Array.from(set);
}

function normalizeFontWriteOutput(output: ArrayBuffer | Uint8Array | string): ArrayBuffer {
  if (output instanceof ArrayBuffer) {
    return output;
  }
  if (typeof output === 'string') {
    return new TextEncoder().encode(output).buffer;
  }
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
}

export async function prepareFontBufferForEditor(
  buffer: ArrayBuffer,
  wasmUrl: string,
  fallbackName = '',
): Promise<{ sfntBuffer: ArrayBuffer; type: 'ttf' | 'otf' | 'woff2' }> {
  const detected = detectFontFormatFromBuffer(buffer, fallbackName);
  if (detected.ext === 'woff') {
    const sfntBuffer = await safeDecompressWoff1(buffer);
    const inner = detectFontFormatFromBuffer(sfntBuffer);
    return {
      sfntBuffer,
      type: inner.ext === 'otf'
        ? 'otf'
        : 'ttf',
    };
  }
  if (detected.ext === 'woff2') {
    await ensureWoff2Ready(wasmUrl);
    return { sfntBuffer: buffer, type: 'woff2' };
  }
  return {
    sfntBuffer: buffer,
    type: detected.ext === 'otf'
      ? 'otf'
      : 'ttf',
  };
}

export async function subsetFontBufferDirect(
  fontBuffer: ArrayBuffer,
  codePoints: number[],
  wasmUrl: string,
  options: { fallbackName?: string; preferredFamily?: string } = {},
): Promise<SubsetFontOutput> {
  const { sfntBuffer, type } = await prepareFontBufferForEditor(fontBuffer, wasmUrl, options.fallbackName);

  const font = Font.create(sfntBuffer, {
    type,
    subset: codePoints,
    hinting: false,
  });

  const fontData = font.get();
  const detectedFamily = fontData.name?.fontFamily?.trim();
  const family = options.preferredFamily || detectedFamily || 'CustomUserFont';

  if (fontData.name) {
    fontData.name.fontFamily = family;
    fontData.name.fontSubFamily = 'Regular';
    fontData.name.fullName = `${family} Subset`;
    fontData.name.postScriptName = family.replace(/[^\w-]/g, '') || 'CustomUserFont';
  }
  font.set(fontData);

  const subsetBuffer = normalizeFontWriteOutput(font.write({
    type: 'ttf',
    hinting: false,
  }));

  if (subsetBuffer.byteLength === 0) {
    throw new Error('子集化後字體大小為 0');
  }

  return {
    buffer: subsetBuffer,
    family,
    ext: 'ttf',
    mime: 'font/ttf',
    format: 'truetype',
  };
}

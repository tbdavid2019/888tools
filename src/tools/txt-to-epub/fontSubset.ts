import {
  BUILT_IN_FONT_IDS,
  DEFAULT_EPUB_FONT,
  EPUB_FONT_MAP,
  estimateSubsetSize,
  extractUniqueCodePoints,
  loadBuiltInFontBuffer,
  subsetFontBuffer,
} from '@/services/epub/fonts';

export interface FontInfo {
  id: string;
  name: string;
  file: string;
  family: string;
  ext: string;
  mime: string;
  format: string;
  description: string;
}

export const FONT_CONFIG: Record<string, FontInfo> = Object.fromEntries(
  BUILT_IN_FONT_IDS.map((id) => {
    const meta = EPUB_FONT_MAP[id];
    return [
      id,
      {
        id: meta.id,
        name: meta.name,
        file: meta.file,
        family: meta.family,
        ext: meta.ext,
        mime: meta.mime,
        format: meta.format,
        description: meta.description,
      },
    ];
  }),
);

export const DEFAULT_FONT = DEFAULT_EPUB_FONT;

export { estimateSubsetSize };

export function extractUniqueChars(text: string): string {
  return extractUniqueCodePoints(text)
    .map(cp => String.fromCodePoint(cp))
    .join('');
}

export async function loadFontFile(fontId: string): Promise<ArrayBuffer> {
  return loadBuiltInFontBuffer(fontId);
}

export interface SubsetFontResult {
  buffer: ArrayBuffer;
  format: string;
  family: string;
  mimeType: string;
  extension: string;
}

export async function subsetFont(
  fontId: string,
  text: string,
  onProgress: (p: { stage: string; message: string }) => void = () => {},
): Promise<SubsetFontResult> {
  const config = FONT_CONFIG[fontId];
  if (!config) {
    throw new Error(`未知的字型: ${fontId}`);
  }

  onProgress({ stage: 'loading', message: `正在載入 ${config.name}...` });
  const fontBuffer = await loadBuiltInFontBuffer(fontId);

  onProgress({ stage: 'parsing', message: '正在解析字型...' });
  const codePoints = extractUniqueCodePoints(text);

  onProgress({ stage: 'subsetting', message: `正在子集化（保留 ${codePoints.length} 個字元）...` });

  try {
    const subset = await subsetFontBuffer(fontBuffer, codePoints, {
      fallbackName: config.file,
      preferredFamily: config.family,
    });

    onProgress({ stage: 'done', message: '字型子集化完成！' });

    return {
      buffer: subset.buffer,
      format: subset.format,
      family: subset.family,
      mimeType: subset.mime,
      extension: '.ttf',
    };
  }
  catch (error: any) {
    console.error('字型子集化失敗:', error);
    throw new Error(`字型子集化失敗: ${error.message}`);
  }
}

export function generateFontFaceCSS(family: string, filename: string, format = 'truetype'): string {
  return `@font-face {
  font-family: "${family}";
  src: url("../fonts/${filename}") format("${format}");
  font-weight: normal;
  font-style: normal;
}`;
}

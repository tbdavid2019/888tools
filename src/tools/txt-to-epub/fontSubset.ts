// @ts-ignore
import { Font } from 'fonteditor-core';

export interface FontInfo {
  id: string;
  name: string;
  file: string;
  family: string;
  format: string;
  description: string;
}

export const FONT_CONFIG: Record<string, FontInfo> = {
  'noto-sans': {
    id: 'noto-sans',
    name: '思源黑體',
    file: '/fonts/NotoSansCJKtc-Regular.otf',
    family: 'Noto Sans TC',
    format: 'opentype',
    description: '清晰俐落，適合螢幕閱讀',
  },
  'noto-serif': {
    id: 'noto-serif',
    name: '思源宋體',
    file: '/fonts/NotoSerifCJKtc-Regular.otf',
    family: 'Noto Serif TC',
    format: 'opentype',
    description: '典雅正式，適合長篇小說',
  },
  'guankiap': {
    id: 'guankiap',
    name: '原俠正楷',
    file: '/fonts/GuanKiapTsingKhai-TW.ttf',
    family: 'GuanKiapTsingKhai TW',
    format: 'truetype',
    description: '手寫楷書，溫暖文青感',
  },
  'huninn': {
    id: 'huninn',
    name: 'jf 粉圓',
    file: '/fonts/jf-openhuninn.ttf',
    family: 'jf-openhuninn',
    format: 'truetype',
    description: '可愛圓體，活潑輕鬆',
  },
};

export const DEFAULT_FONT = 'noto-sans';

export function extractUniqueChars(text: string): string {
  const chars = [...new Set(text)].join('');
  const baseChars = '。，、；：？！「」『』（）【】…—　 \n\r\t';
  const numbers = '0123456789';
  const latin = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return [...new Set(chars + baseChars + numbers + latin)].join('');
}

const fontCache = new Map<string, ArrayBuffer>();

export async function loadFontFile(fontId: string): Promise<ArrayBuffer> {
  const config = FONT_CONFIG[fontId];
  if (!config) {
    throw new Error(`未知的字型: ${fontId}`);
  }

  if (fontCache.has(fontId)) {
    return fontCache.get(fontId)!;
  }

  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`無法載入字型: ${config.name}`);
  }

  const buffer = await response.arrayBuffer();
  fontCache.set(fontId, buffer);
  return buffer;
}

export interface SubsetProgress {
  stage: string;
  message: string;
}

export async function subsetFont(
  fontId: string,
  text: string,
  onProgress: (p: SubsetProgress) => void = () => {},
): Promise<{ buffer: ArrayBuffer; format: string; family: string; mimeType: string; extension: string }> {
  const config = FONT_CONFIG[fontId];
  if (!config) {
    throw new Error(`未知的字型: ${fontId}`);
  }

  onProgress({ stage: 'loading', message: `正在載入 ${config.name}...` });

  const fontBuffer = await loadFontFile(fontId);
  
  onProgress({ stage: 'parsing', message: '正在解析字型...' });

  const chars = extractUniqueChars(text);
  const charCodes = [...chars].map(c => c.charCodeAt(0));

  onProgress({ stage: 'subsetting', message: `正在子集化（保留 ${charCodes.length} 個字元）...` });

  try {
    const font = Font.create(fontBuffer, {
      type: config.file.endsWith('.otf') ? 'otf' : 'ttf',
      subset: charCodes,
      hinting: false,
    });

    const fontData = font.get();
    if (fontData.name) {
      fontData.name.fontFamily = config.family;
      fontData.name.fontSubFamily = 'Regular';
      fontData.name.fullName = `${config.family} Subset`;
      fontData.name.postScriptName = config.family.replace(/\s/g, '');
    }
    font.set(fontData);

    onProgress({ stage: 'generating', message: '正在產生子集化字型...' });

    const subsetBuffer = font.write({
      type: 'ttf',
      hinting: false,
    });

    onProgress({ stage: 'done', message: '字型子集化完成！' });

    return {
      buffer: subsetBuffer,
      format: 'truetype',
      family: config.family,
      mimeType: 'font/ttf',
      extension: '.ttf',
    };
  } catch (error: any) {
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

export function estimateSubsetSize(charCount: number): string {
  const estimatedBytes = charCount * 750;
  if (estimatedBytes < 1024) {
    return `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

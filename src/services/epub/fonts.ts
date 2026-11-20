import type { DetectedFontFormat, SubsetFontOutput } from './font-core';
import { Font } from 'fonteditor-core';
import { loadCachedBuiltInFont, saveCachedBuiltInFont } from '@/tools/epub-editor/epub-storage';
import {

  detectFontFormatFromBuffer,
  extractUniqueCodePoints,
  prepareFontBufferForEditor,
  safeDecompressWoff1,
  subsetFontBufferDirect,
} from './font-core';

export {
  type DetectedFontFormat,
  detectFontFormatFromBuffer,
  extractUniqueCodePoints,
  safeDecompressWoff1,
  type SubsetFontOutput,
};

export interface EpubFontMeta {
  id: string;
  name: string;
  description: string;
  family: string;
  cssFamily: string;
  file: string;
  ext: 'otf' | 'ttf' | 'woff2' | '';
  mime: string;
  format: 'opentype' | 'truetype' | 'woff2' | '';
}

const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

export const EPUB_FONT_MAP: Record<string, EpubFontMeta> = {
  'noto-sans': {
    id: 'noto-sans',
    name: '思源黑體',
    description: '清晰俐落，適合螢幕閱讀',
    family: 'Noto Sans TC',
    cssFamily: '"NotoSansCJKtc", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
    file: `${baseUrl}fonts/NotoSansCJKtc-Regular.otf`,
    ext: 'otf',
    mime: 'font/otf',
    format: 'opentype',
  },
  'gen-jyuu': {
    id: 'gen-jyuu',
    name: '源柔黑體',
    description: '柔和圓角黑體，閱讀舒適',
    family: 'Gen Jyuu Gothic',
    cssFamily: '"Gen Jyuu Gothic", "Noto Sans TC", sans-serif',
    file: `${baseUrl}fonts/GenJyuuGothic-Medium.woff2`,
    ext: 'woff2',
    mime: 'font/woff2',
    format: 'woff2',
  },
  'noto-serif': {
    id: 'noto-serif',
    name: '思源宋體',
    description: '典雅正式，適合長篇小說',
    family: 'Noto Serif TC',
    cssFamily: '"NotoSerifCJKtc", "Noto Serif TC", "PMingLiU", serif',
    file: `${baseUrl}fonts/NotoSerifCJKtc-Regular.otf`,
    ext: 'otf',
    mime: 'font/otf',
    format: 'opentype',
  },
  'guankiap': {
    id: 'guankiap',
    name: '原俠正楷',
    description: '手寫楷書，溫暖文青感',
    family: 'GuanKiapTsingKhai TW',
    cssFamily: '"GuanKiapTsingKhai", "GuanKiapTsingKhai TW", "DFKai-SB", "BiauKai", serif',
    file: `${baseUrl}fonts/GuanKiapTsingKhai-TW.ttf`,
    ext: 'ttf',
    mime: 'font/ttf',
    format: 'truetype',
  },
  'huninn': {
    id: 'huninn',
    name: 'jf 粉圓',
    description: '可愛圓體，活潑輕鬆',
    family: 'jf-openhuninn',
    cssFamily: '"jf-openhuninn", "Microsoft JhengHei", sans-serif',
    file: `${baseUrl}fonts/jf-openhuninn.ttf`,
    ext: 'ttf',
    mime: 'font/ttf',
    format: 'truetype',
  },
  'custom': {
    id: 'custom',
    name: '自訂字型',
    description: '使用自行上傳的字型檔案',
    family: 'CustomUserFont',
    cssFamily: '"EpubEditorPreviewCustom", sans-serif',
    file: '',
    ext: '',
    mime: '',
    format: '',
  },
  'default': {
    id: 'default',
    name: '閱讀器預設',
    description: '沿用閱讀器預設字型',
    family: 'inherit',
    cssFamily: 'inherit',
    file: '',
    ext: '',
    mime: '',
    format: '',
  },
};

export const BUILT_IN_FONT_IDS = [
  'noto-sans',
  'gen-jyuu',
  'noto-serif',
  'guankiap',
  'huninn',
] as const;
export const DEFAULT_EPUB_FONT = 'noto-sans';

function resolveWoff2WasmUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(`${baseUrl}wasm/woff2.wasm`, window.location.origin).toString();
  }
  return `${baseUrl}wasm/woff2.wasm`;
}

export async function extractFontFamilyName(buffer: ArrayBuffer, fallbackName = ''): Promise<string | null> {
  try {
    const { sfntBuffer, type } = await prepareFontBufferForEditor(buffer, resolveWoff2WasmUrl(), fallbackName);
    const font = Font.create(sfntBuffer, {
      type,
      subset: [0x20],
      hinting: false,
    });
    const data = font.get();
    return data.name?.fontFamily?.trim() || null;
  }
  catch (err) {
    console.warn('讀取字型 family name 失敗：', err);
    return null;
  }
}

let subsetWorker: Worker | null = null;
let workerJobSeq = 0;
const pendingWorkerJobs = new Map<
  number,
  { resolve: (val: SubsetFontOutput) => void; reject: (err: Error) => void }
>();

function resetSubsetWorker(err?: Error) {
  if (subsetWorker) {
    subsetWorker.terminate();
    subsetWorker = null;
  }
  for (const job of pendingWorkerJobs.values()) {
    job.reject(err || new Error('Font subset worker terminated'));
  }
  pendingWorkerJobs.clear();
}

function getOrCreateSubsetWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  if (subsetWorker) {
    return subsetWorker;
  }

  try {
    const w = new Worker(new URL('./font-subset.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (event: MessageEvent<{ id: number; ok: boolean; result?: SubsetFontOutput; error?: string }>) => {
      const { id, ok, result, error } = event.data;
      const pending = pendingWorkerJobs.get(id);
      if (!pending) {
        return;
      }
      pendingWorkerJobs.delete(id);
      if (ok && result) {
        pending.resolve(result);
      }
      else {
        pending.reject(new Error(error || '字型子集化失敗'));
      }
    };
    w.onerror = () => {
      resetSubsetWorker(new Error('字型子集化 Worker 發生錯誤'));
    };
    subsetWorker = w;
    return subsetWorker;
  }
  catch {
    return null;
  }
}

/**
 * Subsets TTF/OTF/WOFF/WOFF2 font buffers off-main-thread via Web Worker (with in-thread fallback).
 */
export async function subsetFontBuffer(
  fontBuffer: ArrayBuffer,
  textOrCodePoints: string | Iterable<number>,
  options: { fallbackName?: string; preferredFamily?: string } = {},
): Promise<SubsetFontOutput> {
  const codePoints = typeof textOrCodePoints === 'string'
    ? extractUniqueCodePoints(textOrCodePoints)
    : Array.from(new Set(textOrCodePoints));
  const wasmUrl = resolveWoff2WasmUrl();

  const worker = getOrCreateSubsetWorker();
  if (worker) {
    try {
      return await new Promise<SubsetFontOutput>((resolve, reject) => {
        const id = ++workerJobSeq;
        pendingWorkerJobs.set(id, { resolve, reject });
        // Clone so caller's cached ArrayBuffer is never detached on transfer
        const transferableCopy = fontBuffer.slice(0);
        worker.postMessage(
          {
            id,
            fontBuffer: transferableCopy,
            codePoints,
            wasmUrl,
            fallbackName: options.fallbackName,
            preferredFamily: options.preferredFamily,
          },
          [transferableCopy],
        );
      });
    }
    catch (workerErr) {
      console.warn('Web Worker 子集化失敗，退回主執行緒執行：', workerErr);
    }
  }

  return subsetFontBufferDirect(fontBuffer, codePoints, wasmUrl, options);
}

const memoryFontCache = new Map<string, ArrayBuffer>();

export async function loadBuiltInFontBuffer(fontId: string): Promise<ArrayBuffer> {
  const meta = EPUB_FONT_MAP[fontId];
  if (!meta || !meta.file) {
    throw new Error(`未知的字型: ${fontId}`);
  }

  if (memoryFontCache.has(fontId)) {
    return memoryFontCache.get(fontId)!;
  }

  const cached = await loadCachedBuiltInFont(fontId);
  if (cached && cached.byteLength > 0) {
    memoryFontCache.set(fontId, cached);
    return cached;
  }

  const response = await fetch(meta.file);
  if (!response.ok) {
    throw new Error(`無法載入字型: ${meta.name}`);
  }

  const buffer = await response.arrayBuffer();
  memoryFontCache.set(fontId, buffer);
  void saveCachedBuiltInFont(fontId, buffer);
  return buffer;
}

export function estimateSubsetSize(charCount: number): string {
  const estimatedBytes = charCount * 750;
  if (estimatedBytes < 1024) {
    return `${estimatedBytes} B`;
  }
  if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  }
  return `${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`;
}

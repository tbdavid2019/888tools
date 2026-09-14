import * as ort from 'onnxruntime-web';
import { PaddleOcrService, type OrtInferenceSession, type OrtModule } from 'paddleocr';
import type { OcrProgressEvent, OcrTextItem } from './ocr.types';
import {
  broadcastOcrProgress,
  getExecutionProviders,
  normalizeOcrDictionary,
  type OcrBackend,
} from './ocr.worker-utils';

// 配置 ONNX Runtime wasm 路徑與執行緒
if (typeof ort !== 'undefined' && ort.env?.wasm) {
  const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  ort.env.wasm.numThreads = isIsolated ? Math.min(4, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2) : 1;
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';
}

let paddleOcrService: PaddleOcrService | null = null;
let currentBackend: OcrBackend = 'wasm';
let initPromise: Promise<void> | null = null;
const initRequestIds = new Set<number>();

// 模型檔案路徑（先從本地 /models/ocr/ 載入，若失敗則回退至 HuggingFace CDN）
const MODEL_PATHS = {
  det: [
    '/models/ocr/PP-OCRv5_mobile_det_infer.onnx',
    'https://huggingface.co/x3zvawq/paddleocr-js-onnx/resolve/main/ppocr_v5_mobile/PP-OCRv5_mobile_det_infer.onnx',
  ],
  rec: [
    '/models/ocr/PP-OCRv5_mobile_rec_infer.onnx',
    'https://huggingface.co/x3zvawq/paddleocr-js-onnx/resolve/main/ppocr_v5_mobile/PP-OCRv5_mobile_rec_infer.onnx',
  ],
  dict: [
    '/models/ocr/ppocrv5_dict.txt',
    'https://huggingface.co/x3zvawq/paddleocr-js-onnx/resolve/main/ppocr_v5_mobile/ppocrv5_dict.txt',
  ],
};

/**
 * 具備真實字節進度回報的下載函式 (Streaming Download)
 */
async function fetchWithProgress(
  urls: string[],
  label: string,
  startPct: number,
  endPct: number,
  onProgress: (data: OcrProgressEvent) => void,
  isText = false,
): Promise<ArrayBuffer | string> {
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentLength = Number(res.headers.get('content-length') || 0);

      // 若不支援 Body Stream 或為小字典，直接取得
      if (!res.body || contentLength < 500000 || isText) {
        onProgress({
          stage: 'load-model',
          message: `正在載入 ${label}...`,
          progress: startPct + Math.round((endPct - startPct) * 0.5),
        });

        const data = isText ? await res.text() : await res.arrayBuffer();

        onProgress({
          stage: 'load-model',
          message: `已載入 ${label}`,
          progress: endPct,
        });

        return data;
      }

      // 大型 ONNX 模型走串流讀取，向使用者呈現真實下載進度條與 MB 數
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;

          const ratio = Math.min(1, received / contentLength);
          const currentProgress = Math.round(startPct + ratio * (endPct - startPct));
          const currentMB = (received / 1048576).toFixed(1);
          const totalMB = (contentLength / 1048576).toFixed(1);

          onProgress({
            stage: 'load-model',
            message: `正在下載 ${label} (${currentMB}MB / ${totalMB}MB)...`,
            progress: currentProgress,
            current: received,
            total: contentLength,
          });
        }
      }

      const combined = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      onProgress({
        stage: 'load-model',
        message: `已載入 ${label}`,
        progress: endPct,
        current: received,
        total: contentLength,
      });

      return combined.buffer;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to load ${label}`);
}

/**
 * 檢測 WebGPU，並於失敗時自動降級至 WebAssembly/CPU
 */
async function resolveBackend(): Promise<OcrBackend> {
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        return 'webgpu';
      }
    }
  } catch (err) {
    console.warn('[OCR Worker] WebGPU 初始化失敗，平滑降級至 WebAssembly/CPU:', err);
  }
  return 'wasm';
}

function postInitializationProgress(data: OcrProgressEvent): void {
  broadcastOcrProgress(initRequestIds, data, message => postMessage(message));
}

function createPaddleOcrService(
  detBuffer: ArrayBuffer,
  recBuffer: ArrayBuffer,
  charactersDictionary: string[],
): Promise<PaddleOcrService> {
  const executionProviders = getExecutionProviders(currentBackend);
  const paddleOrt: OrtModule = {
    Tensor: ort.Tensor,
    InferenceSession: {
      create: async (modelBuffer: ArrayBuffer): Promise<OrtInferenceSession> =>
        (await ort.InferenceSession.create(modelBuffer, { executionProviders })) as unknown as OrtInferenceSession,
    },
  };

  return PaddleOcrService.createInstance({
    ort: paddleOrt,
    detection: {
      modelBuffer: detBuffer,
      textPixelThreshold: 0.3,
      boxScoreThreshold: 0.6,
      unclipRatio: 1.6,
    },
    recognition: {
      modelBuffer: recBuffer,
      charactersDictionary,
    },
  });
}

/**
 * 初始化 OCR 服務實例
 */
async function initService(requestId?: number): Promise<void> {
  if (requestId !== undefined) {
    initRequestIds.add(requestId);
  }

  if (paddleOcrService) {
    if (requestId !== undefined) initRequestIds.delete(requestId);
    return;
  }

  if (!initPromise) {
    const initialization = (async () => {
    currentBackend = await resolveBackend();

    postInitializationProgress({
      stage: 'init',
      message: currentBackend === 'webgpu' ? 'WebGPU 硬體加速就緒，準備載入模型...' : 'WebAssembly 引擎就緒，準備載入模型...',
      progress: 10,
    });

    // 依序下載文字檢測 (Det, 4.8MB)、辨識 (Rec, 16.5MB) 與字典 (74KB)，帶真實進度回饋
    const detBuffer = (await fetchWithProgress(
      MODEL_PATHS.det,
      '文字檢測模型 (Det)',
      15,
      35,
      postInitializationProgress,
    )) as ArrayBuffer;

    const recBuffer = (await fetchWithProgress(
      MODEL_PATHS.rec,
      '文字識別模型 (Rec)',
      36,
      75,
      postInitializationProgress,
    )) as ArrayBuffer;

    const dictText = (await fetchWithProgress(
      MODEL_PATHS.dict,
      '中文繁簡字表 (Dict)',
      76,
      82,
      postInitializationProgress,
      true,
    )) as string;

    postInitializationProgress({
      stage: 'init',
      message: '正在編譯神經網絡並建立 PaddleOCR 推論管線...',
      progress: 85,
    });

    const charactersDictionary = normalizeOcrDictionary(dictText);

    try {
      paddleOcrService = await createPaddleOcrService(detBuffer, recBuffer, charactersDictionary);
    } catch (err: any) {
      // 若 WebGPU 建立 Session 失敗，嘗試降級
      if (currentBackend === 'webgpu') {
        console.warn('[OCR Worker] WebGPU 推論初始化異常，切換至 WebAssembly/CPU 備援:', err);
        currentBackend = 'wasm';
        paddleOcrService = await createPaddleOcrService(detBuffer, recBuffer, charactersDictionary);
      } else {
        throw err;
      }
    }

    postMessage({
      type: 'init-complete',
      data: { backend: currentBackend },
    });
    })();

    initPromise = initialization.catch(err => {
      initPromise = null;
      throw err;
    });
  }

  try {
    await initPromise;
  } finally {
    if (requestId !== undefined) initRequestIds.delete(requestId);
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { type, id, data } = event.data;

  // 1. 初始化請求
  if (type === 'init') {
    try {
      await initService(id);
      postMessage({ type: 'init-success', id, backend: currentBackend });
    } catch (err: any) {
      console.error('[OCR Worker] Init failed:', err);
      postMessage({ type: 'init-error', id, error: err.message || String(err) });
    }
    return;
  }

  // 2. 記憶體釋放請求 (SPA 元件卸載時調用)
  if (type === 'destroy') {
    try {
      // Do not release sessions while model initialization is still creating them.
      const pendingInitialization = initPromise;
      await pendingInitialization?.catch(() => {});
      if (paddleOcrService) {
        await paddleOcrService.destroy().catch(() => {});
        paddleOcrService = null;
      }
      initPromise = null;
      initRequestIds.clear();
      postMessage({ type: 'destroy-complete', id });
    } catch (e) {
      console.warn('[OCR Worker] Destroy warning:', e);
    }
    return;
  }

  // 3. 圖像辨識請求
  if (type === 'recognize') {
    const startTime = performance.now();
    try {
      if (!paddleOcrService) {
        await initService(id);
      }

      if (!paddleOcrService) {
        throw new Error('PaddleOcrService could not be initialized');
      }

      const { width, height, pixels } = data;

      postMessage({
        type: 'progress',
        id,
        data: {
          stage: 'det',
          message: '正在進行文字幾何區域檢測 (Det)...',
          progress: 88,
        } as OcrProgressEvent,
      });

      const ocrResults = await paddleOcrService.recognize(
        {
          width,
          height,
          data: new Uint8Array(pixels),
        },
        {
          onProgress(ev: any) {
            if (ev.type === 'rec') {
              postMessage({
                type: 'progress',
                id,
                data: {
                  stage: 'rec',
                  message: `正在辨識文字內容 (Rec)...`,
                  progress: 92,
                } as OcrProgressEvent,
              });
            }
          },
        },
      );

      const items: OcrTextItem[] = (ocrResults || []).map((res: any, idx: number) => ({
        id: `ocr-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        text: res.text || '',
        box: {
          x: Math.round(res.box.x),
          y: Math.round(res.box.y),
          width: Math.round(res.box.width),
          height: Math.round(res.box.height),
          points: res.box.points,
        },
        confidence: Number((res.confidence || 0).toFixed(4)),
      }));

      // 生成完整文字
      const fullText = items.map(it => it.text).join('\n');
      const timeMs = Math.round(performance.now() - startTime);

      postMessage({
        type: 'result',
        id,
        data: {
          text: fullText,
          items,
          timeMs,
          backend: currentBackend,
          imageWidth: width,
          imageHeight: height,
        },
      });
    } catch (err: any) {
      console.error('[OCR Worker] Recognize error:', err);
      postMessage({
        type: 'error',
        id,
        error: err.message || String(err),
      });
    }
  }
};

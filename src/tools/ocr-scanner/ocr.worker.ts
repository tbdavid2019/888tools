import * as ort from 'onnxruntime-web';
import { PaddleOcrService } from 'paddleocr';
import type { OcrProgressEvent, OcrTextItem } from './ocr.types';

// 配置 ONNX Runtime wasm 路徑
if (typeof ort !== 'undefined' && ort.env?.wasm) {
  ort.env.wasm.numThreads = Math.min(4, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2);
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';
}

let paddleOcrService: PaddleOcrService | null = null;
let currentBackend: 'webgpu' | 'wasm' = 'wasm';

// 模型檔案路徑（先從本地 public/models/ocr/ 載入，若失敗則回退至 HuggingFace CDN）
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

async function fetchWithFallback(urls: string[], isText = false): Promise<ArrayBuffer | string> {
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return isText ? await res.text() : await res.arrayBuffer();
      }
      lastError = new Error(`HTTP ${res.status} from ${url}`);
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to fetch from any of: ${urls.join(', ')}`);
}

async function checkWebGpuSupport(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return !!adapter;
    }
  } catch (e) {
    console.warn('[OCR Worker] WebGPU detection error:', e);
  }
  return false;
}

async function initService(): Promise<void> {
  if (paddleOcrService) return;

  const hasWebGpu = await checkWebGpuSupport();
  currentBackend = hasWebGpu ? 'webgpu' : 'wasm';

  postMessage({
    type: 'progress',
    data: {
      stage: 'load-model',
      message: hasWebGpu ? '正在透過 WebGPU 加速載入 PP-OCR 模型...' : '正在透過 WASM 載入 PP-OCR 模型...',
      progress: 20,
    } as OcrProgressEvent,
  });

  const [detBuffer, recBuffer, dictText] = await Promise.all([
    fetchWithFallback(MODEL_PATHS.det) as Promise<ArrayBuffer>,
    fetchWithFallback(MODEL_PATHS.rec) as Promise<ArrayBuffer>,
    fetchWithFallback(MODEL_PATHS.dict, true) as Promise<string>,
  ]);

  postMessage({
    type: 'progress',
    data: {
      stage: 'init',
      message: '正在初始化 PaddleOCR 推論實例...',
      progress: 60,
    } as OcrProgressEvent,
  });

  const charactersDictionary = dictText.trimEnd().split(/\r?\n/);

  paddleOcrService = await PaddleOcrService.createInstance({
    ort,
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

  postMessage({
    type: 'init-complete',
    data: { backend: currentBackend },
  });
}

self.onmessage = async (event: MessageEvent) => {
  const { type, id, data } = event.data;

  if (type === 'init') {
    try {
      await initService();
      postMessage({ type: 'init-success', id, backend: currentBackend });
    } catch (err: any) {
      console.error('[OCR Worker] Init failed:', err);
      postMessage({ type: 'init-error', id, error: err.message || String(err) });
    }
    return;
  }

  if (type === 'recognize') {
    const startTime = performance.now();
    try {
      if (!paddleOcrService) {
        await initService();
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
          message: '正在檢測文字區域 (Det)...',
          progress: 75,
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
                  progress: 85,
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

      // 生成完整文字（按自然排版組合）
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

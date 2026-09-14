import type { OcrProgressEvent, OcrResult } from './ocr.types';

let ocrWorker: Worker | null = null;
let isInitializing = false;
let initPromise: Promise<{ backend: string }> | null = null;

let reqIdCounter = 0;
const pendingRequests = new Map<
  number,
  {
    resolve: (res: any) => void;
    reject: (err: any) => void;
    onProgress?: (e: OcrProgressEvent) => void;
  }
>();

/**
 * 檢查瀏覽器是否支援 WebGPU
 */
export async function checkBrowserWebGpu(): Promise<{ supported: boolean; adapterName?: string }> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator) || !(navigator as any).gpu) {
    return { supported: false };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (adapter) {
      const info = typeof adapter.requestAdapterInfo === 'function' ? await adapter.requestAdapterInfo() : null;
      return {
        supported: true,
        adapterName: info?.description || info?.vendor || 'WebGPU Compatible Adapter',
      };
    }
  } catch (e) {
    console.warn('WebGPU check failed:', e);
  }

  return { supported: false };
}

/**
 * 取得或啟動 OCR Web Worker
 */
function getOrCreateWorker(): Worker {
  if (!ocrWorker) {
    ocrWorker = new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' });

    ocrWorker.onmessage = (event: MessageEvent) => {
      const { type, id, data, error, backend } = event.data;

      if (type === 'progress') {
        if (id && pendingRequests.has(id)) {
          pendingRequests.get(id)!.onProgress?.(data);
        }
        return;
      }

      if (type === 'result' && id && pendingRequests.has(id)) {
        const req = pendingRequests.get(id)!;
        pendingRequests.delete(id);
        req.resolve(data);
        return;
      }

      if (type === 'error' && id && pendingRequests.has(id)) {
        const req = pendingRequests.get(id)!;
        pendingRequests.delete(id);
        req.reject(new Error(error));
        return;
      }

      if (type === 'init-success' && id && pendingRequests.has(id)) {
        const req = pendingRequests.get(id)!;
        pendingRequests.delete(id);
        req.resolve({ backend });
        return;
      }

      if (type === 'init-error' && id && pendingRequests.has(id)) {
        const req = pendingRequests.get(id)!;
        pendingRequests.delete(id);
        req.reject(new Error(error));
        return;
      }

      if (type === 'destroy-complete' && id && pendingRequests.has(id)) {
        const req = pendingRequests.get(id)!;
        pendingRequests.delete(id);
        req.resolve(undefined);
      }
    };

    ocrWorker.onerror = (err) => {
      console.error('[OCR Service] Worker error:', err);
    };
  }

  return ocrWorker;
}

/**
 * 初始化 OCR 引擎模型
 */
export async function initOcrService(onProgress?: (e: OcrProgressEvent) => void): Promise<{ backend: string }> {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const worker = getOrCreateWorker();
    const reqId = ++reqIdCounter;

    pendingRequests.set(reqId, {
      resolve,
      reject,
      onProgress,
    });

    worker.postMessage({ type: 'init', id: reqId });
  });

  return initPromise;
}

/**
 * 終止 Worker 並釋放所有推論記憶體與張量
 */
export async function destroyOcrService(): Promise<void> {
  const worker = ocrWorker;
  if (!worker) return;

  // Detach the worker synchronously so a remounted component cannot reuse it
  // while the asynchronous cleanup handshake is in progress.
  ocrWorker = null;
  initPromise = null;

  const destroyError = new Error('OCR service was destroyed');
  const requests = [...pendingRequests.values()];
  pendingRequests.clear();
  for (const request of requests) {
    request.reject(destroyError);
  }

  const destroyReqId = ++reqIdCounter;
  try {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 300);
      pendingRequests.set(destroyReqId, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: () => {
          clearTimeout(timeout);
          resolve();
        },
      });
      worker.postMessage({ type: 'destroy', id: destroyReqId });
    });
  } catch {
    // ignore
  } finally {
    pendingRequests.delete(destroyReqId);
    worker.terminate();
  }
}

/**
 * 從 File、Blob 或 Data URL 提取像素陣列
 */
export async function extractImageData(source: File | Blob | string): Promise<{
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  dataUrl: string;
}> {
  let dataUrl = '';

  if (typeof source === 'string') {
    dataUrl = source;
  } else {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  }

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot get 2d context for image processing');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    pixels: imageData.data,
    dataUrl,
  };
}

/**
 * 執行 OCR 文字與幾何辨識
 */
export async function recognizeImage(
  source: File | Blob | string,
  onProgress?: (e: OcrProgressEvent) => void,
): Promise<OcrResult> {
  onProgress?.({
    stage: 'init',
    message: '正在解碼圖像像素與計算幾何尺寸...',
    progress: 10,
  });

  const { width, height, pixels, dataUrl } = await extractImageData(source);

  const worker = getOrCreateWorker();
  const reqId = ++reqIdCounter;

  return new Promise((resolve, reject) => {
    pendingRequests.set(reqId, {
      resolve,
      reject,
      onProgress,
    });

    // 將 pixel buffer 傳送至 Worker (Transferable ArrayBuffer)
    worker.postMessage(
      {
        type: 'recognize',
        id: reqId,
        data: {
          width,
          height,
          pixels: pixels.buffer,
        },
      },
      [pixels.buffer],
    );
  });
}

/**
 * 動態生成示範用測試圖片（高對比度中文文字與二維結構表格）
 */
export function generateDemoSample(type: 'text' | 'table'): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (type === 'table') {
    // 繪製一個清晰的 4x4 二維財務報表樣例
    canvas.width = 640;
    canvas.height = 360;

    // 白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 標題
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('2026年度 產品銷售與利潤統計表', 130, 42);

    const startX = 40;
    const startY = 70;
    const colWidths = [120, 140, 140, 160];
    const rowHeight = 55;

    const data = [
      ['季度', '產品線', '銷售額 (萬)', '利潤率 (%)'],
      ['第一季 Q1', '雲端運算', '1,280.50', '32.4%'],
      ['第二季 Q2', '智慧裝置', '2,460.00', '28.6%'],
      ['第三季 Q3', '軟體授權', '3,150.80', '41.2%'],
      ['第四季 Q4', '人工智慧', '5,890.20', '48.9%'],
    ];

    // 繪製表頭背景
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight);

    // 繪製格線與文字
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.font = '16px sans-serif';

    for (let r = 0; r < data.length; r++) {
      let currentX = startX;
      const currentY = startY + r * rowHeight;

      for (let c = 0; c < data[r].length; c++) {
        const w = colWidths[c];

        // 單元格邊框
        ctx.strokeRect(currentX, currentY, w, rowHeight);

        // 文字
        ctx.fillStyle = r === 0 ? '#0f172a' : '#334155';
        ctx.font = r === 0 ? 'bold 16px sans-serif' : '15px sans-serif';
        ctx.fillText(data[r][c], currentX + 16, currentY + 34);

        currentX += w;
      }
    }
  } else {
    // 繪製一段繁簡混合中文與英文說明的清晰段落
    canvas.width = 640;
    canvas.height = 360;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('智慧光學字元辨識 (PP-OCRv6 + WebGPU)', 40, 50);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#334155';
    const lines = [
      '這是一個完全運行在瀏覽器本地的 AI 文字識別系統。',
      '無需上傳至任何雲端伺服器，保障最高等級的數據與隱私安全。',
      '支援項目包括：',
      '1. 繁體中文與簡體中文精準文字檢測與辨識 (PP-OCR Det & Rec)',
      '2. 二維幾何空間重構演算法，自動識別欄列並還原表格結構',
      '3. 一鍵匯出為 Excel (.xlsx)、Markdown 與 CSV 格式',
      '4. 支援剪貼簿截圖直接貼上 (Ctrl+V) 即時處理。',
    ];

    let y = 100;
    for (const line of lines) {
      ctx.fillText(line, 40, y);
      y += 35;
    }
  }

  return canvas.toDataURL('image/png');
}

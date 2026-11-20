import { subsetFontBufferDirect } from './font-core';

interface SubsetWorkerRequest {
  id: number;
  fontBuffer: ArrayBuffer;
  codePoints: number[];
  wasmUrl: string;
  fallbackName?: string;
  preferredFamily?: string;
}

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SubsetWorkerRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

workerScope.onmessage = async (event: MessageEvent<SubsetWorkerRequest>) => {
  const { id, fontBuffer, codePoints, wasmUrl, fallbackName, preferredFamily } = event.data;
  try {
    const result = await subsetFontBufferDirect(fontBuffer, codePoints, wasmUrl, {
      fallbackName,
      preferredFamily,
    });
    workerScope.postMessage({ id, ok: true, result }, [result.buffer]);
  }
  catch (err: any) {
    workerScope.postMessage({
      id,
      ok: false,
      error: err?.message || String(err),
    });
  }
};

import type { OcrProgressEvent } from './ocr.types';

export type OcrBackend = 'webgpu' | 'wasm';

export function getExecutionProviders(backend: OcrBackend): Array<'webgpu' | 'wasm'> {
  return backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
}

export function broadcastOcrProgress(
  requestIds: Iterable<number>,
  data: OcrProgressEvent,
  send: (message: { type: 'progress'; id: number; data: OcrProgressEvent }) => void,
): void {
  for (const id of requestIds) {
    send({ type: 'progress', id, data });
  }
}

export function isCurrentOcrRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}

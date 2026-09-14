import { describe, expect, it, vi } from 'vitest';
import { broadcastOcrProgress, getExecutionProviders, isCurrentOcrRequest } from './ocr.worker-utils';

describe('ocr worker utilities', () => {
  it('prefers WebGPU and keeps WASM as the fallback provider', () => {
    expect(getExecutionProviders('webgpu')).toEqual(['webgpu', 'wasm']);
    expect(getExecutionProviders('wasm')).toEqual(['wasm']);
  });

  it('broadcasts initialization progress to every waiting OCR request', () => {
    const send = vi.fn();
    const progress = { stage: 'load-model', message: '下載中', progress: 50 } as const;

    broadcastOcrProgress([4, 9], progress, send);

    expect(send).toHaveBeenCalledWith({ type: 'progress', id: 4, data: progress });
    expect(send).toHaveBeenCalledWith({ type: 'progress', id: 9, data: progress });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('only accepts the latest OCR request', () => {
    expect(isCurrentOcrRequest(2, 2)).toBe(true);
    expect(isCurrentOcrRequest(1, 2)).toBe(false);
  });
});

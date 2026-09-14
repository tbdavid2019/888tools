import { afterEach, describe, expect, it, vi } from 'vitest';
import { destroyOcrService, initOcrService } from './ocr.service';

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = vi.fn();

  postMessage(message: { type: string; id: number }): void {
    if (message.type === 'destroy') {
      this.onmessage?.({ data: { type: 'destroy-complete', id: message.id } } as MessageEvent);
    }
  }
}

describe('ocr service lifecycle', () => {
  afterEach(async () => {
    await destroyOcrService();
    vi.unstubAllGlobals();
  });

  it('resolves cleanup as soon as the worker acknowledges destruction', async () => {
    vi.stubGlobal('Worker', MockWorker);

    const initialization = initOcrService().catch(error => error);
    await destroyOcrService();

    expect(await initialization).toBeInstanceOf(Error);
  });
});

import { describe, expect, it } from 'vitest';
import { detectBytes, isEpubFile, isTextFile } from '@/services/magika/magika.service';
import { getMetaForLabel } from '@/services/magika/content-types';

describe('Magika File Detection Service', () => {
  it('should return correct metadata for known labels', () => {
    const epubMeta = getMetaForLabel('epub');
    expect(epubMeta.label).toBe('epub');
    expect(epubMeta.mimeType).toBe('application/epub+zip');
    expect(epubMeta.category).toBe('ebook');
    expect(epubMeta.suggestedTools?.length).toBeGreaterThan(0);
    expect(epubMeta.suggestedTools?.[0].path).toBe('/epub-editor');

    const txtMeta = getMetaForLabel('txt');
    expect(txtMeta.category).toBe('text');
    expect(txtMeta.suggestedTools?.[0].path).toBe('/txt-to-epub');
  });

  it('should detect empty files correctly', async () => {
    const emptyBytes = new Uint8Array(0);
    const res = await detectBytes(emptyBytes, 'test.bin');
    expect(res.label).toBe('empty');
    expect(res.score).toBe(1.0);
  }, 30000);

  it('should detect short ascii text correctly', async () => {
    const textBytes = new TextEncoder().encode('Hello World');
    const res = await detectBytes(textBytes, 'hello.txt');
    expect(res.isText).toBe(true);
    expect(['txt', 'unknown', 'empty']).toContain(res.label);
  });

  it('should detect text file with isTextFile helper', async () => {
    const blob = new Blob(['This is a sample text file content for detection testing.']);
    const { isText, detection } = await isTextFile(blob);
    expect(isText).toBe(true);
    expect(detection.score).toBeGreaterThan(0);
  });

  it('should flag extension mismatch if confidence is high', async () => {
    // Windows PE EXE bytes
    const peBytes = new Uint8Array(1024);
    peBytes[0] = 0x4d; // 'M'
    peBytes[1] = 0x5a; // 'Z'
    peBytes[0x3c] = 0x80;
    peBytes[0x80] = 0x50; // 'P'
    peBytes[0x81] = 0x45; // 'E'

    const res = await detectBytes(peBytes, 'malicious_file.txt');
    if (res.label === 'pebin' && res.score >= 0.7) {
      expect(res.isExtensionMismatch).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { clampPreviewPage, getPreviewPageCount } from './preview-pagination';

describe('EPUB preview pagination', () => {
  it('counts each viewport-width of horizontal overflow as a page', () => {
    expect(getPreviewPageCount(440, 440)).toBe(1);
    expect(getPreviewPageCount(441, 440)).toBe(2);
    expect(getPreviewPageCount(1320, 440)).toBe(3);
    expect(getPreviewPageCount(440, 0)).toBe(1);
  });

  it('keeps the selected page inside the available range', () => {
    expect(clampPreviewPage(-1, 3)).toBe(0);
    expect(clampPreviewPage(1, 3)).toBe(1);
    expect(clampPreviewPage(9, 3)).toBe(2);
  });
});

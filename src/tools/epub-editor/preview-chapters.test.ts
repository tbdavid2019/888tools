import { describe, expect, it } from 'vitest';
import { getPreviewChapterIndex, parsePreviewChapter } from './preview-chapters';

describe('EPUB preview chapters', () => {
  it('extracts an entire chapter instead of a truncated sample', () => {
    const result = parsePreviewChapter(`
      <html><body>
        <h1>第一章</h1>
        <p>${'甲'.repeat(700)}</p>
        <p>第二段</p>
      </body></html>
    `, '備用章名');

    expect(result.title).toBe('第一章');
    expect(result.text).toHaveLength(704);
  });

  it('moves between available chapter previews without leaving their range', () => {
    expect(getPreviewChapterIndex(0, -1, 3)).toBe(0);
    expect(getPreviewChapterIndex(0, 1, 3)).toBe(1);
    expect(getPreviewChapterIndex(2, 1, 3)).toBe(2);
  });
});

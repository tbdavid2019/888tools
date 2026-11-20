// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getPreviewChapterIndex, parsePreviewChapter } from './preview-chapters';

describe('ePUB preview chapters', () => {
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

  it('extracts div-based paragraphs, decodes title entities without double-unescaping, and ignores pre tags confusion', () => {
    const result = parsePreviewChapter(`
      <html><body>
        <h1>第1章 &amp;lt;序幕&amp;gt;</h1>
        <div>第一段文字</div>
        <div><p>第二段文字</p></div>
        <pre>程式碼區塊</pre>
      </body></html>
    `, '備用章名');

    expect(result.title).toBe('第1章 &lt;序幕&gt;');
    expect(result.text).toContain('第一段文字');
    expect(result.text).toContain('第二段文字');
  });

  it('moves between available chapter previews without leaving their range', () => {
    expect(getPreviewChapterIndex(0, -1, 3)).toBe(0);
    expect(getPreviewChapterIndex(0, 1, 3)).toBe(1);
    expect(getPreviewChapterIndex(2, 1, 3)).toBe(2);
  });
});

// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderChapterPreviewSrcdoc } from './preview-renderer';

describe('preview-renderer', () => {
  it('renders sanitized chapter HTML with resolved Blob images, OpenCC text conversion, and style overrides', async () => {
    const zip = new JSZip();
    zip.file('OEBPS/Styles/book.css', 'p { color: #333; }');
    zip.file('OEBPS/Images/pic.png', new Uint8Array([0x89, 0x50, 0x4E, 0x47]));
    zip.file('OEBPS/Text/ch1.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><link rel="stylesheet" type="text/css" href="../Styles/book.css"/></head>
<body>
  <h1>软件测试</h1>
  <p>点击<script>alert("xss")</script>查看图片。</p>
  <img src="../Images/pic.png" onerror="alert(1)" alt="软件插图"/>
</body>
</html>`);

    const rendered = await renderChapterPreviewSrcdoc(zip, 'OEBPS/Text/ch1.xhtml', {
      writingMode: 'vertical',
      fontSize: 'medium',
      lineHeight: 'normal',
      textIndent: 'two',
      fontFamily: 'default',
      pageMargin: 'compact',
      optimizeVerticalLayout: true,
      convertMode: 'twp',
      convertPunctuation: true,
    });

    expect(rendered.createdBlobUrls.length).toBe(1);
    expect(rendered.srcdoc).toContain('軟體測試');
    expect(rendered.srcdoc).toContain(`src="${rendered.createdBlobUrls[0]}"`);
    expect(rendered.srcdoc).toContain('alt="軟體插圖"');
    expect(rendered.srcdoc).toContain('writing-mode: vertical-rl !important;');
    expect(rendered.srcdoc).toContain('p { color: #333; }');
    expect(rendered.srcdoc).not.toContain('<script');
    expect(rendered.srcdoc).not.toContain('onerror=');

    for (const url of rendered.createdBlobUrls) {
      URL.revokeObjectURL(url);
    }
  });
});

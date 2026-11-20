// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { generateEpub } from './epubGenerator';

describe('txt-to-epub epubGenerator', () => {
  it('respects convertToTraditional=false instead of unconditionally forcing s2t conversion', async () => {
    const simplifiedBlob = await generateEpub({
      title: '软件测试',
      author: '作者',
      chapters: [
        { title: '第一章 发现', content: '这是软件测试内容。' },
      ],
      cover: null,
      convertToTraditional: false,
      writingMode: 'horizontal',
      returnBlob: true,
    });

    expect(simplifiedBlob).toBeDefined();
    const zip = await JSZip.loadAsync(await simplifiedBlob!.arrayBuffer());
    const opf = await zip.files['OEBPS/content.opf'].async('string');
    const ch1 = await zip.files['OEBPS/chapter1.xhtml'].async('string');

    expect(opf).toContain('<dc:title>软件测试</dc:title>');
    expect(ch1).toContain('第一章 发现');
    expect(ch1).toContain('这是软件测试内容。');
  });

  it('converts Simplified Chinese to Traditional Chinese when convertToTraditional=true', async () => {
    const traditionalBlob = await generateEpub({
      title: '软件测试',
      author: '作者',
      chapters: [
        { title: '第一章 发现', content: '这是软件测试内容。' },
      ],
      cover: null,
      convertToTraditional: true,
      writingMode: 'vertical',
      returnBlob: true,
    });

    expect(traditionalBlob).toBeDefined();
    const zip = await JSZip.loadAsync(await traditionalBlob!.arrayBuffer());
    const opf = await zip.files['OEBPS/content.opf'].async('string');
    const ch1 = await zip.files['OEBPS/chapter1.xhtml'].async('string');

    expect(opf).toContain('<dc:title>軟體測試</dc:title>');
    expect(ch1).toContain('第一章 發現');
    expect(ch1).toContain('這是軟體測試內容。');
  });

  it('writes explicit page-progression-direction="ltr" and primary-writing-mode="vertical-rl" when overridden in vertical mode', async () => {
    const blob = await generateEpub({
      title: 'Kindle 直排測試',
      author: '作者',
      chapters: [
        { title: '第一章', content: '測試內文。' },
      ],
      cover: null,
      convertToTraditional: true,
      writingMode: 'vertical',
      pageProgressionDirection: 'ltr',
      returnBlob: true,
    });

    expect(blob).toBeDefined();
    const zip = await JSZip.loadAsync(await blob!.arrayBuffer());
    const opf = await zip.files['OEBPS/content.opf'].async('string');
    const ch1 = await zip.files['OEBPS/chapter1.xhtml'].async('string');
    const nav = await zip.files['OEBPS/nav.xhtml'].async('string');

    expect(opf).toContain('xmlns:dcterms="http://purl.org/dc/terms/"');
    expect(opf).toContain('<meta name="primary-writing-mode" content="vertical-rl"/>');
    expect(opf).toContain('<spine toc="ncx" page-progression-direction="ltr">');
    expect(ch1).toContain('xml:lang="zh-TW" lang="zh-TW"');
    expect(nav).toContain('xml:lang="zh-TW" lang="zh-TW"');
  });

  it('places mimetype first with STORE compression and preserves woff2 metadata when embedding gen-jyuu in full mode', async () => {
    const woff2Path = path.resolve(process.cwd(), 'public/fonts/GenJyuuGothic-Medium.woff2');
    if (!fs.existsSync(woff2Path)) {
      return;
    }

    const fontBytes = fs.readFileSync(woff2Path);
    const origFetch = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('GenJyuuGothic-Medium.woff2')) {
        return new Response(fontBytes, { status: 200 });
      }
      return origFetch(input, init);
    });

    try {
      const blob = await generateEpub({
        title: '測試書',
        author: '作者',
        chapters: [
          { title: '第一章', content: '測試內文' },
        ],
        cover: null,
        convertToTraditional: true,
        writingMode: 'vertical',
        fontFamily: 'gen-jyuu',
        embedFont: true,
        embedFontMode: 'full',
        returnBlob: true,
      });

      const outBytes = new Uint8Array(await blob!.arrayBuffer());
      const compressionMethod = outBytes[8] | (outBytes[9] << 8);
      const nameLen = outBytes[26] | (outBytes[27] << 8);
      const firstEntryName = new TextDecoder().decode(outBytes.slice(30, 30 + nameLen));
      expect(firstEntryName).toBe('mimetype');
      expect(compressionMethod).toBe(0);

      const zip = await JSZip.loadAsync(outBytes);
      const opf = await zip.files['OEBPS/content.opf'].async('string');
      const css = await zip.files['OEBPS/styles/main.css'].async('string');
      expect(zip.files['OEBPS/fonts/gen-jyuu-full.woff2']).toBeDefined();
      expect(opf).toContain('media-type="font/woff2"');
      expect(css).toContain('format("woff2")');
    }
    finally {
      vi.unstubAllGlobals();
    }
  });
});

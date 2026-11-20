// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { subsetFontBuffer } from '@/services/epub/fonts';
import { loadEpubArchive, processEpubPackage } from './epub-processor';

async function createSampleEpubBuffer(options?: { simplifiedHref?: boolean; epub2Cover?: boolean }): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const chHref = options?.simplifiedHref ? 'Text/软件说明.xhtml' : 'Text/ch1.xhtml';
  const imgHref = options?.simplifiedHref ? 'Images/软件图.jpg' : 'Images/cover.jpg';
  const coverMeta = options?.epub2Cover
    ? '<meta name="cover" content="legacy-cover"/>'
    : '<meta name="cover" content="cover-img"/>';
  const coverItem = options?.epub2Cover
    ? `<item id="legacy-cover" href="${imgHref}" media-type="image/jpeg"/>`
    : `<item id="cover-img" href="${imgHref}" media-type="image/jpeg" properties="cover-image"/>`;

  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:1234</dc:identifier>
    <dc:title>原始软件书名</dc:title>
    <dc:creator>原作者</dc:creator>
    ${coverMeta}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="Styles/main.css" media-type="text/css"/>
    ${coverItem}
    <item id="ch1" href="${chHref}" media-type="application/xhtml+xml"/>
    <item id="ch2" href="Text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch2"/>
    <itemref idref="ch1"/>
  </spine>
</package>`);

  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <docTitle><text>原始软件书名</text></docTitle>
  <navMap>
    <navPoint id="np2"><navLabel><text>第二章</text></navLabel><content src="Text/ch2.xhtml"/></navPoint>
    <navPoint id="np1"><navLabel><text>软件说明</text></navLabel><content src="${chHref}"/></navPoint>
  </navMap>
</ncx>`);

  zip.file('OEBPS/Styles/main.css', 'body { color: #111; }');
  zip.file(`OEBPS/${imgHref}`, new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]));
  zip.file(`OEBPS/${chHref}`, `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>软件说明</title><link rel="stylesheet" type="text/css" href="../Styles/main.css"/></head>
<body>
  <h1 id="软件标题">“软件”说明</h1>
  <p>这个软件很好用，请看插图。</p>
  <img src="../${imgHref}" alt="软件示意图"/>
  <pre><code>const software = "软件";</code></pre>
</body>
</html>`);
  zip.file('OEBPS/Text/ch2.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter 2</title></head><body><p>第二章正文</p></body></html>`);

  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('epub-processor', () => {
  it('writes edited metadata back to OPF and NCX, preserves attribute paths during OpenCC, and orders spine chapters', async () => {
    const raw = await createSampleEpubBuffer({ simplifiedHref: true, epub2Cover: true });
    const parsed = await loadEpubArchive(raw, true);

    // Spine order in sample OPF is ch2 first, then ch1
    expect(parsed.previewChapters[0].path).toBe('OEBPS/Text/ch2.xhtml');
    expect(parsed.previewChapters[1].path).toBe('OEBPS/Text/软件说明.xhtml');

    const result = await processEpubPackage({
      sourceZip: parsed.zip,
      bookTitle: '自訂新書名',
      bookAuthor: '新作者名',
      originalTitle: parsed.title,
      originalAuthor: parsed.author,
      originalFileName: 'test.epub',
      settings: {
        convertMode: 'twp',
        convertPunctuation: true,
        writingMode: 'vertical',
        fontFamily: 'default',
        fontEmbedMode: 'none',
        fontSize: 'medium',
        lineHeight: 'normal',
        textIndent: 'two',
        pageMargin: 'compact',
        optimizeVerticalLayout: true,
        fixKindleCompatibility: true,
      },
      coverAction: 'remove',
      originalCoverPath: parsed.cover?.path,
    });

    const outBytes = new Uint8Array(await result.blob.arrayBuffer());
    // Verify OCF requirement: first ZIP entry must be `mimetype` stored uncompressed (method 0)
    expect(outBytes[0]).toBe(0x50); // P
    expect(outBytes[1]).toBe(0x4B); // K
    const compressionMethod = outBytes[8] | (outBytes[9] << 8);
    const nameLen = outBytes[26] | (outBytes[27] << 8);
    const firstEntryName = new TextDecoder().decode(outBytes.slice(30, 30 + nameLen));
    expect(firstEntryName).toBe('mimetype');
    expect(compressionMethod).toBe(0);

    const outZip = await JSZip.loadAsync(outBytes);
    const opf = await outZip.files['OEBPS/content.opf'].async('string');
    const ncx = await outZip.files['OEBPS/toc.ncx'].async('string');
    const ch1 = await outZip.files['OEBPS/Text/软件说明.xhtml'].async('string');

    // Metadata updated
    expect(opf).toContain('<dc:title>自訂新書名</dc:title>');
    expect(opf).toContain('<dc:creator>新作者名</dc:creator>');
    expect(ncx).toContain('<text>自訂新書名</text>');
    expect(opf).toContain('page-progression-direction="rtl"');

    // Cover removed completely without dangling manifest item
    expect(outZip.files['OEBPS/Images/软件图.jpg']).toBeUndefined();
    expect(opf).not.toContain('legacy-cover');
    expect(opf).not.toContain('name="cover"');

    // OpenCC converted readable text & alt, but did NOT break src/id/<code>
    expect(ch1).toContain('「軟體」說明');
    expect(ch1).toContain('這個軟體很好用');
    expect(ch1).toContain('alt="軟體示意圖"');
    expect(ch1).toContain('src="../Images/软件图.jpg"');
    expect(ch1).toContain('id="软件标题"');
    expect(ch1).toContain('const software = "软件";');
  });

  it('keeps sourceZip clean across repeated exports without stacking styles or locking OpenCC', async () => {
    const raw = await createSampleEpubBuffer();
    const parsed = await loadEpubArchive(raw, false);

    // Export 1: twp + vertical
    await processEpubPackage({
      sourceZip: parsed.zip,
      bookTitle: parsed.title,
      bookAuthor: parsed.author,
      originalTitle: parsed.title,
      originalAuthor: parsed.author,
      originalFileName: 'book.epub',
      settings: {
        convertMode: 'twp',
        convertPunctuation: true,
        writingMode: 'vertical',
        fontFamily: 'default',
        fontEmbedMode: 'none',
        fontSize: 'medium',
        lineHeight: 'normal',
        textIndent: 'two',
        pageMargin: 'compact',
        optimizeVerticalLayout: true,
        fixKindleCompatibility: false,
      },
      coverAction: 'keep',
    });

    // Export 2: off + horizontal on the SAME parsed.zip
    const second = await processEpubPackage({
      sourceZip: parsed.zip,
      bookTitle: parsed.title,
      bookAuthor: parsed.author,
      originalTitle: parsed.title,
      originalAuthor: parsed.author,
      originalFileName: 'book.epub',
      settings: {
        convertMode: 'off',
        convertPunctuation: false,
        writingMode: 'horizontal',
        fontFamily: 'default',
        fontEmbedMode: 'none',
        fontSize: 'medium',
        lineHeight: 'normal',
        textIndent: 'two',
        pageMargin: 'normal',
        optimizeVerticalLayout: true,
        fixKindleCompatibility: false,
      },
      coverAction: 'keep',
    });

    const outZip2 = await JSZip.loadAsync(await second.blob.arrayBuffer());
    const ch1 = await outZip2.files['OEBPS/Text/ch1.xhtml'].async('string');
    const css = await outZip2.files['OEBPS/Styles/main.css'].async('string');

    expect(ch1).toContain('这个软件很好用');
    expect(ch1).not.toContain('這個軟體');
    expect(css.match(/888TOOLS EPUB OVERRIDES START/g)?.length).toBe(1);
    expect(css).toContain('writing-mode: horizontal-tb !important;');
    expect(css).not.toContain('writing-mode: vertical-rl');
  });

  it('subsets local OTF/TTF/WOFF2 fonts including non-BMP characters and outputs valid TTF', async () => {
    const ttfPath = path.resolve(process.cwd(), 'public/fonts/jf-openhuninn.ttf');
    if (fs.existsSync(ttfPath)) {
      const buf = fs.readFileSync(ttfPath);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const out = await subsetFontBuffer(ab, '繁體中文測試𠮷', { preferredFamily: 'jf 粉圓' });

      expect(out.ext).toBe('ttf');
      expect(out.mime).toBe('font/ttf');
      expect(out.format).toBe('truetype');
      expect(out.buffer.byteLength).toBeGreaterThan(500);
      expect(out.buffer.byteLength).toBeLessThan(ab.byteLength);
    }

    const woff2Path = path.resolve(process.cwd(), 'public/fonts/GenJyuuGothic-Medium.woff2');
    const wasmPath = path.resolve(process.cwd(), 'public/wasm/woff2.wasm');
    if (fs.existsSync(woff2Path) && fs.existsSync(wasmPath)) {
      const wasmBytes = fs.readFileSync(wasmPath);
      const origFetch = globalThis.fetch;
      vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('woff2.wasm')) {
          return new Response(wasmBytes, {
            status: 200,
            headers: { 'content-type': 'application/wasm' },
          });
        }
        return origFetch(input, init);
      });
      try {
        const buf = fs.readFileSync(woff2Path);
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const out = await subsetFontBuffer(ab, '源柔黑體測試', { preferredFamily: '源柔黑體' });

        expect(out.ext).toBe('ttf');
        expect(out.mime).toBe('font/ttf');
        expect(out.buffer.byteLength).toBeGreaterThan(500);
        expect(out.buffer.byteLength).toBeLessThan(ab.byteLength);
      }
      finally {
        vi.unstubAllGlobals();
      }
    }
  });
});

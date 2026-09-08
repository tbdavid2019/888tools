import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import fs from 'fs';
import {
  normalizeZipTimestamps,
  repairKindleEpub,
  resolveRelativePath,
} from './kindle-fixer';

describe('kindle-fixer', () => {
  describe('resolveRelativePath', () => {
    it('resolves simple child paths', () => {
      expect(resolveRelativePath('EPUB/', 'xhtml/ch1.xhtml')).toBe('EPUB/xhtml/ch1.xhtml');
      expect(resolveRelativePath('', 'xhtml/ch1.xhtml')).toBe('xhtml/ch1.xhtml');
    });

    it('resolves parent directory dots', () => {
      expect(resolveRelativePath('EPUB/xhtml/', '../images/c.jpg')).toBe('EPUB/images/c.jpg');
      expect(resolveRelativePath('OEBPS/Text/', '../../images/c.jpg')).toBe('images/c.jpg');
    });
  });

  describe('normalizeZipTimestamps', () => {
    it('normalizes corrupted or future overflow timestamps', () => {
      const zip = new JSZip();
      zip.file('file1.txt', 'hello', { date: new Date('2044-04-01T07:03:02.000Z') });
      zip.file('file2.txt', 'world', { date: new Date('2024-01-01T12:00:00.000Z') });

      const count = normalizeZipTimestamps(zip);
      expect(count).toBe(1);
      expect(zip.files['file1.txt'].date.getFullYear()).toBeLessThanOrEqual(2035);
      expect(zip.files['file2.txt'].date.getFullYear()).toBe(2024);
    });
  });

  describe('repairKindleEpub', () => {
    it('repairs extensionless chapters, trailing dots in OPF, and dead links in NCX', async () => {
      const zip = new JSZip();

      // Container
      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

      // OPF with trailing dot in nav. and extensionless Chapter1
      zip.file('EPUB/package.opf', `<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="nav." href="nav." media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="xhtml/Chapter1" media-type="application/xhtml+xml"/>
    <item id="ch2" href="xhtml/Chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav."/>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`);

      // Extensionless files in zip
      zip.file('EPUB/nav', `<!DOCTYPE html>
<html>
  <head><title>TOC</title></head>
  <body>
    <nav epub:type="toc">
      <ol>
        <li><a href="xhtml/Chapter1">Chapter 1</a></li>
        <li><a href="xhtml/Chapter2.xhtml">Chapter 2</a></li>
        <li><a href="xhtml/DeadLink.xhtml">Dead Link</a></li>
      </ol>
    </nav>
  </body>
</html>`);

      zip.file('EPUB/xhtml/Chapter1', `<div><p>Chapter 1 content</p></div>`);
      zip.file('EPUB/xhtml/Chapter2.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html><body><p>Chapter 2</p></body></html>`);

      // NCX with dead link to Copyright.xhtml
      zip.file('EPUB/toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <navMap>
    <navPoint id="navPoint-1">
      <navLabel><text>Copyright</text></navLabel>
      <content src="xhtml/Copyright.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-2">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="xhtml/Chapter1"/>
    </navPoint>
    <navPoint id="navPoint-3">
      <navLabel><text>Chapter 2</text></navLabel>
      <content src="xhtml/Chapter2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

      // Image with bad date
      zip.file('EPUB/images/cover.jpg', 'fake-image-bytes', {
        date: new Date('2044-01-01T00:00:00Z'),
      });

      const report = await repairKindleEpub(zip);

      expect(report.hasRepairs).toBe(true);
      expect(report.normalizedTimestampsCount).toBe(1);
      expect(report.fixedExtensionlessFiles).toContain('EPUB/nav');
      expect(report.fixedExtensionlessFiles).toContain('EPUB/xhtml/Chapter1');

      // Check files renamed
      expect(zip.files['EPUB/nav.xhtml']).toBeDefined();
      expect(zip.files['EPUB/nav']).toBeUndefined();
      expect(zip.files['EPUB/xhtml/Chapter1.xhtml']).toBeDefined();
      expect(zip.files['EPUB/xhtml/Chapter1']).toBeUndefined();

      // Check OPF updated
      const opf = await zip.files['EPUB/package.opf'].async('string');
      expect(opf).toContain('href="nav.xhtml"');
      expect(opf).toContain('id="nav"');
      expect(opf).toContain('idref="nav"');
      expect(opf).toContain('href="xhtml/Chapter1.xhtml"');

      // Check NCX updated and dead link removed
      const ncx = await zip.files['EPUB/toc.ncx'].async('string');
      expect(ncx).not.toContain('xhtml/Copyright.xhtml');
      expect(ncx).not.toContain('navPoint-1');
      expect(ncx).toContain('src="xhtml/Chapter1.xhtml"');
      expect(ncx).toContain('src="xhtml/Chapter2.xhtml"');

      // Check NAV document updated and dead link removed
      const nav = await zip.files['EPUB/nav.xhtml'].async('string');
      expect(nav).toContain('href="xhtml/Chapter1.xhtml"');
      expect(nav).not.toContain('xhtml/DeadLink.xhtml');

      // Check XML declaration added to Chapter1
      const ch1 = await zip.files['EPUB/xhtml/Chapter1.xhtml'].async('string');
      expect(ch1.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    });

    it('successfully processes real-world user book if present', async () => {
      const realPath = '/Users/david/Downloads/数字永生计划Gray Egan.epub';
      if (!fs.existsSync(realPath)) return;

      const buf = fs.readFileSync(realPath);
      const zip = await JSZip.loadAsync(buf);

      const report = await repairKindleEpub(zip);
      expect(report.hasRepairs).toBe(true);
      expect(report.fixedExtensionlessFiles.length).toBeGreaterThanOrEqual(7);
      expect(report.normalizedTimestampsCount).toBeGreaterThanOrEqual(43);
      expect(report.fixedDeadLinks).toContain('ncx:xhtml/Copyright.xhtml');

      // Ensure no manifest target is missing
      const opfPath = 'EPUB/package.opf';
      const opf = await zip.files[opfPath].async('string');
      const itemHrefs = Array.from(opf.matchAll(/<item\b[^>]*href=["']([^"']+)["']/gi)).map(m => m[1]);
      for (const href of itemHrefs) {
        expect(zip.files['EPUB/' + href]).toBeDefined();
      }

      // Ensure no NCX targets are missing
      const ncx = await zip.files['EPUB/toc.ncx'].async('string');
      const ncxSrcs = Array.from(ncx.matchAll(/<content\b[^>]*src=["']([^"']+)["']/gi)).map(m => m[1]);
      for (const src of ncxSrcs) {
        const filePart = src.split('#')[0];
        expect(zip.files['EPUB/' + filePart]).toBeDefined();
      }
    });
  });
});

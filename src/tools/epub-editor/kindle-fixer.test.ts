import JSZip from 'jszip';
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  normalizeZipTimestamps,
  repairKindleEpub,
  resolveRelativePath,
} from './kindle-fixer';

describe('kindle-fixer', () => {
  describe('resolveRelativePath', () => {
    it('resolves simple child paths, URI encoding, and root-level dot segments', () => {
      expect(resolveRelativePath('EPUB/', 'xhtml/ch1.xhtml')).toBe('EPUB/xhtml/ch1.xhtml');
      expect(resolveRelativePath('', 'xhtml/ch1.xhtml')).toBe('xhtml/ch1.xhtml');
      expect(resolveRelativePath('', './xhtml/ch1.xhtml')).toBe('xhtml/ch1.xhtml');
      expect(resolveRelativePath('', 'foo/../xhtml/ch1.xhtml')).toBe('xhtml/ch1.xhtml');
      expect(resolveRelativePath('EPUB/', 'xhtml/Chapter%201.xhtml')).toBe('EPUB/xhtml/Chapter 1.xhtml');
    });

    it('resolves parent directory dots', () => {
      expect(resolveRelativePath('EPUB/xhtml/', '../images/c.jpg')).toBe('EPUB/images/c.jpg');
      expect(resolveRelativePath('OEBPS/Text/', '../../images/c.jpg')).toBe('images/c.jpg');
    });
  });

  describe('normalizeZipTimestamps', () => {
    it('normalizes corrupted or future overflow timestamps', () => {
      const zip = new JSZip();
      zip.file('file1.txt', 'hello', {
        date: new Date('2044-04-01T07:03:02.000Z'),
      });
      zip.file('file2.txt', 'world', {
        date: new Date('2024-01-01T12:00:00.000Z'),
      });

      const count = normalizeZipTimestamps(zip);
      expect(count).toBe(1);
      expect(zip.files['file1.txt'].date.getFullYear()).toBeLessThanOrEqual(2035);
      expect(zip.files['file2.txt'].date.getFullYear()).toBe(2024);
    });
  });

  describe('repairKindleEpub', () => {
    it('repairs extensionless chapters, trailing dots in OPF, and dead links in NCX and NAV', async () => {
      const zip = new JSZip();

      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

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

      zip.file('EPUB/nav', `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
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
<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Chapter 2</p></body></html>`);

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

      zip.file('EPUB/images/cover.jpg', 'fake-image-bytes', {
        date: new Date('2044-01-01T00:00:00Z'),
      });

      const report = await repairKindleEpub(zip);

      expect(report.hasRepairs).toBe(true);
      expect(report.normalizedTimestampsCount).toBe(1);
      expect(report.fixedExtensionlessFiles).toContain('EPUB/nav');
      expect(report.fixedExtensionlessFiles).toContain('EPUB/xhtml/Chapter1');

      expect(zip.files['EPUB/nav.xhtml']).toBeDefined();
      expect(zip.files['EPUB/nav']).toBeUndefined();
      expect(zip.files['EPUB/xhtml/Chapter1.xhtml']).toBeDefined();
      expect(zip.files['EPUB/xhtml/Chapter1']).toBeUndefined();

      const opf = await zip.files['EPUB/package.opf'].async('string');
      expect(opf).toContain('href="nav.xhtml"');
      expect(opf).toContain('id="nav"');
      expect(opf).toContain('idref="nav"');
      expect(opf).toContain('href="xhtml/Chapter1.xhtml"');

      const ncx = await zip.files['EPUB/toc.ncx'].async('string');
      expect(ncx).not.toContain('xhtml/Copyright.xhtml');
      expect(ncx).not.toContain('navPoint-1');
      expect(ncx).toContain('src="xhtml/Chapter1.xhtml"');
      expect(ncx).toContain('src="xhtml/Chapter2.xhtml"');

      const nav = await zip.files['EPUB/nav.xhtml'].async('string');
      expect(nav).toContain('href="xhtml/Chapter1.xhtml"');
      expect(nav).not.toContain('xhtml/DeadLink.xhtml');

      const ch1 = await zip.files['EPUB/xhtml/Chapter1.xhtml'].async('string');
      expect(ch1.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    });

    it('preserves nested navPoint/li trees, percent-encoded paths, non-HTML XML assets, BOM, and uppercase BODY', async () => {
      const zip = new JSZip();

      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

      zip.file('EPUB/package.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="xhtml/Chapter%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="pg" href="page.xpgt" media-type="application/vnd.adobe-page-template+xml"/>
  </manifest>
  <spine toc="ncx"><itemref idref="ch1"/></spine>
</package>`);

      zip.file('EPUB/page.xpgt', '<?xml version="1.0" encoding="UTF-8"?><ade:template xmlns:ade="http://ns.adobe.com/2006/ade"/>');
      // UTF-8 BOM + uppercase BODY id
      zip.file('EPUB/xhtml/Chapter 1.xhtml', '\uFEFF<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><BODY id="top"><p>Hello</p></BODY></html>');

      zip.file('EPUB/toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <navMap>
    <navPoint id="vol-1">
      <navLabel><text>Volume 1</text></navLabel>
      <content src="xhtml/MissingParent.xhtml"/>
      <navPoint id="ch-1">
        <navLabel><text>Chapter 1</text></navLabel>
        <content src="xhtml/Chapter%201.xhtml"/>
      </navPoint>
      <navPoint id="ch-dead">
        <navLabel><text>Dead Child</text></navLabel>
        <content src="xhtml/DeadChild.xhtml"/>
      </navPoint>
    </navPoint>
  </navMap>
</ncx>`);

      zip.file('EPUB/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <body>
    <nav epub:type="toc">
      <ol>
        <li>
          <a href="xhtml/MissingParent.xhtml">Volume 1</a>
          <ol>
            <li><a href="xhtml/Chapter%201.xhtml">Chapter 1</a></li>
            <li><a href="xhtml/DeadChild.xhtml">Dead Child</a></li>
          </ol>
        </li>
      </ol>
    </nav>
  </body>
</html>`);

      const report = await repairKindleEpub(zip);

      // .xpgt must NOT be renamed to .xpgt.xhtml
      expect(zip.files['EPUB/page.xpgt']).toBeDefined();
      expect(zip.files['EPUB/page.xpgt.xhtml']).toBeUndefined();

      // Percent-encoded valid chapter must remain in NCX & NAV, while dead child is cleanly pruned
      const ncx = await zip.files['EPUB/toc.ncx'].async('string');
      expect(ncx).toContain('vol-1');
      expect(ncx).toContain('xhtml/Chapter%201.xhtml');
      expect(ncx).not.toContain('DeadChild.xhtml');

      const nav = await zip.files['EPUB/nav.xhtml'].async('string');
      expect(nav).toContain('<span>Volume 1</span>');
      expect(nav).toContain('xhtml/Chapter%201.xhtml');
      expect(nav).not.toContain('DeadChild.xhtml');

      // BOM stripped before <?xml and <BODY id="top"> properly closed with </div></BODY>
      const ch1 = await zip.files['EPUB/xhtml/Chapter 1.xhtml'].async('string');
      expect(ch1.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
      expect(ch1).not.toContain('\uFEFF');
      expect(ch1).toContain('<body><div id="top"><p>Hello</p></div></body>');
      expect(report.fixedDeadLinks).toContain('ncx:xhtml/DeadChild.xhtml');
      expect(report.fixedDeadLinks).toContain('nav:xhtml/DeadChild.xhtml');
    });

    it('preserves relative parent paths when nav or ncx lives in a sibling subdirectory', async () => {
      const zip = new JSZip();
      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);
      zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="nav" href="Text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="Chapters/ch1" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`);
      zip.file('OEBPS/Text/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <body><nav epub:type="toc"><ol><li><a href="../Chapters/ch1">Ch 1</a></li></ol></nav></body>
</html>`);
      zip.file('OEBPS/Chapters/ch1', '<html><body><p>Chapter 1</p></body></html>');

      await repairKindleEpub(zip);

      const nav = await zip.files['OEBPS/Text/nav.xhtml'].async('string');
      expect(nav).toContain('href="../Chapters/ch1.xhtml"');
      expect(nav).not.toContain('OEBPS/Chapters/ch1.xhtml');
    });
  });
});

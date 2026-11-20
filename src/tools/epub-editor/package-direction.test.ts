// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { resolveEffectiveDirection, updatePackageDirection } from './package-direction';

const epub2Package = `<?xml version="1.0"?>
<package version="2.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata />
  <spine toc="ncx" page-progression-direction="ltr"><itemref idref="chapter-1" /></spine>
</package>`;

describe('ePUB package direction', () => {
  it('sets spine page-progression-direction="rtl" and Kindle primary-writing-mode="vertical-rl" for a vertical EPUB', () => {
    const result = updatePackageDirection(epub2Package, 'vertical');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="rtl">');
    expect(result).toContain('<meta name="primary-writing-mode" content="vertical-rl"/>');
    expect(result).toContain('>zh-TW</dc:language>');
    expect(result).toContain('version="2.0"');
  });

  it('handles spine tags without explicit page-progression-direction', () => {
    const opf = `<?xml version="1.0"?>
<package version="3.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata />
  <spine toc="ncx"><itemref idref="chapter-1" /></spine>
</package>`;
    const result = updatePackageDirection(opf, 'vertical');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="rtl">');
  });

  it('restores horizontal direction and updates primary-writing-mode without duplicating meta', () => {
    const verticalOpf = updatePackageDirection(epub2Package, 'vertical');
    const result = updatePackageDirection(verticalOpf, 'horizontal');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="ltr">');
    expect(result).toContain('<meta name="primary-writing-mode" content="horizontal-lr"/>');
    expect(result).not.toContain('content="vertical-rl"');
    expect(result.match(/primary-writing-mode/gi)?.length).toBe(1);
  });

  it('cleans up existing primary-writing-mode case-insensitively and allows ltr override in vertical mode', () => {
    const opf = `<?xml version="1.0"?>
<package version="3.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <metadata>
    <dc:language>zh-Hant</dc:language>
    <meta name="Primary-Writing-Mode" content="horizontal-lr"/>
  </metadata>
  <spine toc="ncx" page-progression-direction="rtl"><itemref idref="chapter-1" /></spine>
</package>`;
    const result = updatePackageDirection(opf, 'vertical', { pageProgressionDirection: 'ltr' });
    expect(result).toContain('<spine toc="ncx" page-progression-direction="ltr">');
    expect(result).toContain('<meta name="primary-writing-mode" content="vertical-rl"/>');
    expect(result.match(/primary-writing-mode/gi)?.length).toBe(1);
    expect(result).toContain('<dc:language>zh-Hant</dc:language>');
    expect(result).not.toContain('zh-TW');
  });

  it('normalizes und and Simplified Chinese dc:language even in multilingual OPF or when Kindle repair is off', () => {
    const opf = `<?xml version="1.0"?>
<package version="3.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <metadata>
    <dc:language>zh-CN</dc:language>
    <dc:language>en</dc:language>
  </metadata>
  <spine><itemref idref="ch1" /></spine>
</package>`;
    const converted = updatePackageDirection(opf, 'horizontal', {
      ensureKindleMetadata: false,
      targetLanguage: 'zh-TW',
    });
    expect(converted).toContain('<dc:language>zh-TW</dc:language>');
    expect(converted).toContain('<dc:language>en</dc:language>');
    expect(converted).not.toContain('primary-writing-mode');

    const untouched = updatePackageDirection(opf, 'horizontal');
    expect(untouched).toContain('<dc:language>zh-CN</dc:language>');
    expect(untouched).toContain('<dc:language>en</dc:language>');
  });

  it('skips Kindle metadata updates when ensureKindleMetadata is false', () => {
    const result = updatePackageDirection(epub2Package, 'vertical', { ensureKindleMetadata: false });
    expect(result).toContain('<spine toc="ncx" page-progression-direction="rtl">');
    expect(result).not.toContain('primary-writing-mode');
    expect(result).not.toContain('dc:language');
    expect(result).toContain('version="2.0"');
  });

  it('preserves package version instead of half-migrating EPUB 2.0 metadata even when nav exists', () => {
    const epub2WithNav = `<?xml version="1.0"?>
<package version="2.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata />
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="ch1" /></spine>
</package>`;
    const result = updatePackageDirection(epub2WithNav, 'vertical');
    expect(result).toContain('version="2.0"');
    expect(result).toContain('page-progression-direction="rtl"');
    expect(result).toContain('<meta name="primary-writing-mode" content="vertical-rl"/>');
  });

  it('resolves direction safely for unknown inputs and handles malformed spine snippets without duplicating attributes', () => {
    expect(resolveEffectiveDirection('vertical', 'invalid-value')).toBe('rtl');
    expect(resolveEffectiveDirection('horizontal', 'rtl')).toBe('rtl');

    const malformed = '<package><spine toc="ncx" page-progression-direction = "ltr"><broken></package>';
    const fallback = updatePackageDirection(malformed, 'vertical');
    expect(fallback.match(/page-progression-direction/gi)?.length).toBe(1);
    expect(fallback).toContain('page-progression-direction = "rtl"');
  });
});

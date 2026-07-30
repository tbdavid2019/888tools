import { describe, expect, it } from 'vitest';
import { updatePackageDirection } from './package-direction';

const epub2Package = `<?xml version="1.0"?>
<package version="2.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata />
  <spine toc="ncx" page-progression-direction="ltr"><itemref idref="chapter-1" /></spine>
</package>`;

describe('EPUB package direction', () => {
  it('sets all Apple Books direction signals for a vertical EPUB', () => {
    const result = updatePackageDirection(epub2Package, 'vertical');

    expect(result).toContain('<package dir="rtl" version="3.0"');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="rtl">');
  });

  it('restores left-to-right direction without downgrading EPUB 3', () => {
    const result = updatePackageDirection(resultForVertical(), 'horizontal');

    expect(result).toContain('<package dir="ltr" version="3.0"');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="ltr">');
  });
});

function resultForVertical() {
  return updatePackageDirection(epub2Package, 'vertical');
}

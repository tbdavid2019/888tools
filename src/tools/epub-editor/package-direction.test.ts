import { describe, expect, it } from 'vitest';
import { updatePackageDirection } from './package-direction';

const epub2Package = `<?xml version="1.0"?>
<package version="2.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata />
  <spine toc="ncx" page-progression-direction="ltr"><itemref idref="chapter-1" /></spine>
</package>`;

describe('EPUB package direction', () => {
  it('sets spine page-progression-direction="rtl" for a vertical EPUB', () => {
    const result = updatePackageDirection(epub2Package, 'vertical');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="rtl">');
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

  it('restores horizontal direction', () => {
    const verticalOpf = updatePackageDirection(epub2Package, 'vertical');
    const result = updatePackageDirection(verticalOpf, 'horizontal');
    expect(result).toContain('<spine toc="ncx" page-progression-direction="ltr">');
  });
});

type WritingMode = 'horizontal' | 'vertical';

export function updatePackageDirection(opfContent: string, writingMode: WritingMode): string {
  const isVertical = writingMode === 'vertical';

  if (isVertical) {
    if (opfContent.includes('page-progression-direction')) {
      return opfContent.replace(/page-progression-direction="[^"]*"/i, 'page-progression-direction="rtl"');
    } else {
      return opfContent.replace(/<spine([^>]*)>/i, '<spine$1 page-progression-direction="rtl">');
    }
  } else {
    if (opfContent.includes('page-progression-direction')) {
      return opfContent.replace(/page-progression-direction="[^"]*"/i, 'page-progression-direction="ltr"');
    }
    return opfContent.replace(/\s*page-progression-direction="rtl"/gi, '');
  }
}

import { getElementsByLocalName, parseXmlSafe, serializeXmlWithDecl } from '@/services/epub/xml';

export type WritingMode = 'horizontal' | 'vertical';

export function updatePackageDirection(opfContent: string, writingMode: WritingMode): string {
  const direction = writingMode === 'vertical'
    ? 'rtl'
    : 'ltr';
  const doc = parseXmlSafe(opfContent);

  if (doc) {
    const spine = getElementsByLocalName(doc, 'spine')[0];
    if (spine) {
      spine.setAttribute('page-progression-direction', direction);
      return serializeXmlWithDecl(doc, opfContent);
    }
  }

  // Fallback for non-XML malformed OPF snippets
  if (/<spine\s[^>]*?\bpage-progression-direction=/i.test(opfContent)) {
    return opfContent.replace(
      /(<spine\s[^>]*?\bpage-progression-direction=)(["'])[^"']*\2/i,
      `$1"${direction}"`,
    );
  }
  return opfContent.replace(/<spine\b[^>]*>/i, (tag) => {
    if (tag.endsWith('/>')) {
      return `${tag.slice(0, -2).trimEnd()} page-progression-direction="${direction}"/>`;
    }
    return `${tag.slice(0, -1)} page-progression-direction="${direction}">`;
  });
}

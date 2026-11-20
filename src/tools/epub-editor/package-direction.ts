import { getElementsByLocalName, parseXmlSafe, serializeXmlWithDecl } from '@/services/epub/xml';

export type WritingMode = 'horizontal' | 'vertical';
export type PageProgressionDirection = 'auto' | 'rtl' | 'ltr';

export interface PackageDirectionOptions {
  pageProgressionDirection?: PageProgressionDirection | string;
  ensureKindleMetadata?: boolean;
  /** Target language to normalize placeholder/Simplified tags (e.g., 'zh-TW' when OpenCC converts to Traditional). */
  targetLanguage?: string;
}

const DC_NAMESPACE = 'http://purl.org/dc/elements/1.1/';
export const REPLACEABLE_SIMPLIFIED_LANGS = new Set([
  'und',
  'zh',
  'zh-cn',
  'zh-hans',
  'zh-sg',
]);

export function resolveEffectiveDirection(
  writingMode: WritingMode,
  pageProgressionDirection?: string,
): 'rtl' | 'ltr' {
  if (pageProgressionDirection === 'rtl' || pageProgressionDirection === 'ltr') {
    return pageProgressionDirection;
  }
  return writingMode === 'vertical'
    ? 'rtl'
    : 'ltr';
}

function getDirectChildrenByLocalName(parent: Element, localName: string): Element[] {
  return Array.from(parent.childNodes).filter(
    (node): node is Element => node.nodeType === 1 && ((node as Element).localName || node.nodeName.split(':').pop()) === localName,
  );
}

function shouldReplaceLanguage(rawLang: string, targetLanguage?: string): boolean {
  const normalized = rawLang.trim().toLowerCase();
  if (!normalized || normalized === 'und') {
    return true;
  }
  if (targetLanguage && targetLanguage.toLowerCase() === 'zh-tw') {
    return REPLACEABLE_SIMPLIFIED_LANGS.has(normalized);
  }
  return false;
}

function syncKindleWritingModeMeta(doc: Document, metadataEl: Element, writingMode: WritingMode): void {
  for (const meta of getDirectChildrenByLocalName(metadataEl, 'meta')) {
    if ((meta.getAttribute('name') || '').trim().toLowerCase() === 'primary-writing-mode') {
      meta.parentNode?.removeChild(meta);
    }
  }

  const primaryWritingMeta = doc.createElementNS(metadataEl.namespaceURI, 'meta');
  primaryWritingMeta.setAttribute('name', 'primary-writing-mode');
  primaryWritingMeta.setAttribute('content', writingMode === 'vertical'
    ? 'vertical-rl'
    : 'horizontal-lr');
  metadataEl.appendChild(primaryWritingMeta);
}

function syncPackageLanguage(
  doc: Document,
  metadataEl: Element,
  writingMode: WritingMode,
  ensureKindleMetadata: boolean,
  targetLanguage?: string,
): void {
  const shouldEnsureVerticalFallback = ensureKindleMetadata && writingMode === 'vertical';
  if (!shouldEnsureVerticalFallback && !targetLanguage) {
    return;
  }

  const fallbackLang = targetLanguage || 'zh-TW';
  const languageEls = getDirectChildrenByLocalName(metadataEl, 'language').filter(
    el => !el.namespaceURI || el.namespaceURI === DC_NAMESPACE || el.nodeName.startsWith('dc:'),
  );

  if (languageEls.length === 0) {
    const langEl = doc.createElementNS(DC_NAMESPACE, 'dc:language');
    langEl.textContent = fallbackLang;
    metadataEl.appendChild(langEl);
    return;
  }

  for (const el of languageEls) {
    if (shouldReplaceLanguage(el.textContent || '', targetLanguage)) {
      el.textContent = fallbackLang;
    }
  }
}

function syncPackageMetadata(
  doc: Document,
  writingMode: WritingMode,
  ensureKindleMetadata: boolean,
  targetLanguage?: string,
): void {
  const packageEl = getElementsByLocalName(doc, 'package')[0] || doc.documentElement;
  const metadataEl = packageEl
    ? getDirectChildrenByLocalName(packageEl, 'metadata')[0]
    : getElementsByLocalName(doc, 'metadata')[0];
  if (!metadataEl) {
    return;
  }

  if (ensureKindleMetadata) {
    syncKindleWritingModeMeta(doc, metadataEl, writingMode);
  }
  syncPackageLanguage(doc, metadataEl, writingMode, ensureKindleMetadata, targetLanguage);
}

export function updatePackageDirection(
  opfContent: string,
  writingMode: WritingMode,
  options: PackageDirectionOptions = {},
): string {
  const effectiveDirection = resolveEffectiveDirection(writingMode, options.pageProgressionDirection);
  const doc = parseXmlSafe(opfContent);

  if (doc) {
    const packageEl = getElementsByLocalName(doc, 'package')[0] || doc.documentElement;
    const spine = (packageEl
      ? getDirectChildrenByLocalName(packageEl, 'spine')[0]
      : undefined)
    || getElementsByLocalName(doc, 'spine')[0];
    if (spine) {
      spine.setAttribute('page-progression-direction', effectiveDirection);
      syncPackageMetadata(
        doc,
        writingMode,
        options.ensureKindleMetadata !== false,
        options.targetLanguage,
      );
      return serializeXmlWithDecl(doc, opfContent);
    }
  }

  // Fallback for non-XML malformed OPF snippets (updates progression attribute without mutating unparsed metadata)
  if (/<spine\s[^>]*?\bpage-progression-direction\s*=/i.test(opfContent)) {
    return opfContent.replace(
      /(<spine\s[^>]*?\bpage-progression-direction\s*=\s*)(["'])[^"']*\2/i,
      `$1"${effectiveDirection}"`,
    );
  }
  return opfContent.replace(/<spine\b[^>]*>/i, (tag) => {
    if (tag.endsWith('/>')) {
      return `${tag.slice(0, -2).trimEnd()} page-progression-direction="${effectiveDirection}"/>`;
    }
    return `${tag.slice(0, -1)} page-progression-direction="${effectiveDirection}">`;
  });
}

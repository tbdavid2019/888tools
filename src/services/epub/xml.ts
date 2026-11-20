import type JSZip from 'jszip';
import { decodeBytesAuto, normalizeUtf8Declarations, stripUtf8Bom } from './encoding';

export function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  }
  catch {
    return value;
  }
}

/**
 * Resolves a relative path inside an EPUB ZIP against a base directory.
 * e.g. resolveRelativePath('EPUB/', 'xhtml/ch1.xhtml') => 'EPUB/xhtml/ch1.xhtml'
 * e.g. resolveRelativePath('EPUB/xhtml/', '../images/c.jpg') => 'EPUB/images/c.jpg'
 */
export function resolveRelativePath(baseDir: string, relativePath: string): string {
  const decodedRel = safeDecodeUriComponent(relativePath);
  const baseParts = baseDir
    ? baseDir.split('/').filter(Boolean)
    : [];
  const relParts = decodedRel.split('/');

  for (const part of relParts) {
    if (part === '.' || part === '') {
      continue;
    }
    if (part === '..') {
      if (baseParts.length > 0) {
        baseParts.pop();
      }
    }
    else {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

/**
 * Computes a relative path from a source file inside the ZIP to a target file inside the ZIP.
 */
export function relativePathFromFile(fromFilePath: string, targetFilePath: string): string {
  const fromParts = fromFilePath.split('/').slice(0, -1).filter(Boolean);
  const targetParts = targetFilePath.split('/').filter(Boolean);
  let common = 0;
  while (common < fromParts.length && common < targetParts.length - 1 && fromParts[common] === targetParts[common]) {
    common++;
  }
  const upLevels = fromParts.length - common;
  const downPath = targetParts.slice(common).join('/');
  return `${'../'.repeat(upLevels)}${downPath}`;
}

export function getDirPrefix(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0
    ? filePath.slice(0, idx + 1)
    : '';
}

export async function readZipTextAuto(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.files[path];
  if (!entry || entry.dir) {
    return null;
  }
  const bytes = await entry.async('uint8array');
  return decodeBytesAuto(bytes);
}

/**
 * Finds the root package.opf path inside an EPUB archive using META-INF/container.xml.
 */
export async function findOpfPath(zip: JSZip): Promise<string | null> {
  const containerXml = await readZipTextAuto(zip, 'META-INF/container.xml');
  if (containerXml) {
    const doc = parseXmlSafe(containerXml);
    if (doc) {
      const rootfiles = getElementsByLocalName(doc, 'rootfile');
      for (const rf of rootfiles) {
        const fullPath = rf.getAttribute('full-path');
        if (fullPath) {
          const decoded = safeDecodeUriComponent(fullPath);
          if (zip.files[fullPath]) {
            return fullPath;
          }
          if (zip.files[decoded]) {
            return decoded;
          }
        }
      }
    }
    const match = containerXml.match(/<rootfile\s[^>]*?\bfull-path=["']([^"']+)["']/i);
    if (match?.[1]) {
      const decoded = safeDecodeUriComponent(match[1]);
      if (zip.files[match[1]]) {
        return match[1];
      }
      if (zip.files[decoded]) {
        return decoded;
      }
    }
  }

  const opfFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.opf') && !zip.files[f].dir);
  return opfFiles[0] || null;
}

export function getElementsByLocalName(root: Document | Element, localName: string): Element[] {
  const target = localName.toLowerCase();
  const list = root.getElementsByTagName('*');
  const results: Element[] = [];
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    const elLocal = (el.localName || el.tagName.split(':').pop() || '').toLowerCase();
    if (elLocal === target) {
      results.push(el);
    }
  }
  return results;
}

export function parseXmlSafe(xmlString: string): Document | null {
  const clean = stripUtf8Bom(xmlString);
  const parser = new DOMParser();
  const doc = parser.parseFromString(clean, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return null;
  }
  return doc;
}

export function parseXhtmlOrHtml(content: string): { doc: Document; isHtmlFallback: boolean } {
  const clean = stripUtf8Bom(content);
  const parser = new DOMParser();
  const xhtmlDoc = parser.parseFromString(clean, 'application/xhtml+xml');
  if (xhtmlDoc.getElementsByTagName('parsererror').length === 0) {
    return { doc: xhtmlDoc, isHtmlFallback: false };
  }
  const htmlDoc = parser.parseFromString(clean, 'text/html');
  return { doc: htmlDoc, isHtmlFallback: true };
}

export function serializeXmlWithDecl(doc: Document, originalContent?: string): string {
  let serialized = new XMLSerializer().serializeToString(doc);
  // Ensure clean UTF-8 XML declaration without BOM before it
  serialized = stripUtf8Bom(serialized).replace(/^<\?xml\b[^>]*\?>\s*/i, '');

  const doctypeMatch = originalContent
    ? stripUtf8Bom(originalContent).match(/<!DOCTYPE\s[^>]+>/i)
    : null;
  if (doctypeMatch && !/^<!DOCTYPE\b/i.test(serialized)) {
    serialized = `${doctypeMatch[0]}\n${serialized}`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>\n${serialized}`;
}

export function parseOpfMetadata(opfContent: string): { title: string; author: string } {
  const doc = parseXmlSafe(opfContent);
  if (doc) {
    const titleEl = getElementsByLocalName(doc, 'title')[0];
    const creatorEl = getElementsByLocalName(doc, 'creator')[0];
    return {
      title: titleEl?.textContent?.trim() || '',
      author: creatorEl?.textContent?.trim() || '',
    };
  }
  return { title: '', author: '' };
}

export function updateOpfMetadata(
  opfContent: string,
  updates: { title?: string; author?: string },
): string {
  const doc = parseXmlSafe(opfContent);
  if (!doc) {
    return opfContent;
  }

  const dcNs = 'http://purl.org/dc/elements/1.1/';
  const metadataEl = getElementsByLocalName(doc, 'metadata')[0];
  if (!metadataEl) {
    return opfContent;
  }

  const updateField = (localName: string, qualifiedName: string, value?: string) => {
    if (value === undefined) {
      return;
    }
    const trimmed = value.trim();
    const existing = getElementsByLocalName(metadataEl, localName)[0];
    if (existing) {
      existing.textContent = trimmed;
    }
    else if (trimmed) {
      const el = doc.createElementNS(dcNs, qualifiedName);
      el.textContent = trimmed;
      metadataEl.appendChild(el);
    }
  };

  updateField('title', 'dc:title', updates.title);
  updateField('creator', 'dc:creator', updates.author);

  return serializeXmlWithDecl(doc, opfContent);
}

export function updateNcxDocTitle(ncxContent: string, title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return ncxContent;
  }
  const doc = parseXmlSafe(ncxContent);
  if (!doc) {
    return ncxContent;
  }

  const docTitle = getElementsByLocalName(doc, 'docTitle')[0];
  if (docTitle) {
    const textEl = getElementsByLocalName(docTitle, 'text')[0];
    if (textEl) {
      textEl.textContent = trimmed;
      return serializeXmlWithDecl(doc, ncxContent);
    }
  }
  return ncxContent;
}

const SKIP_TEXT_PARENTS = new Set([
  'script',
  'style',
  'code',
  'pre',
  'kbd',
  'samp',
  'tt',
]);

function walkTextNodes(node: Node, convertFn: (text: string) => string): boolean {
  let changed = false;
  if (node.nodeType === 3) {
    const orig = node.nodeValue || '';
    if (orig.trim()) {
      const next = convertFn(orig);
      if (next !== orig) {
        node.nodeValue = next;
        changed = true;
      }
    }
    return changed;
  }

  if (node.nodeType === 1) {
    const el = node as Element;
    const tag = (el.localName || el.tagName).toLowerCase();
    if (SKIP_TEXT_PARENTS.has(tag)) {
      return false;
    }
  }

  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    if (walkTextNodes(children[i], convertFn)) {
      changed = true;
    }
  }
  return changed;
}

/**
 * Converts only human-readable text inside XHTML/HTML, NCX, or OPF documents
 * without mutating href/src/id/class attributes, XML tags, or CSS rules.
 */
export function convertEpubDocumentText(
  content: string,
  ext: '.xhtml' | '.html' | '.htm' | '.ncx' | '.opf',
  convertFn: (text: string) => string,
  convertAttributes = false,
): string {
  const normalized = normalizeUtf8Declarations(content);

  if (ext === '.opf') {
    const doc = parseXmlSafe(normalized);
    if (!doc) {
      return normalized;
    }
    const metadataEl = getElementsByLocalName(doc, 'metadata')[0];
    if (!metadataEl) {
      return normalized;
    }
    let changed = false;
    const textTargets = [
      'title',
      'creator',
      'description',
      'subject',
      'publisher',
    ];
    for (const tag of textTargets) {
      for (const el of getElementsByLocalName(metadataEl, tag)) {
        if (walkTextNodes(el, convertFn)) {
          changed = true;
        }
      }
    }
    return changed
      ? serializeXmlWithDecl(doc, normalized)
      : normalized;
  }

  if (ext === '.ncx') {
    const doc = parseXmlSafe(normalized);
    if (!doc) {
      return normalized;
    }
    let changed = false;
    for (const el of getElementsByLocalName(doc, 'text')) {
      if (walkTextNodes(el, convertFn)) {
        changed = true;
      }
    }
    return changed
      ? serializeXmlWithDecl(doc, normalized)
      : normalized;
  }

  // XHTML / HTML / HTM
  const { doc } = parseXhtmlOrHtml(normalized);
  let changed = false;
  const titleEl = getElementsByLocalName(doc, 'title')[0];
  if (titleEl && walkTextNodes(titleEl, convertFn)) {
    changed = true;
  }
  const bodyEl = getElementsByLocalName(doc, 'body')[0] || doc.documentElement;
  if (bodyEl) {
    if (walkTextNodes(bodyEl, convertFn)) {
      changed = true;
    }
    if (convertAttributes) {
      const elements = bodyEl.getElementsByTagName('*');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        for (const attr of ['alt', 'title']) {
          const val = el.getAttribute(attr);
          if (val) {
            const next = convertFn(val);
            if (next !== val) {
              el.setAttribute(attr, next);
              changed = true;
            }
          }
        }
      }
    }
  }
  return changed
    ? serializeXmlWithDecl(doc, normalized)
    : normalized;
}

export function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n\f]/g, ' ');
}

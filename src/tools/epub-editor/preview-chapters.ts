import type JSZip from 'jszip';
import {
  findOpfPath,
  getDirPrefix,
  getElementsByLocalName,
  parseXhtmlOrHtml,
  parseXmlSafe,
  readZipTextAuto,
  resolveRelativePath,
} from '@/services/epub/xml';

export interface PreviewChapter {
  path?: string;
  title: string;
  text: string;
}

export function parsePreviewChapter(html: string, fallbackTitle: string, path?: string): PreviewChapter {
  const { doc } = parseXhtmlOrHtml(html);

  const heading = getElementsByLocalName(doc, 'h1')[0]
    || getElementsByLocalName(doc, 'h2')[0]
    || getElementsByLocalName(doc, 'title')[0];
  const title = heading?.textContent?.replace(/\s+/g, ' ').trim() || fallbackTitle;

  const body = getElementsByLocalName(doc, 'body')[0] || doc.documentElement;
  const paragraphs: string[] = [];

  if (body) {
    const blockTags = new Set([
      'p',
      'div',
      'li',
      'blockquote',
      'h3',
      'h4',
      'pre',
    ]);
    const collectBlocks = (el: Element) => {
      const tag = (el.localName || el.tagName).toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'nav') {
        return;
      }

      // If this is a leaf-like block (no nested blockTags inside), collect its text
      const childElements = Array.from(el.children);
      const hasNestedBlocks = childElements.some((child) => {
        const cTag = (child.localName || child.tagName).toLowerCase();
        return blockTags.has(cTag);
      });

      if (blockTags.has(tag) && !hasNestedBlocks) {
        const txt = (el.textContent || '').replace(/\u00A0/g, ' ').trim();
        if (txt) {
          paragraphs.push(txt);
        }
        return;
      }

      for (const child of childElements) {
        collectBlocks(child);
      }
    };

    collectBlocks(body);

    if (paragraphs.length === 0) {
      const fallbackText = (body.textContent || '').replace(/\u00A0/g, ' ').trim();
      if (fallbackText) {
        paragraphs.push(...fallbackText.split(/\n+/).map(s => s.trim()).filter(Boolean));
      }
    }
  }

  return {
    path,
    title,
    text: paragraphs.join('\n'),
  };
}

export function getPreviewChapterIndex(index: number, change: number, chapterCount: number): number {
  return Math.min(Math.max(index + change, 0), Math.max(chapterCount - 1, 0));
}

/**
 * Resolves chapter XHTML paths in the exact OPF <spine> reading order, falling back to natural path sort.
 */
export async function getOrderedContentPaths(zip: JSZip): Promise<string[]> {
  const opfPath = await findOpfPath(zip);
  if (opfPath) {
    const opfXml = await readZipTextAuto(zip, opfPath);
    if (opfXml) {
      const doc = parseXmlSafe(opfXml);
      if (doc) {
        const opfDir = getDirPrefix(opfPath);
        const manifestMap = new Map<string, string>();
        for (const item of getElementsByLocalName(doc, 'item')) {
          const id = item.getAttribute('id');
          const href = item.getAttribute('href');
          const media = (item.getAttribute('media-type') || '').toLowerCase();
          if (id && href && (!media || media === 'application/xhtml+xml' || media === 'text/html')) {
            manifestMap.set(id, resolveRelativePath(opfDir, href));
          }
        }
        const ordered: string[] = [];
        const seen = new Set<string>();
        for (const itemref of getElementsByLocalName(doc, 'itemref')) {
          const idref = itemref.getAttribute('idref');
          const resolved = idref
            ? manifestMap.get(idref)
            : undefined;
          if (resolved && zip.files[resolved] && !zip.files[resolved].dir && !seen.has(resolved)) {
            seen.add(resolved);
            ordered.push(resolved);
          }
        }
        if (ordered.length > 0) {
          return ordered;
        }
      }
    }
  }

  return Object.keys(zip.files)
    .filter((f) => {
      if (zip.files[f].dir) {
        return false;
      }
      const lower = f.toLowerCase();
      return lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm');
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

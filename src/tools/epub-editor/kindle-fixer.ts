import type JSZip from 'jszip';
import { normalizeUtf8Declarations } from '@/services/epub/encoding';
import {
  findOpfPath as findOpfPathShared,
  getDirPrefix,
  getElementsByLocalName,
  parseXhtmlOrHtml,
  parseXmlSafe,
  readZipTextAuto,
  relativePathFromFile,
  resolveRelativePath as resolveRelativePathShared,
  safeDecodeUriComponent,
  serializeXmlWithDecl,
} from '@/services/epub/xml';

export interface KindleRepairReport {
  fixedExtensionlessFiles: string[];
  fixedDeadLinks: string[];
  fixedOpfItems: string[];
  normalizedTimestampsCount: number;
  fixedXmlDeclarations: string[];
  hasRepairs: boolean;
}

export interface KindleRepairOptions {
  normalizeTimestamps?: boolean;
  fixExtensionlessHtml?: boolean;
  fixOpfMismatches?: boolean;
  fixDeadLinks?: boolean;
  ensureXmlDeclaration?: boolean;
}

// Valid DOS ZIP date inside 1980-2035 window
export const SAFE_ZIP_DATE = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

const KNOWN_NON_HTML_EXTS = new Set([
  'css',
  'ncx',
  'opf',
  'xml',
  'xpgt',
  'plist',
  'rdf',
  'dtd',
  'xsl',
  'xslt',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
  'otf',
  'ttf',
  'woff',
  'woff2',
  'eot',
  'json',
  'txt',
  'md',
  'js',
  'smil',
  'pls',
  'mp3',
  'mp4',
  'm4a',
  'ogg',
  'webm',
]);

export function resolveRelativePath(baseDir: string, relativePath: string): string {
  return resolveRelativePathShared(baseDir, relativePath);
}

/**
 * Normalizes all timestamps in the zip to prevent Java/KindleGen ZipEntry crashes.
 */
export function normalizeZipTimestamps(zip: JSZip, safeDate = SAFE_ZIP_DATE): number {
  let count = 0;
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry || entry.dir) {
      continue;
    }

    const d = entry.date;
    const isInvalid = !d || Number.isNaN(d.getTime()) || d.getFullYear() < 1980 || d.getFullYear() > 2035;
    if (isInvalid) {
      entry.date = safeDate;
      count++;
    }
  }
  return count;
}

export async function findOpfPath(zip: JSZip): Promise<string | null> {
  return findOpfPathShared(zip);
}

function hasKnownExtension(filename: string): boolean {
  if (filename.startsWith('META-INF/') || filename === 'mimetype') {
    return true;
  }
  const lastSlash = filename.lastIndexOf('/');
  const basename = lastSlash >= 0
    ? filename.slice(lastSlash + 1)
    : filename;
  const lastDot = basename.lastIndexOf('.');
  if (lastDot <= 0) {
    return false;
  }
  const ext = basename.slice(lastDot + 1).toLowerCase();
  return KNOWN_NON_HTML_EXTS.has(ext) || ext === 'xhtml' || ext === 'html' || ext === 'htm';
}

function isHtmlBodyHeuristic(rawContent: string): boolean {
  const head = rawContent.slice(0, 800).toLowerCase();
  return (
    head.includes('<!doctype html')
    || head.includes('<html')
    || head.includes('<body')
    || head.includes('<nav')
    || /<div\b/.test(head)
    || /<p\b/.test(head)
  );
}

function isExternalOrFragmentHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  return (
    !trimmed
    || trimmed.startsWith('#')
    || trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('tel:')
    || trimmed.startsWith('data:')
    || trimmed.startsWith('javascript:')
  );
}

function resolveFileInZip(zip: JSZip, baseDir: string, rawHref: string): { path: string; exists: boolean; hasXhtmlExt: boolean } {
  const pathPart = rawHref.split('#')[0].split('?')[0];
  const fullPath = resolveRelativePath(baseDir, pathPart);
  if (zip.files[fullPath] && !zip.files[fullPath].dir) {
    return { path: fullPath, exists: true, hasXhtmlExt: false };
  }
  if (zip.files[`${fullPath}.xhtml`] && !zip.files[`${fullPath}.xhtml`].dir) {
    return { path: `${fullPath}.xhtml`, exists: true, hasXhtmlExt: true };
  }
  return { path: fullPath, exists: false, hasXhtmlExt: false };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteRenamedReferences(content: string, sourceFilePath: string, renameMap: Record<string, string>): { content: string; modified: boolean } {
  let updated = content;
  let modified = false;

  for (const [oldPath, newPath] of Object.entries(renameMap)) {
    const oldRel = relativePathFromFile(sourceFilePath, oldPath);
    const newRel = relativePathFromFile(sourceFilePath, newPath);
    const encodedOldRel = encodeURI(oldRel);

    for (const candidate of new Set([oldRel, encodedOldRel])) {
      const pattern = new RegExp(
        `(\\b(?:href|src)=["'])${escapeRegExp(candidate)}(?=["'#?])`,
        'g',
      );
      const next = updated.replace(pattern, `$1${newRel}`);
      if (next !== updated) {
        updated = next;
        modified = true;
      }
    }
  }

  return { content: updated, modified };
}

function fixDeadNavPointTree(
  navPointEl: Element,
  ncxDir: string,
  zip: JSZip,
  report: KindleRepairReport,
): boolean {
  let modified = false;

  // Recurse children first (snapshot array before mutating DOM)
  const childNavPoints = Array.from(navPointEl.children).filter(
    el => (el.localName || el.tagName).toLowerCase() === 'navpoint',
  );
  for (const child of childNavPoints) {
    if (fixDeadNavPointTree(child, ncxDir, zip, report)) {
      modified = true;
    }
  }

  const contentEl = Array.from(navPointEl.children).find(
    el => (el.localName || el.tagName).toLowerCase() === 'content',
  );
  if (!contentEl) {
    return modified;
  }

  const rawSrc = contentEl.getAttribute('src');
  if (!rawSrc) {
    return modified;
  }

  const resolved = resolveFileInZip(zip, ncxDir, rawSrc);
  if (resolved.exists) {
    if (resolved.hasXhtmlExt) {
      const filePart = rawSrc.split('#')[0].split('?')[0];
      contentEl.setAttribute('src', rawSrc.replace(filePart, `${filePart}.xhtml`));
      return true;
    }
    return modified;
  }

  // Redirect to first surviving child navPoint's src if any exist
  const survivingChildren = Array.from(navPointEl.children).filter(
    el => (el.localName || el.tagName).toLowerCase() === 'navpoint',
  );
  for (const child of survivingChildren) {
    const childContent = getElementsByLocalName(child, 'content')[0];
    const childSrc = childContent?.getAttribute('src');
    if (childSrc) {
      contentEl.setAttribute('src', childSrc);
      return true;
    }
  }

  report.fixedDeadLinks.push(`ncx:${rawSrc}`);
  navPointEl.parentNode?.removeChild(navPointEl);
  return true;
}

function fixDeadNavLiTree(
  liEl: Element,
  navDir: string,
  zip: JSZip,
  report: KindleRepairReport,
): boolean {
  let modified = false;

  // Process nested lists bottom-up first
  const nestedLists = Array.from(liEl.children).filter((el) => {
    const tag = (el.localName || el.tagName).toLowerCase();
    return tag === 'ol' || tag === 'ul';
  });
  for (const list of nestedLists) {
    const nestedItems = Array.from(list.children).filter(
      el => (el.localName || el.tagName).toLowerCase() === 'li',
    );
    for (const childLi of nestedItems) {
      if (fixDeadNavLiTree(childLi, navDir, zip, report)) {
        modified = true;
      }
    }
  }

  const directAnchor = Array.from(liEl.children).find(
    el => (el.localName || el.tagName).toLowerCase() === 'a',
  );
  if (!directAnchor) {
    return modified;
  }

  const href = directAnchor.getAttribute('href') || '';
  if (isExternalOrFragmentHref(href)) {
    return modified;
  }

  const resolved = resolveFileInZip(zip, navDir, href);
  if (resolved.exists) {
    if (resolved.hasXhtmlExt) {
      const filePart = href.split('#')[0].split('?')[0];
      directAnchor.setAttribute('href', href.replace(filePart, `${filePart}.xhtml`));
      return true;
    }
    return modified;
  }

  report.fixedDeadLinks.push(`nav:${href}`);
  const hasRemainingSubList = nestedLists.some(list => list.querySelectorAll('li').length > 0);
  if (hasRemainingSubList) {
    const span = liEl.ownerDocument.createElementNS(directAnchor.namespaceURI, 'span');
    while (directAnchor.firstChild) {
      span.appendChild(directAnchor.firstChild);
    }
    liEl.replaceChild(span, directAnchor);
  }
  else {
    liEl.parentNode?.removeChild(liEl);
  }
  return true;
}

/**
 * Repairs EPUB structural defects that cause Amazon Send to Kindle E999 errors.
 */
export async function repairKindleEpub(
  zip: JSZip,
  options: KindleRepairOptions = {},
): Promise<KindleRepairReport> {
  const {
    normalizeTimestamps = true,
    fixExtensionlessHtml = true,
    fixOpfMismatches = true,
    fixDeadLinks = true,
    ensureXmlDeclaration = true,
  } = options;

  const report: KindleRepairReport = {
    fixedExtensionlessFiles: [],
    fixedDeadLinks: [],
    fixedOpfItems: [],
    normalizedTimestampsCount: 0,
    fixedXmlDeclarations: [],
    hasRepairs: false,
  };

  if (normalizeTimestamps) {
    report.normalizedTimestampsCount = normalizeZipTimestamps(zip);
  }

  const opfPath = await findOpfPath(zip);
  if (!opfPath || !zip.files[opfPath]) {
    report.hasRepairs = report.normalizedTimestampsCount > 0;
    return report;
  }

  const opfDir = getDirPrefix(opfPath);
  const rawOpf = await readZipTextAuto(zip, opfPath);
  if (!rawOpf) {
    report.hasRepairs = report.normalizedTimestampsCount > 0;
    return report;
  }

  let opfDoc = parseXmlSafe(rawOpf);
  const opfDeclaredHtmlFullPaths = new Set<string>();

  if (opfDoc) {
    for (const item of getElementsByLocalName(opfDoc, 'item')) {
      const href = item.getAttribute('href');
      const media = (item.getAttribute('media-type') || '').toLowerCase();
      if (href && (media === 'application/xhtml+xml' || media === 'text/html')) {
        const full = resolveRelativePath(opfDir, href);
        opfDeclaredHtmlFullPaths.add(full);
        if (href.endsWith('.')) {
          opfDeclaredHtmlFullPaths.add(resolveRelativePath(opfDir, href.slice(0, -1)));
        }
      }
    }
  }

  // 3. Detect and Rename Extensionless HTML Files (only reading bytes when extension is missing/unknown)
  const renameMap: Record<string, string> = {};
  if (fixExtensionlessHtml) {
    const fileKeys = Object.keys(zip.files).filter(k => !zip.files[k].dir && !hasKnownExtension(k));
    for (const filename of fileKeys) {
      const entry = zip.files[filename];
      if (!entry) {
        continue;
      }

      const text = await readZipTextAuto(zip, filename);
      if (text === null) {
        continue;
      }

      if (opfDeclaredHtmlFullPaths.has(filename) || isHtmlBodyHeuristic(text)) {
        const newFilename = `${filename}.xhtml`;
        const bytes = await entry.async('uint8array');
        zip.file(newFilename, bytes, { date: SAFE_ZIP_DATE });
        zip.remove(filename);
        renameMap[filename] = newFilename;
        report.fixedExtensionlessFiles.push(filename);
      }
    }
  }

  // 4. Fix OPF Manifest and Spine via DOM
  if (opfDoc && (fixOpfMismatches || Object.keys(renameMap).length > 0)) {
    const opfIdRenameMap: Record<string, string> = {};
    let opfModified = false;

    for (const item of getElementsByLocalName(opfDoc, 'item')) {
      let itemModified = false;
      let href = item.getAttribute('href');
      const id = item.getAttribute('id');

      if (href !== null) {
        const originalHref = href;
        if (href.endsWith('.')) {
          href = href.replace(/\.+$/, '');
          itemModified = true;
        }

        const oldFullPath = resolveRelativePath(opfDir, originalHref);
        const strippedFullPath = resolveRelativePath(opfDir, href);

        if (renameMap[oldFullPath]) {
          const newFull = renameMap[oldFullPath];
          href = relativePathFromFile(opfPath, newFull);
          itemModified = true;
        }
        else if (renameMap[strippedFullPath]) {
          const newFull = renameMap[strippedFullPath];
          href = relativePathFromFile(opfPath, newFull);
          itemModified = true;
        }
        else {
          const resolved = resolveRelativePath(opfDir, href);
          if (!zip.files[resolved] && zip.files[`${resolved}.xhtml`]) {
            href = `${href}.xhtml`;
            itemModified = true;
          }
        }

        if (itemModified) {
          item.setAttribute('href', href);
          if (href.toLowerCase().endsWith('.xhtml') || href.toLowerCase().endsWith('.html')) {
            item.setAttribute('media-type', 'application/xhtml+xml');
          }
        }
      }

      if (id && id.endsWith('.')) {
        const sanitizedId = id.replace(/\.+$/, '');
        item.setAttribute('id', sanitizedId);
        opfIdRenameMap[id] = sanitizedId;
        itemModified = true;
      }

      if (itemModified) {
        opfModified = true;
        report.fixedOpfItems.push(item.getAttribute('href') || id || 'item');
      }
    }

    if (Object.keys(opfIdRenameMap).length > 0) {
      for (const itemref of getElementsByLocalName(opfDoc, 'itemref')) {
        const idref = itemref.getAttribute('idref');
        if (idref && opfIdRenameMap[idref]) {
          itemref.setAttribute('idref', opfIdRenameMap[idref]);
          opfModified = true;
        }
      }
    }

    if (opfModified) {
      zip.file(opfPath, serializeXmlWithDecl(opfDoc, rawOpf), { date: SAFE_ZIP_DATE });
    }
  }

  // Reload opfDoc in case we need nav path after renames
  const updatedOpf = await readZipTextAuto(zip, opfPath);
  if (updatedOpf) {
    opfDoc = parseXmlSafe(updatedOpf);
  }

  // 5. Fix Dead Links & Renamed Files in TOC (toc.ncx) via DOM
  const ncxFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.ncx') && !zip.files[f].dir);
  for (const ncxPath of ncxFiles) {
    const ncxDir = getDirPrefix(ncxPath);
    const rawNcx = await readZipTextAuto(zip, ncxPath);
    if (!rawNcx) {
      continue;
    }

    let ncxModified = false;
    const ncxDoc = parseXmlSafe(rawNcx);
    if (ncxDoc) {
      if (Object.keys(renameMap).length > 0) {
        for (const contentEl of getElementsByLocalName(ncxDoc, 'content')) {
          const src = contentEl.getAttribute('src');
          if (!src) {
            continue;
          }
          const [filePart, hash] = src.split('#');
          const resolved = resolveRelativePath(ncxDir, filePart);
          if (renameMap[resolved]) {
            const newFull = renameMap[resolved];
            const newRel = relativePathFromFile(ncxPath, newFull);
            contentEl.setAttribute('src', hash !== undefined
              ? `${newRel}#${hash}`
              : newRel);
            ncxModified = true;
          }
        }
      }

      if (fixDeadLinks) {
        const navMap = getElementsByLocalName(ncxDoc, 'navMap')[0];
        if (navMap) {
          const topNavPoints = Array.from(navMap.children).filter(
            el => (el.localName || el.tagName).toLowerCase() === 'navpoint',
          );
          for (const np of topNavPoints) {
            if (fixDeadNavPointTree(np, ncxDir, zip, report)) {
              ncxModified = true;
            }
          }
        }
      }

      if (ncxModified) {
        zip.file(ncxPath, serializeXmlWithDecl(ncxDoc, rawNcx), { date: SAFE_ZIP_DATE });
      }
    }
  }

  // 6. Fix Dead Links & Renamed Files in EPUB 3 NAV document via DOM
  let navPathCandidate: string | undefined;
  if (opfDoc) {
    for (const item of getElementsByLocalName(opfDoc, 'item')) {
      const props = (item.getAttribute('properties') || '').split(/\s+/);
      const href = item.getAttribute('href');
      if (href && props.includes('nav')) {
        navPathCandidate = resolveRelativePath(opfDir, href);
        break;
      }
    }
  }
  if (!navPathCandidate) {
    navPathCandidate = Object.keys(zip.files).find(f => !zip.files[f].dir && (/nav\.xhtml$/i.test(f) || /toc\.xhtml$/i.test(f)));
  }

  if (navPathCandidate && zip.files[navPathCandidate]) {
    const navDir = getDirPrefix(navPathCandidate);
    const rawNav = await readZipTextAuto(zip, navPathCandidate);
    if (rawNav) {
      const { doc: navDoc } = parseXhtmlOrHtml(rawNav);
      let navModified = false;

      if (Object.keys(renameMap).length > 0) {
        for (const aEl of getElementsByLocalName(navDoc, 'a')) {
          const href = aEl.getAttribute('href');
          if (!href || isExternalOrFragmentHref(href)) {
            continue;
          }
          const [filePart, hash] = href.split('#');
          const resolved = resolveRelativePath(navDir, filePart);
          if (renameMap[resolved]) {
            const newFull = renameMap[resolved];
            const newRel = relativePathFromFile(navPathCandidate, newFull);
            aEl.setAttribute('href', hash !== undefined
              ? `${newRel}#${hash}`
              : newRel);
            navModified = true;
          }
        }
      }

      if (fixDeadLinks) {
        const navElements = getElementsByLocalName(navDoc, 'nav');
        for (const navEl of navElements) {
          const lists = Array.from(navEl.children).filter((el) => {
            const tag = (el.localName || el.tagName).toLowerCase();
            return tag === 'ol' || tag === 'ul';
          });
          for (const list of lists) {
            const topLis = Array.from(list.children).filter(
              el => (el.localName || el.tagName).toLowerCase() === 'li',
            );
            for (const li of topLis) {
              if (fixDeadNavLiTree(li, navDir, zip, report)) {
                navModified = true;
              }
            }
          }
        }
      }

      if (navModified) {
        zip.file(navPathCandidate, serializeXmlWithDecl(navDoc, rawNav), { date: SAFE_ZIP_DATE });
      }
    }
  }

  // 7. Fix Content Documents (Encoding -> UTF-8, XML Declaration, Renamed links, body ID)
  const contentFiles = Object.keys(zip.files).filter((f) => {
    if (zip.files[f].dir) {
      return false;
    }
    const lower = f.toLowerCase();
    return lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm');
  });

  for (const filePath of contentFiles) {
    const rawContent = await readZipTextAuto(zip, filePath);
    if (rawContent === null) {
      continue;
    }

    let content = normalizeUtf8Declarations(rawContent);
    let fileModified = content !== rawContent;

    if (Object.keys(renameMap).length > 0) {
      const linkRes = rewriteRenamedReferences(content, filePath, renameMap);
      if (linkRes.modified) {
        content = linkRes.content;
        fileModified = true;
      }
    }

    if (ensureXmlDeclaration && !content.trimStart().startsWith('<?xml')) {
      content = `<?xml version="1.0" encoding="utf-8"?>\n${content.trimStart()}`;
      report.fixedXmlDeclarations.push(filePath);
      fileModified = true;
    }

    // Fix <body id="..."> to avoid KindleGen hyperlink body-target warning (handle case-insensitive </body>)
    if (/<body\s[^>]*?\bid=["'][^"']+["'][^>]*>/i.test(content) && !/<body\s[^>]*?\bid=["'][^"']+["'][^>]*\/>/i.test(content)) {
      content = content.replace(/<body\s[^>]*>/i, (tag) => {
        const idMatch = tag.match(/\sid=(["'])([^"']+)\1/i);
        if (!idMatch) {
          return tag;
        }
        const cleanedTag = tag.replace(/\sid=(["'])([^"']+)\1/i, '');
        return `<body${cleanedTag.slice(5)}<div id="${idMatch[2]}">`;
      });
      if (/<\/body>/i.test(content)) {
        content = content.replace(/<\/body>/i, '</div></body>');
      }
      else {
        content += '</div>';
      }
      fileModified = true;
    }

    if (fileModified) {
      zip.file(filePath, content, { date: SAFE_ZIP_DATE });
    }
  }

  // Ensure mimetype is stored with valid DOS timestamp if missing
  if (!zip.files.mimetype) {
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', date: SAFE_ZIP_DATE });
  }
  else {
    const mimeEntry = zip.files.mimetype;
    if (!mimeEntry.date || mimeEntry.date.getFullYear() < 1980 || mimeEntry.date.getFullYear() > 2035) {
      mimeEntry.date = SAFE_ZIP_DATE;
    }
  }

  report.hasRepairs
    = report.fixedExtensionlessFiles.length > 0
      || report.fixedDeadLinks.length > 0
      || report.fixedOpfItems.length > 0
      || report.normalizedTimestampsCount > 0
      || report.fixedXmlDeclarations.length > 0;

  return report;
}

// Keep safeDecodeUriComponent used so TS/ESLint has no dead imports if checked
export { safeDecodeUriComponent };

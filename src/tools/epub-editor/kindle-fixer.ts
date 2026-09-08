import type JSZip from 'jszip';

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

const KNOWN_NON_HTML_EXTS = new Set([
  'css', 'ncx', 'opf', 'xml',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
  'otf', 'ttf', 'woff', 'woff2',
  'json', 'txt', 'js', 'smil', 'mp3', 'mp4', 'm4a',
]);

/**
 * Resolves a relative path against a base directory.
 * e.g. resolveRelativePath('EPUB/', 'xhtml/ch1.xhtml') => 'EPUB/xhtml/ch1.xhtml'
 * e.g. resolveRelativePath('EPUB/xhtml/', '../images/c.jpg') => 'EPUB/images/c.jpg'
 */
export function resolveRelativePath(baseDir: string, relativePath: string): string {
  if (!baseDir) return relativePath.replace(/^\/+/, '');
  const baseParts = baseDir.split('/').filter(Boolean);
  const relParts = relativePath.split('/');

  for (const part of relParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (baseParts.length > 0) baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

/**
 * Normalizes all timestamps in the zip to prevent Java/KindleGen ZipEntry crashes.
 * Many unzippers fail with IllegalArgumentException when month > 12, hour > 23, or minute > 59.
 */
export function normalizeZipTimestamps(zip: JSZip, safeDate = new Date()): number {
  let count = 0;
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;

    const d = entry.date;
    const isInvalid = !d || isNaN(d.getTime()) || d.getFullYear() < 1980 || d.getFullYear() > 2035;
    if (isInvalid) {
      entry.date = safeDate;
      count++;
    }
  }
  return count;
}

/**
 * Finds the root package.opf path inside the EPUB.
 */
export async function findOpfPath(zip: JSZip): Promise<string | null> {
  const container = zip.files['META-INF/container.xml'];
  if (container) {
    const xml = await container.async('string');
    const match = xml.match(/<rootfile\b[^>]*full-path=["']([^"']+)["']/i);
    if (match && match[1] && zip.files[match[1]]) {
      return match[1];
    }
  }

  // Fallback: search for any .opf file
  const opfFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.opf') && !zip.files[f].dir);
  return opfFiles[0] || null;
}

/**
 * Checks if a file entry is an XHTML/HTML document without a proper extension.
 */
function isExtensionlessHtmlFile(
  filename: string,
  rawContent: string,
  opfDeclaredHrefSet: Set<string>
): boolean {
  if (filename.startsWith('META-INF/') || filename === 'mimetype') return false;

  const lastSlash = filename.lastIndexOf('/');
  const basename = lastSlash >= 0 ? filename.slice(lastSlash + 1) : filename;
  const lastDot = basename.lastIndexOf('.');

  if (lastDot > 0) {
    const ext = basename.slice(lastDot + 1).toLowerCase();
    if (KNOWN_NON_HTML_EXTS.has(ext) || ext === 'xhtml' || ext === 'html' || ext === 'htm') {
      return false;
    }
  }

  // If OPF manifest explicitly declared this file as xhtml/html
  if (opfDeclaredHrefSet.has(filename)) return true;

  // Check content heuristic
  const head = rawContent.slice(0, 500).toLowerCase();
  return (
    head.includes('<?xml') ||
    head.includes('<!doctype html') ||
    head.includes('<html') ||
    head.includes('<body') ||
    head.includes('<div') ||
    head.includes('<nav')
  );
}

/**
 * Main function to repair EPUB for Kindle / Send to Kindle compatibility.
 */
export async function repairKindleEpub(
  zip: JSZip,
  options: KindleRepairOptions = {}
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

  // 1. Normalize ZIP Timestamps
  if (normalizeTimestamps) {
    report.normalizedTimestampsCount = normalizeZipTimestamps(zip);
  }

  // 2. Locate OPF file
  const opfPath = await findOpfPath(zip);
  if (!opfPath || !zip.files[opfPath]) {
    report.hasRepairs = report.normalizedTimestampsCount > 0;
    return report;
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  let opfContent = await zip.files[opfPath].async('string');

  // Collect OPF declared XHTML hrefs
  const opfDeclaredHtmlFullPaths = new Set<string>();
  const itemRegex = /<item\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(opfContent)) !== null) {
    const attrs = match[1];
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    const mediaMatch = attrs.match(/media-type=["']([^"']+)["']/i);
    if (hrefMatch && mediaMatch) {
      const media = mediaMatch[1].toLowerCase();
      if (media === 'application/xhtml+xml' || media === 'text/html') {
        const full = resolveRelativePath(opfDir, hrefMatch[1]);
        opfDeclaredHtmlFullPaths.add(full);
        // Also check if href has trailing dot (e.g. "nav.")
        if (hrefMatch[1].endsWith('.')) {
          opfDeclaredHtmlFullPaths.add(resolveRelativePath(opfDir, hrefMatch[1].slice(0, -1)));
        }
      }
    }
  }

  // 3. Detect and Rename Extensionless HTML Files
  const renameMap: Record<string, string> = {};

  if (fixExtensionlessHtml) {
    const fileKeys = Object.keys(zip.files).filter(k => !zip.files[k].dir);
    for (const filename of fileKeys) {
      const entry = zip.files[filename];
      if (!entry) continue;

      const raw = await entry.async('string');
      if (isExtensionlessHtmlFile(filename, raw, opfDeclaredHtmlFullPaths)) {
        const newFilename = filename + '.xhtml';
        const u8 = await entry.async('uint8array');
        zip.file(newFilename, u8, { date: new Date() });
        zip.remove(filename);
        renameMap[filename] = newFilename;
        report.fixedExtensionlessFiles.push(filename);
      }
    }
  }

  // 4. Fix OPF Manifest and Spine
  if (fixOpfMismatches || Object.keys(renameMap).length > 0) {
    const opfIdRenameMap: Record<string, string> = {};

    opfContent = opfContent.replace(/<item\b([^>]*)\/?>/gi, (fullTag, attrs) => {
      let newAttrs = attrs;
      let tagModified = false;

      const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);

      if (hrefMatch) {
        let href = hrefMatch[1];
        const originalHref = href;

        // Strip trailing dot if present (e.g. href="nav.")
        if (href.endsWith('.')) {
          href = href.replace(/\.+$/, '');
          tagModified = true;
        }

        // Check if old full path was in renameMap
        const oldFullPath = resolveRelativePath(opfDir, originalHref);
        const strippedFullPath = resolveRelativePath(opfDir, href);

        if (renameMap[oldFullPath]) {
          const newFull = renameMap[oldFullPath];
          href = newFull.startsWith(opfDir) ? newFull.slice(opfDir.length) : newFull;
          tagModified = true;
        } else if (renameMap[strippedFullPath]) {
          const newFull = renameMap[strippedFullPath];
          href = newFull.startsWith(opfDir) ? newFull.slice(opfDir.length) : newFull;
          tagModified = true;
        } else {
          // Check if resolved file does not exist, but adding .xhtml does exist
          const resolved = resolveRelativePath(opfDir, href);
          if (!zip.files[resolved] && zip.files[resolved + '.xhtml']) {
            href = href + '.xhtml';
            tagModified = true;
          }
        }

        if (tagModified) {
          newAttrs = newAttrs.replace(/href=["'][^"']+["']/i, `href="${href}"`);
          if (href.endsWith('.xhtml') || href.endsWith('.html')) {
            newAttrs = newAttrs.replace(/media-type=["'][^"']+["']/i, 'media-type="application/xhtml+xml"');
          }
        }
      }

      if (idMatch) {
        const id = idMatch[1];
        if (id.endsWith('.')) {
          const sanitizedId = id.replace(/\.+$/, '');
          newAttrs = newAttrs.replace(/id=["'][^"']+["']/i, `id="${sanitizedId}"`);
          opfIdRenameMap[id] = sanitizedId;
          tagModified = true;
        }
      }

      if (tagModified) {
        report.fixedOpfItems.push(attrs);
        return `<item${newAttrs}/>`;
      }
      return fullTag;
    });

    // Update spine idrefs if any id was sanitized
    for (const [oldId, newId] of Object.entries(opfIdRenameMap)) {
      const idrefRegex = new RegExp(`(<itemref\\b[^>]*idref=["'])${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'][^>]*\\/?>)`, 'gi');
      opfContent = opfContent.replace(idrefRegex, `$1${newId}$2`);
    }

    zip.file(opfPath, opfContent, { date: new Date() });
  }

  // 5. Fix Dead Links & Renamed Files in TOC (toc.ncx)
  const ncxFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.ncx') && !zip.files[f].dir);
  for (const ncxPath of ncxFiles) {
    const ncxDir = ncxPath.includes('/') ? ncxPath.substring(0, ncxPath.lastIndexOf('/') + 1) : '';
    let ncxContent = await zip.files[ncxPath].async('string');
    let ncxModified = false;

    // Update renamed files in src
    for (const [oldPath, newPath] of Object.entries(renameMap)) {
      const oldRel = oldPath.startsWith(ncxDir) ? oldPath.slice(ncxDir.length) : oldPath;
      const newRel = newPath.startsWith(ncxDir) ? newPath.slice(ncxDir.length) : newPath;
      if (ncxContent.includes(`src="${oldRel}"`)) {
        ncxContent = ncxContent.split(`src="${oldRel}"`).join(`src="${newRel}"`);
        ncxModified = true;
      }
    }

    // Check dead links in <navPoint>
    if (fixDeadLinks) {
      ncxContent = ncxContent.replace(/<navPoint\b[^>]*>[\s\S]*?<\/navPoint>/gi, (navPointBlock) => {
        const srcMatch = navPointBlock.match(/<content\b[^>]*src=["']([^"']+)["']/i);
        if (srcMatch) {
          const rawSrc = srcMatch[1];
          const filePart = rawSrc.split('#')[0];
          const fullPath = resolveRelativePath(ncxDir, filePart);

          if (!zip.files[fullPath]) {
            // Check if adding .xhtml resolves it
            if (zip.files[fullPath + '.xhtml']) {
              const fixedSrc = rawSrc.replace(filePart, filePart + '.xhtml');
              ncxModified = true;
              return navPointBlock.replace(`src="${rawSrc}"`, `src="${fixedSrc}"`);
            }

            // Has child navPoints? If so, try to redirect src to child's src
            const childSrcMatch = navPointBlock.slice(srcMatch.index! + srcMatch[0].length).match(/<content\b[^>]*src=["']([^"']+)["']/i);
            if (childSrcMatch) {
              ncxModified = true;
              return navPointBlock.replace(`src="${rawSrc}"`, `src="${childSrcMatch[1]}"`);
            }

            // Leaf navPoint with broken target => remove entirely
            report.fixedDeadLinks.push(`ncx:${rawSrc}`);
            ncxModified = true;
            return '';
          }
        }
        return navPointBlock;
      });
    }

    if (ncxModified) {
      zip.file(ncxPath, ncxContent, { date: new Date() });
    }
  }

  // 6. Fix Dead Links & Renamed Files in EPUB 3 NAV document
  const navItemMatch = opfContent.match(/<item\b[^>]*properties=["'][^"']*nav[^"']*["'][^>]*href=["']([^"']+)["']/i)
    || opfContent.match(/<item\b[^>]*href=["']([^"']+)["'][^>]*properties=["'][^"']*nav[^"']*["']/i);

  const navPathCandidate = navItemMatch
    ? resolveRelativePath(opfDir, navItemMatch[1])
    : Object.keys(zip.files).find(f => /nav\.xhtml$/i.test(f) || /toc\.xhtml$/i.test(f));

  if (navPathCandidate && zip.files[navPathCandidate]) {
    const navDir = navPathCandidate.includes('/') ? navPathCandidate.substring(0, navPathCandidate.lastIndexOf('/') + 1) : '';
    let navContent = await zip.files[navPathCandidate].async('string');
    let navModified = false;

    // Update renamed files in href
    for (const [oldPath, newPath] of Object.entries(renameMap)) {
      const oldRel = oldPath.startsWith(navDir) ? oldPath.slice(navDir.length) : oldPath;
      const newRel = newPath.startsWith(navDir) ? newPath.slice(navDir.length) : newPath;
      if (navContent.includes(`href="${oldRel}"`)) {
        navContent = navContent.split(`href="${oldRel}"`).join(`href="${newRel}"`);
        navModified = true;
      }
    }

    // Check dead links in <a>
    if (fixDeadLinks) {
      navContent = navContent.replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, (liBlock) => {
        // If li contains nested ol or ul, do not delete the whole li
        const hasNestedList = /<(ol|ul)\b/i.test(liBlock);
        const aMatch = liBlock.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i);
        if (aMatch) {
          const href = aMatch[1];
          if (!href.startsWith('#') && !href.startsWith('http://') && !href.startsWith('https://')) {
            const filePart = href.split('#')[0];
            const fullPath = resolveRelativePath(navDir, filePart);
            if (!zip.files[fullPath]) {
              if (zip.files[fullPath + '.xhtml']) {
                navModified = true;
                return liBlock.replace(`href="${href}"`, `href="${href.replace(filePart, filePart + '.xhtml')}"`);
              }

              report.fixedDeadLinks.push(`nav:${href}`);
              navModified = true;
              if (hasNestedList) {
                // Strip the <a> tag but keep children
                return liBlock.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/i, '<span>$1</span>');
              }
              return '';
            }
          }
        }
        return liBlock;
      });
    }

    if (navModified) {
      zip.file(navPathCandidate, navContent, { date: new Date() });
    }
  }

  // 7. Fix Content Documents (Encoding, XML Declaration, Renamed file links, body ID)
  const contentFiles = Object.keys(zip.files).filter(f => {
    if (zip.files[f].dir) return false;
    const lower = f.toLowerCase();
    return lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm');
  });

  for (const filePath of contentFiles) {
    const fileDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
    let content = await zip.files[filePath].async('string');
    let fileModified = false;

    // A. Update links to renamed files
    for (const [oldPath, newPath] of Object.entries(renameMap)) {
      const oldRel = oldPath.startsWith(fileDir) ? oldPath.slice(fileDir.length) : oldPath;
      const newRel = newPath.startsWith(fileDir) ? newPath.slice(fileDir.length) : newPath;
      if (content.includes(`href="${oldRel}"`)) {
        content = content.split(`href="${oldRel}"`).join(`href="${newRel}"`);
        fileModified = true;
      }
    }

    // B. Prepend XML declaration if missing (Send to Kindle defaults to ISO-8859-1 without it)
    if (ensureXmlDeclaration && !content.trim().startsWith('<?xml')) {
      content = '<?xml version="1.0" encoding="utf-8"?>\n' + content;
      report.fixedXmlDeclarations.push(filePath);
      fileModified = true;
    }

    // C. Fix <body id="..."> to avoid KindleGen hyperlink body-target warning
    if (/<body\b[^>]*id=["'][^"']+["']/i.test(content)) {
      content = content.replace(/<body\b([^>]*)id=["']([^"']+)["']([^>]*)>/i, '<body$1$3><div id="$2">');
      if (content.includes('</body>')) {
        content = content.replace('</body>', '</div></body>');
      }
      fileModified = true;
    }

    if (fileModified) {
      zip.file(filePath, content, { date: new Date() });
    }
  }

  // 8. Ensure mimetype is stored correctly
  if (!zip.files['mimetype']) {
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', date: new Date(0) });
  }

  report.hasRepairs =
    report.fixedExtensionlessFiles.length > 0 ||
    report.fixedDeadLinks.length > 0 ||
    report.fixedOpfItems.length > 0 ||
    report.normalizedTimestampsCount > 0 ||
    report.fixedXmlDeclarations.length > 0;

  return report;
}

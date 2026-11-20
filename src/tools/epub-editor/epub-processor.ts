import type { KindleRepairReport } from './kindle-fixer';
import type { PageProgressionDirection } from './package-direction';
import type { PreviewChapter } from './preview-chapters';
import type { EmbeddedFontInfo, StyleGeneratorOptions } from './style-generator';
import JSZip from 'jszip';
import {
  decodeBytesAuto,
} from '@/services/epub/encoding';
import {
  detectFontFormatFromBuffer,
  EPUB_FONT_MAP,
  extractFontFamilyName,
  loadBuiltInFontBuffer,
  subsetFontBuffer,
} from '@/services/epub/fonts';
import {
  convertEpubDocumentText,
  findOpfPath,
  getDirPrefix,
  getElementsByLocalName,
  parseOpfMetadata,
  parseXhtmlOrHtml,
  parseXmlSafe,
  readZipTextAuto,
  relativePathFromFile,
  resolveRelativePath,
  serializeXmlWithDecl,
  updateNcxDocTitle,
  updateOpfMetadata,
} from '@/services/epub/xml';
import { convertOpenCC, convertPunctuation } from '@/services/opencc.service';
import { normalizeZipTimestamps, repairKindleEpub, SAFE_ZIP_DATE } from './kindle-fixer';
import { REPLACEABLE_SIMPLIFIED_LANGS, updatePackageDirection } from './package-direction';
import { getOrderedContentPaths, parsePreviewChapter } from './preview-chapters';
import {

  generateStyleOverrides,
  stripPreviousOverrides,

} from './style-generator';

export const MAX_ZIP_ENTRIES = 5000;
export const MAX_TEXT_BYTES_TOTAL = 128 * 1024 * 1024;
export const OVERRIDE_STYLE_ELEMENT_ID = 'epub-editor-overrides';

export interface EpubEditableEntry {
  name: string;
  type: string;
  originalContent: string;
  currentContent: string;
}

export interface DetectedCover {
  path: string;
  mimeType: string;
  blob: Blob;
}

export interface ParsedEpubResult {
  zip: JSZip;
  entries: EpubEditableEntry[];
  opfPath: string;
  title: string;
  author: string;
  cover: DetectedCover | null;
  previewChapters: PreviewChapter[];
  repairReport: KindleRepairReport | null;
}

export interface ProcessEpubSettings extends StyleGeneratorOptions {
  convertMode: 'twp' | 'tw' | 'off';
  convertPunctuation: boolean;
  pageProgressionDirection?: PageProgressionDirection;
  fontEmbedMode: 'none' | 'subset' | 'full';
  fixKindleCompatibility: boolean;
}

export interface ProcessEpubInput {
  sourceZip: JSZip;
  editedFiles?: Record<string, string>;
  bookTitle: string;
  bookAuthor: string;
  originalTitle: string;
  originalAuthor: string;
  originalFileName: string;
  settings: ProcessEpubSettings;
  coverAction: 'keep' | 'replace' | 'remove';
  originalCoverPath?: string | null;
  newCover?: { buffer: ArrayBuffer; mimeType: string } | null;
  customFont?: { buffer: ArrayBuffer; name: string } | null;
  onProgress?: (stage: string, percent: number) => void;
}

export interface ProcessEpubOutput {
  blob: Blob;
  outputFileName: string;
  repairReport: KindleRepairReport | null;
}

function isEditableTextPath(filename: string): boolean {
  const ext = filename.toLowerCase();
  return (
    ext.endsWith('.xhtml')
    || ext.endsWith('.html')
    || ext.endsWith('.htm')
    || ext.endsWith('.ncx')
    || ext.endsWith('.opf')
    || ext.endsWith('.css')
  );
}

function isHtmlPath(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm');
}

export function validateZipLimits(zip: JSZip): void {
  const keys = Object.keys(zip.files);
  if (keys.length > MAX_ZIP_ENTRIES) {
    throw new Error(`EPUB 檔案包含過多項目 (${keys.length} > ${MAX_ZIP_ENTRIES})，已中止載入以保護瀏覽器記憶體`);
  }
}

export async function extractEditableEntries(zip: JSZip): Promise<{
  entries: EpubEditableEntry[];
  opfPath: string;
  title: string;
  author: string;
}> {
  const entries: EpubEditableEntry[] = [];
  let totalDecodedBytes = 0;

  for (const [filename, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isEditableTextPath(filename)) {
      continue;
    }

    const bytes = await entry.async('uint8array');
    totalDecodedBytes += bytes.byteLength;
    if (totalDecodedBytes > MAX_TEXT_BYTES_TOTAL) {
      throw new Error('EPUB 文字內容總體積超過安全上限 (128MB)，建議先拆冊後再處理');
    }

    const textContent = decodeBytesAuto(bytes);
    const dotIdx = filename.lastIndexOf('.');
    entries.push({
      name: filename,
      type: dotIdx >= 0
        ? filename.slice(dotIdx)
        : '',
      originalContent: textContent,
      currentContent: textContent,
    });
  }

  const rootOpf = (await findOpfPath(zip)) || '';
  const opfEntry = entries.find(e => e.name === rootOpf) || entries.find(e => e.name.toLowerCase().endsWith('.opf'));
  const meta = opfEntry
    ? parseOpfMetadata(opfEntry.currentContent)
    : { title: '', author: '' };

  return {
    entries,
    opfPath: opfEntry?.name || rootOpf,
    title: meta.title,
    author: meta.author,
  };
}

export async function detectCoverFromZip(zip: JSZip): Promise<DetectedCover | null> {
  const opfFile = await findOpfPath(zip);
  if (!opfFile) {
    return null;
  }

  const opfContent = await readZipTextAuto(zip, opfFile);
  if (!opfContent) {
    return null;
  }

  const opfDir = getDirPrefix(opfFile);
  const doc = parseXmlSafe(opfContent);
  if (!doc) {
    return null;
  }

  const manifestItems = getElementsByLocalName(doc, 'item');

  // EPUB 3: properties="cover-image"
  for (const item of manifestItems) {
    const props = (item.getAttribute('properties') || '').split(/\s+/);
    const href = item.getAttribute('href');
    if (href && props.includes('cover-image')) {
      const imgPath = resolveRelativePath(opfDir, href);
      if (zip.files[imgPath] && !zip.files[imgPath].dir) {
        const blob = await zip.files[imgPath].async('blob');
        return {
          path: imgPath,
          mimeType: item.getAttribute('media-type') || 'image/jpeg',
          blob,
        };
      }
    }
  }

  // EPUB 2: <meta name="cover" content="cover-id"/>
  let coverId: string | null = null;
  for (const meta of getElementsByLocalName(doc, 'meta')) {
    if ((meta.getAttribute('name') || '').toLowerCase() === 'cover') {
      coverId = meta.getAttribute('content');
      if (coverId) {
        break;
      }
    }
  }

  if (coverId) {
    const targetItem = manifestItems.find(item => item.getAttribute('id') === coverId);
    const href = targetItem?.getAttribute('href');
    if (href) {
      const imgPath = resolveRelativePath(opfDir, href);
      if (zip.files[imgPath] && !zip.files[imgPath].dir) {
        const blob = await zip.files[imgPath].async('blob');
        return {
          path: imgPath,
          mimeType: targetItem?.getAttribute('media-type') || 'image/jpeg',
          blob,
        };
      }
    }
  }

  return null;
}

export async function extractPreviewChapters(zip: JSZip): Promise<PreviewChapter[]> {
  const orderedPaths = await getOrderedContentPaths(zip);
  const skipPatterns = /cover|nav|toc|colophon|copyright|titlepage|frontmatter/i;
  const candidates = orderedPaths.filter(filename => !skipPatterns.test(filename.split('/').pop() || ''));
  const contentFiles = candidates.length > 0
    ? candidates
    : orderedPaths;
  const chapters: PreviewChapter[] = [];

  for (const filename of contentFiles) {
    const html = await readZipTextAuto(zip, filename);
    if (!html) {
      continue;
    }
    const fallbackTitle = filename.split('/').pop()?.replace(/\.[^.]+$/, '') || '預覽章節';
    const chapter = parsePreviewChapter(html, fallbackTitle, filename);
    if (chapter.text) {
      chapters.push(chapter);
    }
  }

  return chapters.length > 0
    ? chapters
    : [
        { title: '即時預覽', text: '此電子書未包含符合條件的內容網頁檔案。' },
      ];
}

export async function loadEpubArchive(
  data: File | ArrayBuffer | Uint8Array,
  fixKindleCompatibility = true,
): Promise<ParsedEpubResult> {
  const zip = await JSZip.loadAsync(data);
  validateZipLimits(zip);

  let repairReport: KindleRepairReport | null = null;
  if (fixKindleCompatibility) {
    repairReport = await repairKindleEpub(zip);
  }

  const { entries, opfPath, title, author } = await extractEditableEntries(zip);
  const cover = await detectCoverFromZip(zip);
  const previewChapters = await extractPreviewChapters(zip);

  return {
    zip,
    entries,
    opfPath,
    title,
    author,
    cover,
    previewChapters,
    repairReport,
  };
}

/**
 * Clones sourceZip into a fresh JSZip with OCF-compliant `mimetype` as the very first STORE entry.
 */
async function cloneZipWithOcfMimetypeFirst(
  sourceZip: JSZip,
  editedFiles: Record<string, string>,
): Promise<JSZip> {
  const out = new JSZip();
  out.file('mimetype', 'application/epub+zip', {
    compression: 'STORE',
    date: SAFE_ZIP_DATE,
  });

  for (const [name, entry] of Object.entries(sourceZip.files)) {
    if (entry.dir || name === 'mimetype') {
      continue;
    }
    const validDate = entry.date && !Number.isNaN(entry.date.getTime()) && entry.date.getFullYear() >= 1980 && entry.date.getFullYear() <= 2035
      ? entry.date
      : SAFE_ZIP_DATE;

    if (Object.hasOwn(editedFiles, name)) {
      out.file(name, editedFiles[name], { date: SAFE_ZIP_DATE });
    }
    else {
      const bytes = await entry.async('uint8array');
      out.file(name, bytes, { date: validDate });
    }
  }

  return out;
}

async function removeOldFontsFromEpub(zip: JSZip): Promise<void> {
  const fontExts = ['.ttf', '.otf', '.woff', '.woff2'];
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) {
      continue;
    }
    const lo = name.toLowerCase();
    if (fontExts.some(ext => lo.endsWith(ext))) {
      zip.remove(name);
    }
  }

  const opfPath = await findOpfPath(zip);
  if (opfPath) {
    const rawOpf = await readZipTextAuto(zip, opfPath);
    const opfDoc = rawOpf
      ? parseXmlSafe(rawOpf)
      : null;
    if (opfDoc) {
      let changed = false;
      for (const item of getElementsByLocalName(opfDoc, 'item')) {
        const href = (item.getAttribute('href') || '').toLowerCase();
        const media = (item.getAttribute('media-type') || '').toLowerCase();
        const id = item.getAttribute('id') || '';
        const isFontMedia = media.startsWith('font/')
          || media.includes('font-')
          || media === 'application/vnd.ms-opentype';
        const isFontExt = fontExts.some(ext => href.endsWith(ext));
        if (isFontMedia || isFontExt || id === 'epub-editor-font' || id === 'hr-custom-font') {
          item.parentNode?.removeChild(item);
          changed = true;
        }
      }
      if (changed) {
        zip.file(opfPath, serializeXmlWithDecl(opfDoc, rawOpf!), { date: SAFE_ZIP_DATE });
      }
    }
  }

  const cssFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir && f.toLowerCase().endsWith('.css'));
  for (const cf of cssFiles) {
    const raw = await readZipTextAuto(zip, cf);
    if (raw === null) {
      continue;
    }
    const cleaned = stripPreviousOverrides(raw.replace(/@font-face\s*\{[^}]*\}\s*/g, ''));
    zip.file(cf, cleaned, { date: SAFE_ZIP_DATE });
  }
}

async function embedFontIntoEpub(
  zip: JSZip,
  fontBuffer: ArrayBuffer,
  meta: { embeddedFilename: string; mime: string; format: string },
): Promise<string> {
  const opfPath = await findOpfPath(zip);
  const opfDir = opfPath
    ? getDirPrefix(opfPath)
    : '';
  const targetPath = `${opfDir}fonts/${meta.embeddedFilename}`;
  zip.file(targetPath, fontBuffer, { date: SAFE_ZIP_DATE });

  if (opfPath) {
    const rawOpf = await readZipTextAuto(zip, opfPath);
    const opfDoc = rawOpf
      ? parseXmlSafe(rawOpf)
      : null;
    if (opfDoc) {
      const manifest = getElementsByLocalName(opfDoc, 'manifest')[0];
      if (manifest) {
        // Ensure unique item id
        for (const existing of getElementsByLocalName(manifest, 'item')) {
          if (existing.getAttribute('id') === 'epub-editor-font') {
            existing.parentNode?.removeChild(existing);
          }
        }
        const href = targetPath.startsWith(opfDir)
          ? targetPath.slice(opfDir.length)
          : relativePathFromFile(opfPath, targetPath);
        const item = opfDoc.createElementNS(manifest.namespaceURI, 'item');
        item.setAttribute('id', 'epub-editor-font');
        item.setAttribute('href', href);
        item.setAttribute('media-type', meta.mime);
        manifest.appendChild(item);
        zip.file(opfPath, serializeXmlWithDecl(opfDoc, rawOpf!), { date: SAFE_ZIP_DATE });
      }
    }
  }

  return targetPath;
}

async function collectCodepointsFromZip(zip: JSZip): Promise<Set<number>> {
  const set = new Set<number>();
  for (let a = 0x20; a < 0x7F; a++) {
    set.add(a);
  }

  const textFiles = Object.keys(zip.files).filter((f) => {
    if (zip.files[f].dir) {
      return false;
    }
    const lower = f.toLowerCase();
    return (
      lower.endsWith('.xhtml')
      || lower.endsWith('.html')
      || lower.endsWith('.htm')
      || lower.endsWith('.ncx')
      || lower.endsWith('.opf')
    );
  });

  for (const fn of textFiles) {
    const text = await readZipTextAuto(zip, fn);
    if (!text) {
      continue;
    }
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined) {
        set.add(cp);
      }
    }
  }
  return set;
}

async function injectStyleOverridesIntoEpub(
  zip: JSZip,
  options: StyleGeneratorOptions,
  fontInfo: EmbeddedFontInfo | null,
  languageOptions: { ensureVerticalHtmlLang?: boolean; targetLanguage?: string } = {},
): Promise<void> {
  const cssFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir && f.toLowerCase().endsWith('.css'));

  for (const filename of cssFiles) {
    const raw = await readZipTextAuto(zip, filename);
    if (raw === null) {
      continue;
    }
    const baseCss = stripPreviousOverrides(raw);
    const overrides = generateStyleOverrides(options, filename, fontInfo);
    zip.file(filename, `${baseCss}\n${overrides}`, { date: SAFE_ZIP_DATE });
  }

  const xhtmlFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir && isHtmlPath(f));
  for (const filename of xhtmlFiles) {
    const raw = await readZipTextAuto(zip, filename);
    if (raw === null) {
      continue;
    }

    const overrides = generateStyleOverrides(options, filename, fontInfo);
    const { doc } = parseXhtmlOrHtml(raw);

    // Idempotently remove any existing override <style>
    for (const styleEl of getElementsByLocalName(doc, 'style')) {
      const id = styleEl.getAttribute('id');
      if (id === OVERRIDE_STYLE_ELEMENT_ID || (styleEl.textContent || '').includes('HelloRuru EPUB Editor')) {
        styleEl.parentNode?.removeChild(styleEl);
      }
    }

    const htmlEl = getElementsByLocalName(doc, 'html')[0] || doc.documentElement;
    if ((languageOptions.ensureVerticalHtmlLang || languageOptions.targetLanguage) && htmlEl) {
      const currentLang = (htmlEl.getAttribute('lang') || '').trim();
      const currentXmlLang = (htmlEl.getAttribute('xml:lang') || '').trim();
      let resolvedLang = currentXmlLang || currentLang;
      if (languageOptions.targetLanguage && (!resolvedLang || REPLACEABLE_SIMPLIFIED_LANGS.has(resolvedLang.toLowerCase()))) {
        resolvedLang = languageOptions.targetLanguage;
      }
      else if (!resolvedLang && languageOptions.ensureVerticalHtmlLang) {
        resolvedLang = 'zh-TW';
      }
      if (resolvedLang) {
        htmlEl.setAttribute('xml:lang', resolvedLang);
        htmlEl.setAttribute('lang', resolvedLang);
      }
    }

    let headEl = getElementsByLocalName(doc, 'head')[0];
    if (!headEl && htmlEl) {
      headEl = doc.createElementNS(htmlEl.namespaceURI, 'head');
      htmlEl.insertBefore(headEl, htmlEl.firstChild);
    }

    if (headEl) {
      const styleEl = doc.createElementNS(headEl.namespaceURI, 'style');
      styleEl.setAttribute('id', OVERRIDE_STYLE_ELEMENT_ID);
      styleEl.setAttribute('type', 'text/css');
      styleEl.textContent = overrides;
      headEl.appendChild(styleEl);
      zip.file(filename, serializeXmlWithDecl(doc, raw), { date: SAFE_ZIP_DATE });
    }
  }
}

async function applyCoverChanges(
  zip: JSZip,
  action: 'keep' | 'replace' | 'remove',
  originalCoverPath?: string | null,
  newCover?: { buffer: ArrayBuffer; mimeType: string } | null,
): Promise<void> {
  if (action === 'keep') {
    return;
  }

  const opfPath = await findOpfPath(zip);
  if (!opfPath) {
    return;
  }

  const rawOpf = await readZipTextAuto(zip, opfPath);
  const opfDoc = rawOpf
    ? parseXmlSafe(rawOpf)
    : null;
  if (!opfDoc) {
    return;
  }

  const opfDir = getDirPrefix(opfPath);
  const metadataEl = getElementsByLocalName(opfDoc, 'metadata')[0];
  const manifestEl = getElementsByLocalName(opfDoc, 'manifest')[0];

  // Discover existing cover ids & paths before removing them
  const oldCoverIds = new Set<string>(['cover-image']);
  const oldCoverPaths = new Set<string>();
  if (originalCoverPath) {
    oldCoverPaths.add(originalCoverPath);
  }

  if (metadataEl) {
    for (const meta of getElementsByLocalName(metadataEl, 'meta')) {
      if ((meta.getAttribute('name') || '').toLowerCase() === 'cover') {
        const contentId = meta.getAttribute('content');
        if (contentId) {
          oldCoverIds.add(contentId);
        }
        meta.parentNode?.removeChild(meta);
      }
    }
  }

  if (manifestEl) {
    for (const item of getElementsByLocalName(manifestEl, 'item')) {
      const id = item.getAttribute('id') || '';
      const props = (item.getAttribute('properties') || '').split(/\s+/);
      const href = item.getAttribute('href') || '';
      const resolvedPath = href
        ? resolveRelativePath(opfDir, href)
        : '';
      const media = (item.getAttribute('media-type') || '').toLowerCase();

      const isCoverManifestItem
        = props.includes('cover-image')
          || (oldCoverIds.has(id) && media.startsWith('image/'))
          || (originalCoverPath && resolvedPath === originalCoverPath);

      if (isCoverManifestItem) {
        if (resolvedPath) {
          oldCoverPaths.add(resolvedPath);
        }
        item.parentNode?.removeChild(item);
      }
    }
  }

  for (const oldPath of oldCoverPaths) {
    if (zip.files[oldPath]) {
      zip.remove(oldPath);
    }
  }

  if (action === 'remove' || !newCover) {
    zip.file(opfPath, serializeXmlWithDecl(opfDoc, rawOpf!), { date: SAFE_ZIP_DATE });
    return;
  }

  const mime = newCover.mimeType || 'image/jpeg';
  const ext = mime === 'image/png'
    ? '.png'
    : mime === 'image/webp'
      ? '.webp'
      : '.jpg';
  let imagesDir = `${opfDir}Images/`;
  const existingImg = Object.keys(zip.files).find(
    f => !zip.files[f].dir && f.toLowerCase().startsWith(`${opfDir}images/`.toLowerCase()),
  );
  if (existingImg) {
    const idx = existingImg.toLowerCase().indexOf('images/');
    imagesDir = existingImg.slice(0, idx + 7);
  }

  const coverPath = `${imagesDir}cover${ext}`;
  const coverHref = coverPath.startsWith(opfDir)
    ? coverPath.slice(opfDir.length)
    : relativePathFromFile(opfPath, coverPath);

  zip.file(coverPath, newCover.buffer, { date: SAFE_ZIP_DATE });

  if (manifestEl) {
    const item = opfDoc.createElementNS(manifestEl.namespaceURI, 'item');
    item.setAttribute('id', 'cover-image');
    item.setAttribute('href', coverHref);
    item.setAttribute('media-type', mime);
    item.setAttribute('properties', 'cover-image');
    manifestEl.appendChild(item);
  }

  if (metadataEl) {
    const meta = opfDoc.createElementNS(metadataEl.namespaceURI, 'meta');
    meta.setAttribute('name', 'cover');
    meta.setAttribute('content', 'cover-image');
    metadataEl.appendChild(meta);
  }

  zip.file(opfPath, serializeXmlWithDecl(opfDoc, rawOpf!), { date: SAFE_ZIP_DATE });
}

export async function processEpubPackage(input: ProcessEpubInput): Promise<ProcessEpubOutput> {
  const {
    sourceZip,
    editedFiles = {},
    bookTitle,
    bookAuthor,
    originalTitle,
    originalAuthor,
    originalFileName,
    settings,
    coverAction,
    originalCoverPath,
    newCover,
    customFont,
    onProgress = () => {},
  } = input;

  onProgress('正在初始化輸出套件...', 5);
  const outputZip = await cloneZipWithOcfMimetypeFirst(sourceZip, editedFiles);

  // 1. OpenCC & Punctuation Conversion on DOM text nodes (never raw XML tags/attrs)
  const convertText = (text: string): string => {
    let out = text;
    if (settings.convertMode !== 'off') {
      const dir = settings.convertMode === 'twp'
        ? 's2twp'
        : 's2tw';
      out = convertOpenCC(out, dir);
    }
    if (settings.convertPunctuation) {
      out = convertPunctuation(out);
    }
    return out;
  };

  if (settings.convertMode !== 'off' || settings.convertPunctuation) {
    const targetFiles = Object.keys(outputZip.files).filter((f) => {
      if (outputZip.files[f].dir) {
        return false;
      }
      const lo = f.toLowerCase();
      return (
        lo.endsWith('.xhtml')
        || lo.endsWith('.html')
        || lo.endsWith('.htm')
        || lo.endsWith('.ncx')
        || lo.endsWith('.opf')
      );
    });

    for (let i = 0; i < targetFiles.length; i++) {
      const filename = targetFiles[i];
      const ext = filename.toLowerCase().slice(filename.lastIndexOf('.')) as '.xhtml' | '.html' | '.htm' | '.ncx' | '.opf';
      onProgress(`轉換內文 (${i + 1}/${targetFiles.length}): ${filename.split('/').pop()}`, 10 + Math.floor((i / Math.max(targetFiles.length, 1)) * 45));

      const raw = await readZipTextAuto(outputZip, filename);
      if (raw === null) {
        continue;
      }

      const updated = convertEpubDocumentText(
        raw,
        ext,
        ext === '.xhtml' || ext === '.html' || ext === '.htm' || ext === '.ncx' || ext === '.opf'
          ? convertText
          : s => s,
        true,
      );

      if (updated !== raw) {
        outputZip.file(filename, updated, { date: SAFE_ZIP_DATE });
      }
      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }

  // 1b. Write back user-edited bookTitle & bookAuthor to OPF and NCX (fixes P0-1)
  const effectiveTitle = bookTitle.trim() !== originalTitle.trim()
    ? bookTitle
    : (settings.convertMode !== 'off'
        ? convertText(bookTitle)
        : bookTitle);
  const effectiveAuthor = bookAuthor.trim() !== originalAuthor.trim()
    ? bookAuthor
    : (settings.convertMode !== 'off'
        ? convertText(bookAuthor)
        : bookAuthor);

  const opfPath = await findOpfPath(outputZip);
  if (opfPath) {
    const rawOpf = await readZipTextAuto(outputZip, opfPath);
    if (rawOpf) {
      const nextOpf = updateOpfMetadata(rawOpf, {
        title: effectiveTitle,
        author: effectiveAuthor,
      });
      if (nextOpf !== rawOpf) {
        outputZip.file(opfPath, nextOpf, { date: SAFE_ZIP_DATE });
      }
    }
  }
  if (effectiveTitle.trim()) {
    const ncxFiles = Object.keys(outputZip.files).filter(f => !outputZip.files[f].dir && f.toLowerCase().endsWith('.ncx'));
    for (const ncxPath of ncxFiles) {
      const rawNcx = await readZipTextAuto(outputZip, ncxPath);
      if (rawNcx) {
        const nextNcx = updateNcxDocTitle(rawNcx, effectiveTitle);
        if (nextNcx !== rawNcx) {
          outputZip.file(ncxPath, nextNcx, { date: SAFE_ZIP_DATE });
        }
      }
    }
  }

  // 2. Font Embedding / Subsetting via unified fonteditor-core
  let finalFontInfo: EmbeddedFontInfo | null = null;
  const isCustom = settings.fontFamily === 'custom';
  const isStandard = settings.fontFamily !== 'default' && settings.fontFamily !== 'custom';
  const shouldEmbed = settings.fontEmbedMode !== 'none';

  if (shouldEmbed && isCustom && customFont) {
    onProgress('正在清理舊字型...', 62);
    await removeOldFontsFromEpub(outputZip);

    if (settings.fontEmbedMode === 'subset') {
      onProgress('正在收集書中字元並子集化自訂字型...', 68);
      const cps = await collectCodepointsFromZip(outputZip);
      try {
        const subset = await subsetFontBuffer(customFont.buffer, cps, { fallbackName: customFont.name });
        const meta = {
          embeddedFilename: 'epub-custom-font.ttf',
          mime: subset.mime,
          format: subset.format,
        };
        const embeddedPath = await embedFontIntoEpub(outputZip, subset.buffer, meta);
        finalFontInfo = { embeddedPath, format: subset.format, realName: subset.family };
      }
      catch (err) {
        console.warn('自訂字型子集化失敗，改為完整嵌入：', err);
        const fmt = detectFontFormatFromBuffer(customFont.buffer, customFont.name);
        const realName = (await extractFontFamilyName(customFont.buffer, customFont.name)) || 'CustomUserFont';
        const meta = {
          embeddedFilename: `epub-custom-font.${fmt.ext}`,
          mime: fmt.mime,
          format: fmt.format,
        };
        const embeddedPath = await embedFontIntoEpub(outputZip, customFont.buffer, meta);
        finalFontInfo = { embeddedPath, format: fmt.format, realName };
      }
    }
    else {
      onProgress('正在嵌入完整自訂字型...', 72);
      const fmt = detectFontFormatFromBuffer(customFont.buffer, customFont.name);
      const realName = (await extractFontFamilyName(customFont.buffer, customFont.name)) || 'CustomUserFont';
      const meta = {
        embeddedFilename: `epub-custom-font.${fmt.ext}`,
        mime: fmt.mime,
        format: fmt.format,
      };
      const embeddedPath = await embedFontIntoEpub(outputZip, customFont.buffer, meta);
      finalFontInfo = { embeddedPath, format: fmt.format, realName };
    }
  }
  else if (shouldEmbed && isStandard) {
    const fontConfig = EPUB_FONT_MAP[settings.fontFamily];
    if (fontConfig && fontConfig.file) {
      onProgress('正在清理舊字型...', 62);
      await removeOldFontsFromEpub(outputZip);

      onProgress(`正在載入 ${fontConfig.name}...`, 66);
      const rawBuffer = await loadBuiltInFontBuffer(settings.fontFamily);

      if (settings.fontEmbedMode === 'subset') {
        onProgress('正在收集書中字元並子集化...', 70);
        const cps = await collectCodepointsFromZip(outputZip);
        try {
          const subset = await subsetFontBuffer(rawBuffer, cps, {
            fallbackName: fontConfig.file,
            preferredFamily: fontConfig.name,
          });
          const meta = {
            embeddedFilename: `epub-${settings.fontFamily}.ttf`,
            mime: subset.mime,
            format: subset.format,
          };
          const embeddedPath = await embedFontIntoEpub(outputZip, subset.buffer, meta);
          finalFontInfo = { embeddedPath, format: subset.format, realName: subset.family };
        }
        catch (err) {
          console.warn('標準字型子集化失敗，改用完整嵌入：', err);
          const meta = {
            embeddedFilename: `epub-${settings.fontFamily}.${fontConfig.ext}`,
            mime: fontConfig.mime,
            format: fontConfig.format,
          };
          const embeddedPath = await embedFontIntoEpub(outputZip, rawBuffer, meta);
          finalFontInfo = { embeddedPath, format: fontConfig.format, realName: fontConfig.name };
        }
      }
      else {
        const meta = {
          embeddedFilename: `epub-${settings.fontFamily}.${fontConfig.ext}`,
          mime: fontConfig.mime,
          format: fontConfig.format,
        };
        const embeddedPath = await embedFontIntoEpub(outputZip, rawBuffer, meta);
        finalFontInfo = { embeddedPath, format: fontConfig.format, realName: fontConfig.name };
      }
    }
  }

  // 3. CSS & Style Overrides
  onProgress('套用字體與排版覆蓋樣式...', 80);
  const ensureVerticalHtmlLang = settings.fixKindleCompatibility && settings.writingMode === 'vertical';
  const targetLanguage = settings.convertMode !== 'off'
    ? 'zh-TW'
    : undefined;
  await injectStyleOverridesIntoEpub(outputZip, settings, finalFontInfo, {
    ensureVerticalHtmlLang,
    targetLanguage,
  });

  // 4. Spine page-progression-direction & Kindle metadata sync
  onProgress('設定翻頁方向與套件描述...', 84);
  if (opfPath) {
    const rawOpf = await readZipTextAuto(outputZip, opfPath);
    if (rawOpf) {
      outputZip.file(
        opfPath,
        updatePackageDirection(rawOpf, settings.writingMode, {
          pageProgressionDirection: settings.pageProgressionDirection ?? 'auto',
          ensureKindleMetadata: settings.fixKindleCompatibility,
          targetLanguage,
        }),
        { date: SAFE_ZIP_DATE },
      );
    }
  }

  // 5. Cover changes
  if (coverAction !== 'keep') {
    onProgress('套用封面變更...', 88);
    await applyCoverChanges(outputZip, coverAction, originalCoverPath, newCover);
  }

  // 6. Final Kindle compatibility check & timestamp normalization
  onProgress('執行最終封裝與相容性檢查...', 92);
  let repairReport: KindleRepairReport | null = null;
  if (settings.fixKindleCompatibility) {
    repairReport = await repairKindleEpub(outputZip);
  }
  normalizeZipTimestamps(outputZip);

  const blob = await outputZip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress(`壓縮封裝中: ${Math.floor(metadata.percent)}%`, 92 + Math.floor(metadata.percent * 0.08));
    },
  );

  const baseName = originalFileName.replace(/\.epub$/i, '').trim() || 'book';
  let outputName = baseName;
  if (settings.convertMode !== 'off') {
    try {
      outputName = convertOpenCC(baseName, settings.convertMode === 'twp'
        ? 's2twp'
        : 's2tw');
    }
    catch {
      outputName = baseName;
    }
  }
  const suffixes: string[] = [];
  if (settings.convertMode === 'twp') {
    suffixes.push('繁・詞彙');
  }
  else if (settings.convertMode === 'tw') {
    suffixes.push('繁');
  }
  if (settings.writingMode === 'vertical') {
    suffixes.push('直排');
  }
  if (suffixes.length > 0) {
    outputName += `（${suffixes.join('・')}）`;
  }

  onProgress('處理完成', 100);
  return {
    blob,
    outputFileName: `${outputName}.epub`,
    repairReport,
  };
}

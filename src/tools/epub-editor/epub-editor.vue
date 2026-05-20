<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import JSZip from 'jszip';
import { translate } from '@/plugins/i18n.plugin';
import { convertOpenCC } from '@/services/opencc.service';
import { detectEncoding, decodeWithEncoding } from '../txt-to-epub/encodingDetector';

const message = useMessage();

// EPUB File state
const file = ref<File | null>(null);
const isProcessing = ref(false);
const progressStage = ref('');
const progressPercent = ref(0);

// JSZip instance & files list
const zipInstance = ref<JSZip | null>(null);
const fileEntries = ref<Array<{ name: string; type: string; originalContent: string; currentContent: string }>>([]);
const selectedFileName = ref<string | null>(null);
const activeFileContent = ref('');

// Book metadata
const bookTitle = ref('');
const bookAuthor = ref('');
const opfPath = ref('');

// Tab settings
const activeTab = ref<'preview' | 'editor' | 'metadata'>('preview');

// Conversion and layout settings
const settings = ref({
  convertMode: 'twp', // 'twp' (詞彙) | 'tw' (純字) | 'off' (關閉)
  convertPunctuation: true,
  writingMode: 'horizontal' as 'horizontal' | 'vertical',
  fontFamily: 'noto-sans', // 'noto-sans' | 'noto-serif' | 'guankiap' | 'huninn' | 'default' | 'custom'
  fontEmbedMode: 'full' as 'none' | 'subset' | 'full',
  fontSize: 'medium', // 'small' | 'medium' | 'large' | 'xlarge'
  lineHeight: 'normal', // 'compact' | 'normal' | 'relaxed' | 'loose'
  textIndent: 'two', // 'none' | 'one' | 'two'
});

// Custom Font File
const customFontFile = ref<File | null>(null);
const customFontUrl = ref('');
const isCustomFontLoading = ref(false);

// Cover Image state
const originalCover = ref<{ path: string; mimeType: string; dataUrl: string } | null>(null);
const coverAction = ref<'keep' | 'replace' | 'remove'>('keep');
const newCoverBlob = ref<File | null>(null);
const newCoverPreviewUrl = ref('');

// Live Preview Sample Text
const previewTitle = ref('即時排版預覽');
const previewText = ref('載入 EPUB 電子書後，這裡將會呈現第一個內容章節的實際渲染結果。您可以調整左側的排版、字型、直橫排等參數，效果會即時更新。');

// Constants
const SIZE_MAP: Record<string, string> = {
  small: '0.9em',
  medium: '1.0em',
  large: '1.15em',
  xlarge: '1.3em',
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  compact: '1.5',
  normal: '1.8',
  relaxed: '2.0',
  loose: '2.3',
};

const INDENT_MAP: Record<string, string> = {
  none: '0',
  one: '1em',
  two: '2em',
};

const FONT_MAP: Record<string, { family: string; name: string; file: string; ext: string; mime: string; format: string }> = {
  'noto-sans': { family: '"NotoSansCJKtc", "Noto Sans TC", "Microsoft JhengHei", sans-serif', name: '思源黑體', file: '/fonts/NotoSansCJKtc-Regular.otf', ext: 'otf', mime: 'font/otf', format: 'opentype' },
  'noto-serif': { family: '"NotoSerifCJKtc", "Noto Serif TC", "PMingLiU", serif', name: '思源宋體', file: '/fonts/NotoSerifCJKtc-Regular.otf', ext: 'otf', mime: 'font/otf', format: 'opentype' },
  'guankiap': { family: '"GuanKiapTsingKhai", "GuanKiapTsingKhai TW", "DFKai-SB", "BiauKai", serif', name: '原俠正楷', file: '/fonts/GuanKiapTsingKhai-TW.ttf', ext: 'ttf', mime: 'font/ttf', format: 'truetype' },
  'huninn': { family: '"jf-openhuninn", "Microsoft JhengHei", sans-serif', name: 'jf 粉圓', file: '/fonts/jf-openhuninn.ttf', ext: 'ttf', mime: 'font/ttf', format: 'truetype' },
  'custom': { family: '"EpubEditorPreviewCustom", sans-serif', name: '自訂字型', file: '', ext: '', mime: '', format: '' },
  'default': { family: 'inherit', name: '閱讀器預設', file: '', ext: '', mime: '', format: '' },
};

// OpenCC Punctuation mapping
const PUNCTUATION_MAP: Record<string, string> = {
  '\u201C': '\u300C',  // “ -> 「
  '\u201D': '\u300D',  // ” -> 」
  '\u2018': '\u300E',  // ‘ -> 『
  '\u2019': '\u300F',  // ’ -> 』
};

// Drag and drop state
const isDragging = ref(false);
const isCoverDragging = ref(false);

const editableFiles = computed(() => {
  return fileEntries.value.filter(entry => 
    entry.name.endsWith('.xhtml') || 
    entry.name.endsWith('.html') || 
    entry.name.endsWith('.htm') || 
    entry.name.endsWith('.ncx') || 
    entry.name.endsWith('.opf') ||
    entry.name.endsWith('.css')
  );
});

// Process preview paragraphs
const processedPreviewTitle = computed(() => {
  let title = previewTitle.value;
  if (settings.value.convertMode !== 'off') {
    const dir = settings.value.convertMode === 'twp' ? 's2twp' : 's2tw';
    title = convertOpenCC(title, dir);
  }
  if (settings.value.convertPunctuation) {
    title = convertPunctuation(title);
  }
  return title;
});

const processedPreviewParagraphs = computed(() => {
  const rawText = previewText.value;
  const paras = rawText.split(/\n+/).filter(p => p.trim());
  return paras.map(p => {
    let t = p.trim();
    if (settings.value.convertMode !== 'off') {
      const dir = settings.value.convertMode === 'twp' ? 's2twp' : 's2tw';
      t = convertOpenCC(t, dir);
    }
    if (settings.value.convertPunctuation) {
      t = convertPunctuation(t);
    }
    return t;
  });
});

const computedPreviewFontFamily = computed(() => {
  const font = settings.value.fontFamily;
  if (font === 'custom' && customFontUrl.value) {
    return '"EpubEditorPreviewCustom", sans-serif';
  }
  return FONT_MAP[font]?.family || 'sans-serif';
});

// Watch custom font file to update preview sub-setting
watch([customFontFile, previewTitle, previewText, () => settings.value.fontFamily], () => {
  if (settings.value.fontFamily === 'custom' && customFontFile.value) {
    injectCustomFontForPreview();
  }
});

// Watch activeFileContent to auto-save to fileEntries
watch(activeFileContent, (newVal) => {
  if (selectedFileName.value) {
    const found = fileEntries.value.find(e => e.name === selectedFileName.value);
    if (found) {
      found.currentContent = newVal;
    }
  }
});

// WebAssembly HarfBuzz subset loader for preview
let previewHbExports: any = null;
async function loadPreviewHb() {
  if (previewHbExports) return previewHbExports;
  const resp = await fetch('https://cdn.jsdelivr.net/npm/harfbuzzjs@0.4.11/hb-subset.wasm');
  if (!resp.ok) throw new Error('hb-subset.wasm 載入失敗');
  const result = await WebAssembly.instantiate(await resp.arrayBuffer());
  previewHbExports = result.instance.exports;
  return previewHbExports;
}

async function subsetFontForPreview(fontBuffer: ArrayBuffer, cps: Set<number>): Promise<ArrayBuffer> {
  const ex = await loadPreviewHb();
  const fontBytes = new Uint8Array(fontBuffer);
  const ptr = ex.malloc(fontBytes.byteLength);
  new Uint8Array(ex.memory.buffer).set(fontBytes, ptr);
  
  const blob = ex.hb_blob_create(ptr, fontBytes.byteLength, 2, 0, 0);
  const face = ex.hb_face_create(blob, 0);
  ex.hb_blob_destroy(blob);
  
  const input = ex.hb_subset_input_create_or_fail();
  const us = ex.hb_subset_input_unicode_set(input);
  cps.forEach(cp => ex.hb_set_add(us, cp));
  
  const sub = ex.hb_subset_or_fail(face, input);
  ex.hb_subset_input_destroy(input);
  if (!sub) {
    ex.hb_face_destroy(face);
    ex.free(ptr);
    throw new Error('hb_subset_or_fail 失敗');
  }
  
  const rb = ex.hb_face_reference_blob(sub);
  const offset = ex.hb_blob_get_data(rb, 0);
  const len = ex.hb_blob_get_length(rb);
  const view = new Uint8Array(ex.memory.buffer, offset, len);
  const data = new Uint8Array(len);
  data.set(view);
  
  ex.hb_blob_destroy(rb);
  ex.hb_face_destroy(sub);
  ex.hb_face_destroy(face);
  ex.free(ptr);
  return data.buffer;
}

async function injectCustomFontForPreview() {
  const f = customFontFile.value;
  if (!f) return;
  
  isCustomFontLoading.value = true;
  try {
    const sample = previewTitle.value + '\n' + previewText.value;
    const cps = new Set<number>();
    for (let i = 0; i < sample.length; i++) {
      const cp = sample.codePointAt(i);
      if (cp !== undefined) {
        cps.add(cp);
        if (cp > 0xFFFF) i++;
      }
    }
    // Add ASCII
    for (let a = 0x20; a < 0x7F; a++) cps.add(a);
    
    const buf = await f.arrayBuffer();
    const sub = await subsetFontForPreview(buf, cps);
    
    if (customFontUrl.value) {
      URL.revokeObjectURL(customFontUrl.value);
    }
    customFontUrl.value = URL.createObjectURL(new Blob([sub], { type: 'font/ttf' }));
    
    let styleEl = document.getElementById('hr-preview-custom-font-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'hr-preview-custom-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@font-face { font-family: "EpubEditorPreviewCustom"; src: url("${customFontUrl.value}") format("truetype"); font-display: swap; }`;
  } catch (err) {
    console.warn('預覽字體子集化失敗，使用原檔預覽：', err);
    if (customFontUrl.value) {
      URL.revokeObjectURL(customFontUrl.value);
    }
    customFontUrl.value = URL.createObjectURL(f);
    
    let styleEl = document.getElementById('hr-preview-custom-font-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'hr-preview-custom-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@font-face { font-family: "EpubEditorPreviewCustom"; src: url("${customFontUrl.value}"); font-display: swap; }`;
  } finally {
    isCustomFontLoading.value = false;
  }
}

// Upload and Parse EPUB
async function handleFileUpload(uploadedFile: File) {
  if (!uploadedFile.name.toLowerCase().endsWith('.epub')) {
    message.error('請選擇 .epub 格式的電子書');
    return;
  }

  file.value = uploadedFile;
  isProcessing.value = true;
  progressStage.value = '正在讀起 EPUB 檔案...';
  progressPercent.value = 10;

  try {
    const zip = await JSZip.loadAsync(uploadedFile);
    zipInstance.value = zip;
    fileEntries.value = [];
    
    let parsedCount = 0;
    const totalFiles = Object.keys(zip.files).length;
    
    // Parse files
    for (const [filename, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;

      progressStage.value = `解壓中: ${filename.split('/').pop()}`;
      progressPercent.value = 10 + Math.floor((parsedCount / totalFiles) * 60);

      const ext = filename.toLowerCase();
      if (
        ext.endsWith('.xhtml') || 
        ext.endsWith('.html') || 
        ext.endsWith('.htm') || 
        ext.endsWith('.ncx') || 
        ext.endsWith('.opf') ||
        ext.endsWith('.css')
      ) {
        const buffer = await entry.async('arraybuffer');
        const encoding = detectEncoding(buffer);
        const textContent = decodeWithEncoding(buffer, encoding);

        fileEntries.value.push({
          name: filename,
          type: ext.substring(ext.lastIndexOf('.')),
          originalContent: textContent,
          currentContent: textContent,
        });

        // Detect metadata and cover from OPF
        if (ext.endsWith('.opf')) {
          opfPath.value = filename;
          parseMetadata(textContent);
        }
      }
      parsedCount++;
    }

    // Try extracting cover
    progressStage.value = '偵測書籍封面圖片...';
    progressPercent.value = 85;
    const cover = await detectCover(zip);
    if (cover) {
      originalCover.value = cover;
      coverAction.value = 'keep';
    } else {
      originalCover.value = null;
      coverAction.value = 'keep';
    }

    // Extract Preview Sample Text
    progressStage.value = '生成即時排版預覽...';
    progressPercent.value = 95;
    const sample = await extractPreviewSample(zip);
    previewTitle.value = sample.title;
    previewText.value = sample.text;

    progressPercent.value = 100;
    message.success('EPUB 解析成功！');
  } catch (err: any) {
    message.error(`解析 EPUB 失敗: ${err.message}`);
    resetAll();
  } finally {
    isProcessing.value = false;
  }
}

function parseMetadata(opfContent: string) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opfContent, 'text/xml');
  
  const titleNode = xmlDoc.getElementsByTagName('dc:title')[0] || xmlDoc.getElementsByTagName('title')[0];
  const creatorNode = xmlDoc.getElementsByTagName('dc:creator')[0] || xmlDoc.getElementsByTagName('creator')[0];

  bookTitle.value = titleNode ? titleNode.textContent || '' : '';
  bookAuthor.value = creatorNode ? creatorNode.textContent || '' : '';
}

function selectFile(name: string) {
  saveActiveFileChanges();
  selectedFileName.value = name;
  const found = fileEntries.value.find(e => e.name === name);
  if (found) {
    activeFileContent.value = found.currentContent;
  }
}

function saveActiveFileChanges() {
  if (selectedFileName.value) {
    const found = fileEntries.value.find(e => e.name === selectedFileName.value);
    if (found) {
      found.currentContent = activeFileContent.value;
    }
  }
}

// OpenCC Punctuation replace helper
function convertPunctuation(text: string): string {
  let result = text;
  for (const [from, to] of Object.entries(PUNCTUATION_MAP)) {
    result = result.split(from).join(to);
  }
  return result;
}

// Decode helper
function decodeContent(uint8Array: Uint8Array): string {
  const encoding = detectEncoding(uint8Array);
  return decodeWithEncoding(uint8Array, encoding);
}

// Cover detection
async function detectCover(zip: JSZip): Promise<{ path: string; mimeType: string; dataUrl: string } | null> {
  const allFiles = Object.keys(zip.files);
  const opfFile = allFiles.find(f => f.toLowerCase().endsWith('.opf'));
  if (!opfFile) return null;

  const opfContent = await zip.files[opfFile].async('string');
  const opfDir = opfFile.includes('/') ? opfFile.substring(0, opfFile.lastIndexOf('/') + 1) : '';

  const coverMeta = opfContent.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i)
    || opfContent.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']cover["'][^>]*\/?>/i);
  if (coverMeta) {
    const coverId = coverMeta[1];
    const itemRegex = new RegExp('<item[^>]*id=["\']' + coverId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>', 'i');
    const itemMatch = opfContent.match(itemRegex);
    if (itemMatch) {
      const hrefMatch = itemMatch[0].match(/href=["']([^"']+)["']/i);
      const typeMatch = itemMatch[0].match(/media-type=["']([^"']+)["']/i);
      if (hrefMatch) {
        const imgPath = opfDir + decodeURIComponent(hrefMatch[1]);
        if (zip.files[imgPath]) {
          const blob = await zip.files[imgPath].async('blob');
          const dataUrl = URL.createObjectURL(blob);
          return { path: imgPath, mimeType: typeMatch ? typeMatch[1] : 'image/jpeg', dataUrl };
        }
      }
    }
  }

  const coverPropMatch = opfContent.match(/<item[^>]*properties=["'][^"']*cover-image[^"']*["'][^>]*>/i);
  if (coverPropMatch) {
    const hrefMatch = coverPropMatch[0].match(/href=["']([^"']+)["']/i);
    const typeMatch = coverPropMatch[0].match(/media-type=["']([^"']+)["']/i);
    if (hrefMatch) {
      const imgPath = opfDir + decodeURIComponent(hrefMatch[1]);
      if (zip.files[imgPath]) {
        const blob = await zip.files[imgPath].async('blob');
        const dataUrl = URL.createObjectURL(blob);
        return { path: imgPath, mimeType: typeMatch ? typeMatch[1] : 'image/jpeg', dataUrl };
      }
    }
  }

  return null;
}

// Extract Preview Sample Text from EPUB Content file
async function extractPreviewSample(zip: JSZip): Promise<{ title: string; text: string }> {
  const allFiles = Object.keys(zip.files);
  const fileNames = allFiles.filter(f => {
    if (zip.files[f].dir) return false;
    const ext = f.toLowerCase().slice(f.lastIndexOf('.'));
    return ['.xhtml', '.html', '.htm'].includes(ext);
  }).sort();

  const skipPatterns = /(cover|nav|toc|colophon|copyright|titlepage|frontmatter)/i;
  const candidate = fileNames.find(f => !skipPatterns.test(f.split('/').pop() || '')) || fileNames[0];
  if (!candidate) return { title: '即時預覽', text: '此電子書未包含符合條件的內容網頁檔案。' };

  const u8 = await zip.files[candidate].async('uint8array');
  const html = decodeContent(u8);
  
  const titleMatch = html.match(/<(?:h1|h2)[^>]*>([\s\S]*?)<\/(?:h1|h2)>/i);
  let title = titleMatch ? titleMatch[1] : '';
  title = title.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const pMatches = bodyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const paragraphs: string[] = [];
  let totalChars = 0;
  for (const p of pMatches) {
    const text = p
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    if (!text) continue;
    paragraphs.push(text);
    totalChars += text.length;
    if (totalChars > 650) break;
  }
  return { title: title || '預覽章節', text: paragraphs.join('\n') };
}

// Font helpers
function getCustomFontMeta(file: File) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.woff2')) return { ext: 'woff2', mime: 'font/woff2', format: 'woff2' };
  if (name.endsWith('.woff')) return { ext: 'woff', mime: 'font/woff', format: 'woff' };
  if (name.endsWith('.otf')) return { ext: 'otf', mime: 'font/otf', format: 'opentype' };
  return { ext: 'ttf', mime: 'font/ttf', format: 'truetype' };
}

async function decompressWoffToTtf(woffArrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const view = new DataView(woffArrayBuffer);
  const signature = view.getUint32(0);
  if (signature !== 0x774F4646) throw new Error('不是合法的 WOFF 檔');
  const flavor = view.getUint32(4);
  const numTables = view.getUint16(12);

  const tables: Array<{
    tag: number;
    offset: number;
    compLength: number;
    origLength: number;
    origChecksum: number;
    data?: Uint8Array;
  }> = [];
  
  let dirOffset = 44;
  for (let i = 0; i < numTables; i++) {
    tables.push({
      tag: view.getUint32(dirOffset),
      offset: view.getUint32(dirOffset + 4),
      compLength: view.getUint32(dirOffset + 8),
      origLength: view.getUint32(dirOffset + 12),
      origChecksum: view.getUint32(dirOffset + 16),
    });
    dirOffset += 20;
  }

  const woffBytes = new Uint8Array(woffArrayBuffer);
  for (const t of tables) {
    const slice = woffBytes.subarray(t.offset, t.offset + t.compLength);
    if (t.compLength < t.origLength) {
      const stream = new Response(new Blob([slice]).stream().pipeThrough(new DecompressionStream('deflate')));
      const buf = await stream.arrayBuffer();
      t.data = new Uint8Array(buf);
    } else {
      t.data = new Uint8Array(slice);
    }
  }

  const headerSize = 12 + numTables * 16;
  let bodySize = 0;
  for (const t of tables) {
    bodySize += t.data!.byteLength;
    const pad = (4 - (t.data!.byteLength % 4)) % 4;
    bodySize += pad;
  }
  const ttf = new ArrayBuffer(headerSize + bodySize);
  const ttfView = new DataView(ttf);
  const ttfBytes = new Uint8Array(ttf);

  ttfView.setUint32(0, flavor);
  ttfView.setUint16(4, numTables);
  
  let entrySelector = 0;
  let searchRange = 1;
  while (searchRange * 2 <= numTables) { searchRange *= 2; entrySelector++; }
  searchRange *= 16;
  ttfView.setUint16(6, searchRange);
  ttfView.setUint16(8, entrySelector);
  ttfView.setUint16(10, numTables * 16 - searchRange);

  let dataOffset = headerSize;
  let dirCursor = 12;
  for (const t of tables) {
    ttfView.setUint32(dirCursor, t.tag);
    ttfView.setUint32(dirCursor + 4, t.origChecksum);
    ttfView.setUint32(dirCursor + 8, dataOffset);
    ttfView.setUint32(dirCursor + 12, t.data!.byteLength);
    dirCursor += 16;
    ttfBytes.set(t.data!, dataOffset);
    dataOffset += t.data!.byteLength;
    const pad = (4 - (t.data!.byteLength % 4)) % 4;
    dataOffset += pad;
  }
  return ttf;
}

function readFontFamilyName(arrayBuffer: ArrayBuffer): string | null {
  try {
    const view = new DataView(arrayBuffer);
    const sfnt = view.getUint32(0);
    if (sfnt === 0x774F4646 || sfnt === 0x774F4632) return null;
    if (sfnt !== 0x00010000 && sfnt !== 0x4F54544F && sfnt !== 0x74727565) return null;
    const numTables = view.getUint16(4);
    let nameOffset: number | null = null;
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + i * 16;
      const tag = String.fromCharCode(view.getUint8(rec), view.getUint8(rec+1), view.getUint8(rec+2), view.getUint8(rec+3));
      if (tag === 'name') {
        nameOffset = view.getUint32(rec + 8);
        break;
      }
    }
    if (nameOffset === null) return null;
    const count = view.getUint16(nameOffset + 2);
    const stringOffset = view.getUint16(nameOffset + 4);
    const candidates: Array<{ priority: number; name: string }> = [];
    for (let r = 0; r < count; r++) {
      const rec = nameOffset + 6 + r * 12;
      const platformID = view.getUint16(rec);
      const encodingID = view.getUint16(rec + 2);
      const nameID = view.getUint16(rec + 6);
      const sLen = view.getUint16(rec + 8);
      const sOff = view.getUint16(rec + 10);
      if (nameID !== 1 && nameID !== 16) continue;
      const raw = new Uint8Array(arrayBuffer, nameOffset + stringOffset + sOff, sLen);
      let str = '';
      if (platformID === 3 || (platformID === 0 && encodingID >= 3)) {
        const chars: string[] = [];
        for (let k = 0; k < raw.length; k += 2) {
          chars.push(String.fromCharCode((raw[k] << 8) | raw[k + 1]));
        }
        str = chars.join('');
      } else {
        str = String.fromCharCode.apply(null, Array.from(raw));
      }
      candidates.push({ priority: (nameID === 16 ? 0 : 1) + (platformID === 3 ? 0 : 10), name: str });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0].name;
  } catch (e) {
    console.warn('讀取字體 family name 失敗：', e);
    return null;
  }
}

// Clear font files inside EPUB
async function removeOldFontsFromEpub(zip: JSZip) {
  const FONT_EXTS = ['.ttf', '.otf', '.woff', '.woff2'];
  const fontFiles = Object.keys(zip.files).filter(f => {
    if (zip.files[f].dir) return false;
    const lo = f.toLowerCase();
    return FONT_EXTS.some(ext => lo.endsWith(ext));
  });
  fontFiles.forEach(f => zip.remove(f));
  
  const opfFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.opf'));
  for (const opf of opfFiles) {
    let content = await zip.files[opf].async('string');
    content = content.replace(
      /<item[^>]*media-type=["'](?:font\/[^"']*|application\/(?:font-[^"']*|vnd\.ms-opentype|x-font-[^"']*))["'][^>]*\/>\s*\n?/gi,
      ''
    );
    content = content.replace(
      /<item[^>]*href=["'][^"']*\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)["'][^>]*\/>\s*\n?/g,
      ''
    );
    zip.file(opf, content);
  }
  
  const cssFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.css'));
  for (const cf of cssFiles) {
    let content = await zip.files[cf].async('string');
    content = content.replace(/@font-face\s*\{[^}]*\}\s*/g, '');
    zip.file(cf, content);
  }
}

// Embed font
async function embedCustomFontIntoEpub(zip: JSZip, fontDataBuffer: ArrayBuffer, meta: { embeddedFilename: string; mime: string; format: string }) {
  const opfFiles = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.opf'));
  let targetPath = '';
  if (opfFiles.length > 0) {
    const opfDir = opfFiles[0].substring(0, opfFiles[0].lastIndexOf('/') + 1);
    targetPath = opfDir + 'fonts/' + meta.embeddedFilename;
  } else {
    targetPath = 'fonts/' + meta.embeddedFilename;
  }
  zip.file(targetPath, fontDataBuffer);

  for (const opf of opfFiles) {
    let content = await zip.files[opf].async('string');
    const opfDir = opf.substring(0, opf.lastIndexOf('/') + 1);
    let href = '';
    if (targetPath.startsWith(opfDir)) {
      href = targetPath.substring(opfDir.length);
    } else {
      const depth = opfDir.split('/').length - 1;
      href = '../'.repeat(depth) + targetPath;
    }
    const newItem = `    <item id="hr-custom-font" href="${href}" media-type="${meta.mime}"/>\n`;
    content = content.replace('</manifest>', newItem + '</manifest>');
    zip.file(opf, content);
  }
  return targetPath;
}

// Relative path calculator
function relativePathFromCss(cssFilePath: string, fontFilePath: string): string {
  const cssParts = cssFilePath.split('/').slice(0, -1);
  const fontParts = fontFilePath.split('/');
  let common = 0;
  while (common < cssParts.length && common < fontParts.length - 1 && cssParts[common] === fontParts[common]) {
    common++;
  }
  const upLevels = cssParts.length - common;
  const downPath = fontParts.slice(common).join('/');
  return ('../'.repeat(upLevels)) + downPath;
}

// Generate style overrides CSS content
function generateStyleOverrides(cssFilePath: string, customFontInfo: any): string {
  const isVertical = settings.value.writingMode === 'vertical';
  const fontSize = SIZE_MAP[settings.value.fontSize] || SIZE_MAP.medium;
  const lineHeight = LINE_HEIGHT_MAP[settings.value.lineHeight] || LINE_HEIGHT_MAP.normal;

  let css = '\n/* === HelloRuru EPUB Editor 樣式覆蓋 === */\n';

  const font = FONT_MAP[settings.value.fontFamily] || FONT_MAP.default;
  const useCustom = settings.value.fontFamily === 'custom' && customFontInfo;
  const useEmbeddedStandard = settings.value.fontFamily !== 'custom' && settings.value.fontFamily !== 'default' && customFontInfo;

  if (useCustom || useEmbeddedStandard) {
    const info = customFontInfo;
    const realFamily = info.realName || (useCustom ? 'CustomUserFont' : font.name);
    const fontAbsPath = info.embeddedPath;
    const fontUrl = cssFilePath ? relativePathFromCss(cssFilePath, fontAbsPath) : fontAbsPath;
    css += `@font-face {
  font-family: "${realFamily}";
  src: url("${fontUrl}") format("${info.format}");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "CustomUserFont";
  src: url("${fontUrl}") format("${info.format}");
  font-weight: normal;
  font-style: normal;
}
* { font-family: "${realFamily}", "CustomUserFont", sans-serif !important; }
body { font-family: "${realFamily}", "CustomUserFont", sans-serif !important; }
p { font-family: "${realFamily}", "CustomUserFont", sans-serif !important; }
h1, h2, h3, h4, h5, h6 { font-family: "${realFamily}", "CustomUserFont", sans-serif !important; }
`;
  } else if (settings.value.fontFamily !== 'default') {
    css += `body { font-family: ${font.family}; }\n`;
  }
  css += `body { font-size: ${fontSize}; line-height: ${lineHeight}; }\n`;

  const indent = INDENT_MAP[settings.value.textIndent] || INDENT_MAP.two;
  if (indent !== '0') {
    css += `p { text-indent: ${indent}; }\n`;
  } else {
    css += `p { text-indent: 0; }\n`;
  }

  if (isVertical) {
    css += `html, body, body * {
  writing-mode: vertical-rl !important;
  -webkit-writing-mode: vertical-rl !important;
  -epub-writing-mode: vertical-rl !important;
  text-orientation: mixed !important;
}\n`;
  } else {
    css += `html, body, body * {
  writing-mode: horizontal-tb !important;
  -webkit-writing-mode: horizontal-tb !important;
  -epub-writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
}\n`;
  }

  return css;
}

async function injectStyleIntoCSS(zip: JSZip, customFontInfo: any) {
  const cssFiles = Object.keys(zip.files).filter(f =>
    f.toLowerCase().endsWith('.css') && !zip.files[f].dir
  );

  for (const filename of cssFiles) {
    const overrides = generateStyleOverrides(filename, customFontInfo);
    const content = await zip.files[filename].async('string');
    zip.file(filename, content + overrides);
  }

  const xhtmlFiles = Object.keys(zip.files).filter(f => {
    if (zip.files[f].dir) return false;
    const ext = f.toLowerCase().slice(f.lastIndexOf('.'));
    return ['.xhtml', '.html', '.htm'].includes(ext);
  });

  for (const filename of xhtmlFiles) {
    let content = await zip.files[filename].async('string');
    const overrides = generateStyleOverrides(filename, customFontInfo);
    const styleTag = `<style type="text/css">${overrides}</style>`;
    if (content.includes('</head>')) {
      content = content.replace('</head>', styleTag + '</head>');
    } else if (content.match(/<body[^>]*>/i)) {
      content = content.replace(/(<body[^>]*>)/i, styleTag + '$1');
    } else {
      content = styleTag + content;
    }
    zip.file(filename, content);
  }
}

// Update Spine direction in OPF
async function updateSpineDirection(zip: JSZip) {
  const isVertical = settings.value.writingMode === 'vertical';
  const opfFile = Object.keys(zip.files).find(f => f.toLowerCase().endsWith('.opf'));
  if (!opfFile) return;

  const content = await zip.files[opfFile].async('string');
  let newContent = content;
  if (isVertical) {
    if (newContent.includes('page-progression-direction')) {
      newContent = newContent.replace(/page-progression-direction="[^"]*"/, 'page-progression-direction="rtl"');
    } else {
      newContent = newContent.replace(/<spine([^>]*)>/, '<spine$1 page-progression-direction="rtl">');
    }
  } else {
    newContent = newContent.replace(/\s*page-progression-direction="rtl"/, '');
  }
  zip.file(opfFile, newContent);
}

// Collect codepoints for subsetting
async function collectCodepointsFromZip(zip: JSZip): Promise<Set<number>> {
  const set = new Set<number>();
  for (let a = 0x20; a < 0x7F; a++) set.add(a);
  const textFiles = Object.keys(zip.files).filter(f => {
    if (zip.files[f].dir) return false;
    const ext = f.toLowerCase().slice(f.lastIndexOf('.'));
    return ['.xhtml', '.html', '.htm', '.ncx', '.opf'].includes(ext);
  });
  for (const fn of textFiles) {
    const u8 = await zip.files[fn].async('uint8array');
    const text = decodeContent(u8);
    for (let i = 0; i < text.length; i++) {
      const cp = text.codePointAt(i);
      if (cp !== undefined) {
        set.add(cp);
        if (cp > 0xFFFF) i++;
      }
    }
  }
  return set;
}

// Subsetting WASM Loader
let hbExportsPromise: any = null;
function loadHbSubset() {
  if (hbExportsPromise) return hbExportsPromise;
  hbExportsPromise = (async () => {
    const resp = await fetch('https://cdn.jsdelivr.net/npm/harfbuzzjs@0.4.11/hb-subset.wasm');
    if (!resp.ok) throw new Error('載入 hb-subset.wasm 失敗：' + resp.status);
    const bytes = await resp.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes);
    return result.instance.exports;
  })();
  return hbExportsPromise;
}

async function subsetFontWithHarfBuzz(fontArrayBuffer: ArrayBuffer, codepointSet: Set<number>): Promise<ArrayBuffer> {
  const exports = await loadHbSubset();
  const fontBytes = new Uint8Array(fontArrayBuffer);
  const fontPtr = exports.malloc(fontBytes.byteLength);
  new Uint8Array(exports.memory.buffer).set(fontBytes, fontPtr);

  const blob = exports.hb_blob_create(fontPtr, fontBytes.byteLength, 2, 0, 0);
  const face = exports.hb_face_create(blob, 0);
  exports.hb_blob_destroy(blob);

  const input = exports.hb_subset_input_create_or_fail();
  if (!input) {
    exports.hb_face_destroy(face);
    exports.free(fontPtr);
    throw new Error('hb_subset_input_create_or_fail 失敗');
  }
  const unicodeSet = exports.hb_subset_input_unicode_set(input);
  codepointSet.forEach(cp => exports.hb_set_add(unicodeSet, cp));

  const subsetFace = exports.hb_subset_or_fail(face, input);
  exports.hb_subset_input_destroy(input);
  if (!subsetFace) {
    exports.hb_face_destroy(face);
    exports.free(fontPtr);
    throw new Error('hb_subset_or_fail 失敗');
  }

  const resultBlob = exports.hb_face_reference_blob(subsetFace);
  const offset = exports.hb_blob_get_data(resultBlob, 0);
  const subsetLength = exports.hb_blob_get_length(resultBlob);
  if (subsetLength === 0) {
    exports.hb_blob_destroy(resultBlob);
    exports.hb_face_destroy(subsetFace);
    exports.hb_face_destroy(face);
    exports.free(fontPtr);
    throw new Error('子集化後字體大小為 0');
  }
  const resultView = new Uint8Array(exports.memory.buffer, offset, subsetLength);
  const subsetData = new Uint8Array(subsetLength);
  subsetData.set(resultView);

  exports.hb_blob_destroy(resultBlob);
  exports.hb_face_destroy(subsetFace);
  exports.hb_face_destroy(face);
  exports.free(fontPtr);
  return subsetData.buffer;
}

// Cover image injection
async function injectCoverIntoEpub(zip: JSZip) {
  if (coverAction.value === 'keep') return;

  const allFiles = Object.keys(zip.files);
  const opfFile = allFiles.find(f => f.toLowerCase().endsWith('.opf'));
  if (!opfFile) return;

  let opfContent = await zip.files[opfFile].async('string');
  const opfDir = opfFile.includes('/') ? opfFile.substring(0, opfFile.lastIndexOf('/') + 1) : '';

  if (coverAction.value === 'remove') {
    if (originalCover.value && zip.files[originalCover.value.path]) {
      zip.remove(originalCover.value.path);
    }
    opfContent = opfContent.replace(/<meta[^>]*name=["']cover["'][^>]*\/?>\s*/gi, '');
    zip.file(opfFile, opfContent);
    return;
  }

  // replace
  if (!newCoverBlob.value) return;

  const coverFile = newCoverBlob.value;
  const ext = coverFile.type === 'image/png' ? '.png' : coverFile.type === 'image/webp' ? '.webp' : '.jpg';
  const mimeType = coverFile.type || 'image/jpeg';

  let imagesDir = opfDir + 'Images/';
  const existingImgDir = allFiles.find(f => f.toLowerCase().startsWith((opfDir + 'images/').toLowerCase()) && !zip.files[f].dir);
  if (existingImgDir) {
    imagesDir = existingImgDir.substring(0, existingImgDir.toLowerCase().indexOf('images/') + 7);
  }

  const coverPath = imagesDir + 'cover' + ext;
  const coverHref = coverPath.startsWith(opfDir) ? coverPath.substring(opfDir.length) : coverPath;

  const arrayBuffer = await coverFile.arrayBuffer();
  zip.file(coverPath, arrayBuffer);

  if (originalCover.value && originalCover.value.path !== coverPath && zip.files[originalCover.value.path]) {
    zip.remove(originalCover.value.path);
  }

  opfContent = opfContent.replace(/<item[^>]*properties=["'][^"']*cover-image[^"']*["'][^>]*\/?>[\s]*/gi, '');
  opfContent = opfContent.replace(/<item[^>]*id=["']cover-image["'][^>]*\/?>[\s]*/gi, '');

  const newItem = `  <item id="cover-image" href="${coverHref}" media-type="${mimeType}" properties="cover-image"/>\n`;
  opfContent = opfContent.replace('</manifest>', newItem + '</manifest>');

  if (!opfContent.match(/<meta[^>]*name=["']cover["'][^>]*>/i)) {
    opfContent = opfContent.replace('</metadata>', '  <meta name="cover" content="cover-image"/>\n</metadata>');
  } else {
    opfContent = opfContent.replace(/<meta[^>]*name=["']cover["'][^>]*\/?>/i, '<meta name="cover" content="cover-image"/>');
  }

  zip.file(opfFile, opfContent);
}

// Update Book Metadata inside content.opf
function updateOpfMetadata(opfText: string): string {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opfText, 'text/xml');
  
  const titleNode = xmlDoc.getElementsByTagName('dc:title')[0] || xmlDoc.getElementsByTagName('title')[0];
  if (titleNode) {
    titleNode.textContent = bookTitle.value;
  }
  
  const creatorNode = xmlDoc.getElementsByTagName('dc:creator')[0] || xmlDoc.getElementsByTagName('creator')[0];
  if (creatorNode) {
    creatorNode.textContent = bookAuthor.value;
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(xmlDoc);
}

// Full execution and download
async function processEpub() {
  if (!zipInstance.value || !file.value) return;

  isProcessing.value = true;
  progressStage.value = '正在解析檔案...';
  progressPercent.value = 5;

  try {
    const zip = zipInstance.value;
    
    saveActiveFileChanges();

    // 1. Text conversion and opencc/punctuation mapping
    const allFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir);
    const textFiles = allFiles.filter(f => {
      const ext = f.toLowerCase().slice(f.lastIndexOf('.'));
      return ['.xhtml', '.html', '.htm', '.xml', '.ncx', '.opf', '.css'].includes(ext);
    });

    let totalProcessed = 0;
    let totalCharsConverted = 0;

    for (let i = 0; i < textFiles.length; i++) {
      const filename = textFiles[i];
      const shortName = filename.split('/').pop();
      const progress = 10 + Math.floor((i / textFiles.length) * 50);
      progressStage.value = `編譯轉換中: ${shortName}`;
      progressPercent.value = progress;

      const entry = fileEntries.value.find(e => e.name === filename);
      let content = '';
      if (entry) {
        content = entry.currentContent;
      } else {
        const uint8Array = await zip.files[filename].async('uint8array');
        content = decodeContent(uint8Array);
      }

      let modified = false;

      // OpenCC
      if (settings.value.convertMode !== 'off') {
        const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
        if (['.xhtml', '.html', '.htm', '.ncx', '.opf'].includes(ext)) {
          const direction = settings.value.convertMode === 'twp' ? 's2twp' : 's2tw';
          const converted = convertOpenCC(content, direction);
          if (converted !== content) {
            totalCharsConverted += content.length;
            content = converted;
            modified = true;
          }
        }
      }

      // Punctuation
      if (settings.value.convertPunctuation) {
        const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
        if (['.xhtml', '.html', '.htm'].includes(ext)) {
          const punctuated = convertPunctuation(content);
          if (punctuated !== content) {
            content = punctuated;
            modified = true;
          }
        }
      }

      if (entry) {
        entry.currentContent = content;
      }
      
      if (modified || entry) {
        zip.file(filename, content);
        totalProcessed++;
      }

      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // 2. Font Embedding (standard or custom)
    let finalFontInfo = null;
    const isCustom = settings.value.fontFamily === 'custom';
    const isStandard = settings.value.fontFamily !== 'default' && settings.value.fontFamily !== 'custom';
    const shouldEmbed = settings.value.fontEmbedMode !== 'none';

    if (shouldEmbed && isCustom && customFontFile.value) {
      progressStage.value = '正在清理舊字型...';
      progressPercent.value = 65;
      await removeOldFontsFromEpub(zip);

      progressStage.value = '正在收集使用到的字元...';
      progressPercent.value = 68;
      const codepoints = await collectCodepointsFromZip(zip);

      progressStage.value = '正在讀取上傳的自訂字體...';
      progressPercent.value = 70;
      const rawBuffer = await customFontFile.value.arrayBuffer();
      const fname = (customFontFile.value.name || '').toLowerCase();

      let fontForSubset = rawBuffer;
      if (fname.endsWith('.woff')) {
        try {
          progressStage.value = 'WOFF 解壓中...';
          fontForSubset = await decompressWoffToTtf(rawBuffer);
        } catch (woffErr) {
          console.warn('WOFF 解壓失敗：', woffErr);
          message.warning('WOFF 解壓失敗，將直接嵌入完整字型');
        }
      }

      let fontBufferToEmbed = rawBuffer;
      const canSubset = !fname.endsWith('.woff2') && settings.value.fontEmbedMode === 'subset';
      if (canSubset) {
        try {
          progressStage.value = '正在為字型子集化精簡尺寸...';
          fontBufferToEmbed = await subsetFontWithHarfBuzz(fontForSubset, codepoints);
        } catch (subErr) {
          console.warn('子集化精簡失敗，改用完整滿血嵌入：', subErr);
        }
      }

      const realName = readFontFamilyName(fontBufferToEmbed) || 'CustomUserFont';
      const originalMeta = getCustomFontMeta(customFontFile.value);
      const isSubsetSuccess = fontBufferToEmbed !== rawBuffer;
      const meta = {
        embeddedFilename: 'hr-custom-font.' + (isSubsetSuccess ? 'ttf' : originalMeta.ext),
        mime: isSubsetSuccess ? 'font/ttf' : originalMeta.mime,
        format: isSubsetSuccess ? 'truetype' : originalMeta.format,
      };

      progressStage.value = '嵌入自訂字型中...';
      progressPercent.value = 75;
      const embeddedPath = await embedCustomFontIntoEpub(zip, fontBufferToEmbed, meta);
      finalFontInfo = { ...meta, realName, embeddedPath };

    } else if (shouldEmbed && isStandard) {
      progressStage.value = '正在清理舊字型...';
      progressPercent.value = 65;
      await removeOldFontsFromEpub(zip);

      progressStage.value = '正在載入系統字型檔...';
      progressPercent.value = 68;
      
      const config = FONT_MAP[settings.value.fontFamily];
      const fontResponse = await fetch(config.file);
      const rawBuffer = await fontResponse.arrayBuffer();

      let fontBufferToEmbed = rawBuffer;
      if (settings.value.fontEmbedMode === 'subset') {
        progressStage.value = '正在收集使用到的字元...';
        const codepoints = await collectCodepointsFromZip(zip);
        try {
          progressStage.value = '正在精簡子集化字體...';
          fontBufferToEmbed = await subsetFontWithHarfBuzz(rawBuffer, codepoints);
        } catch (subErr) {
          console.warn('子集化失敗，改用滿血完整字型嵌入：', subErr);
        }
      }

      const isSubsetSuccess = fontBufferToEmbed !== rawBuffer;
      const meta = {
        embeddedFilename: `hr-${settings.value.fontFamily}.${isSubsetSuccess ? 'ttf' : config.ext}`,
        mime: isSubsetSuccess ? 'font/ttf' : config.mime,
        format: isSubsetSuccess ? 'truetype' : config.format,
      };

      progressStage.value = '嵌入字型檔案中...';
      progressPercent.value = 75;
      const embeddedPath = await embedCustomFontIntoEpub(zip, fontBufferToEmbed, meta);
      finalFontInfo = { ...meta, realName: config.name, embeddedPath };
    }

    // 3. CSS style overrides
    progressStage.value = '套用字體與排版覆蓋樣式...';
    progressPercent.value = 80;
    await injectStyleIntoCSS(zip, finalFontInfo);

    // 4. Set spine page progression direction (vertical / horizontal)
    progressStage.value = '設定翻頁方向...';
    progressPercent.value = 83;
    await updateSpineDirection(zip);

    // 5. Save opf metadata modifications
    if (opfPath.value) {
      const opfEntry = fileEntries.value.find(e => e.name === opfPath.value);
      if (opfEntry) {
        opfEntry.currentContent = updateOpfMetadata(opfEntry.currentContent);
        zip.file(opfPath.value, opfEntry.currentContent);
      }
    }

    // 6. Cover image
    if (coverAction.value !== 'keep') {
      progressStage.value = '套用封面變更...';
      progressPercent.value = 88;
      await injectCoverIntoEpub(zip);
    }

    // 7. Zip generation
    progressStage.value = '重新封裝成 EPUB...';
    progressPercent.value = 92;

    if (!zip.files['mimetype']) {
      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }, (metadata) => {
      const p = 92 + Math.floor(metadata.percent * 0.08);
      progressStage.value = `壓縮封裝中: ${Math.floor(metadata.percent)}%`;
      progressPercent.value = p;
    });

    const cleanTitle = (bookTitle.value || file.value.name.replace(/\.epub$/i, '')).trim();
    let outputName = cleanTitle;
    if (settings.value.convertMode !== 'off') {
      const direction = settings.value.convertMode === 'twp' ? 's2twp' : 's2tw';
      outputName = convertOpenCC(cleanTitle, direction);
    }

    const suffixes = [];
    if (settings.value.convertMode === 'twp') suffixes.push('繁・詞彙');
    else if (settings.value.convertMode === 'tw') suffixes.push('繁');
    if (settings.value.writingMode === 'vertical') suffixes.push('直排');
    if (suffixes.length > 0) {
      outputName += '（' + suffixes.join('・') + '）';
    }

    const finalFilename = outputName + '.epub';

    progressPercent.value = 100;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    message.success('EPUB 電子書處理完成並已開始下載！');
  } catch (err: any) {
    console.error('電子書處理失敗:', err);
    message.error(`處理失敗: ${err.message}`);
  } finally {
    isProcessing.value = false;
  }
}

// Drag & Drop
function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    handleFileUpload(files[0]);
  }
}

function handleCoverDrop(event: DragEvent) {
  event.preventDefault();
  isCoverDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    setNewCover(files[0]);
  }
}

// New cover uploaded
function setNewCover(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('請上傳圖片格式檔案 (JPG, PNG, WEBP)');
    return;
  }
  newCoverBlob.value = file;
  coverAction.value = 'replace';
  if (newCoverPreviewUrl.value) {
    URL.revokeObjectURL(newCoverPreviewUrl.value);
  }
  newCoverPreviewUrl.value = URL.createObjectURL(file);
  message.success('已選擇新封面圖片');
}

function handleCoverUpload(event: any) {
  const f = event.target.files && event.target.files[0];
  if (f) setNewCover(f);
}

function removeCover() {
  coverAction.value = 'remove';
  newCoverBlob.value = null;
  if (newCoverPreviewUrl.value) {
    URL.revokeObjectURL(newCoverPreviewUrl.value);
    newCoverPreviewUrl.value = '';
  }
  message.info('已設定移除封面 (輸出時將無封面)');
}

function restoreOriginalCover() {
  coverAction.value = 'keep';
  newCoverBlob.value = null;
  if (newCoverPreviewUrl.value) {
    URL.revokeObjectURL(newCoverPreviewUrl.value);
    newCoverPreviewUrl.value = '';
  }
  message.info('已復原為原電子書封面');
}

function handleCustomFontUpload(event: any) {
  const f = event.target.files && event.target.files[0];
  if (!f) return;
  const lo = (f.name || '').toLowerCase();
  if (!['.ttf', '.otf', '.woff', '.woff2'].some(ext => lo.endsWith(ext))) {
    message.error('請上傳 .ttf / .otf / .woff / .woff2 格式的字體檔');
    return;
  }
  customFontFile.value = f;
  message.success('字體載入成功，已套用至預覽');
}

function resetAll() {
  file.value = null;
  zipInstance.value = null;
  fileEntries.value = [];
  selectedFileName.value = null;
  activeFileContent.value = '';
  bookTitle.value = '';
  bookAuthor.value = '';
  opfPath.value = '';
  originalCover.value = null;
  coverAction.value = 'keep';
  newCoverBlob.value = null;
  
  if (newCoverPreviewUrl.value) {
    URL.revokeObjectURL(newCoverPreviewUrl.value);
    newCoverPreviewUrl.value = '';
  }
  if (customFontUrl.value) {
    URL.revokeObjectURL(customFontUrl.value);
    customFontUrl.value = '';
  }
  customFontFile.value = null;
  
  settings.value.fontFamily = 'noto-sans';
  settings.value.fontEmbedMode = 'full';
  settings.value.writingMode = 'horizontal';
  
  let styleEl = document.getElementById('hr-preview-custom-font-style');
  if (styleEl) styleEl.remove();
}

onUnmounted(() => {
  if (newCoverPreviewUrl.value) URL.revokeObjectURL(newCoverPreviewUrl.value);
  if (customFontUrl.value) URL.revokeObjectURL(customFontUrl.value);
  let styleEl = document.getElementById('hr-preview-custom-font-style');
  if (styleEl) styleEl.remove();
});
</script>

<template>
  <div class="epub-editor-container">
    <c-card title="EPUB 編輯器 / 轉換器">
    <!-- Step 1: Upload -->
    <div v-if="!file" class="max-w-2xl mx-auto py-8">
      <div
        class="flex flex-col cursor-pointer items-center justify-center border-2px border-gray-300 dark:border-zinc-700 border-opacity-50 rounded-2xl border-dashed p-12 transition-all hover:border-primary hover:bg-gray-50/50 dark:hover:bg-zinc-800/10"
        :class="{ 'border-primary border-opacity-100 bg-gray-50 dark:bg-zinc-800/20': isDragging }"
        @dragover.prevent
        @dragenter="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".epub"
          class="hidden"
          @change="(e: any) => e.target.files[0] && handleFileUpload(e.target.files[0])"
        />
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 dark:text-zinc-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span class="text-lg font-semibold text-gray-700 dark:text-gray-200">
          拖曳 EPUB 電子書至此，或點擊選取檔案
        </span>
        <span class="text-sm text-gray-400 mt-2 text-center">
          支援本機繁簡體轉換、標點符號轉換、橫排直排轉換、字體滿血嵌入及封面替換
        </span>
      </div>
    </div>

    <!-- Processing Loader -->
    <div v-else-if="isProcessing" class="max-w-md mx-auto py-16 text-center space-y-5">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">{{ progressStage }}</h3>
      <div class="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
        <div class="bg-primary h-full transition-all duration-300" :style="{ width: `${progressPercent}%` }" />
      </div>
      <p class="text-sm text-gray-400">處理大型電子書字體子集化可能需要 10 - 25 秒，請耐心等候...</p>
    </div>

    <!-- Step 2: Main Workspace -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left side: settings panel -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Card:排版與樣式設定 -->
        <div class="p-5 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-5">
          <h3 class="text-base font-bold flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            排版與轉換設定
          </h3>

          <!-- Simplified to Traditional Mode -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">簡轉繁模式</label>
            <c-buttons-select
              v-model:value="settings.convertMode"
              :options="[
                { label: '繁體・詞彙', value: 'twp', tooltip: '簡轉繁並轉換台灣常用詞彙 (如：軟件->軟體)' },
                { label: '繁體・純字', value: 'tw', tooltip: '僅進行簡轉繁字元對照，不轉換詞彙' },
                { label: '不轉換', value: 'off', tooltip: '保持原電子書字元' }
              ]"
            />
          </div>

          <!-- Punctuation conversion -->
          <div class="flex items-center justify-between py-1">
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">標點符號轉換</label>
              <span class="text-xs text-gray-400">將雙引號 “...” 轉換為直排/繁體書名號 「...」</span>
            </div>
            <n-switch v-model:value="settings.convertPunctuation" />
          </div>

          <!-- Writing Mode -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">排版方向</label>
            <c-buttons-select
              v-model:value="settings.writingMode"
              :options="[
                { label: '橫排 (Horizontal)', value: 'horizontal' },
                { label: '直排 (Vertical)', value: 'vertical' }
              ]"
            />
          </div>

          <!-- Font Style -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">字型風格 (寫入 EPUB CSS)</label>
            <c-buttons-select
              v-model:value="settings.fontFamily"
              :options="[
                { label: '思源黑體', value: 'noto-sans' },
                { label: '思源宋體', value: 'noto-serif' },
                { label: '原俠正楷', value: 'guankiap' },
                { label: 'jf 粉圓', value: 'huninn' },
                { label: '預設', value: 'default' },
                { label: '自訂', value: 'custom' }
              ]"
            />
          </div>

          <!-- Custom Font upload -->
          <div v-if="settings.fontFamily === 'custom'" class="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">上傳自訂字體檔案 (.ttf / .otf / .woff)</span>
              <span v-if="customFontFile" class="text-xs text-primary font-medium truncate max-w-[150px]" :title="customFontFile.name">
                {{ customFontFile.name }}
              </span>
            </div>
            <div class="flex gap-2">
              <c-button size="small" tertiary class="flex-1" @click="$refs.fontInput.click()">
                {{ customFontFile ? '重新選擇字型' : '選擇字型檔案' }}
              </c-button>
              <input
                ref="fontInput"
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                class="hidden"
                @change="handleCustomFontUpload"
              />
            </div>
          </div>

          <!-- Font Embedding Options -->
          <div v-if="settings.fontFamily !== 'default'" class="space-y-2">
            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">字型嵌入模式</label>
            <c-buttons-select
              v-model:value="settings.fontEmbedMode"
              :options="[
                { label: '不嵌入 (僅 CSS 宣告)', value: 'none', tooltip: '不打包字型檔，體積最小' },
                { label: '子集化精簡版', value: 'subset', tooltip: '只保留電子書內用到的字元，體積小 (1-3MB)' },
                { label: '完整滿血版', value: 'full', tooltip: '打包完整字型檔，體積大 (10-25MB) 但最完整' }
              ]"
            />
          </div>

          <!-- Size & Spacing -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-500">字體大小</label>
              <c-buttons-select
                v-model:value="settings.fontSize"
                :options="[
                  { label: '小', value: 'small' },
                  { label: '中', value: 'medium' },
                  { label: '大', value: 'large' },
                  { label: '特大', value: 'xlarge' }
                ]"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-500">行距</label>
              <c-buttons-select
                v-model:value="settings.lineHeight"
                :options="[
                  { label: '緊湊', value: 'compact' },
                  { label: '適中', value: 'normal' },
                  { label: '寬鬆', value: 'relaxed' },
                  { label: '特寬', value: 'loose' }
                ]"
              />
            </div>
          </div>

          <!-- Indent -->
          <div class="space-y-2">
            <label class="text-xs font-semibold text-gray-500">首行縮排</label>
            <c-buttons-select
              v-model:value="settings.textIndent"
              :options="[
                { label: '不縮排', value: 'none' },
                { label: '縮 1 字', value: 'one' },
                { label: '縮 2 字', value: 'two' }
              ]"
            />
          </div>
        </div>

        <!-- Card: Cover Image -->
        <div class="p-5 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4">
          <h3 class="text-base font-bold flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            電子書封面設定
          </h3>

          <!-- Case 1: Has cover -->
          <div v-if="originalCover || newCoverBlob" class="flex gap-4 items-start">
            <img 
              :src="coverAction === 'replace' ? newCoverPreviewUrl : (originalCover ? originalCover.dataUrl : '')" 
              class="w-20 h-28 object-cover rounded-lg shadow border border-gray-200 dark:border-zinc-700 flex-shrink-0"
              alt="EPUB Cover"
            />
            <div class="space-y-3 flex-1 min-w-0">
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {{ coverAction === 'replace' ? '已載入新封面' : '原書封面' }}
                </span>
                <span class="text-xs text-gray-400 truncate">
                  {{ coverAction === 'replace' ? newCoverBlob?.name : originalCover?.path.split('/').pop() }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <c-button size="small" tertiary @click="$refs.coverInput.click()">替換封面</c-button>
                <c-button v-if="coverAction !== 'remove'" size="small" danger tertiary @click="removeCover">移除封面</c-button>
                <c-button v-if="coverAction !== 'keep'" size="small" tertiary @click="restoreOriginalCover">還原</c-button>
              </div>
            </div>
          </div>

          <!-- Case 2: No cover or removed -->
          <div 
            v-else
            class="flex flex-col items-center justify-center p-6 border border-dashed border-gray-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-zinc-800/10 transition-colors"
            :class="{ 'border-primary bg-white dark:bg-zinc-800/20': isCoverDragging }"
            @dragover.prevent
            @dragenter="isCoverDragging = true"
            @dragleave="isCoverDragging = false"
            @drop.prevent="handleCoverDrop"
            @click="$refs.coverInput.click()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-xs text-gray-500 text-center">
              此書目前無封面或已移除。拖曳圖片或點擊在此新增封面
            </span>
          </div>

          <input
            ref="coverInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handleCoverUpload"
          />
        </div>

        <div class="flex gap-3">
          <c-button tertiary class="flex-1" @click="resetAll">關閉檔案</c-button>
          <c-button class="flex-1" @click="processEpub">開始處理並下載</c-button>
        </div>
      </div>

      <!-- Right side: Tabs & View panels -->
      <div class="lg:col-span-7 space-y-4">
        <n-tabs v-model:value="activeTab" type="line" animated>
          <!-- Tab 1: Live Preview -->
          <n-tab-pane name="preview" tab="即時排版預覽">
            <div class="preview-frame border border-gray-200 dark:border-zinc-800 rounded-2xl max-h-[520px] overflow-auto relative">
              <div 
                class="preview-content w-full"
                :class="{ 'vertical': settings.writingMode === 'vertical' }"
                :style="{
                  fontSize: SIZE_MAP[settings.fontSize] || '1em',
                  lineHeight: LINE_HEIGHT_MAP[settings.lineHeight] || '1.8',
                  fontFamily: computedPreviewFontFamily
                }"
              >
                <h1>{{ processedPreviewTitle }}</h1>
                <p 
                  v-for="(p, idx) in processedPreviewParagraphs" 
                  :key="idx"
                  :style="{ textIndent: INDENT_MAP[settings.textIndent] || '2em' }"
                >
                  {{ p }}
                </p>
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-2 text-center">
              * 直排模式下預覽支援向右橫向滾動。實體輸出將完美寫入翻頁 Progression 指令。
            </div>
          </n-tab-pane>

          <!-- Tab 2: Manual Source Editor -->
          <n-tab-pane name="editor" tab="內部檔案修改器">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Files list -->
              <div class="md:col-span-1 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col max-h-[460px]">
                <div class="bg-gray-100 dark:bg-zinc-800 p-2 text-xs font-bold border-b border-gray-200 dark:border-zinc-800">
                  EPUB 內置檔案 ({{ editableFiles.length }})
                </div>
                <n-scrollbar class="flex-1">
                  <div class="p-1 space-y-0.5">
                    <button
                      v-for="entry in editableFiles"
                      :key="entry.name"
                      class="w-full text-left px-2 py-1.5 rounded text-xs truncate transition-all flex items-center gap-1.5 border border-transparent"
                      :class="{
                        'bg-primary/10 text-primary border-primary/20 font-semibold': selectedFileName === entry.name,
                        'hover:bg-gray-100 dark:hover:bg-zinc-800/50 text-gray-600 dark:text-gray-300': selectedFileName !== entry.name
                      }"
                      @click="selectFile(entry.name)"
                    >
                      <span class="opacity-80 text-[9px] px-1 py-0.2 rounded bg-gray-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono flex-shrink-0">
                        {{ entry.type.replace('.', '') }}
                      </span>
                      <span class="truncate">{{ entry.name.split('/').pop() }}</span>
                    </button>
                  </div>
                </n-scrollbar>
              </div>

              <!-- Editor input -->
              <div class="md:col-span-2 space-y-3">
                <div v-if="selectedFileName" class="space-y-2">
                  <div class="flex justify-between items-center text-xs">
                    <span class="font-mono text-gray-500 truncate max-w-[200px]" :title="selectedFileName">
                      編輯：{{ selectedFileName }}
                    </span>
                    <span class="text-gray-400">系統將自動即時儲存</span>
                  </div>
                  <n-input
                    v-model:value="activeFileContent"
                    type="textarea"
                    :autosize="{ minRows: 15, maxRows: 18 }"
                    class="font-mono text-xs dark:bg-zinc-900"
                    placeholder="載入程式碼編輯中..."
                  />
                </div>
                <div v-else class="h-[360px] flex flex-col items-center justify-center bg-gray-50/50 dark:bg-zinc-900/10 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-gray-400 p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span class="text-xs">請點選左側內置檔案，可手動微調 XHTML / XML / CSS 原始碼</span>
                </div>
              </div>
            </div>
          </n-tab-pane>

          <!-- Tab 3: Metadata Details -->
          <n-tab-pane name="metadata" tab="書籍資訊修改">
            <div class="p-5 bg-gray-50 dark:bg-zinc-800/10 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4 max-w-lg">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-gray-500">書名 (Title)</label>
                <n-input v-model:value="bookTitle" placeholder="書籍名稱" />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-semibold text-gray-500">作者 (Author / Creator)</label>
                <n-input v-model:value="bookAuthor" placeholder="作者名稱" />
              </div>
              <div class="pt-2 text-xs text-gray-400 space-y-1">
                <div>OPF 路徑：<span class="font-mono text-gray-500">{{ opfPath || '無' }}</span></div>
                <div>原始內容檔數：<span class="font-semibold text-gray-600 dark:text-gray-300">{{ fileEntries.filter(f => f.name.endsWith('.xhtml') || f.name.endsWith('.html')).length }}</span> 個</div>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
    </c-card>
  </div>
</template>

<style scoped>
.preview-frame {
  background: #fafafa;
}
.dark .preview-frame {
  background: #18181c;
}
.preview-content {
  padding: 28px 24px;
  color: #2b2b2b;
  font-size: 1.05em;
  line-height: 1.8;
  text-align: justify;
}
.dark .preview-content {
  color: #e3e3e3;
}
.preview-content h1 {
  font-size: 1.6em;
  font-weight: 800;
  margin: 0 0 1.2em 0;
  line-height: 1.3;
  color: #1a1a1a;
}
.dark .preview-content h1 {
  color: #ffffff;
}
.preview-content p {
  margin: 0.8em 0;
}
.preview-content.vertical {
  writing-mode: vertical-rl;
  -webkit-writing-mode: vertical-rl;
  text-orientation: mixed;
  height: 440px;
  max-height: 440px;
  overflow-x: auto;
  overflow-y: hidden;
  display: block;
}
.preview-content.vertical h1 {
  text-align: center;
  margin: 0 0 0 1.2em;
  height: 100%;
}
.preview-content.vertical p {
  margin: 0 0.8em;
  height: 100%;
}
</style>

<style>
/* 覆寫外層 it-tools 的 tool.layout.vue 限制 */
.tool-content:has(.epub-editor-container) {
  max-width: 1400px !important;
}
.tool-content:has(.epub-editor-container) > * {
  flex: 1 1 100% !important;
}
.tool-layout:has(+ .tool-content .epub-editor-container) {
  max-width: 1400px !important;
}
</style>

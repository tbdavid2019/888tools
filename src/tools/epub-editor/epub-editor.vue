<script setup lang="ts">
import type JSZip from 'jszip';
import type { EpubEditableEntry } from './epub-processor';
import type { KindleRepairReport } from './kindle-fixer';
import type { PageProgressionDirection } from './package-direction';
import type { PreviewChapter } from './preview-chapters';
import { useStorage } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { config } from '@/config';
import { downloadBlob } from '@/services/epub/download';
import { BUILT_IN_FONT_IDS, EPUB_FONT_MAP, subsetFontBuffer } from '@/services/epub/fonts';
import { detectFile } from '@/services/magika/magika.service';
import { convertOpenCC, convertPunctuation } from '@/services/opencc.service';
import { useStyleStore } from '@/stores/style.store';
import {
  extractEditableEntries,
  extractPreviewChapters,
  loadEpubArchive,
  processEpubPackage,
} from './epub-processor';
import {
  clearAllHistoryBlobs,
  clearCustomFont,
  deleteHistoryBlob,
  getHistoryBlob,
  loadCustomFont,
  saveCustomFont,
  saveHistoryBlob,
} from './epub-storage';
import { repairKindleEpub, SAFE_ZIP_DATE } from './kindle-fixer';
import { resolveEffectiveDirection } from './package-direction';
import { getPreviewChapterIndex } from './preview-chapters';
import { clampPreviewPage, getPreviewPageCount } from './preview-pagination';
import { buildFallbackPreviewSrcdoc, renderChapterPreviewSrcdoc } from './preview-renderer';
import {
  FONT_MAP,
  MARGIN_PRESET_MAP,
} from './style-generator';

const message = useMessage();
const styleStore = useStyleStore();

// EPUB File state
const file = ref<File | null>(null);
const fontInput = ref<HTMLInputElement | null>(null);
const coverInput = ref<HTMLInputElement | null>(null);
const isProcessing = ref(false);
const progressStage = ref('');
const progressPercent = ref(0);

// Read-only source JSZip (shallowRef avoids Vue deep reactive proxy overhead)
const sourceZip = shallowRef<JSZip | null>(null);
const fileEntries = ref<EpubEditableEntry[]>([]);
const selectedFileName = ref<string | null>(null);
const activeFileContent = ref('');

// Book metadata
const bookTitle = ref('');
const bookAuthor = ref('');
const originalTitle = ref('');
const originalAuthor = ref('');
const opfPath = ref('');

// Tab settings
const activeTab = ref<'preview' | 'editor' | 'metadata'>('preview');

// Conversion and layout settings (persisted in localStorage)
const settings = useStorage('epub-editor:settings', {
  convertMode: 'twp' as 'twp' | 'tw' | 'off',
  convertPunctuation: true,
  writingMode: 'horizontal' as 'horizontal' | 'vertical',
  pageProgressionDirection: 'auto' as PageProgressionDirection,
  fontFamily: 'noto-sans',
  fontEmbedMode: 'subset' as 'none' | 'subset' | 'full',
  fontSize: 'medium',
  lineHeight: 'normal',
  textIndent: 'two',
  pageMargin: 'compact' as 'none' | 'compact' | 'normal' | 'relaxed' | 'custom',
  customMarginVertical: 0.3,
  customMarginHorizontal: 0.5,
  optimizeVerticalLayout: true,
  fixKindleCompatibility: true,
}, undefined, { mergeDefaults: true });

const kindleRepairSummary = ref<string | null>(null);

export interface ProcessedHistoryItem {
  id: string;
  originalFileName: string;
  outputFileName: string;
  title: string;
  author: string;
  writingMode: 'horizontal' | 'vertical';
  fontFamily: string;
  convertMode: string;
  pageMargin?: string;
  customMarginVertical?: number;
  customMarginHorizontal?: number;
  optimizeVerticalLayout?: boolean;
  timestamp: number;
}

function historyMarginLabel(item: ProcessedHistoryItem): string {
  if (item.pageMargin === 'custom') {
    if (item.customMarginVertical == null || item.customMarginHorizontal == null) {
      return '自訂（舊紀錄未保存數值）';
    }
    return `自訂：上下 ${item.customMarginVertical}em / 左右 ${item.customMarginHorizontal}em`;
  }
  return MARGIN_PRESET_MAP[item.pageMargin || '']?.label || item.pageMargin || '';
}

const processedHistory = useStorage<ProcessedHistoryItem[]>('epub-editor:history', []);

async function clearHistory() {
  await clearAllHistoryBlobs();
  processedHistory.value = [];
  message.success('已清空轉換歷史紀錄與快取檔案');
}

async function removeHistoryItem(id: string) {
  await deleteHistoryBlob(id);
  processedHistory.value = processedHistory.value.filter(h => h.id !== id);
  message.success('已刪除該筆紀錄');
}

async function downloadHistoryItem(item: ProcessedHistoryItem) {
  const blob = await getHistoryBlob(item.id);
  if (!blob) {
    message.error('此歷史快取檔案已被清理或不存在，無法下載');
    return;
  }
  downloadBlob(blob, item.outputFileName);
  message.success(`已開始下載歷史紀錄檔案：${item.outputFileName}`);
}

// Custom Font File
const customFontFile = ref<File | null>(null);
const customFontBufferCache = ref<{ file: File; buffer: ArrayBuffer } | null>(null);
const customFontUrl = ref('');
const isCustomFontLoading = ref(false);
let previewFontRequestSeq = 0;
let isUnmounted = false;

// Cover Image state
const originalCover = ref<{ path: string; mimeType: string; dataUrl: string } | null>(null);
const coverAction = ref<'keep' | 'replace' | 'remove'>('keep');
const newCoverBlob = ref<File | null>(null);
const newCoverPreviewUrl = ref('');

function revokeOriginalCoverUrl() {
  if (originalCover.value?.dataUrl) {
    URL.revokeObjectURL(originalCover.value.dataUrl);
  }
}

function revokeNewCoverUrl() {
  if (newCoverPreviewUrl.value) {
    URL.revokeObjectURL(newCoverPreviewUrl.value);
    newCoverPreviewUrl.value = '';
  }
}

function clickFileInput(input: HTMLInputElement | null) {
  input?.click();
}

const DEFAULT_PREVIEW_TITLE = '即時排版預覽';
const DEFAULT_PREVIEW_TEXT = '載入 EPUB 電子書後，這裡將會呈現第一個內容章節的實際渲染結果。您可以調整左側的排版、字型、直橫排等參數，效果會即時更新。';

// Live Preview Sample Text & Sandboxed Iframe State
const previewTitle = ref(DEFAULT_PREVIEW_TITLE);
const previewText = ref(DEFAULT_PREVIEW_TEXT);
const previewChapters = ref<PreviewChapter[]>([]);
const previewChapterIndex = ref(0);
const previewIframe = ref<HTMLIFrameElement | null>(null);
const previewSrcdoc = ref('');
const previewPage = ref(0);
const previewPageCount = ref(1);
let previewResizeObserver: ResizeObserver | null = null;
let previewAssetUrls: string[] = [];
let previewRenderSeq = 0;
let detachIframeListeners: (() => void) | null = null;

function revokePreviewAssetUrls() {
  for (const url of previewAssetUrls) {
    URL.revokeObjectURL(url);
  }
  previewAssetUrls = [];
}

// Drag and drop state for cover upload
const isCoverDragging = ref(false);
let coverDragCounter = 0;

const editableFiles = computed(() => {
  return fileEntries.value.filter((entry) => {
    const lo = entry.name.toLowerCase();
    return (
      lo.endsWith('.xhtml')
      || lo.endsWith('.html')
      || lo.endsWith('.htm')
      || lo.endsWith('.ncx')
      || lo.endsWith('.opf')
      || lo.endsWith('.css')
    );
  });
});

const contentHtmlCount = computed(() => {
  return fileEntries.value.filter((entry) => {
    const lo = entry.name.toLowerCase();
    return lo.endsWith('.xhtml') || lo.endsWith('.html') || lo.endsWith('.htm');
  }).length;
});

function convertPreviewString(raw: string): string {
  let result = raw;
  if (settings.value.convertMode !== 'off') {
    const dir = settings.value.convertMode === 'twp'
      ? 's2twp'
      : 's2tw';
    result = convertOpenCC(result, dir);
  }
  if (settings.value.convertPunctuation) {
    result = convertPunctuation(result);
  }
  return result;
}

const processedPreviewTitle = computed(() => convertPreviewString(previewTitle.value));

const processedPreviewParagraphs = computed(() => {
  return previewText.value
    .split(/\n+/)
    .filter(p => p.trim())
    .map(p => convertPreviewString(p.trim()));
});

const fontSelectOptions = computed(() => [
  ...BUILT_IN_FONT_IDS.map(id => ({ label: EPUB_FONT_MAP[id].name, value: id })),
  { label: '預設', value: 'default' },
  { label: '自訂', value: 'custom' },
]);

function getPreviewScrollElement(): HTMLElement | null {
  const doc = previewIframe.value?.contentDocument;
  if (!doc) {
    return null;
  }
  return (doc.scrollingElement as HTMLElement | null) || doc.documentElement;
}

function syncPreviewPagination() {
  const viewport = getPreviewScrollElement();
  if (!viewport) {
    return;
  }

  previewPageCount.value = getPreviewPageCount(viewport.scrollWidth, viewport.clientWidth);
  if (viewport.clientWidth <= 0) {
    previewPage.value = 0;
    return;
  }

  const offset = Math.abs(viewport.scrollLeft);
  previewPage.value = clampPreviewPage(Math.round(offset / viewport.clientWidth), previewPageCount.value);
}

function getVerticalScrollDirection(viewport: HTMLElement): number {
  const originalOffset = viewport.scrollLeft;
  const originalBehavior = viewport.style.scrollBehavior;
  viewport.style.scrollBehavior = 'auto';
  viewport.scrollLeft = -1;
  const supportsNegativeOffset = viewport.scrollLeft < 0;
  viewport.scrollLeft = originalOffset;
  viewport.style.scrollBehavior = originalBehavior;
  return supportsNegativeOffset
    ? -1
    : 1;
}

function goToPreviewPage(page: number) {
  const viewport = getPreviewScrollElement();
  if (!viewport) {
    return;
  }

  const nextPage = clampPreviewPage(page, previewPageCount.value);
  const offset = nextPage * viewport.clientWidth;
  const isVertical = settings.value.writingMode === 'vertical';

  viewport.scrollTo({
    left: isVertical
      ? getVerticalScrollDirection(viewport) * offset
      : offset,
    behavior: 'smooth',
  });
  previewPage.value = nextPage;
}

const effectivePreviewDirection = computed(() =>
  resolveEffectiveDirection(settings.value.writingMode, settings.value.pageProgressionDirection),
);

function handlePreviewKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return;
  }

  const nextKey = effectivePreviewDirection.value === 'rtl'
    ? 'ArrowLeft'
    : 'ArrowRight';
  event.preventDefault();
  goToPreviewPage(previewPage.value + (event.key === nextKey
    ? 1
    : -1));
}

function handlePreviewIframeLoad() {
  detachIframeListeners?.();
  detachIframeListeners = null;

  const iframe = previewIframe.value;
  const doc = iframe?.contentDocument;
  const win = iframe?.contentWindow;
  if (!doc || !win) {
    return;
  }

  const onScroll = () => syncPreviewPagination();
  const onKeydown = (e: KeyboardEvent) => handlePreviewKeydown(e);
  win.addEventListener('scroll', onScroll, { passive: true });
  doc.addEventListener('scroll', onScroll, { passive: true });
  doc.addEventListener('keydown', onKeydown);

  detachIframeListeners = () => {
    win.removeEventListener('scroll', onScroll);
    doc.removeEventListener('scroll', onScroll);
    doc.removeEventListener('keydown', onKeydown);
  };

  previewPage.value = 0;
  nextTick(syncPreviewPagination);
}

async function refreshPreviewSrcdoc() {
  const seq = ++previewRenderSeq;
  const currentChapter = previewChapters.value[previewChapterIndex.value];
  const renderOpts = {
    writingMode: settings.value.writingMode,
    fontSize: settings.value.fontSize,
    lineHeight: settings.value.lineHeight,
    textIndent: settings.value.textIndent,
    fontFamily: settings.value.fontFamily,
    pageMargin: settings.value.pageMargin,
    customMarginVertical: settings.value.customMarginVertical,
    customMarginHorizontal: settings.value.customMarginHorizontal,
    optimizeVerticalLayout: settings.value.optimizeVerticalLayout,
    convertMode: settings.value.convertMode,
    convertPunctuation: settings.value.convertPunctuation,
    customFontUrl: customFontUrl.value,
    isDark: styleStore.isDarkTheme,
    baseOrigin: typeof window !== 'undefined'
      ? window.location.origin
      : '',
  };

  if (sourceZip.value && currentChapter?.path) {
    const rendered = await renderChapterPreviewSrcdoc(sourceZip.value, currentChapter.path, renderOpts);
    if (isUnmounted || seq !== previewRenderSeq) {
      for (const u of rendered.createdBlobUrls) {
        URL.revokeObjectURL(u);
      }
      return;
    }
    revokePreviewAssetUrls();
    previewAssetUrls = rendered.createdBlobUrls;
    previewSrcdoc.value = rendered.srcdoc;
    return;
  }

  revokePreviewAssetUrls();
  previewSrcdoc.value = buildFallbackPreviewSrcdoc(
    processedPreviewTitle.value,
    processedPreviewParagraphs.value.join('\n'),
    renderOpts,
  );
}

function selectPreviewChapter(index: number) {
  const chapterIndex = getPreviewChapterIndex(
    previewChapterIndex.value,
    index - previewChapterIndex.value,
    previewChapters.value.length,
  );
  const chapter = previewChapters.value[chapterIndex];
  if (!chapter) {
    return;
  }

  previewChapterIndex.value = chapterIndex;
  previewTitle.value = chapter.title;
  previewText.value = chapter.text;
}

watch([
  sourceZip,
  previewChapters,
  previewChapterIndex,
  previewTitle,
  previewText,
  customFontUrl,
  () => styleStore.isDarkTheme,
  () => settings.value.convertMode,
  () => settings.value.convertPunctuation,
  () => settings.value.writingMode,
  () => settings.value.fontFamily,
  () => settings.value.fontSize,
  () => settings.value.lineHeight,
  () => settings.value.textIndent,
  () => settings.value.pageMargin,
  () => settings.value.customMarginVertical,
  () => settings.value.customMarginHorizontal,
  () => settings.value.optimizeVerticalLayout,
], () => {
  void refreshPreviewSrcdoc();
}, { immediate: true });

watch(previewIframe, (iframe, previousIframe) => {
  if (previousIframe) {
    previewResizeObserver?.unobserve(previousIframe);
  }
  if (iframe) {
    previewResizeObserver?.observe(iframe);
    nextTick(syncPreviewPagination);
  }
});

// Watch custom font or converted preview text to update preview subsetting
watch(
  [
    customFontFile,
    processedPreviewTitle,
    processedPreviewParagraphs,
    () => settings.value.fontFamily,
  ],
  () => {
    if (settings.value.fontFamily === 'custom' && customFontFile.value) {
      injectCustomFontForPreview();
    }
  },
);

watch(activeFileContent, (newVal) => {
  if (selectedFileName.value) {
    const found = fileEntries.value.find(e => e.name === selectedFileName.value);
    if (found) {
      found.currentContent = newVal;
    }
  }
});

function setPreviewCustomFontStyle(url: string, format?: string) {
  let styleEl = document.getElementById('epub-preview-custom-font-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'epub-preview-custom-font-style';
    document.head.appendChild(styleEl);
  }
  const formatClause = format
    ? ` format("${format}")`
    : '';
  styleEl.textContent = `@font-face { font-family: "EpubEditorPreviewCustom"; src: url("${url}")${formatClause}; font-display: swap; }`;
}

async function getCustomFontBuffer(f: File): Promise<ArrayBuffer> {
  if (customFontBufferCache.value && customFontBufferCache.value.file === f) {
    return customFontBufferCache.value.buffer;
  }
  const buffer = await f.arrayBuffer();
  customFontBufferCache.value = { file: f, buffer };
  return buffer;
}

async function injectCustomFontForPreview() {
  const f = customFontFile.value;
  if (!f) {
    return;
  }

  const requestSeq = ++previewFontRequestSeq;
  isCustomFontLoading.value = true;
  try {
    const sample = `${processedPreviewTitle.value}\n${processedPreviewParagraphs.value.join('\n')}`;
    const rawBuffer = await getCustomFontBuffer(f);
    if (isUnmounted || requestSeq !== previewFontRequestSeq) {
      return;
    }

    const subset = await subsetFontBuffer(rawBuffer, sample, { fallbackName: f.name });
    if (isUnmounted || requestSeq !== previewFontRequestSeq) {
      return;
    }

    const nextUrl = URL.createObjectURL(new Blob([subset.buffer], { type: subset.mime }));
    if (customFontUrl.value) {
      URL.revokeObjectURL(customFontUrl.value);
    }
    customFontUrl.value = nextUrl;
    setPreviewCustomFontStyle(nextUrl, subset.format);
  }
  catch (err) {
    if (isUnmounted || requestSeq !== previewFontRequestSeq) {
      return;
    }
    console.warn('預覽字體子集化失敗，使用原檔預覽：', err);
    const nextUrl = URL.createObjectURL(f);
    if (customFontUrl.value) {
      URL.revokeObjectURL(customFontUrl.value);
    }
    customFontUrl.value = nextUrl;
    setPreviewCustomFontStyle(nextUrl);
  }
  finally {
    if (!isUnmounted && requestSeq === previewFontRequestSeq) {
      isCustomFontLoading.value = false;
    }
  }
}

function formatRepairSummary(report: KindleRepairReport): string | null {
  if (!report.hasRepairs) {
    return null;
  }
  const parts: string[] = [];
  if (report.fixedExtensionlessFiles.length > 0) {
    parts.push(`補全 ${report.fixedExtensionlessFiles.length} 個章節副檔名`);
  }
  if (report.fixedDeadLinks.length > 0) {
    parts.push(`移除 ${report.fixedDeadLinks.length} 個目錄死連結`);
  }
  if (report.fixedOpfItems.length > 0) {
    parts.push(`校正 ${report.fixedOpfItems.length} 項 OPF 清單`);
  }
  if (report.normalizedTimestampsCount > 0) {
    parts.push(`正規化 ${report.normalizedTimestampsCount} 個時間戳`);
  }
  if (report.fixedXmlDeclarations.length > 0) {
    parts.push(`補充 ${report.fixedXmlDeclarations.length} 處 XML 宣告`);
  }
  return parts.join('、');
}

// Upload and Parse EPUB
async function handleFileUpload(uploadedFile: File) {
  if (!uploadedFile.name.toLowerCase().endsWith('.epub')) {
    try {
      const detection = await detectFile(uploadedFile);
      if (detection.label === 'epub' || detection.mimeType === 'application/epub+zip') {
        message.info(`檔案格式分析：此檔案為標準 EPUB 電子書（副檔名為 ${uploadedFile.name.split('.').pop() || '無'}），正在解析...`);
      }
      else if (detection.isText || detection.label === 'txt' || detection.label === 'markdown') {
        message.warning(`檢測到此檔案為純文字（${detection.name}），建議使用「TXT 轉 EPUB 電子書」工具製作成 EPUB！`, { duration: 6000 });
        return;
      }
      else if (detection.label === 'pdf') {
        message.warning('檢測到此檔案為 PDF 文件，EPUB 編輯器僅支援標準 EPUB 電子書。', { duration: 6000 });
        return;
      }
      else {
        message.error(`檔案格式不符：檢測為 ${detection.name} (${detection.mimeType})，請選擇 .epub 格式電子書。`);
        return;
      }
    }
    catch {
      message.error('請選擇 .epub 格式的電子書');
      return;
    }
  }

  resetAll();
  file.value = uploadedFile;
  isProcessing.value = true;
  progressStage.value = '正在讀取 EPUB 檔案...';
  progressPercent.value = 15;

  try {
    const parsed = await loadEpubArchive(uploadedFile, settings.value.fixKindleCompatibility);
    progressPercent.value = 60;

    sourceZip.value = parsed.zip;
    fileEntries.value = parsed.entries;
    opfPath.value = parsed.opfPath;
    bookTitle.value = parsed.title;
    bookAuthor.value = parsed.author;
    originalTitle.value = parsed.title;
    originalAuthor.value = parsed.author;

    const summary = parsed.repairReport
      ? formatRepairSummary(parsed.repairReport)
      : null;
    kindleRepairSummary.value = summary;
    if (summary) {
      message.info(`已為此書自動完成 Kindle 相容性修復：${summary}`);
    }

    progressStage.value = '偵測書籍封面圖片...';
    progressPercent.value = 80;
    if (parsed.cover) {
      originalCover.value = {
        path: parsed.cover.path,
        mimeType: parsed.cover.mimeType,
        dataUrl: URL.createObjectURL(parsed.cover.blob),
      };
    }

    progressStage.value = '生成即時排版預覽...';
    progressPercent.value = 95;
    previewChapters.value = parsed.previewChapters;
    previewChapterIndex.value = 0;
    selectPreviewChapter(0);

    progressPercent.value = 100;
    message.success('EPUB 解析成功！');
  }
  catch (err: any) {
    message.error(`解析 EPUB 失敗: ${err.message}`);
    resetAll();
  }
  finally {
    isProcessing.value = false;
  }
}

function getEditedFilesMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of fileEntries.value) {
    if (entry.currentContent !== entry.originalContent) {
      map[entry.name] = entry.currentContent;
    }
  }
  return map;
}

async function runManualKindleRepair() {
  if (!sourceZip.value) {
    message.warning('請先載入 EPUB 電子書');
    return;
  }

  saveActiveFileChanges();
  isProcessing.value = true;
  progressStage.value = '正在執行 Kindle 相容性檢測與修復...';
  try {
    // Persist user's manual Tab 2 edits into sourceZip before running structural repair
    for (const [name, content] of Object.entries(getEditedFilesMap())) {
      sourceZip.value.file(name, content, { date: SAFE_ZIP_DATE });
    }

    const report = await repairKindleEpub(sourceZip.value);
    const refreshed = await extractEditableEntries(sourceZip.value);
    fileEntries.value = refreshed.entries;
    opfPath.value = refreshed.opfPath;
    if (selectedFileName.value) {
      const current = refreshed.entries.find(e => e.name === selectedFileName.value);
      activeFileContent.value = current ? current.currentContent : '';
      if (!current) {
        selectedFileName.value = null;
      }
    }

    previewChapters.value = await extractPreviewChapters(sourceZip.value);
    previewChapterIndex.value = 0;
    selectPreviewChapter(0);

    const summary = formatRepairSummary(report);
    if (summary) {
      kindleRepairSummary.value = summary;
      message.success(`修復完成：${summary}`);
    }
    else {
      kindleRepairSummary.value = '此電子書結構健康，未發現 Kindle 相容性問題';
      message.info('檢測完成：未發現 Kindle 相容性問題');
    }
  }
  catch (err: any) {
    message.error(`修復失敗: ${err.message}`);
  }
  finally {
    isProcessing.value = false;
  }
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

// Full execution and download (read-only on sourceZip, idempotent on repeated clicks)
async function processEpub() {
  if (!sourceZip.value || !file.value) {
    return;
  }

  isProcessing.value = true;
  progressStage.value = '正在準備處理...';
  progressPercent.value = 5;

  try {
    saveActiveFileChanges();

    const newCoverPayload = coverAction.value === 'replace' && newCoverBlob.value
      ? {
          buffer: await newCoverBlob.value.arrayBuffer(),
          mimeType: newCoverBlob.value.type || 'image/jpeg',
        }
      : null;

    const customFontPayload = settings.value.fontFamily === 'custom'
      && settings.value.fontEmbedMode !== 'none'
      && customFontFile.value
      ? {
          buffer: await getCustomFontBuffer(customFontFile.value),
          name: customFontFile.value.name,
        }
      : null;

    const result = await processEpubPackage({
      sourceZip: sourceZip.value,
      editedFiles: getEditedFilesMap(),
      bookTitle: bookTitle.value,
      bookAuthor: bookAuthor.value,
      originalTitle: originalTitle.value,
      originalAuthor: originalAuthor.value,
      originalFileName: file.value.name,
      settings: {
        convertMode: settings.value.convertMode,
        convertPunctuation: settings.value.convertPunctuation,
        writingMode: settings.value.writingMode,
        pageProgressionDirection: settings.value.pageProgressionDirection,
        fontFamily: settings.value.fontFamily,
        fontEmbedMode: settings.value.fontEmbedMode,
        fontSize: settings.value.fontSize,
        lineHeight: settings.value.lineHeight,
        textIndent: settings.value.textIndent,
        pageMargin: settings.value.pageMargin,
        customMarginVertical: settings.value.customMarginVertical,
        customMarginHorizontal: settings.value.customMarginHorizontal,
        optimizeVerticalLayout: settings.value.optimizeVerticalLayout,
        fixKindleCompatibility: settings.value.fixKindleCompatibility,
      },
      coverAction: coverAction.value,
      originalCoverPath: originalCover.value?.path,
      newCover: newCoverPayload,
      customFont: customFontPayload,
      onProgress: (stage, percent) => {
        progressStage.value = stage;
        progressPercent.value = percent;
      },
    });

    progressPercent.value = 100;
    downloadBlob(result.blob, result.outputFileName);
    message.success('EPUB 電子書處理完成並已開始下載！');

    const historyId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const saved = await saveHistoryBlob(historyId, result.blob);
    if (saved) {
      processedHistory.value.unshift({
        id: historyId,
        originalFileName: file.value.name,
        outputFileName: result.outputFileName,
        title: bookTitle.value || file.value.name.replace(/\.epub$/i, ''),
        author: bookAuthor.value || '未知',
        writingMode: settings.value.writingMode,
        fontFamily: settings.value.fontFamily,
        convertMode: settings.value.convertMode,
        pageMargin: settings.value.pageMargin,
        customMarginVertical: settings.value.customMarginVertical,
        customMarginHorizontal: settings.value.customMarginHorizontal,
        optimizeVerticalLayout: settings.value.optimizeVerticalLayout,
        timestamp: Date.now(),
      });
      if (processedHistory.value.length > 30) {
        const removed = processedHistory.value.slice(30);
        processedHistory.value = processedHistory.value.slice(0, 30);
        for (const item of removed) {
          void deleteHistoryBlob(item.id);
        }
      }
    }
    else {
      message.warning('瀏覽器本機儲存空間不足，本次檔案未寫入歷史快取（已正常下載）。');
    }
  }
  catch (err: any) {
    console.error('電子書處理失敗:', err);
    message.error(`處理失敗: ${err.message}`);
  }
  finally {
    isProcessing.value = false;
  }
}

function onCoverDragEnter(event: DragEvent) {
  event.preventDefault();
  coverDragCounter++;
  isCoverDragging.value = true;
}

function onCoverDragLeave(event: DragEvent) {
  event.preventDefault();
  coverDragCounter--;
  if (coverDragCounter <= 0) {
    coverDragCounter = 0;
    isCoverDragging.value = false;
  }
}

function handleCoverDrop(event: DragEvent) {
  event.preventDefault();
  coverDragCounter = 0;
  isCoverDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    setNewCover(files[0]);
  }
}

function setNewCover(uploaded: File) {
  if (!uploaded.type.startsWith('image/')) {
    message.error('請上傳圖片格式檔案 (JPG, PNG, WEBP)');
    return;
  }
  newCoverBlob.value = uploaded;
  coverAction.value = 'replace';
  revokeNewCoverUrl();
  newCoverPreviewUrl.value = URL.createObjectURL(uploaded);
  message.success('已選擇新封面圖片');
}

function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) {
    setNewCover(f);
  }
  input.value = '';
}

function removeCover() {
  coverAction.value = 'remove';
  newCoverBlob.value = null;
  revokeNewCoverUrl();
  message.info('已設定移除封面 (輸出時將無封面)');
}

function restoreOriginalCover() {
  coverAction.value = 'keep';
  newCoverBlob.value = null;
  revokeNewCoverUrl();
  message.info('已復原為原電子書封面');
}

async function handleCustomFontUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) {
    return;
  }

  const lo = (f.name || '').toLowerCase();
  if (!['.ttf', '.otf', '.woff', '.woff2'].some(ext => lo.endsWith(ext))) {
    message.error('請上傳 .ttf / .otf / .woff / .woff2 格式的字體檔');
    return;
  }
  customFontFile.value = f;
  customFontBufferCache.value = null;
  await saveCustomFont(f);
  message.success(`已讀取並自動儲存自訂字型：${f.name}`);
}

async function removeCustomFont() {
  previewFontRequestSeq++;
  isCustomFontLoading.value = false;
  customFontFile.value = null;
  customFontBufferCache.value = null;
  if (customFontUrl.value) {
    URL.revokeObjectURL(customFontUrl.value);
    customFontUrl.value = '';
  }
  document.getElementById('epub-preview-custom-font-style')?.remove();
  await clearCustomFont();
  message.info('已清除儲存的自訂字型');
}

function resetAll() {
  previewRenderSeq++;
  revokePreviewAssetUrls();
  revokeOriginalCoverUrl();
  revokeNewCoverUrl();
  file.value = null;
  sourceZip.value = null;
  fileEntries.value = [];
  selectedFileName.value = null;
  activeFileContent.value = '';
  bookTitle.value = '';
  bookAuthor.value = '';
  originalTitle.value = '';
  originalAuthor.value = '';
  opfPath.value = '';
  originalCover.value = null;
  coverAction.value = 'keep';
  newCoverBlob.value = null;
  kindleRepairSummary.value = null;
  previewChapters.value = [];
  previewChapterIndex.value = 0;
  previewTitle.value = DEFAULT_PREVIEW_TITLE;
  previewText.value = DEFAULT_PREVIEW_TEXT;
  previewPage.value = 0;
  previewPageCount.value = 1;
}

onMounted(async () => {
  const base = config.app.baseUrl.replace(/\/$/, '');
  const styleEl = document.createElement('style');
  styleEl.id = 'epub-preview-standard-fonts-style';
  styleEl.textContent = `
    @font-face {
      font-family: "NotoSansCJKtc";
      src: url("${base}/fonts/NotoSansCJKtc-Regular.otf") format("opentype");
      font-display: swap;
    }
    @font-face {
      font-family: "Gen Jyuu Gothic";
      src: url("${base}/fonts/GenJyuuGothic-Medium.woff2") format("woff2");
      font-display: swap;
    }
    @font-face {
      font-family: "NotoSerifCJKtc";
      src: url("${base}/fonts/NotoSerifCJKtc-Regular.otf") format("opentype");
      font-display: swap;
    }
    @font-face {
      font-family: "GuanKiapTsingKhai";
      src: url("${base}/fonts/GuanKiapTsingKhai-TW.ttf") format("truetype");
      font-display: swap;
    }
    @font-face {
      font-family: "jf-openhuninn";
      src: url("${base}/fonts/jf-openhuninn.ttf") format("truetype");
      font-display: swap;
    }
  `;
  document.head.appendChild(styleEl);

  const savedCustomFont = await loadCustomFont();
  if (isUnmounted) {
    return;
  }
  if (savedCustomFont) {
    customFontFile.value = savedCustomFont;
    if (settings.value.fontFamily === 'custom') {
      await injectCustomFontForPreview();
    }
  }
  if (isUnmounted) {
    return;
  }

  previewResizeObserver = new ResizeObserver(syncPreviewPagination);
  if (previewIframe.value) {
    previewResizeObserver.observe(previewIframe.value);
  }
  nextTick(syncPreviewPagination);
});

onUnmounted(() => {
  isUnmounted = true;
  previewFontRequestSeq++;
  previewRenderSeq++;
  detachIframeListeners?.();
  detachIframeListeners = null;
  previewResizeObserver?.disconnect();
  revokePreviewAssetUrls();
  revokeOriginalCoverUrl();
  revokeNewCoverUrl();
  if (customFontUrl.value) {
    URL.revokeObjectURL(customFontUrl.value);
  }
  document.getElementById('epub-preview-custom-font-style')?.remove();
  document.getElementById('epub-preview-standard-fonts-style')?.remove();
});
</script>

<template>
  <div class="epub-editor-container">
    <c-card title="EPUB 編輯器 / 轉換器">
      <!-- Step 1: Upload -->
      <div v-if="!file" class="mx-auto max-w-2xl py-8">
        <c-file-upload
          accept=".epub,application/epub+zip,*"
          @file-upload="handleFileUpload"
        >
          <div class="flex flex-col items-center py-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="mb-4 h-16 w-16 text-gray-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span class="text-lg text-gray-700 font-semibold dark:text-gray-200">
              拖曳 EPUB 電子書至此，或點擊選取檔案
            </span>
            <span class="mt-2 text-center text-sm text-gray-400">
              支援本機繁簡體轉換、標點符號轉換、橫排直排轉換、字體子集化與滿血嵌入及封面替換
            </span>
          </div>
        </c-file-upload>

        <!-- Processed History List -->
        <div v-if="processedHistory.length > 0" class="mt-8 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="flex items-center gap-2 text-sm text-gray-700 font-bold dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              最近處理歷史紀錄（已自動記憶偏好設定）
            </h4>
            <c-button size="small" tertiary @click="clearHistory">
              清空歷史紀錄
            </c-button>
          </div>
          <div class="max-h-60 overflow-y-auto pr-1 space-y-2">
            <div
              v-for="item in processedHistory"
              :key="item.id"
              class="flex items-center justify-between border border-gray-100 rounded-xl bg-gray-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div class="truncate pr-2 space-y-1">
                <div class="truncate text-gray-800 font-semibold dark:text-gray-200">
                  {{ item.outputFileName }}
                </div>
                <div class="flex items-center gap-2 text-gray-400">
                  <span>{{ new Date(item.timestamp).toLocaleString() }}</span>
                  <span>•</span>
                  <span>{{ item.writingMode === 'vertical' ? '直排' : '橫排' }}</span>
                  <span>•</span>
                  <span>{{ FONT_MAP[item.fontFamily]?.name || item.fontFamily }}</span>
                  <template v-if="item.pageMargin">
                    <span>•</span>
                    <span>{{ historyMarginLabel(item) }}</span>
                  </template>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <c-button size="small" secondary @click="downloadHistoryItem(item)">
                  再次下載
                </c-button>
                <c-button size="small" tertiary danger @click="removeHistoryItem(item.id)">
                  刪除
                </c-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Processing Loader -->
      <div v-else-if="isProcessing" class="mx-auto max-w-md py-16 text-center space-y-5">
        <div class="mx-auto h-12 w-12 animate-spin border-b-2 border-primary rounded-full" />
        <h3 class="text-lg text-gray-800 font-semibold dark:text-gray-200">
          {{ progressStage }}
        </h3>
        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
          <div class="h-full bg-primary transition-all duration-300" :style="{ width: `${progressPercent}%` }" />
        </div>
        <p class="text-sm text-gray-400">
          處理大型電子書與字型子集化時請耐心等候...
        </p>
      </div>

      <!-- Step 2: Main Workspace -->
      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Left side: settings panel -->
        <div class="lg:col-span-5 space-y-6">
          <!-- Card:排版與樣式設定 -->
          <div class="border border-gray-100 rounded-2xl bg-gray-50 p-5 space-y-5 dark:border-zinc-800 dark:bg-zinc-800/30">
            <h3 class="flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-bold dark:border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              排版與轉換設定
            </h3>

            <!-- Simplified to Traditional Mode -->
            <div class="space-y-2">
              <label class="text-sm text-gray-700 font-semibold dark:text-gray-300">簡轉繁模式</label>
              <c-buttons-select
                v-model:value="settings.convertMode"
                :options="[
                  { label: '繁體・詞彙', value: 'twp', tooltip: '簡轉繁並轉換台灣常用詞彙 (如：軟件->軟體)' },
                  { label: '繁體・純字', value: 'tw', tooltip: '僅進行簡轉繁字元對照，不轉換詞彙' },
                  { label: '不轉換', value: 'off', tooltip: '保持原電子書字元' },
                ]"
              />
            </div>

            <!-- Punctuation conversion -->
            <div class="flex items-center justify-between py-1">
              <div class="flex flex-col">
                <label class="text-sm text-gray-700 font-semibold dark:text-gray-300">標點符號轉換</label>
                <span class="text-xs text-gray-400">將雙引號 “...” 轉換為繁體引號 「...」</span>
              </div>
              <n-switch v-model:value="settings.convertPunctuation" />
            </div>

            <!-- Writing Mode -->
            <div class="space-y-2">
              <label class="text-sm text-gray-700 font-semibold dark:text-gray-300">排版方向</label>
              <c-buttons-select
                v-model:value="settings.writingMode"
                :options="[
                  { label: '橫排 (Horizontal)', value: 'horizontal' },
                  { label: '直排 (Vertical)', value: 'vertical' },
                ]"
              />
            </div>

            <!-- Page Progression Direction -->
            <div class="space-y-2">
              <label class="text-sm text-gray-700 font-semibold dark:text-gray-300">翻頁方向 (Kindle / 閱讀器)</label>
              <c-buttons-select
                v-model:value="settings.pageProgressionDirection"
                :options="[
                  { label: '跟隨排版', value: 'auto', tooltip: '直排採右至左 (rtl，點左側下一頁)；橫排採左至右 (ltr)' },
                  { label: '右至左 (點左下一頁)', value: 'rtl', tooltip: '寫入 page-progression-direction=&quot;rtl&quot;（標準直排翻頁；部分舊版 Kindle 轉檔依韌體而異）' },
                  { label: '左至右 (點右下一頁)', value: 'ltr', tooltip: '強制寫入 page-progression-direction=&quot;ltr&quot;（通用閱讀器點右側下一頁；若直排翻頁方向不符習慣可切換測試）' },
                ]"
              />
            </div>

            <!-- Font Style -->
            <div class="space-y-2">
              <label class="text-sm text-gray-700 font-semibold dark:text-gray-300">字型風格 (寫入 EPUB CSS)</label>
              <c-buttons-select
                v-model:value="settings.fontFamily"
                :options="fontSelectOptions"
              />
            </div>

            <!-- Custom Font upload -->
            <div v-if="settings.fontFamily === 'custom'" class="border border-gray-200 rounded-xl border-dashed bg-white p-3 space-y-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">上傳自訂字體檔案 (.ttf / .otf / .woff / .woff2)</span>
                <span v-if="customFontFile" class="max-w-[150px] truncate text-xs text-primary font-medium" :title="customFontFile.name">
                  {{ customFontFile.name }}
                </span>
              </div>
              <div class="flex gap-2">
                <c-button size="small" tertiary class="flex-1" @click="clickFileInput(fontInput)">
                  {{ customFontFile ? '重新選擇字型' : '選擇字型檔案' }}
                </c-button>
                <c-button v-if="customFontFile" size="small" tertiary danger @click="removeCustomFont">
                  清除
                </c-button>
                <input
                  ref="fontInput"
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  class="hidden"
                  @change="handleCustomFontUpload"
                >
              </div>
            </div>

            <!-- Font Embedding Options -->
            <div v-if="settings.fontFamily !== 'default'" class="space-y-2">
              <label class="text-sm text-gray-700 font-semibold dark:text-gray-300">字型嵌入模式</label>
              <c-buttons-select
                v-model:value="settings.fontEmbedMode"
                :options="[
                  { label: '不嵌入 (僅 CSS 宣告)', value: 'none', tooltip: '不打包字型檔，體積最小' },
                  { label: '子集化精簡版 (推薦)', value: 'subset', tooltip: '只保留電子書內用到的字元，體積小 (1-3MB)' },
                  { label: '完整滿血版', value: 'full', tooltip: '打包完整字型檔，體積大 (10-25MB) 但最完整' },
                ]"
              />
            </div>

            <!-- Size & Spacing -->
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="space-y-2">
                <label class="text-xs text-gray-500 font-semibold">字體大小</label>
                <c-buttons-select
                  v-model:value="settings.fontSize"
                  :options="[
                    { label: '小', value: 'small' },
                    { label: '中', value: 'medium' },
                    { label: '大', value: 'large' },
                    { label: '特大', value: 'xlarge' },
                  ]"
                />
              </div>
              <div class="space-y-2">
                <label class="text-xs text-gray-500 font-semibold">行距</label>
                <c-buttons-select
                  v-model:value="settings.lineHeight"
                  :options="[
                    { label: '緊湊', value: 'compact' },
                    { label: '適中', value: 'normal' },
                    { label: '寬鬆', value: 'relaxed' },
                    { label: '特寬', value: 'loose' },
                  ]"
                />
              </div>
            </div>

            <!-- Indent -->
            <div class="space-y-2">
              <label class="text-xs text-gray-500 font-semibold">首行縮排</label>
              <c-buttons-select
                v-model:value="settings.textIndent"
                :options="[
                  { label: '不縮排', value: 'none' },
                  { label: '縮 1 字', value: 'one' },
                  { label: '縮 2 字', value: 'two' },
                ]"
              />
            </div>

            <!-- Page Margins -->
            <div class="pt-1 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs text-gray-500 font-semibold">頁面留白 (邊距)</label>
                <span class="text-[11px] text-gray-400">
                  {{ settings.pageMargin === 'custom' ? `上下 ${settings.customMarginVertical ?? 0.3}em / 左右 ${settings.customMarginHorizontal ?? 0.5}em` : (MARGIN_PRESET_MAP[settings.pageMargin]?.label || '極窄 (推薦直排)') }}
                </span>
              </div>
              <c-buttons-select
                v-model:value="settings.pageMargin"
                :options="[
                  { label: '無留白', value: 'none', tooltip: '邊界歸零 (0)，完全交由閱讀軟體邊框決定' },
                  { label: '極窄 (推薦直排)', value: 'compact', tooltip: '上下 0.3em / 左右 0.5em，滿版體驗' },
                  { label: '適中', value: 'normal', tooltip: '上下 1.0em / 左右 1.2em' },
                  { label: '寬鬆', value: 'relaxed', tooltip: '上下 1.8em / 左右 2.0em' },
                  { label: '自訂', value: 'custom', tooltip: '自行微調上下與左右邊距' },
                ]"
              />
            </div>

            <!-- Custom Margin Controls -->
            <div v-if="settings.pageMargin === 'custom'" class="border border-gray-200 rounded-xl bg-white p-3 space-y-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">上下邊距 (垂直留白)</span>
                  <span class="text-primary font-semibold font-mono">{{ settings.customMarginVertical ?? 0.3 }} em</span>
                </div>
                <n-slider v-model:value="settings.customMarginVertical" :min="0" :max="4" :step="0.1" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">左右邊距 (水平流向)</span>
                  <span class="text-primary font-semibold font-mono">{{ settings.customMarginHorizontal ?? 0.5 }} em</span>
                </div>
                <n-slider v-model:value="settings.customMarginHorizontal" :min="0" :max="4" :step="0.1" />
              </div>
            </div>

            <!-- Vertical Layout Optimization Toggle -->
            <div v-if="settings.writingMode === 'vertical'" class="flex items-center justify-between border-t border-gray-100 py-1 pt-3 dark:border-zinc-800/80">
              <div class="flex flex-col pr-2">
                <label class="text-xs text-gray-700 font-semibold dark:text-gray-300">直排段落與留白優化</label>
                <span class="text-[11px] text-gray-400">清除原橫排段落上下空隙與容器寬度拘束，讓文字完整填滿</span>
              </div>
              <n-switch v-model:value="settings.optimizeVerticalLayout" size="small" />
            </div>
          </div>

          <!-- Card: Kindle 相容性修復 -->
          <div class="border border-gray-100 rounded-2xl bg-gray-50 p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <h3 class="flex items-center justify-between border-b border-gray-100 pb-3 text-base font-bold dark:border-zinc-800">
              <span class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Kindle 相容性防錯修復
              </span>
              <n-switch v-model:value="settings.fixKindleCompatibility" size="small" />
            </h3>

            <div class="text-xs text-gray-500 space-y-1 dark:text-gray-400">
              <p>自動補齊章節副檔名、清理 NCX/NAV 目錄死連結、修正 OPF 清單參照，並正規化 ZIP 損壞時間戳，徹底預防 Amazon Send to Kindle 發生 <span class="text-primary font-semibold font-mono">E999 內部錯誤</span>。</p>
            </div>

            <div v-if="kindleRepairSummary" class="flex items-start gap-2 border border-green-200 rounded-xl bg-green-50 p-3 text-xs text-green-700 dark:border-green-800/40 dark:bg-green-950/30 dark:text-green-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <div class="flex-1">
                <span class="font-bold">已套用修復：</span>
                <span>{{ kindleRepairSummary }}</span>
              </div>
            </div>

            <div v-if="sourceZip" class="pt-1">
              <c-button size="small" secondary class="w-full" :disabled="isProcessing" @click="runManualKindleRepair">
                立即健檢與修復此書
              </c-button>
            </div>
          </div>

          <!-- Card: Cover Image -->
          <div class="border border-gray-100 rounded-2xl bg-gray-50 p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <h3 class="flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-bold dark:border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              電子書封面設定
            </h3>

            <!-- Case 1: Has cover -->
            <div v-if="originalCover || newCoverBlob" class="flex items-start gap-4">
              <img
                :src="coverAction === 'replace' ? newCoverPreviewUrl : (originalCover ? originalCover.dataUrl : '')"
                class="h-28 w-20 flex-shrink-0 border border-gray-200 rounded-lg object-cover shadow dark:border-zinc-700"
                alt="EPUB Cover"
              >
              <div class="min-w-0 flex-1 space-y-3">
                <div class="flex flex-col">
                  <span class="text-sm text-gray-700 font-semibold dark:text-gray-300">
                    {{ coverAction === 'replace' ? '已載入新封面' : coverAction === 'remove' ? '已標記移除封面' : '原書封面' }}
                  </span>
                  <span class="truncate text-xs text-gray-400">
                    {{ coverAction === 'replace' ? newCoverBlob?.name : originalCover?.path.split('/').pop() }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <c-button size="small" tertiary @click="clickFileInput(coverInput)">
                    替換封面
                  </c-button>
                  <c-button v-if="coverAction !== 'remove'" size="small" danger tertiary @click="removeCover">
                    移除封面
                  </c-button>
                  <c-button v-if="coverAction !== 'keep'" size="small" tertiary @click="restoreOriginalCover">
                    還原
                  </c-button>
                </div>
              </div>
            </div>

            <!-- Case 2: No cover or removed -->
            <div
              v-else
              class="flex flex-col cursor-pointer items-center justify-center border border-gray-200 rounded-xl border-dashed p-6 transition-colors dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800/10"
              :class="{ 'border-primary bg-white dark:bg-zinc-800/20': isCoverDragging }"
              @dragover.prevent
              @dragenter="onCoverDragEnter"
              @dragleave="onCoverDragLeave"
              @drop.prevent="handleCoverDrop"
              @click="clickFileInput(coverInput)"
            >
              <div class="pointer-events-none flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-center text-xs text-gray-500">
                  此書目前無封面或已移除。拖曳圖片或點擊在此新增封面
                </span>
              </div>
            </div>

            <input
              ref="coverInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleCoverUpload"
            >
          </div>

          <div class="flex gap-3">
            <c-button tertiary class="flex-1" @click="resetAll">
              關閉檔案
            </c-button>
            <c-button class="flex-1" @click="processEpub">
              開始處理並下載
            </c-button>
          </div>
        </div>

        <!-- Right side: Tabs & View panels -->
        <div class="lg:col-span-7 space-y-4">
          <n-tabs v-model:value="activeTab" type="line" animated>
            <!-- Tab 1: Live Preview (Sandboxed Isolated EPUB Renderer) -->
            <n-tab-pane name="preview" tab="即時排版預覽">
              <div
                class="preview-frame relative overflow-hidden border border-gray-200 rounded-2xl dark:border-zinc-800"
                :class="{ vertical: settings.writingMode === 'vertical' }"
                tabindex="0"
                aria-label="EPUB 排版預覽"
                @keydown="handlePreviewKeydown"
              >
                <iframe
                  ref="previewIframe"
                  class="preview-iframe block h-full w-full border-0"
                  sandbox="allow-same-origin"
                  :srcdoc="previewSrcdoc"
                  title="EPUB 排版預覽"
                  @load="handlePreviewIframeLoad"
                />
              </div>
              <p class="mt-2 text-xs text-gray-400">
                預覽於隔離沙盒內套用實際輸出 CSS 與原書圖片資源；不同閱讀器實作細節仍可能影響實際斷頁。
              </p>
              <div v-if="previewChapters.length > 1" class="preview-chapter-pagination mt-3" aria-label="預覽章節控制">
                <c-button size="small" tertiary :disabled="previewChapterIndex === 0" @click="selectPreviewChapter(previewChapterIndex - 1)">
                  上一章
                </c-button>
                <span class="text-xs text-gray-500 tabular-nums dark:text-gray-400" aria-live="polite">
                  章節 {{ previewChapterIndex + 1 }} / {{ previewChapters.length }}
                </span>
                <c-button size="small" tertiary :disabled="previewChapterIndex >= previewChapters.length - 1" @click="selectPreviewChapter(previewChapterIndex + 1)">
                  下一章
                </c-button>
              </div>
              <div v-if="settings.writingMode === 'vertical'" class="preview-pagination mt-3" aria-label="直排預覽翻頁控制">
                <template v-if="effectivePreviewDirection === 'rtl'">
                  <c-button size="small" tertiary :disabled="previewPage >= previewPageCount - 1" @click="goToPreviewPage(previewPage + 1)">
                    ← 下一頁
                  </c-button>
                  <span class="text-xs text-gray-500 tabular-nums dark:text-gray-400" aria-live="polite">
                    第 {{ previewPage + 1 }} / {{ previewPageCount }} 頁
                  </span>
                  <c-button size="small" tertiary :disabled="previewPage === 0" @click="goToPreviewPage(previewPage - 1)">
                    上一頁 →
                  </c-button>
                </template>
                <template v-else>
                  <c-button size="small" tertiary :disabled="previewPage === 0" @click="goToPreviewPage(previewPage - 1)">
                    ← 上一頁
                  </c-button>
                  <span class="text-xs text-gray-500 tabular-nums dark:text-gray-400" aria-live="polite">
                    第 {{ previewPage + 1 }} / {{ previewPageCount }} 頁
                  </span>
                  <c-button size="small" tertiary :disabled="previewPage >= previewPageCount - 1" @click="goToPreviewPage(previewPage + 1)">
                    下一頁 →
                  </c-button>
                </template>
              </div>
              <div class="mt-2 text-center text-xs text-gray-400">
                * 直排預覽按鈕與鍵盤 ←／→ 會依「翻頁方向」同步切換；輸出會寫入 spine progression{{ settings.fixKindleCompatibility ? ' 與 Kindle primary-writing-mode' : '' }}。
              </div>
            </n-tab-pane>

            <!-- Tab 2: Manual Source Editor -->
            <n-tab-pane name="editor" tab="內部檔案修改器">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <!-- Files list -->
                <div class="max-h-[460px] flex flex-col overflow-hidden border border-gray-200 rounded-xl md:col-span-1 dark:border-zinc-800">
                  <div class="border-b border-gray-200 bg-gray-100 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-800">
                    EPUB 內置檔案 ({{ editableFiles.length }})
                  </div>
                  <n-scrollbar class="flex-1">
                    <div class="p-1 space-y-0.5">
                      <button
                        v-for="entry in editableFiles"
                        :key="entry.name"
                        class="w-full flex items-center gap-1.5 truncate border border-transparent rounded px-2 py-1.5 text-left text-xs transition-all"
                        :class="{
                          'bg-primary/10 text-primary border-primary/20 font-semibold': selectedFileName === entry.name,
                          'hover:bg-gray-100 dark:hover:bg-zinc-800/50 text-gray-600 dark:text-gray-300': selectedFileName !== entry.name,
                        }"
                        @click="selectFile(entry.name)"
                      >
                        <span class="flex-shrink-0 rounded bg-gray-200 px-1 py-0.2 text-[9px] text-zinc-700 font-mono opacity-80 dark:bg-zinc-700 dark:text-zinc-300">
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
                    <div class="flex items-center justify-between text-xs">
                      <span class="max-w-[200px] truncate text-gray-500 font-mono" :title="selectedFileName">
                        編輯：{{ selectedFileName }}
                      </span>
                      <span class="text-gray-400">系統將自動即時儲存</span>
                    </div>
                    <n-input
                      v-model:value="activeFileContent"
                      type="textarea"
                      :autosize="{ minRows: 15, maxRows: 18 }"
                      class="text-xs font-mono dark:bg-zinc-900"
                      placeholder="載入程式碼編輯中..."
                    />
                  </div>
                  <div v-else class="h-[360px] flex flex-col items-center justify-center border border-gray-200 rounded-xl border-dashed bg-gray-50/50 p-6 text-center text-gray-400 dark:border-zinc-800 dark:bg-zinc-900/10">
                    <svg xmlns="http://www.w3.org/2000/svg" class="mb-2 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="text-xs">請點選左側內置檔案，可手動微調 XHTML / XML / CSS 原始碼</span>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- Tab 3: Metadata Details -->
            <n-tab-pane name="metadata" tab="書籍資訊修改">
              <div class="max-w-lg border border-gray-100 rounded-2xl bg-gray-50 p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-800/10">
                <div class="space-y-1">
                  <label class="text-xs text-gray-500 font-semibold">書名 (Title)</label>
                  <n-input v-model:value="bookTitle" placeholder="書籍名稱" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-gray-500 font-semibold">作者 (Author / Creator)</label>
                  <n-input v-model:value="bookAuthor" placeholder="作者名稱" />
                </div>
                <div class="pt-2 text-xs text-gray-400 space-y-1">
                  <div>OPF 路徑：<span class="text-gray-500 font-mono">{{ opfPath || '無' }}</span></div>
                  <div>原始內容檔數：<span class="text-gray-600 font-semibold dark:text-gray-300">{{ contentHtmlCount }}</span> 個</div>
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
  height: 520px;
}
.preview-frame.vertical {
  height: 440px;
}
.dark .preview-frame {
  background: #18181c;
}
.preview-pagination,
.preview-chapter-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
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

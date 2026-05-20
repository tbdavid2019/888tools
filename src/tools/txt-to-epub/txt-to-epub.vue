<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { translate } from '@/plugins/i18n.plugin';
import { useCopy } from '@/composable/copy';
import {
  readFileWithAutoEncoding,
  getEncodingLabel,
  decodeWithEncoding,
} from './encodingDetector';
import {
  analyzeText,
  detectChapters,
  detectBookMetadata,
  DETECTION_MODES,
  type Chapter,
  type DetectionMode,
} from './chapterDetector';
import { generateEpub, type EpubProgress } from './epubGenerator';
import { FONT_CONFIG, DEFAULT_FONT, estimateSubsetSize } from './fontSubset';

const message = useMessage();

// Steps: 1: Upload, 2: Chapter Setup & Edit, 3: Style & Metadata, 4: Export
const currentStep = ref(1);
const file = ref<File | null>(null);
const fileText = ref('');
const fileBuffer = ref<ArrayBuffer | null>(null);
const detectedEncoding = ref('');
const selectedEncoding = ref('utf-8');

// Chapter Detection Settings
const detectionMode = ref<DetectionMode>(DETECTION_MODES.AUTO);
const customSeparator = ref('===');
const customKeyword = ref('章');
const textAnalysis = ref<any>(null);

// Chapters list
const chapters = ref<Chapter[]>([]);
const searchKeyword = ref('');
const filteredChapters = computed(() => {
  if (!searchKeyword.value.trim()) return chapters.value;
  const kw = searchKeyword.value.toLowerCase();
  return chapters.value.filter(ch => 
    ch.title.toLowerCase().includes(kw) || 
    ch.content.toLowerCase().includes(kw)
  );
});

// Editing Chapter State
const editingIndex = ref<number | null>(null);
const editTitle = ref('');
const editContent = ref('');

// Metadata & Styling
const bookTitle = ref('');
const bookAuthor = ref('');
const coverFile = ref<File | null>(null);
const coverPreview = ref<string | null>(null);
const writingMode = ref<'horizontal' | 'vertical'>('vertical');
const fontFamily = ref(DEFAULT_FONT);
const embedFontMode = ref<'none' | 'subset' | 'full'>('full');
const fontSize = ref('medium');
const lineHeight = ref('normal');
const textIndent = ref('two');

// Conversion option
const convertToTraditional = ref(true);

// Export Progress State
const isExporting = ref(false);
const exportProgress = ref<EpubProgress>({ stage: '', message: '' });
const exportProgressPercent = ref(0);

// Encoding options dropdown
const encodingOptions = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK（簡體中文）', value: 'gbk' },
  { label: 'Big5（繁體中文）', value: 'big5' },
  { label: 'UTF-16 LE', value: 'utf-16le' },
  { label: 'UTF-16 BE', value: 'utf-16be' },
];

// Font family options
const fontOptions = Object.values(FONT_CONFIG).map(f => ({
  label: `${f.name} (${f.description})`,
  value: f.id,
}));

// FontSize options
const fontSizeOptions = [
  { label: '較小', value: 'small' },
  { label: '適中 (預設)', value: 'medium' },
  { label: '較大', value: 'large' },
  { label: '特大', value: 'xlarge' },
];

// LineHeight options
const lineHeightOptions = [
  { label: '緊湊 (1.5)', value: 'compact' },
  { label: '舒適 (1.8 - 預設)', value: 'normal' },
  { label: '寬鬆 (2.0)', value: 'relaxed' },
  { label: '極寬 (2.3)', value: 'loose' },
];

// TextIndent options
const textIndentOptions = [
  { label: '無縮排', value: 'none' },
  { label: '縮排 1 字元', value: 'one' },
  { label: '縮排 2 字元 (預設)', value: 'two' },
];

// Handle drag and drop or manual selection of txt file
async function handleFileUpload(uploadedFile: File) {
  if (!uploadedFile.name.endsWith('.txt')) {
    message.error('請上傳 .txt 文字檔案');
    return;
  }
  file.value = uploadedFile;
  try {
    const res = await readFileWithAutoEncoding(uploadedFile);
    fileText.value = res.text;
    detectedEncoding.value = res.encoding;
    selectedEncoding.value = res.encoding;
    
    // Store array buffer for re-encoding later if changed
    fileBuffer.value = await uploadedFile.arrayBuffer();

    runTextAnalysis();
    autoDetectMetadata(uploadedFile.name);
    runChapterDetection();
    
    currentStep.value = 2;
    message.success('檔案讀取成功！');
  } catch (err: any) {
    message.error(`讀取檔案失敗: ${err.message}`);
  }
}

// Re-decode text if encoding selection changes
function handleEncodingChange(val: string) {
  if (fileBuffer.value) {
    fileText.value = decodeWithEncoding(fileBuffer.value, val);
    runTextAnalysis();
    runChapterDetection();
    message.info(`已切換為 ${getEncodingLabel(val)} 編碼解碼`);
  }
}

function runTextAnalysis() {
  if (fileText.value) {
    textAnalysis.value = analyzeText(fileText.value);
    detectionMode.value = textAnalysis.value.recommendation;
  }
}

function autoDetectMetadata(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const meta = detectBookMetadata(fileText.value, baseName);
  bookTitle.value = meta.title;
  bookAuthor.value = meta.author;
}

function runChapterDetection() {
  if (!fileText.value) return;
  const opts: any = {};
  if (detectionMode.value === DETECTION_MODES.BY_SEPARATOR) {
    opts.separator = customSeparator.value;
  } else if (detectionMode.value === DETECTION_MODES.BY_KEYWORD) {
    opts.keyword = customKeyword.value;
  }
  chapters.value = detectChapters(fileText.value, detectionMode.value, opts);
}

// Re-run chapter detection when mode/separator/keyword changes
watch([detectionMode, customSeparator, customKeyword], () => {
  runChapterDetection();
});

// Edit specific chapter
function startEditing(index: number, ch: Chapter) {
  editingIndex.value = index;
  editTitle.value = ch.title;
  editContent.value = ch.content;
}

function saveChapterEdit() {
  if (editingIndex.value !== null) {
    chapters.value[editingIndex.value].title = editTitle.value;
    chapters.value[editingIndex.value].content = editContent.value;
    editingIndex.value = null;
    message.success('章節修改成功！');
  }
}

function deleteChapter(index: number) {
  chapters.value.splice(index, 1);
  message.info('已刪除該章節');
}

// Cover Uploader
function handleCoverUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const f = target.files[0];
    coverFile.value = f;
    const reader = new FileReader();
    reader.onload = (event) => {
      coverPreview.value = event.target?.result as string;
    };
    reader.readAsDataURL(f);
  }
}

function clearCover() {
  coverFile.value = null;
  coverPreview.value = null;
}

// SubsetSize estimation
const estimatedSize = computed(() => {
  const totalLength = chapters.value.reduce((acc, ch) => acc + ch.title.length + ch.content.length, 0);
  return estimateSubsetSize(totalLength);
});

const embedFontModeOptions = computed(() => [
  { label: '不嵌入', value: 'none', tooltip: '不打包字型檔，體積最小' },
  { label: '子集化精簡版', value: 'subset', tooltip: `僅打包書中用到的字元，預估體積約為 ${estimatedSize.value}` },
  { label: '完整滿血版 (預設)', value: 'full', tooltip: '嵌入完整字型檔，閱讀器顯示效果最完美且滿血' }
]);

// Run export compiling
async function startExport() {
  if (!bookTitle.value.trim()) {
    message.warning('請填寫書籍名稱');
    currentStep.value = 3;
    return;
  }

  isExporting.value = true;
  exportProgressPercent.value = 10;
  
  try {
    await generateEpub({
      title: bookTitle.value,
      author: bookAuthor.value,
      chapters: chapters.value,
      cover: coverFile.value,
      writingMode: writingMode.value,
      fontFamily: fontFamily.value,
      embedFont: embedFontMode.value !== 'none',
      embedFontMode: embedFontMode.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      textIndent: textIndent.value,
      onProgress: (p) => {
        exportProgress.value = p;
        if (p.stage === 'convert') exportProgressPercent.value = 20;
        else if (p.stage === 'font') exportProgressPercent.value = 40;
        else if (p.stage === 'structure') exportProgressPercent.value = 60;
        else if (p.stage === 'chapters') exportProgressPercent.value = 80;
        else if (p.stage === 'compress') exportProgressPercent.value = 95;
        else if (p.stage === 'done') exportProgressPercent.value = 100;
      }
    });
    
    message.success('EPUB 書籍產生並下載成功！');
    currentStep.value = 4;
  } catch (err: any) {
    message.error(`產生 EPUB 失敗: ${err.message}`);
  } finally {
    isExporting.value = false;
  }
}

function resetAll() {
  file.value = null;
  fileText.value = '';
  fileBuffer.value = null;
  chapters.value = [];
  coverFile.value = null;
  coverPreview.value = null;
  bookTitle.value = '';
  bookAuthor.value = '';
  embedFontMode.value = 'full';
  currentStep.value = 1;
}
</script>

<template>
  <div class="txt-to-epub-container">
    <c-card title="書籍編輯器 (TXT 轉 EPUB)">
    <!-- Custom Elegant Wizard Steps -->
    <div class="flex items-center justify-between mb-8 px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-lg shadow-inner">
      <div class="flex items-center gap-2 cursor-pointer" :class="{ 'text-primary font-semibold': currentStep === 1, 'text-gray-400': currentStep !== 1 }" @click="file ? currentStep = 1 : null">
        <span class="w-6 h-6 flex items-center justify-center rounded-full border border-current text-sm">1</span>
        <span>上傳檔案</span>
      </div>
      <div class="h-1px flex-1 mx-2 bg-gray-200 dark:bg-zinc-700" />
      <div class="flex items-center gap-2 cursor-pointer" :class="{ 'text-primary font-semibold': currentStep === 2, 'text-gray-400': currentStep !== 2 }" @click="file ? currentStep = 2 : null">
        <span class="w-6 h-6 flex items-center justify-center rounded-full border border-current text-sm">2</span>
        <span>章節設定</span>
      </div>
      <div class="h-1px flex-1 mx-2 bg-gray-200 dark:bg-zinc-700" />
      <div class="flex items-center gap-2 cursor-pointer" :class="{ 'text-primary font-semibold': currentStep === 3, 'text-gray-400': currentStep !== 3 }" @click="file ? currentStep = 3 : null">
        <span class="w-6 h-6 flex items-center justify-center rounded-full border border-current text-sm">3</span>
        <span>設計與資訊</span>
      </div>
      <div class="h-1px flex-1 mx-2 bg-gray-200 dark:bg-zinc-700" />
      <div class="flex items-center gap-2 cursor-pointer" :class="{ 'text-primary font-semibold': currentStep === 4, 'text-gray-400': currentStep !== 4 }" @click="file ? currentStep = 4 : null">
        <span class="w-6 h-6 flex items-center justify-center rounded-full border border-current text-sm">4</span>
        <span>匯出完成</span>
      </div>
    </div>

    <!-- Step 1: Upload -->
    <div v-if="currentStep === 1">
      <div class="max-w-2xl mx-auto py-8">
        <c-file-upload
          accept=".txt"
          title="拖曳 TXT 小說/書籍檔案至此，或點擊選取檔案"
          @file-upload="handleFileUpload"
        />
        <div class="mt-4 text-center text-sm text-gray-500">
          支援各種大容量 TXT 檔案，自動偵測編碼 (UTF-8, Big5, GBK 等)，保證絕不亂碼
        </div>
      </div>
    </div>

    <!-- Step 2: Chapter Setup & Edit -->
    <div v-if="currentStep === 2 && file" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Sidebar Settings -->
      <div class="md:col-span-1 space-y-4">
        <div class="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700">
          <h3 class="text-base font-semibold mb-3">檔案資訊</h3>
          <div class="text-sm space-y-2 text-gray-600 dark:text-gray-300">
            <div><strong>檔名：</strong>{{ file?.name }}</div>
            <div><strong>大小：</strong>{{ (file?.size! / 1024 / 1024).toFixed(2) }} MB</div>
            <div>
              <strong>解碼編碼：</strong>
              <c-select
                v-slot:trigger
                v-model:value="selectedEncoding"
                :options="encodingOptions"
                class="inline-block w-full mt-1"
                @update:value="handleEncodingChange"
              />
            </div>
          </div>
        </div>

        <div class="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700">
          <h3 class="text-base font-semibold mb-3">章節偵測規則</h3>
          
          <div class="space-y-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">偵測模式</span>
              <c-select
                v-model:value="detectionMode"
                :options="[
                  { label: '自動正則解析 (推薦)', value: DETECTION_MODES.AUTO },
                  { label: '依連續空行切分', value: DETECTION_MODES.BY_EMPTY_LINES },
                  { label: '自訂分隔符號', value: DETECTION_MODES.BY_SEPARATOR },
                  { label: '自訂關鍵字', value: DETECTION_MODES.BY_KEYWORD },
                  { label: '不切分 (整篇為一章)', value: DETECTION_MODES.SINGLE_CHAPTER },
                ]"
              />
            </div>

            <!-- Conditional configurations -->
            <div v-if="detectionMode === DETECTION_MODES.BY_SEPARATOR">
              <span class="text-xs text-gray-500">分隔符號（如 ===）</span>
              <n-input v-model:value="customSeparator" placeholder="輸入分隔符號" />
            </div>

            <div v-if="detectionMode === DETECTION_MODES.BY_KEYWORD">
              <span class="text-xs text-gray-500">章節關鍵字（如 第、章）</span>
              <n-input v-model:value="customKeyword" placeholder="輸入關鍵字" />
            </div>

            <div class="mt-2 text-xs text-gray-500 bg-white dark:bg-zinc-900 p-2 rounded border border-gray-100 dark:border-zinc-800">
              <div class="font-semibold text-gray-700 dark:text-gray-300">系統分析結果：</div>
              <div v-if="textAnalysis">
                <div>• 偵測到傳統章節樣式：{{ textAnalysis.patternChapterCount }} 個</div>
                <div>• 偵測到括號數字：{{ textAnalysis.bracketNumberCount }} 個</div>
                <div>• 空行區塊：{{ textAnalysis.emptyLineBlocks }} 個</div>
                <div v-if="textAnalysis.commonSeparators.length">
                  • 常見分隔符：{{ textAnalysis.commonSeparators.map((s: any) => `${s.name}(${s.count})`).join(', ') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <c-button tertiary class="flex-1" @click="resetAll">重新載入</c-button>
          <c-button class="flex-1" @click="currentStep = 3">下一步</c-button>
        </div>
      </div>

      <!-- Main Chapters List -->
      <div class="md:col-span-2 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold">目錄結構 (共 {{ chapters.length }} 章)</h3>
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜尋章節名稱或內容..."
            clearable
            class="max-w-xs"
          />
        </div>

        <!-- Inline Editor Modal/Overlay when editing a chapter -->
        <div v-if="editingIndex !== null" class="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-primary">
          <h4 class="font-semibold mb-3 text-primary">編輯章節 - 第 {{ editingIndex + 1 }} 章</h4>
          <div class="space-y-3">
            <n-input v-model:value="editTitle" placeholder="章節名稱" />
            <n-input
              v-model:value="editContent"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 12 }"
              placeholder="章節內容"
            />
            <div class="flex justify-end gap-2">
              <c-button tertiary size="small" @click="editingIndex = null">取消</c-button>
              <c-button size="small" @click="saveChapterEdit">儲存修改</c-button>
            </div>
          </div>
        </div>

        <!-- Scrollable chapter cards -->
        <n-scrollbar style="max-height: 500px" class="pr-2">
          <div class="space-y-2">
            <div
              v-for="(ch, idx) in filteredChapters"
              :key="idx"
              class="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 hover:border-gray-300 transition-colors flex items-start justify-between gap-4"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {{ idx + 1 }}. {{ ch.title || '無標題' }}
                </div>
                <div class="text-xs text-gray-400 mt-1">
                  字數：{{ ch.content.length }} 字
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 italic">
                  {{ ch.content.slice(0, 100) }}...
                </div>
              </div>
              <div class="flex gap-1">
                <c-button tertiary size="small" @click="startEditing(idx, ch)">編輯</c-button>
                <c-button tertiary size="small" class="text-red-500" @click="deleteChapter(idx)">刪除</c-button>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </div>

    <!-- Step 3: Style & Metadata -->
    <div v-if="currentStep === 3" class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Book Info / Metadata -->
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2">書籍元資料</h3>
          <div class="space-y-4">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">書名 (必填)</span>
              <n-input v-model:value="bookTitle" placeholder="例如：三國演義" size="large" />
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">作者</span>
              <n-input v-model:value="bookAuthor" placeholder="例如：羅貫中" size="large" />
            </div>
            <div class="p-3 bg-blue-50 dark:bg-zinc-800 rounded-lg border border-blue-100 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <span class="font-medium text-sm text-blue-900 dark:text-blue-200">簡繁字體詞彙轉換</span>
                <p class="text-xs text-blue-700 dark:text-blue-300 mt-0.5">採用滿血 OpenCC 詞彙庫，轉換更精準 (軟體/軟件、信息/訊息)</p>
              </div>
              <n-checkbox v-slot:trigger v-model:checked="convertToTraditional" />
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2">自訂封面</h3>
          <div class="flex items-center gap-6">
            <div class="w-32 h-44 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-zinc-800 relative group">
              <img v-if="coverPreview" :src="coverPreview" class="w-full h-full object-cover" />
              <div v-else class="text-center text-xs text-gray-400 px-2">無封面<br/>(系統將使用純色封面)</div>
              <button v-if="coverPreview" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" @click="clearCover">
                ✕
              </button>
            </div>
            <div class="flex-1 space-y-2">
              <div class="text-sm text-gray-600 dark:text-gray-300">
                建議比例 3:4 的 JPG 圖片，例如 600x800 或 900x1200 像素
              </div>
              <label class="inline-block cursor-pointer px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm hover:bg-zinc-200 transition-colors">
                選擇封面圖片
                <input type="file" accept="image/jpeg,image/png" class="hidden" @change="handleCoverUpload" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Styling & Font Subsetting -->
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2">排版樣式設定</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-xs text-gray-500 block mb-1">閱讀方向</span>
                <c-select
                  v-model:value="writingMode"
                  :options="[
                    { label: '橫排 (Horizontal)', value: 'horizontal' },
                    { label: '直排 (Vertical) - 傳統小說推薦', value: 'vertical' },
                  ]"
                />
              </div>
              <div>
                <span class="text-xs text-gray-500 block mb-1">字型選擇</span>
                <c-select
                  v-slot:trigger
                  v-model:value="fontFamily"
                  :options="fontOptions"
                />
              </div>
            </div>

            <div v-if="fontFamily !== 'default'" class="space-y-2">
              <label class="text-xs font-semibold text-gray-500 block mb-1">字型嵌入模式</label>
              <c-buttons-select
                v-model:value="embedFontMode"
                :options="embedFontModeOptions"
              />
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <span class="text-xs text-gray-500 block mb-1">字型大小</span>
                <c-select
                  v-model:value="fontSize"
                  :options="fontSizeOptions"
                />
              </div>
              <div>
                <span class="text-xs text-gray-500 block mb-1">行高</span>
                <c-select
                  v-model:value="lineHeight"
                  :options="lineHeightOptions"
                />
              </div>
              <div>
                <span class="text-xs text-gray-500 block mb-1">首行縮排</span>
                <c-select
                  v-model:value="textIndent"
                  :options="textIndentOptions"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="pt-6 flex justify-end gap-3">
          <c-button tertiary size="large" @click="currentStep = 2">上一步</c-button>
          <c-button size="large" :disabled="!bookTitle.trim()" @click="startExport">產生 EPUB 電子書</c-button>
        </div>
      </div>
    </div>

    <!-- Step 4: Export & Progress Tracker -->
    <div v-if="currentStep === 4 || isExporting" class="max-w-xl mx-auto py-12 text-center">
      <div v-if="isExporting" class="space-y-6">
        <!-- Premium Pulsing loader -->
        <div class="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <div class="absolute inset-0 bg-primary opacity-10 rounded-full animate-ping" />
          <div class="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg font-bold">
            EPUB
          </div>
        </div>

        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">正在打包您的電子書...</h3>
        <p class="text-gray-500 text-sm">{{ exportProgress.message || '請稍候，系統正在處理...' }}</p>

        <!-- Premium progress bar -->
        <div class="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
          <div
            class="bg-primary h-full transition-all duration-300 ease-out"
            :style="{ width: `${exportProgressPercent}%` }"
          />
        </div>
      </div>

      <div v-else class="space-y-6">
        <div class="w-20 h-20 bg-green-100 dark:bg-zinc-800 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">電子書匯出成功！</h3>
        <div class="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg text-left max-w-sm mx-auto border border-gray-100 dark:border-zinc-700 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div><strong>書名：</strong>{{ bookTitle }}</div>
          <div><strong>作者：</strong>{{ bookAuthor || '無' }}</div>
          <div><strong>章節數：</strong>{{ chapters.length }} 章</div>
          <div><strong>字型排版：</strong>{{ FONT_CONFIG[fontFamily]?.name }} ({{ writingMode === 'vertical' ? '直書' : '橫書' }})</div>
        </div>

        <div class="pt-4 flex justify-center gap-3">
          <c-button tertiary @click="currentStep = 3">返回修改排版</c-button>
          <c-button @click="resetAll">開始轉換新檔案</c-button>
        </div>
      </div>
    </div>
  </c-card>
  </div>
</template>

<style scoped>
/* Extra styling for vertical flow or fonts if needed */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

<style>
/* 覆寫外層 it-tools 的 tool.layout.vue 限制 */
.tool-content:has(.txt-to-epub-container) {
  max-width: 1400px !important;
}
.tool-content:has(.txt-to-epub-container) > * {
  flex: 1 1 100% !important;
}
.tool-layout:has(+ .tool-content .txt-to-epub-container) {
  max-width: 1400px !important;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useCopy } from '@/composable/copy';
import { formatBytes } from '@/utils/convert';
import { detectBytes, detectFile } from '@/services/magika/magika.service';
import type { MagikaDetection } from '@/services/magika/types';

const router = useRouter();
const message = useMessage();
const { copy } = useCopy();

const file = ref<File | null>(null);
const fileStats = ref<{ name: string; size: number; lastModified: number } | null>(null);
const detection = ref<MagikaDetection | null>(null);
const isLoading = ref(false);
const hexPreview = ref<string>('');

// Drag and drop state
const isOverDropZone = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileInput(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files && files[0]) {
    processFile(files[0]);
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isOverDropZone.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    processFile(files[0]);
  }
}

async function generateHexPreview(blob: Blob) {
  try {
    const slice = blob.slice(0, 128);
    const buf = await slice.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let output = '';

    for (let i = 0; i < bytes.length; i += 16) {
      const offset = i.toString(16).padStart(8, '0');
      const chunk = bytes.subarray(i, Math.min(i + 16, bytes.length));
      
      const hexPart = Array.from(chunk)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
        .padEnd(48, ' ');

      const asciiPart = Array.from(chunk)
        .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');

      output += `${offset}  ${hexPart}  |${asciiPart}|\n`;
    }

    hexPreview.value = output.trimEnd();
  } catch (err) {
    hexPreview.value = '';
  }
}

async function processFile(uploadedFile: File) {
  file.value = uploadedFile;
  fileStats.value = {
    name: uploadedFile.name,
    size: uploadedFile.size,
    lastModified: uploadedFile.lastModified,
  };

  isLoading.value = true;
  detection.value = null;

  try {
    const [res] = await Promise.all([
      detectFile(uploadedFile),
      generateHexPreview(uploadedFile),
    ]);
    detection.value = res;
  } catch (err: any) {
    message.error(err?.message || '辨識失敗');
  } finally {
    isLoading.value = false;
  }
}

// Sample tests
async function loadSample(type: 'epub' | 'disguised' | 'json' | 'python') {
  isLoading.value = true;
  detection.value = null;

  try {
    let mockBytes: Uint8Array;
    let mockName = '';

    if (type === 'epub') {
      // EPUB zip signature + mimetype
      mockName = 'unknown_ebook_without_extension';
      const text = 'PK\x03\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x1c\x00\x00\x00mimetypeapplication/epub+zip';
      mockBytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) mockBytes[i] = text.charCodeAt(i);
    } else if (type === 'disguised') {
      mockName = 'invoice_document.pdf.exe';
      // Windows PE MZ header
      mockBytes = new Uint8Array(1024);
      mockBytes[0] = 0x4D; // M
      mockBytes[1] = 0x5A; // Z
      mockBytes[2] = 0x90;
      mockBytes[3] = 0x00;
      mockBytes[0x3C] = 0x80; // offset to PE header
      mockBytes[0x80] = 0x50; // P
      mockBytes[0x81] = 0x45; // E
    } else if (type === 'json') {
      mockName = 'data_record.txt';
      const str = JSON.stringify({ title: '888tools', features: ['AI Detection', 'EPUB Editor'], rating: 5 }, null, 2);
      mockBytes = new TextEncoder().encode(str);
    } else {
      mockName = 'script.log';
      const py = 'import sys\nimport os\n\ndef main():\n    print("Hello from Python script")\n\nif __name__ == "__main__":\n    main()\n';
      mockBytes = new TextEncoder().encode(py);
    }

    fileStats.value = {
      name: mockName,
      size: mockBytes.length,
      lastModified: Date.now(),
    };

    const blob = new Blob([mockBytes]);
    await generateHexPreview(blob);
    detection.value = await detectBytes(mockBytes, mockName);
  } catch (err: any) {
    message.error(err?.message || '樣本載入失敗');
  } finally {
    isLoading.value = false;
  }
}

function getCategoryColor(cat: string) {
  switch (cat) {
    case 'ebook':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'document':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'code':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'image':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'audio':
    case 'video':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800';
    case 'executable':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-300 border-gray-200 dark:border-zinc-700';
  }
}

function getScoreColorClass(score: number) {
  if (score >= 0.9) return 'text-green-600 dark:text-green-400';
  if (score >= 0.7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function navigateToTool(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto w-full">
    <!-- Header Banner -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800/80 p-5 rounded-2xl border border-blue-100 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
            Google Magika AI
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            100% 本地瀏覽器端推論 • 隱私不外流 • 毫秒級辨識
          </span>
        </div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">
          AI 檔案類型辨識器 (File Type / MIME Sniffer)
        </h2>
        <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          採用 Google Magika 深度學習神經網路模型，分析檔案真實二進位特徵，精準識別 200+ 種檔案格式、MIME Type 與是否包含惡意副檔名偽裝。
        </p>
      </div>

      <!-- Quick sample buttons -->
      <div class="flex flex-wrap gap-1.5 shrink-0">
        <span class="text-xs text-gray-400 self-center mr-1">快速試用樣本：</span>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer shadow-sm"
          @click="loadSample('epub')"
        >
          無副檔名 EPUB
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer shadow-sm"
          @click="loadSample('disguised')"
        >
          偽裝 EXE 執行檔
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer shadow-sm"
          @click="loadSample('json')"
        >
          假裝純文字的 JSON
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer shadow-sm"
          @click="loadSample('python')"
        >
          .log 偽裝 Python
        </button>
      </div>
    </div>

    <!-- Upload Drop Zone -->
    <div
      class="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
      :class="[
        isOverDropZone
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-gray-300 dark:border-zinc-700 hover:border-primary/60 bg-white/50 dark:bg-zinc-900/40',
        isLoading ? 'pointer-events-none opacity-60' : ''
      ]"
      @dragover.prevent="isOverDropZone = true"
      @dragleave.prevent="isOverDropZone = false"
      @drop="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="handleFileInput"
      />

      <div class="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div class="text-base font-semibold text-gray-800 dark:text-gray-200 text-center">
        拖放任意檔案至此，或點擊選取檔案
      </div>
      <div class="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center max-w-md">
        支援任意檔案大小（大檔智慧取樣首尾區塊，毫秒級完成）、無副檔名檔案、電子書、音訊、圖片、壓縮檔或可疑二進位檔。
      </div>

      <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
        <span class="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
        <span>Magika AI 深度分析中...</span>
      </div>
    </div>

    <!-- Detection Result Section -->
    <div v-if="detection && fileStats" class="space-y-5 animate-fade-in">
      <!-- File Metadata Summary & Extension Warning -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">檔案名稱</div>
          <div class="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate" :title="fileStats.name">
            {{ fileStats.name }}
          </div>
        </div>
        <div class="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">檔案大小</div>
          <div class="font-semibold text-sm text-gray-800 dark:text-gray-200">
            {{ formatBytes(fileStats.size) }}
          </div>
        </div>
        <div class="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">內容屬性</div>
          <div class="flex items-center gap-2">
            <span
              class="px-2 py-0.5 text-xs rounded-md font-medium border"
              :class="detection.isText ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300'"
            >
              {{ detection.isText ? '純文字格式 (Text)' : '二進位編碼 (Binary)' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Extension Mismatch Alert -->
      <div
        v-if="detection.isExtensionMismatch"
        class="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 flex items-start gap-3"
      >
        <span class="text-xl">⚠️</span>
        <div class="space-y-1 text-xs">
          <div class="font-bold text-amber-900 dark:text-amber-200 text-sm">
            副檔名不符警示 (Extension Mismatch)
          </div>
          <div class="text-amber-800 dark:text-amber-300 leading-relaxed">
            此檔案副檔名標註為 <code class="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">{{ detection.detectedExtension || '無' }}</code>，
            但 Magika AI 以 <strong class="font-bold">{{ detection.scorePercent }}</strong> 的高度信心判定內容本質其實是
            <strong class="font-bold">{{ detection.name }}</strong> (標準副檔名為 {{ detection.extensions.join(', ') }})！
            請注意是否有格式混淆或安全風險。
          </div>
        </div>
      </div>

      <div
        v-else-if="detection.detectedExtension && detection.extensions.includes(detection.detectedExtension)"
        class="p-3 rounded-xl border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/60 flex items-center gap-2 text-xs text-green-800 dark:text-green-300"
      >
        <span>✅</span>
        <span>副檔名驗證一致：檔案副檔名 <code class="font-mono bg-green-200/50 dark:bg-green-900/40 px-1 rounded">{{ detection.detectedExtension }}</code> 與 AI 預測完全相符。</span>
      </div>

      <!-- Primary Detection Card -->
      <div class="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div class="flex items-center gap-3">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold border"
              :class="getCategoryColor(detection.category)"
            >
              {{ detection.category.toUpperCase() }}
            </span>
            <div>
              <div class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {{ detection.name }}
                <span class="text-xs font-mono font-normal text-gray-400">({{ detection.label }})</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ detection.description }}
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end shrink-0">
            <div class="text-xs text-gray-400 mb-0.5">AI 判定信心度</div>
            <div class="text-2xl font-black font-mono" :class="getScoreColorClass(detection.score)">
              {{ detection.scorePercent }}
            </div>
          </div>
        </div>

        <!-- MIME Type & Extension Info -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div class="p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div class="text-gray-400 mb-0.5 font-medium">標準 MIME Type</div>
              <div class="font-mono font-bold text-gray-800 dark:text-gray-200">
                {{ detection.mimeType }}
              </div>
            </div>
            <button
              type="button"
              class="px-2 py-1 rounded bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 hover:border-primary text-gray-600 dark:text-gray-200 text-xs transition-colors cursor-pointer"
              @click="copy(detection.mimeType)"
            >
              複製
            </button>
          </div>

          <div class="p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div class="text-gray-400 mb-0.5 font-medium">建議標準副檔名</div>
              <div class="font-mono font-bold text-gray-800 dark:text-gray-200">
                {{ detection.extensions.length ? detection.extensions.join('  ') : '無特定副檔名' }}
              </div>
            </div>
            <button
              v-if="detection.extensions.length"
              type="button"
              class="px-2 py-1 rounded bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 hover:border-primary text-gray-600 dark:text-gray-200 text-xs transition-colors cursor-pointer"
              @click="copy(detection.extensions[0])"
            >
              複製
            </button>
          </div>
        </div>

        <!-- Smart Tool Actions (Linked 888tools) -->
        <div v-if="detection.suggestedTools && detection.suggestedTools.length" class="space-y-2 pt-2">
          <div class="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>⚡</span>
            <span>888tools 推薦後續處理工具</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              v-for="tool in detection.suggestedTools"
              :key="tool.path"
              class="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-center justify-between gap-3 hover:border-primary transition-all group cursor-pointer"
              @click="navigateToTool(tool.path)"
            >
              <div class="space-y-0.5">
                <div class="font-bold text-xs text-blue-900 dark:text-blue-200 group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <span>{{ tool.name }}</span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ tool.action }}
                </div>
              </div>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shrink-0 transition-colors shadow-sm"
              >
                立即前往 →
              </button>
            </div>
          </div>
        </div>

        <!-- Top Probability Breakdown -->
        <div v-if="detection.topPredictions && detection.topPredictions.length > 1" class="space-y-2 pt-2">
          <div class="text-xs font-bold text-gray-700 dark:text-gray-300">
            AI 候選機率分佈 (Top Predictions)
          </div>
          <div class="space-y-2">
            <div
              v-for="item in detection.topPredictions"
              :key="item.label"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono text-gray-700 dark:text-gray-300">
                  {{ item.name }} <span class="text-gray-400 text-[11px]">({{ item.label }})</span>
                </span>
                <span class="font-mono font-medium text-gray-600 dark:text-gray-400">
                  {{ item.scorePercent }}
                </span>
              </div>
              <div class="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary transition-all duration-300 rounded-full"
                  :style="{ width: `${Math.min(100, Math.max(0, item.score * 100))}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hex Inspector Preview -->
        <div v-if="hexPreview" class="space-y-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">
              檔案開頭位元組檢視 (Hex & ASCII Header Preview)
            </span>
            <button
              type="button"
              class="text-xs text-primary hover:underline cursor-pointer"
              @click="copy(hexPreview)"
            >
              複製 Hex 內容
            </button>
          </div>
          <pre class="font-mono text-[11px] p-3 bg-gray-900 text-gray-200 rounded-xl overflow-x-auto leading-relaxed">{{ hexPreview }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

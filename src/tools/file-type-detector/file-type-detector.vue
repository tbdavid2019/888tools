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
let dragCounter = 0;
const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files[0]) {
    processFile(files[0]);
  }
  target.value = '';
}

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  dragCounter++;
  isOverDropZone.value = true;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isOverDropZone.value = false;
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  dragCounter = 0;
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
      mockName = 'unknown_ebook_without_extension';
      const text = 'PK\x03\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x1c\x00\x00\x00mimetypeapplication/epub+zip';
      mockBytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) mockBytes[i] = text.charCodeAt(i);
    } else if (type === 'disguised') {
      mockName = 'invoice_document.pdf.exe';
      mockBytes = new Uint8Array(1024);
      mockBytes[0] = 0x4D; // M
      mockBytes[1] = 0x5A; // Z
      mockBytes[2] = 0x90;
      mockBytes[3] = 0x00;
      mockBytes[0x3C] = 0x80;
      mockBytes[0x80] = 0x50; // P
      mockBytes[0x81] = 0x45; // E
    } else if (type === 'json') {
      mockName = 'data_record.txt';
      const str = JSON.stringify({ title: '888tools', features: ['Format Analysis', 'EPUB Editor'], rating: 5 }, null, 2);
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
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'document':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'code':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'image':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'audio':
    case 'video':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300 border-pink-200 dark:border-pink-800';
    case 'executable':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
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
  <div class="file-type-detector w-full max-w-4xl mx-auto space-y-6" style="flex: 1 1 100%;">
    <!-- Sample Quick Bar -->
    <div class="flex items-center justify-between flex-wrap gap-3 p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white shrink-0">
          Google Magika
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">
          純前端本地推論 • 隱私不外流
        </span>
      </div>

      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs text-gray-400 mr-1">試用樣本：</span>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          @click="loadSample('epub')"
        >
          無副檔名 EPUB
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          @click="loadSample('disguised')"
        >
          偽裝 EXE 執行檔
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          @click="loadSample('json')"
        >
          偽裝 TXT 的 JSON
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-primary text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          @click="loadSample('python')"
        >
          .log 偽裝 Python
        </button>
      </div>
    </div>

    <!-- Upload Drop Zone -->
    <div
      class="border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm"
      :class="[
        isOverDropZone
          ? 'border-primary bg-primary/10 scale-[1.01] ring-2 ring-primary/20'
          : 'border-gray-300 dark:border-zinc-700 hover:border-primary',
        isLoading ? 'pointer-events-none opacity-60' : ''
      ]"
      @dragenter="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="handleFileInput"
      />

      <div class="pointer-events-none flex flex-col items-center">
        <div class="p-4 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl mb-3 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div class="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 text-center">
          拖放任意檔案至此，或點擊選取檔案
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center max-w-lg">
          支援任意檔案大小（採用首尾區塊毫秒級智慧切片）、無副檔名檔案、電子書、音訊、圖片、壓縮檔或二進位檔。
        </div>
      </div>

      <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold">
        <span class="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
        <span>Magika 深度分析中...</span>
      </div>
    </div>

    <!-- Detection Result Section -->
    <div v-if="detection && fileStats" class="space-y-5 animate-fade-in">
      <!-- File Metadata Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">檔案名稱</div>
          <div class="font-bold text-sm text-gray-800 dark:text-gray-200 truncate" :title="fileStats.name">
            {{ fileStats.name }}
          </div>
        </div>
        <div class="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">檔案大小</div>
          <div class="font-bold text-sm text-gray-800 dark:text-gray-200">
            {{ formatBytes(fileStats.size) }}
          </div>
        </div>
        <div class="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">內容屬性</div>
          <div>
            <span
              class="px-2.5 py-1 text-xs rounded-lg font-bold border"
              :class="detection.isText ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'"
            >
              {{ detection.isText ? '純文字格式 (Text)' : '二進位編碼 (Binary)' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Extension Mismatch Alert -->
      <div
        v-if="detection.isExtensionMismatch"
        class="p-4 rounded-2xl border bg-amber-50/90 dark:bg-amber-950/40 backdrop-blur-md border-amber-300 dark:border-amber-800/80 flex items-start gap-3.5 shadow-sm"
      >
        <span class="text-2xl shrink-0">⚠️</span>
        <div class="space-y-1 text-xs">
          <div class="font-bold text-amber-900 dark:text-amber-200 text-sm">
            副檔名不符警示 (Extension Mismatch)
          </div>
          <div class="text-amber-800 dark:text-amber-300 leading-relaxed">
            此檔案副檔名標註為 <code class="font-mono font-bold bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">{{ detection.detectedExtension || '無' }}</code>，
            但 Magika 以 <strong class="font-bold">{{ detection.scorePercent }}</strong> 的信心度判定其真實格式為
            <strong class="font-bold underline">{{ detection.name }}</strong> (標準副檔名為 {{ detection.extensions.join(', ') }})！
            請特別注意是否有格式偽裝。
          </div>
        </div>
      </div>

      <div
        v-else-if="detection.detectedExtension && detection.extensions.includes(detection.detectedExtension)"
        class="p-3.5 rounded-2xl border bg-green-50/90 dark:bg-green-950/30 backdrop-blur-md border-green-200 dark:border-green-800/60 flex items-center gap-2.5 text-xs text-green-800 dark:text-green-300 shadow-sm"
      >
        <span class="text-base">✅</span>
        <span>副檔名驗證一致：副檔名 <code class="font-mono font-bold bg-green-200/50 dark:bg-green-900/40 px-1.5 py-0.5 rounded">{{ detection.detectedExtension }}</code> 與內部特徵完全相符。</span>
      </div>

      <!-- Primary Detection Card -->
      <div class="p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-3xl border border-gray-200/80 dark:border-zinc-800 shadow-md space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div class="flex items-center gap-3.5">
            <span
              class="px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm"
              :class="getCategoryColor(detection.category)"
            >
              {{ detection.category.toUpperCase() }}
            </span>
            <div>
              <div class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                {{ detection.name }}
                <span class="text-xs font-mono font-normal text-gray-400">({{ detection.label }})</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ detection.description }}
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:items-end shrink-0">
            <div class="text-xs text-gray-400 mb-0.5">判定信心度</div>
            <div class="text-2xl sm:text-3xl font-black font-mono" :class="getScoreColorClass(detection.score)">
              {{ detection.scorePercent }}
            </div>
          </div>
        </div>

        <!-- MIME Type & Extension Info -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div class="p-3.5 bg-gray-50/80 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div class="text-gray-400 mb-0.5 font-medium">標準 MIME Type</div>
              <div class="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                {{ detection.mimeType }}
              </div>
            </div>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 hover:border-primary text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors cursor-pointer shadow-sm"
              @click="copy(detection.mimeType)"
            >
              複製
            </button>
          </div>

          <div class="p-3.5 bg-gray-50/80 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div class="text-gray-400 mb-0.5 font-medium">建議標準副檔名</div>
              <div class="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                {{ detection.extensions.length ? detection.extensions.join('  ') : '無特定副檔名' }}
              </div>
            </div>
            <button
              v-if="detection.extensions.length"
              type="button"
              class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 hover:border-primary text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors cursor-pointer shadow-sm"
              @click="copy(detection.extensions[0])"
            >
              複製
            </button>
          </div>
        </div>

        <!-- Smart Tool Actions (Linked 888tools) -->
        <div v-if="detection.suggestedTools && detection.suggestedTools.length" class="space-y-2.5 pt-2">
          <div class="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>⚡</span>
            <span>888tools 推薦後續處理工具</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="tool in detection.suggestedTools"
              :key="tool.path"
              class="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex items-center justify-between gap-3 hover:border-primary transition-all group cursor-pointer shadow-sm"
              @click="navigateToTool(tool.path)"
            >
              <div class="space-y-1">
                <div class="font-bold text-xs text-blue-900 dark:text-blue-200 group-hover:text-primary transition-colors">
                  {{ tool.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ tool.action }}
                </div>
              </div>
              <button
                type="button"
                class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                前往 →
              </button>
            </div>
          </div>
        </div>

        <!-- Top Probability Breakdown -->
        <div v-if="detection.topPredictions && detection.topPredictions.length > 1" class="space-y-2.5 pt-2">
          <div class="text-xs font-bold text-gray-700 dark:text-gray-300">
            候選格式機率分佈 (Top Predictions)
          </div>
          <div class="space-y-2.5">
            <div
              v-for="item in detection.topPredictions"
              :key="item.label"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  {{ item.name }} <span class="text-gray-400 font-mono text-[11px]">({{ item.label }})</span>
                </span>
                <span class="font-mono font-bold text-gray-700 dark:text-gray-300">
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
        <div v-if="hexPreview" class="space-y-2.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">
              檔案開頭位元組檢視 (Hex & ASCII Header Preview)
            </span>
            <button
              type="button"
              class="text-xs text-primary font-medium hover:underline cursor-pointer"
              @click="copy(hexPreview)"
            >
              複製 Hex
            </button>
          </div>
          <pre class="font-mono text-[11px] p-3.5 bg-gray-900 text-gray-200 rounded-2xl overflow-x-auto leading-relaxed shadow-inner">{{ hexPreview }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

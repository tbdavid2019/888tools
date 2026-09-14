<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  Download,
  Copy,
  Table as IconTable,
  FileText,
  Upload,
  Refresh,
  ExternalLink,
  Cpu,
  Check,
  Code,
  Eye,
  Trash,
} from '@vicons/tabler';

import { checkBrowserWebGpu, recognizeImage, generateDemoSample } from './ocr.service';
import { reconstructTableFromOcrBoxes, exportGridToXlsx } from './table-reconstruction.service';
import type { OcrResult, OcrTextItem, TableReconstructResult, OcrProgressEvent } from './ocr.types';
import { convertOpenCC } from '@/services/opencc.service';

const message = useMessage();
const router = useRouter();

// 狀態管理
const isProcessing = ref(false);
const progressInfo = ref<OcrProgressEvent>({
  stage: 'init',
  message: '',
  progress: 0,
});

const webGpuInfo = ref<{ supported: boolean; adapterName?: string }>({ supported: false });
const originalImageUrl = ref<string | null>(null);
const imageNaturalWidth = ref(0);
const imageNaturalHeight = ref(0);

// 辨識結果
const ocrResult = ref<OcrResult | null>(null);
const tableResult = ref<TableReconstructResult | null>(null);
const activeTab = ref<'table' | 'text' | 'raw'>('table');

// Canvas 幾何視覺化
const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const showBoundingBoxes = ref(true);
const showTableGrid = ref(true);
const hoveredItemId = ref<string | null>(null);

// 拖曳狀態
const isDraggingOver = ref(false);

// 統計資料
const stats = computed(() => {
  if (!ocrResult.value) return null;
  const totalChars = ocrResult.value.items.reduce((sum, it) => sum + it.text.replace(/\s+/g, '').length, 0);
  const avgConfidence = ocrResult.value.items.length > 0
    ? Math.round(
        (ocrResult.value.items.reduce((sum, it) => sum + it.confidence, 0) / ocrResult.value.items.length) * 100,
      )
    : 0;

  return {
    totalChars,
    boxCount: ocrResult.value.items.length,
    avgConfidence,
    timeMs: ocrResult.value.timeMs,
    backend: ocrResult.value.backend.toUpperCase(),
  };
});

// 初始化檢查 WebGPU
onMounted(async () => {
  webGpuInfo.value = await checkBrowserWebGpu();
  window.addEventListener('paste', handleGlobalPaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handleGlobalPaste);
});

// 處理貼上截圖 (Ctrl+V / Cmd+V)
function handleGlobalPaste(e: ClipboardEvent) {
  if (!e.clipboardData) return;
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) {
        processImageFile(file);
        e.preventDefault();
        break;
      }
    }
  }
}

// 檔案選擇
function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    processImageFile(target.files[0]);
    target.value = '';
  }
}

// 拖放處理
function onDrop(e: DragEvent) {
  isDraggingOver.value = false;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('image/')) {
      processImageFile(file);
    } else {
      message.warning('請上傳圖片格式檔案 (PNG, JPG, WEBP)');
    }
  }
}

// 載入示範樣例
function loadSample(type: 'text' | 'table') {
  const dataUrl = generateDemoSample(type);
  originalImageUrl.value = dataUrl;
  activeTab.value = type === 'table' ? 'table' : 'text';
  runOcr(dataUrl);
}

// 處理圖片檔案
function processImageFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    originalImageUrl.value = dataUrl;
    runOcr(dataUrl);
  };
  reader.readAsDataURL(file);
}

// 執行核心 OCR 與二維表格幾何重構
async function runOcr(imageSource: string) {
  isProcessing.value = true;
  progressInfo.value = {
    stage: 'init',
    message: '正在準備推論引擎...',
    progress: 10,
  };

  try {
    const result = await recognizeImage(imageSource, (ev) => {
      progressInfo.value = ev;
    });

    ocrResult.value = result;
    imageNaturalWidth.value = result.imageWidth;
    imageNaturalHeight.value = result.imageHeight;

    // 執行二維幾何表格重構演算法
    progressInfo.value = {
      stage: 'table',
      message: '正在進行二維空間幾何拓撲分析與表格重構...',
      progress: 95,
    };

    const table = reconstructTableFromOcrBoxes(result.items);
    tableResult.value = table;

    // 若重構出大於 1 列或 1 行的表格，預設切換至表格頁簽
    if (table.rowCount > 1 && table.colCount > 1) {
      activeTab.value = 'table';
    } else {
      activeTab.value = 'text';
    }

    message.success(`辨識完成！共識別 ${result.items.length} 個幾何文字塊 (耗時 ${result.timeMs}ms)`);

    nextTick(() => {
      drawCanvasOverlay();
    });
  } catch (err: any) {
    console.error('OCR Processing failed:', err);
    message.error(`辨識失敗: ${err.message || String(err)}`);
  } finally {
    isProcessing.value = false;
  }
}

// 繪製圖片上的幾何邊界框與網格
function drawCanvasOverlay() {
  const canvas = canvasRef.value;
  const img = imageRef.value;
  if (!canvas || !img || !ocrResult.value) return;

  const displayWidth = img.clientWidth;
  const displayHeight = img.clientHeight;
  if (!displayWidth || !displayHeight) return;

  canvas.width = displayWidth;
  canvas.height = displayHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scaleX = displayWidth / (imageNaturalWidth.value || displayWidth);
  const scaleY = displayHeight / (imageNaturalHeight.value || displayHeight);

  // 1. 繪製個別 OCR 文字邊界框 (Bounding Boxes)
  if (showBoundingBoxes.value) {
    for (const item of ocrResult.value.items) {
      const isHovered = hoveredItemId.value === item.id;
      const bx = item.box.x * scaleX;
      const by = item.box.y * scaleY;
      const bw = item.box.width * scaleX;
      const bh = item.box.height * scaleY;

      // 外框與填充樣式
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.strokeStyle = isHovered ? '#f59e0b' : '#10b981';
      ctx.fillStyle = isHovered ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.12)';

      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);

      // 若滑鼠懸停，繪製文字標籤
      if (isHovered) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#1e293b';
        const label = `${item.text} (${Math.round(item.confidence * 100)}%)`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(bx, Math.max(0, by - 18), textWidth + 8, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, bx + 4, Math.max(13, by - 4));
      }
    }
  }

  // 2. 繪製二維重構表格網格線 (Table Grid)
  if (showTableGrid.value && tableResult.value && tableResult.value.cells.length > 0) {
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;

    for (const cell of tableResult.value.cells) {
      if (cell.box) {
        const cx = cell.box.x * scaleX;
        const cy = cell.box.y * scaleY;
        const cw = cell.box.width * scaleX;
        const ch = cell.box.height * scaleY;
        ctx.strokeRect(cx, cy, cw, ch);
      }
    }
    ctx.setLineDash([]);
  }
}

// 監聽畫布縮放與視窗尺寸變化
watch([showBoundingBoxes, showTableGrid, hoveredItemId], () => {
  drawCanvasOverlay();
});

// 畫布滑鼠移動檢測
function onCanvasMouseMove(e: MouseEvent) {
  if (!canvasRef.value || !ocrResult.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const scaleX = (imageNaturalWidth.value || canvasRef.value.width) / canvasRef.value.width;
  const scaleY = (imageNaturalHeight.value || canvasRef.value.height) / canvasRef.value.height;

  const origX = mouseX * scaleX;
  const origY = mouseY * scaleY;

  let matched: OcrTextItem | null = null;
  for (const item of ocrResult.value.items) {
    if (
      origX >= item.box.x &&
      origX <= item.box.x + item.box.width &&
      origY >= item.box.y &&
      origY <= item.box.y + item.box.height
    ) {
      matched = item;
      break;
    }
  }

  hoveredItemId.value = matched ? matched.id : null;
}

function onCanvasMouseLeave() {
  hoveredItemId.value = null;
}

// 複製到剪貼簿
async function copyToClipboard(text: string, label = '內容') {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label} 已複製到剪貼簿！`);
  } catch {
    message.error('複製失敗，請手動選取複製');
  }
}

// 下載純文字檔案
function downloadTextFile() {
  if (!ocrResult.value) return;
  const blob = new Blob([ocrResult.value.text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ocr_text_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// 匯出 Excel
function handleExportExcel() {
  if (!tableResult.value || tableResult.value.grid.length === 0) {
    message.warning('尚無可匯出的表格資料');
    return;
  }
  try {
    exportGridToXlsx(tableResult.value.grid, `ocr_table_${Date.now()}.xlsx`);
    message.success('Excel 檔案匯出成功！');
  } catch (err: any) {
    message.error(`匯出失敗: ${err.message || String(err)}`);
  }
}

// 傳送至 CSV/Excel 檢視器
function openInCsvExcelViewer() {
  if (!tableResult.value || !tableResult.value.csv) {
    message.warning('尚無表格資料可傳送');
    return;
  }
  // 透過 sessionStorage 傳遞 CSV 資料
  sessionStorage.setItem('external_csv_content', tableResult.value.csv);
  router.push('/csv-excel-viewer');
}

// 簡繁轉換
function convertChinese(direction: 's2t' | 't2s') {
  if (!ocrResult.value) return;

  // 轉換純文字
  ocrResult.value.text = convertOpenCC(ocrResult.value.text, direction);

  // 轉換每個項目
  for (const it of ocrResult.value.items) {
    it.text = convertOpenCC(it.text, direction);
  }

  // 轉換表格
  if (tableResult.value) {
    tableResult.value.grid = tableResult.value.grid.map(row =>
      row.map(cell => convertOpenCC(cell, direction)),
    );
    tableResult.value.markdown = convertOpenCC(tableResult.value.markdown, direction);
    tableResult.value.csv = convertOpenCC(tableResult.value.csv, direction);
    tableResult.value.html = convertOpenCC(tableResult.value.html, direction);
  }

  message.success(direction === 's2t' ? '已轉換為繁體中文' : '已轉換為簡體中文');
}

// 清除所有內容
function reset() {
  originalImageUrl.value = null;
  ocrResult.value = null;
  tableResult.value = null;
  hoveredItemId.value = null;
}
</script>

<template>
  <div class="ocr-scanner-wrapper flex flex-col gap-5">
    <!-- 頂部資訊列與 WebGPU 狀態 -->
    <c-card>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <n-tag :type="webGpuInfo.supported ? 'success' : 'info'" round size="medium">
            <template #icon>
              <Cpu class="w-4 h-4" />
            </template>
            {{ webGpuInfo.supported ? 'WebGPU 加速啟用' : 'WASM 引擎就緒' }}
          </n-tag>
          <span class="text-sm opacity-75">
            推論引擎：PaddleOCR (PP-OCRv5/v6) + 二維幾何重構演算法 (純前端本地運算)
          </span>
        </div>

        <div class="flex items-center gap-2">
          <n-button size="small" secondary type="primary" @click="loadSample('table')">
            <template #icon><IconTable class="w-4 h-4" /></template>
            載入示範表格
          </n-button>
          <n-button size="small" secondary @click="loadSample('text')">
            <template #icon><FileText class="w-4 h-4" /></template>
            載入示範段落
          </n-button>
          <n-button v-if="originalImageUrl" size="small" quaternary type="error" @click="reset">
            <template #icon><Trash class="w-4 h-4" /></template>
            清除
          </n-button>
        </div>
      </div>
    </c-card>

    <!-- 上傳與剪貼簿貼上區 -->
    <div
      class="upload-drop-zone relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
      :class="{
        'border-primary ring-2 ring-primary/20 bg-primary/5': isDraggingOver,
        'border-slate-300 dark:border-slate-700 hover:border-primary/60': !isDraggingOver,
      }"
      @dragover.prevent="isDraggingOver = true"
      @dragleave="isDraggingOver = false"
      @drop.prevent="onDrop"
      @click="($refs.fileInput as HTMLInputElement).click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileSelect"
      />

      <div class="flex flex-col items-center justify-center gap-3">
        <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Upload class="w-7 h-7" />
        </div>
        <div>
          <h3 class="text-base font-semibold mb-1">
            點擊選擇圖片、拖曳至此，或直接按 <kbd class="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Ctrl+V</kbd> / <kbd class="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Cmd+V</kbd> 貼上截圖
          </h3>
          <p class="text-xs opacity-65">
            支援 PNG、JPG、WEBP 等常見影像格式，圖片完全在本地運算不經過任何外部伺服器。
          </p>
        </div>
      </div>
    </div>

    <!-- 執行中進度條 -->
    <n-alert v-if="isProcessing" type="info" class="shadow-sm">
      <template #icon>
        <n-spin size="small" />
      </template>
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center text-sm font-medium">
          <span>{{ progressInfo.message || '正在進行 AI 模型運算...' }}</span>
          <span>{{ progressInfo.progress }}%</span>
        </div>
        <n-progress
          type="line"
          :percentage="progressInfo.progress"
          :show-indicator="false"
          status="info"
          processing
        />
      </div>
    </n-alert>

    <!-- 辨識成果工作區 -->
    <div v-if="originalImageUrl" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- 左欄：原圖與 Canvas 幾何視覺化覆蓋 -->
      <div class="lg:col-span-6 flex flex-col gap-3">
        <c-card title="圖像幾何檢測與標註">
          <template #extra>
            <div class="flex items-center gap-4 text-xs">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input v-model="showBoundingBoxes" type="checkbox" class="rounded text-primary" />
                <span>偵測框 (BBoxes)</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input v-model="showTableGrid" type="checkbox" class="rounded text-primary" />
                <span>表格網格 (Grid)</span>
              </label>
            </div>
          </template>

          <div
            ref="containerRef"
            class="relative w-full max-h-[550px] overflow-auto flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900/60 p-2"
          >
            <div class="relative inline-block max-w-full">
              <img
                ref="imageRef"
                :src="originalImageUrl"
                alt="Original OCR Target"
                class="max-w-full h-auto object-contain block rounded"
                @load="drawCanvasOverlay"
              />
              <canvas
                ref="canvasRef"
                class="absolute inset-0 cursor-crosshair"
                @mousemove="onCanvasMouseMove"
                @mouseleave="onCanvasMouseLeave"
              />
            </div>
          </div>

          <div v-if="stats" class="mt-3 flex flex-wrap items-center justify-between text-xs opacity-75 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span>尺寸: {{ imageNaturalWidth }} × {{ imageNaturalHeight }} px</span>
            <span>推論耗時: {{ stats.timeMs }} ms</span>
            <span>平均置信度: {{ stats.avgConfidence }}%</span>
          </div>
        </c-card>
      </div>

      <!-- 右欄：多模式辨識成果 (表格重構 / 純文字 / JSON 幾何) -->
      <div class="lg:col-span-6 flex flex-col gap-3">
        <c-card>
          <n-tabs v-model:value="activeTab" type="segment" animated>
            <!-- 分頁 1: 二維表格重構 -->
            <n-tab-pane name="table" tab="二維表格重構">
              <div class="flex flex-col gap-3 pt-2">
                <!-- 工具列 -->
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <n-tag v-if="tableResult" size="small" type="success" round>
                      {{ tableResult.rowCount }} 列 × {{ tableResult.colCount }} 欄
                    </n-tag>
                    <span class="text-xs opacity-65">點擊單元格可即時編輯</span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <n-button size="small" type="primary" secondary @click="handleExportExcel">
                      <template #icon><Download class="w-3.5 h-3.5" /></template>
                      匯出 Excel (.xlsx)
                    </n-button>
                    <n-button size="small" secondary @click="copyToClipboard(tableResult?.markdown || '', 'Markdown 表格')">
                      <template #icon><Copy class="w-3.5 h-3.5" /></template>
                      Markdown
                    </n-button>
                    <n-button size="small" secondary @click="copyToClipboard(tableResult?.csv || '', 'CSV')">
                      <template #icon><Copy class="w-3.5 h-3.5" /></template>
                      CSV
                    </n-button>
                    <n-button size="small" quaternary @click="openInCsvExcelViewer">
                      <template #icon><ExternalLink class="w-3.5 h-3.5" /></template>
                      檢視器中打開
                    </n-button>
                  </div>
                </div>

                <!-- 表格預覽視窗 -->
                <div v-if="tableResult && tableResult.grid.length > 0" class="table-container max-h-[440px] overflow-auto border rounded-lg border-slate-200 dark:border-slate-800">
                  <table class="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr class="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th class="p-2.5 w-10 text-center text-xs opacity-50 font-mono">#</th>
                        <th
                          v-for="(header, cIdx) in tableResult.grid[0]"
                          :key="`th-${cIdx}`"
                          class="p-2.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                        >
                          <input
                            v-model="tableResult.grid[0][cIdx]"
                            class="bg-transparent w-full outline-none focus:bg-primary/10 rounded px-1"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, rIdx) in tableResult.grid.slice(1)"
                        :key="`row-${rIdx}`"
                        class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-primary/5 transition-colors"
                      >
                        <td class="p-2 text-center text-xs opacity-40 font-mono select-none">{{ rIdx + 1 }}</td>
                        <td
                          v-for="(cell, cIdx) in row"
                          :key="`cell-${rIdx}-${cIdx}`"
                          class="p-2 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0"
                        >
                          <input
                            v-model="tableResult.grid[rIdx + 1][cIdx]"
                            class="bg-transparent w-full outline-none focus:bg-primary/10 rounded px-1"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else class="text-center py-12 text-slate-400">
                  未偵測到明顯結構之表格，可切換至「純文字辨識」檢視
                </div>
              </div>
            </n-tab-pane>

            <!-- 分頁 2: 純文字辨識 -->
            <n-tab-pane name="text" tab="純文字辨識">
              <div class="flex flex-col gap-3 pt-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <n-tag v-if="stats" size="small" round>
                      共 {{ stats.totalChars }} 字 / {{ stats.boxCount }} 行
                    </n-tag>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <n-button size="small" secondary @click="convertChinese('s2t')">
                      轉繁體
                    </n-button>
                    <n-button size="small" secondary @click="convertChinese('t2s')">
                      轉簡體
                    </n-button>
                    <n-button size="small" type="primary" secondary @click="copyToClipboard(ocrResult?.text || '', '辨識文字')">
                      <template #icon><Copy class="w-3.5 h-3.5" /></template>
                      複製文字
                    </n-button>
                    <n-button size="small" secondary @click="downloadTextFile">
                      <template #icon><Download class="w-3.5 h-3.5" /></template>
                      下載 TXT
                    </n-button>
                  </div>
                </div>

                <n-input
                  v-if="ocrResult"
                  v-model:value="ocrResult.text"
                  type="textarea"
                  placeholder="辨識結果文字"
                  :rows="14"
                  class="font-sans leading-relaxed"
                />
              </div>
            </n-tab-pane>

            <!-- 分頁 3: 原始幾何與 JSON 數據 -->
            <n-tab-pane name="raw" tab="幾何座標 (JSON)">
              <div class="flex flex-col gap-3 pt-2">
                <div class="flex justify-between items-center">
                  <span class="text-xs opacity-75">
                    提供文字區域二維邊界框座標 (X, Y, Width, Height) 與信心分數
                  </span>
                  <n-button size="small" secondary @click="copyToClipboard(JSON.stringify(ocrResult, null, 2), 'JSON 數據')">
                    <template #icon><Copy class="w-3.5 h-3.5" /></template>
                    複製 JSON
                  </n-button>
                </div>

                <pre class="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono max-h-[440px] overflow-auto">{{ JSON.stringify(ocrResult, null, 2) }}</pre>
              </div>
            </n-tab-pane>
          </n-tabs>
        </c-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-drop-zone {
  min-height: 140px;
}

.table-container {
  scrollbar-width: thin;
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconRefresh,
  IconSearch,
  IconTable,
  IconUpload,
} from '@tabler/icons-vue';
import * as XLSX from 'xlsx';
import iconv from 'iconv-lite';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const message = useMessage();
const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

const headers = ref<string[]>([]);
const rows = ref<any[]>([]);
const fileName = ref('');
const fileSize = ref(0);
const loading = ref(false);
const isDragging = ref(false);
const encoding = ref('auto');
const currentFile = ref<File | null>(null);
const currentBuffer = ref<ArrayBuffer | null>(null);
const isCsvFile = ref(false);
const detectedEncoding = ref<string | null>(null);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(50);
const fileInput = ref<HTMLInputElement | null>(null);
const cellModalVisible = ref(false);
const cellModalContent = ref('');
const cellModalTitle = ref('');

const encodingOptions = [
  { label: '智慧自動偵測 (Auto)', value: 'auto' },
  { label: 'UTF-8 (標準萬國碼)', value: 'utf-8' },
  { label: 'Big5 (繁體中文 Windows / 經典抗亂碼)', value: 'big5' },
  { label: 'GB18030 / GBK (簡體中文)', value: 'gb18030' },
  { label: 'Shift-JIS (日文)', value: 'shift_jis' },
  { label: 'Windows-1252 (西歐 ANSI)', value: 'windows-1252' },
];

const pageSizeOptions = [
  { label: '每頁 25 筆', value: 25 },
  { label: '每頁 50 筆', value: 50 },
  { label: '每頁 100 筆', value: 100 },
  { label: '每頁 200 筆', value: 200 },
  { label: '顯示全部', value: 999999 },
];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const normalizeTable = (data: any[][]) => {
  if (!data.length) return { headers: [], rows: [] };

  const normalized = data.map(row => (Array.isArray(row) ? row : [row]));
  const maxColumns = normalized.reduce((max, row) => Math.max(max, row.length), 0);
  const padded = normalized.map((row) => {
    const nextRow = [...row];
    while (nextRow.length < maxColumns) nextRow.push('');
    return nextRow;
  });

  const headerRow = padded[0] || [];
  const headerValues = headerRow.map((cell, index) => {
    if (cell === null || cell === undefined || cell === '') {
      return `欄位 ${index + 1}`;
    }
    return String(cell);
  });

  return {
    headers: headerValues,
    rows: padded.slice(1),
  };
};

const parseWorkbook = (workbook: XLSX.WorkBook) => {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as any[][];

  const normalized = normalizeTable(jsonData);
  headers.value = normalized.headers;
  rows.value = normalized.rows;
  currentPage.value = 1;
};

const parseFile = () => {
  if (!currentFile.value || !currentBuffer.value) return;

  const file = currentFile.value;
  const extension = file.name.split('.').pop()?.toLowerCase();
  isCsvFile.value = extension === 'csv' || extension === 'tsv' || file.type === 'text/csv';

  if (isCsvFile.value) {
    const buffer = currentBuffer.value;
    const uint8 = new Uint8Array(buffer);

    // Check for UTF-8 BOM (0xEF, 0xBB, 0xBF)
    const hasBom = uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF;

    const candidates = encoding.value === 'auto'
      ? (hasBom ? ['utf-8'] : ['utf-8', 'big5', 'gb18030', 'shift_jis', 'windows-1252'])
      : [encoding.value];

    let bestText = '';
    let bestEncoding = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      try {
        let text = '';
        if (candidate === 'utf-8') {
          const decoder = new TextDecoder('utf-8');
          text = decoder.decode(buffer);
        } else {
          // Use iconv-lite for reliable multi-byte decoding
          text = iconv.decode(Buffer.from(buffer), candidate);
        }

        const replacements = (text.match(/\uFFFD/g) || []).length;
        if (replacements < bestScore) {
          bestScore = replacements;
          bestEncoding = candidate;
          bestText = text;
        }
      } catch (error) {
        console.warn(`Encoding ${candidate} error:`, error);
      }
    }

    if (!bestText) {
      const fallback = new TextDecoder('utf-8');
      bestText = fallback.decode(buffer);
      bestEncoding = 'utf-8';
    }

    detectedEncoding.value = encoding.value === 'auto' ? (hasBom ? 'utf-8 (含 BOM)' : bestEncoding) : null;

    const workbook = XLSX.read(bestText, { type: 'string', raw: false, cellText: true });
    parseWorkbook(workbook);
  } else {
    detectedEncoding.value = null;
    const data = new Uint8Array(currentBuffer.value);
    const workbook = XLSX.read(data, { type: 'array', raw: false, cellText: true });
    parseWorkbook(workbook);
  }
};

const processFile = (file: File) => {
  loading.value = true;
  fileName.value = file.name;
  fileSize.value = file.size;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      currentFile.value = file;
      currentBuffer.value = e.target?.result as ArrayBuffer;
      parseFile();
      loading.value = false;
      message.success(`成功載入：${file.name}`);
    } catch (error) {
      console.error(error);
      message.error('檔案解析失敗，請確認檔案格式是否正確。');
      loading.value = false;
    }
  };
  reader.readAsArrayBuffer(file);
};

const handleFileInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

watch(encoding, () => {
  if (isCsvFile.value && currentBuffer.value) {
    parseFile();
  }
});

// Search and pagination
const filteredRows = computed(() => {
  if (!searchQuery.value.trim()) {
    return rows.value;
  }
  const q = searchQuery.value.toLowerCase().trim();
  return rows.value.filter(row =>
    row.some((cell: any) => String(cell).toLowerCase().includes(q)),
  );
});

const totalPages = computed(() => Math.ceil(filteredRows.value.length / pageSize.value) || 1);

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

const getBaseFileName = () => {
  return fileName.value.replace(/\.[^/.]+$/, '') || 'export';
};

const generateCsvContent = () => {
  if (rows.value.length === 0) return '';
  const ws = XLSX.utils.aoa_to_sheet([headers.value, ...rows.value]);
  return XLSX.utils.sheet_to_csv(ws);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 1. Export CSV with BOM (Fixes Windows Excel Chinese garbled text!)
const exportCsvWithBom = () => {
  const csv = generateCsvContent();
  if (!csv) return;
  // Prepend UTF-8 BOM (\uFEFF)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${getBaseFileName()}_excel_utf8_bom.csv`);
  message.success('已下載 Windows Excel 專用 CSV（含 UTF-8 BOM，保證中文不亂碼）！');
};

// 2. Export native Excel (.xlsx)
const exportToXlsx = () => {
  if (rows.value.length === 0) return;
  const ws = XLSX.utils.aoa_to_sheet([headers.value, ...rows.value]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${getBaseFileName()}.xlsx`);
  message.success('已成功匯出為 Excel (.xlsx) 試算表！');
};

// 3. Export Big5 CSV (For legacy Taiwanese ERP/government systems)
const exportToBig5 = () => {
  const csv = generateCsvContent();
  if (!csv) return;
  try {
    const encoded = iconv.encode(csv, 'big5');
    const blob = new Blob([encoded], { type: 'text/csv;charset=big5;' });
    downloadBlob(blob, `${getBaseFileName()}_big5.csv`);
    message.success('已成功轉碼並下載 Big5 編碼 CSV！');
  } catch (error) {
    console.error(error);
    message.error('Big5 轉碼失敗，部分字元可能超出 Big5 字集範圍。');
  }
};

// 4. Export standard UTF-8 CSV (without BOM)
const exportStandardUtf8 = () => {
  const csv = generateCsvContent();
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${getBaseFileName()}_utf8.csv`);
  message.success('已下載標準 UTF-8 CSV！');
};

// 5. Copy CSV content
const copyCsvText = async () => {
  const csv = generateCsvContent();
  if (!csv) return;
  try {
    await navigator.clipboard.writeText(csv);
    message.success('已複製完整 CSV 內容至剪貼簿！');
  } catch {
    message.error('複製失敗，請手動複製。');
  }
};

// View cell detail
const showCellModal = (cell: any, headerName: string, rowIndex: number) => {
  cellModalTitle.value = `${headerName} (列 ${rowIndex + 1})`;
  cellModalContent.value = String(cell);
  cellModalVisible.value = true;
};
</script>

<template>
  <c-card w-full important:flex-1 class="w-full csv-viewer-card">
    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept=".csv, .tsv, .xlsx, .xls"
      hidden
      @change="handleFileInputChange"
    />

    <!-- Upload Dropzone (When no file is loaded) -->
    <div
      v-if="rows.length === 0"
      class="dropzone-area"
      :class="{ 'is-dragging': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <div class="dropzone-icon-wrapper">
        <n-icon size="56" class="dropzone-icon">
          <IconFileSpreadsheet />
        </n-icon>
      </div>
      <p class="dropzone-title">點擊選擇或直接拖曳 CSV / Excel 檔案至此</p>
      <p class="dropzone-subtitle">支援 .csv、.tsv、.xlsx、.xls 等試算表檔案，自動偵測編碼防止中文亂碼</p>
      <div class="dropzone-badges">
        <span class="badge">CSV 支援</span>
        <span class="badge">Excel XLSX/XLS</span>
        <span class="badge">Big5 / UTF-8 智慧辨識</span>
      </div>
    </div>

    <!-- Main Table View & Transcoding Panel -->
    <div
      v-else
      class="viewer-container"
      @dragover.prevent="isDragging = true"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- Drag overlay for quick replacement -->
      <div v-if="isDragging" class="drag-overlay">
        <n-icon size="48"><IconUpload /></n-icon>
        <p>放開滑鼠即可載入新檔案</p>
      </div>

      <!-- Top Toolbar -->
      <div class="toolbar-header">
        <div class="file-meta">
          <div class="file-title-row">
            <n-icon size="24" class="file-icon"><IconTable /></n-icon>
            <h3 class="file-name" :title="fileName">{{ fileName }}</h3>
          </div>
          <div class="file-stats">
            <span class="stat-tag">共 {{ rows.length.toLocaleString() }} 筆資料</span>
            <span class="stat-tag">{{ headers.length }} 個欄位</span>
            <span class="stat-tag">{{ formatFileSize(fileSize) }}</span>
            <span v-if="isCsvFile && detectedEncoding" class="stat-tag encoding-tag">
              偵測編碼：{{ detectedEncoding.toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="toolbar-actions">
          <c-button secondary @click="triggerFileInput">
            <template #icon><n-icon size="16"><IconUpload /></n-icon></template>
            換檔案 (拖曳亦可)
          </c-button>
          <c-button secondary @click="copyCsvText">
            <template #icon><n-icon size="16"><IconCopy /></n-icon></template>
            複製 CSV
          </c-button>
        </div>
      </div>

      <!-- Transcoding & Windows Excel Garbled Text Repair Toolbar -->
      <div class="transcode-panel">
        <div class="transcode-left">
          <span class="transcode-title">來源解碼：</span>
          <c-select
            v-if="isCsvFile"
            v-model:value="encoding"
            :options="encodingOptions"
            size="small"
            class="encoding-select"
          />
          <span v-else class="text-xs text-muted">Excel 活頁簿預設為全 Unicode 格式</span>
        </div>

        <div class="transcode-buttons">
          <!-- The #1 solution for Windows Excel Chinese garbled text -->
          <c-tooltip tooltip="加入 UTF-8 BOM 標記，在 Windows 雙擊用 Excel 開啟時中文保證 100% 正常、絕不亂碼！" position="bottom">
            <c-button primary class="btn-fix-excel" @click="exportCsvWithBom">
              <template #icon><n-icon size="16"><IconCheck /></n-icon></template>
              🌟 下載 Excel 專用 CSV (含 BOM 抗亂碼)
            </c-button>
          </c-tooltip>

          <c-tooltip tooltip="直接轉換為原生 Excel .xlsx 活頁簿，徹底避免 CSV 純文字編碼困擾" position="bottom">
            <c-button secondary @click="exportToXlsx">
              <template #icon><n-icon size="16"><IconFileSpreadsheet /></n-icon></template>
              下載 Excel (.xlsx)
            </c-button>
          </c-tooltip>

          <c-tooltip tooltip="轉碼為繁體中文 Windows 舊式 Big5 編碼，相容台灣舊版 ERP 與會計系統" position="bottom">
            <c-button secondary @click="exportToBig5">
              <template #icon><n-icon size="16"><IconRefresh /></n-icon></template>
              下載 Big5 CSV
            </c-button>
          </c-tooltip>

          <c-tooltip tooltip="下載無 BOM 的標準 UTF-8 CSV，適合 Linux、Python、資料庫匯入" position="bottom">
            <c-button secondary @click="exportStandardUtf8">
              <template #icon><n-icon size="16"><IconDownload /></n-icon></template>
              下載標準 UTF-8
            </c-button>
          </c-tooltip>
        </div>
      </div>

      <!-- Search and Pagination Controls -->
      <div class="filter-pagination-bar">
        <div class="search-box">
          <n-input
            v-model:value="searchQuery"
            placeholder="搜尋表格內容..."
            clearable
            size="small"
          >
            <template #prefix>
              <n-icon size="16" class="op-50"><IconSearch /></n-icon>
            </template>
          </n-input>
          <span v-if="searchQuery" class="search-count">
            符合 {{ filteredRows.length }} 筆
          </span>
        </div>

        <div class="pagination-box">
          <c-select
            v-model:value="pageSize"
            :options="pageSizeOptions"
            size="small"
            class="page-size-select"
            @update:value="currentPage = 1"
          />

          <n-pagination
            v-model:page="currentPage"
            :page-count="totalPages"
            :page-slot="5"
            size="small"
          />
        </div>
      </div>

      <!-- Robust Horizontal & Vertical Scrollable Table -->
      <div class="table-scroll-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-index">#</th>
              <th
                v-for="(header, index) in headers"
                :key="index"
                class="col-header"
                :title="header"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in paginatedRows"
              :key="rowIndex"
              class="data-row"
            >
              <td class="cell-index">
                {{ (currentPage - 1) * pageSize + rowIndex + 1 }}
              </td>
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="data-cell"
                :title="String(cell)"
                @dblclick="showCellModal(cell, headers[cellIndex] || `欄位 ${cellIndex + 1}`, (currentPage - 1) * pageSize + rowIndex)"
              >
                {{ cell }}
              </td>
            </tr>
            <tr v-if="paginatedRows.length === 0">
              <td :colspan="headers.length + 1" class="empty-cell">
                查無符合條件的資料
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bottom Status -->
      <div class="table-footer-status">
        <span>顯示第 {{ (currentPage - 1) * pageSize + 1 }} 至 {{ Math.min(currentPage * pageSize, filteredRows.length) }} 筆（共 {{ filteredRows.length.toLocaleString() }} 筆）</span>
        <span class="tip">💡 提示：按兩下單元格可開啟視窗檢視或複製長文字</span>
      </div>
    </div>

    <!-- Cell Detail Modal -->
    <c-modal v-model:visible="cellModalVisible" :title="cellModalTitle">
      <div class="cell-detail-content">
        <textarea readonly class="cell-textarea" :value="cellModalContent" rows="8"></textarea>
      </div>
    </c-modal>
  </c-card>
</template>

<style scoped lang="less">
.csv-viewer-card {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
}

.dropzone-area {
  padding: 60px 24px;
  border: 2px dashed v-bind('activePalette.border');
  border-radius: 20px;
  text-align: center;
  cursor: pointer;
  background: v-bind('styleStore.isDarkTheme ? "rgba(42, 42, 55, 0.4)" : "rgba(220, 215, 186, 0.4)"');
  transition: all 0.25s ease;

  &:hover,
  &.is-dragging {
    border-color: v-bind('activePalette.button');
    background: v-bind('styleStore.isDarkTheme ? "rgba(126, 156, 216, 0.12)" : "rgba(75, 103, 161, 0.12)"');
    transform: translateY(-2px);
  }

  .dropzone-icon-wrapper {
    margin-bottom: 16px;
    display: flex;
    justify-content: center;

    .dropzone-icon {
      color: v-bind('activePalette.button');
    }
  }

  .dropzone-title {
    font-size: 20px;
    font-weight: 700;
    color: v-bind('activePalette.heading');
    margin-bottom: 8px;
  }

  .dropzone-subtitle {
    font-size: 14px;
    color: v-bind('activePalette.textMuted');
    margin-bottom: 20px;
  }

  .dropzone-badges {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;

    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      background: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"');
      color: v-bind('activePalette.text');
      border: 1px solid v-bind('activePalette.border');
    }
  }
}

.viewer-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 100;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border: 2px dashed #fff;
}

.toolbar-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid v-bind('activePalette.border');

  .file-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .file-title-row {
      display: flex;
      align-items: center;
      gap: 10px;

      .file-icon {
        color: v-bind('activePalette.button');
      }

      .file-name {
        font-size: 18px;
        font-weight: 700;
        color: v-bind('activePalette.heading');
        margin: 0;
        max-width: 450px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .file-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .stat-tag {
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 8px;
        background: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"');
        color: v-bind('activePalette.textMuted');

        &.encoding-tag {
          color: v-bind('activePalette.button');
          background: v-bind('styleStore.isDarkTheme ? "rgba(126, 156, 216, 0.18)" : "rgba(75, 103, 161, 0.15)"');
          font-weight: 700;
        }
      }
    }
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.transcode-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background: v-bind('styleStore.isDarkTheme ? "rgba(42, 42, 55, 0.6)" : "rgba(220, 215, 186, 0.55)"');
  border: 1px solid v-bind('activePalette.border');

  .transcode-left {
    display: flex;
    align-items: center;
    gap: 10px;

    .transcode-title {
      font-size: 13px;
      font-weight: 700;
      color: v-bind('activePalette.heading');
      white-space: nowrap;
    }

    .encoding-select {
      min-width: 200px;
    }
  }

  .transcode-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .btn-fix-excel {
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(126, 156, 216, 0.3);
    }
  }
}

.filter-pagination-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .search-box {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 260px;

    .search-count {
      font-size: 12px;
      color: v-bind('activePalette.textMuted');
      white-space: nowrap;
    }
  }

  .pagination-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    .page-size-select {
      width: 120px;
    }
  }
}

.table-scroll-wrapper {
  width: 100%;
  max-height: 560px;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid v-bind('activePalette.border');
  background: v-bind('styleStore.isDarkTheme ? "rgba(31, 31, 40, 0.9)" : "rgba(255, 255, 255, 0.85)"');
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.04);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;

  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: v-bind('styleStore.isDarkTheme ? "#2A2A37" : "#E6E2CC"');
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);

    tr th {
      padding: 10px 14px;
      font-weight: 700;
      color: v-bind('activePalette.heading');
      border-bottom: 2px solid v-bind('activePalette.border');
      border-right: 1px solid v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"');
      white-space: nowrap;
      user-select: none;

      &.col-index {
        width: 50px;
        text-align: center;
        background: v-bind('styleStore.isDarkTheme ? "#22222E" : "#DCD7BA"');
      }

      &.col-header {
        max-width: 320px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  tbody {
    tr.data-row {
      border-bottom: 1px solid v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"');
      transition: background-color 0.15s ease;

      &:nth-child(even) {
        background: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)"');
      }

      &:hover {
        background: v-bind('styleStore.isDarkTheme ? "rgba(126, 156, 216, 0.1)" : "rgba(75, 103, 161, 0.08)"');
      }

      td {
        padding: 8px 14px;
        color: v-bind('activePalette.text');
        border-right: 1px solid v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"');
        max-width: 340px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &.cell-index {
          width: 50px;
          text-align: center;
          font-weight: 600;
          color: v-bind('activePalette.textMuted');
          background: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)"');
        }

        &.empty-cell {
          text-align: center;
          padding: 40px;
          color: v-bind('activePalette.textMuted');
        }
      }
    }
  }
}

.table-footer-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: v-bind('activePalette.textMuted');
  padding: 0 4px;

  .tip {
    opacity: 0.8;
  }
}

.cell-detail-content {
  .cell-textarea {
    width: 100%;
    padding: 10px;
    font-family: inherit;
    font-size: 13px;
    border-radius: 8px;
    border: 1px solid v-bind('activePalette.border');
    background: v-bind('styleStore.isDarkTheme ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.8)"');
    color: v-bind('activePalette.text');
    box-sizing: border-box;
    outline: none;
    resize: vertical;
  }
}
</style>

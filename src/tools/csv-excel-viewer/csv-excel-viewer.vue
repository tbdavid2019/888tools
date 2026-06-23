<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { ref, watch } from 'vue';
import { Table, Upload, Download } from '@vicons/tabler';
import * as XLSX from 'xlsx';

const message = useMessage();
const headers = ref<string[]>([]);
const rows = ref<any[]>([]);
const fileName = ref('');
const loading = ref(false);
const encoding = ref('auto');
const currentFile = ref<File | null>(null);
const currentBuffer = ref<ArrayBuffer | null>(null);
const isCsvFile = ref(false);
const detectedEncoding = ref<string | null>(null);

const encodingOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'Big5', value: 'big5' },
  { label: 'GB18030', value: 'gb18030' },
  { label: 'Shift-JIS', value: 'shift_jis' },
];

const normalizeTable = (data: any[][]) => {
  if (!data.length) return { headers: [], rows: [] };

  const normalized = data.map((row) => (Array.isArray(row) ? row : [row]));
  const maxColumns = normalized.reduce((max, row) => Math.max(max, row.length), 0);
  const padded = normalized.map((row) => {
    const nextRow = [...row];
    while (nextRow.length < maxColumns) nextRow.push('');
    return nextRow;
  });

  const headerRow = padded[0] || [];
  const headerValues = headerRow.map((cell, index) => {
    if (cell === null || cell === undefined || cell === '') {
      return `Column ${index + 1}`;
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
};

const parseFile = () => {
  if (!currentFile.value || !currentBuffer.value) return;

  const file = currentFile.value;
  const extension = file.name.split('.').pop()?.toLowerCase();
  isCsvFile.value = extension === 'csv' || file.type === 'text/csv';

  if (isCsvFile.value) {
    const buffer = currentBuffer.value;
    const candidates = encoding.value === 'auto' ? ['utf-8', 'big5', 'gb18030', 'shift_jis'] : [encoding.value];
    let bestText = '';
    let bestEncoding = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      try {
        const decoder = new TextDecoder(candidate);
        const text = decoder.decode(buffer);
        const replacements = (text.match(/\uFFFD/g) || []).length;
        if (replacements < bestScore) {
          bestScore = replacements;
          bestEncoding = candidate;
          bestText = text;
        }
      } catch (error) {
        console.warn(`Encoding ${candidate} not supported`, error);
      }
    }

    if (!bestText) {
      const fallback = new TextDecoder('utf-8');
      bestText = fallback.decode(buffer);
      bestEncoding = 'utf-8';
    }

    detectedEncoding.value = encoding.value === 'auto' ? bestEncoding : null;
    const workbook = XLSX.read(bestText, { type: 'string', raw: false, cellText: true });
    parseWorkbook(workbook);
  } else {
    detectedEncoding.value = null;
    const data = new Uint8Array(currentBuffer.value);
    const workbook = XLSX.read(data, { type: 'array', raw: false, cellText: true });
    parseWorkbook(workbook);
  }
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  loading.value = true;
  fileName.value = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      currentFile.value = file;
      currentBuffer.value = e.target?.result as ArrayBuffer;
      parseFile();
      loading.value = false;
    } catch (error) {
      console.error(error);
      message.error('Error parsing file.');
      loading.value = false;
    }
  };
  reader.readAsArrayBuffer(file);
};

watch(encoding, () => {
  if (isCsvFile.value && currentBuffer.value) {
    parseFile();
  }
});

const exportToCsv = () => {
  if (rows.value.length === 0) return;
  const ws = XLSX.utils.json_to_sheet([headers.value, ...rows.value], { skipHeader: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'export.csv');
};
</script>

<template>
  <c-card>
    <div
      v-if="rows.length === 0"
      class="p-10 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      @click="($refs.fileInput as any)?.click()"
    >
      <input ref="fileInput" type="file" accept=".csv, .xlsx, .xls" hidden @change="handleFileUpload" />
      <n-icon size="48" class="text-gray-400 mb-2">
        <Table />
      </n-icon>
      <p class="text-lg text-gray-500">Click or drop CSV/Excel file here</p>
      <p class="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
    </div>

    <div v-else class="space-y-4">
      <div class="flex flex-wrap justify-between items-center gap-3">
        <h3 class="font-bold">{{ fileName }}</h3>
        <div class="flex items-center gap-2">
          <n-form-item v-if="isCsvFile" label="Encoding" :show-label="false">
            <c-select v-model:value="encoding" :options="encodingOptions" size="small" style="min-width: 140px" />
          </n-form-item>
          <span v-if="isCsvFile && encoding === 'auto' && detectedEncoding" class="text-xs text-gray-500">
            Detected: {{ detectedEncoding.toUpperCase() }}
          </span>
          <c-button secondary @click="($refs.fileInput as any)?.click()">
            <template #icon
              ><n-icon><Upload /></n-icon
            ></template>
            New File
          </c-button>
          <c-button primary @click="exportToCsv">
            <template #icon
              ><n-icon><Download /></n-icon
            ></template>
            Export CSV
          </c-button>
        </div>
      </div>

      <div class="overflow-x-auto border rounded-lg">
        <n-table :single-line="false" size="small" striped>
          <thead>
            <tr>
              <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in rows.slice(0, 100)" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
            </tr>
          </tbody>
        </n-table>
        <div
          v-if="rows.length > 100"
          class="p-2 text-center text-gray-500 text-xs bg-gray-50 dark:bg-gray-900 border-t"
        >
          Showing first 100 rows of {{ rows.length }}
        </div>
      </div>
    </div>
  </c-card>
</template>

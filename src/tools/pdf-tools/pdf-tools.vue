<script setup lang="ts">
import { ref } from 'vue';
import { useDropZone } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { FileText, Trash, ArrowsSort, Replace, Download, FilePlus, RotateClockwise, Rotate2 } from '@vicons/tabler';

// Store files
type PDFFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number;
  data: ArrayBuffer;
};

const files = ref<PDFFile[]>([]);
const activeTab = ref('merge');
const isProcessing = ref(false);
const message = useMessage();
const dropZoneRef = ref<HTMLElement | null>(null);

// For Split tool
const splitRanges = ref('');
// For Rotate tool
const rotateAngle = ref(90);

const onFilesDrop = async (droppedFiles: File[] | null) => {
  if (!droppedFiles) return;
  for (const file of droppedFiles) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) continue;

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPageCount();

      files.value.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        pages,
        data: buffer,
      });
    } catch (e) {
      console.error(e);
      message.error(`Failed to load ${file.name}`);
    }
  }
};

const isOverDropZone = ref(false);
let dragCounter = 0;

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

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragCounter = 0;
  isOverDropZone.value = false;
  if (e.dataTransfer?.files) {
    onFilesDrop(Array.from(e.dataTransfer.files));
  }
}

const removeFile = (id: string) => {
  const idx = files.value.findIndex((f) => f.id === id);
  if (idx !== -1) files.value.splice(idx, 1);
};

const moveFile = (idx: number, dir: number) => {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= files.value.length) return;
  const temp = files.value[idx];
  files.value[idx] = files.value[newIdx];
  files.value[newIdx] = temp;
};

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Actions
const mergePDFs = async () => {
  if (files.value.length < 2) return;
  isProcessing.value = true;
  try {
    const mergedPdf = await PDFDocument.create();
    for (const f of files.value) {
      const pdf = await PDFDocument.load(f.data);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page: any) => mergedPdf.addPage(page));
    }
    const pdfBytes = await mergedPdf.save();
    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'merged.pdf');
    message.success('PDFs merged successfully');
  } catch (e) {
    console.error(e);
    message.error('Merge failed');
  } finally {
    isProcessing.value = false;
  }
};

const splitPDF = async () => {
  if (files.value.length === 0) return;
  if (!splitRanges.value) {
    // Default split all pages? Or warn?
    // Let's implement simple page extraction for now based on ranges e.g. "1-2, 5"
  }

  isProcessing.value = true;
  const file = files.value[0]; // operate on first file or selection? usually first for simple tool

  try {
    const pdfDoc = await PDFDocument.load(file.data);
    const totalPages = pdfDoc.getPageCount();

    // Parse ranges
    // Accepted formats: "1", "1-5", "1,3,5"
    // If empty, maybe split every page into separate file?

    const zip = new JSZip();

    let rangesToProcess = splitRanges.value.split(',').filter((s) => s.trim());
    if (rangesToProcess.length === 0) {
      // Split all pages individually
      rangesToProcess = Array.from({ length: totalPages }, (_, i) => `${i + 1}`);
    }

    for (const range of rangesToProcess) {
      const newPdf = await PDFDocument.create();
      const parts = range.trim().split('-');
      let start = parseInt(parts[0]);
      let end = parts.length > 1 ? parseInt(parts[1]) : start;
      if (isNaN(end)) end = start;

      if (isNaN(start)) continue;

      start = Math.max(1, start);
      end = Math.min(totalPages, end);

      if (start > end) continue;

      // page indices are 0-based
      const indices = [];
      for (let i = start; i <= end; i++) indices.push(i - 1);

      const copiedPages = await newPdf.copyPages(pdfDoc, indices);
      copiedPages.forEach((p: any) => newPdf.addPage(p));

      const pdfBytes = await newPdf.save();
      const name = `${file.name.replace('.pdf', '')}_pages_${start}-${end}.pdf`;
      zip.file(name, pdfBytes);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, 'split_files.zip');
    message.success('PDF split successfully');
  } catch (e) {
    console.error(e);
    message.error('Split failed');
  } finally {
    isProcessing.value = false;
  }
};

const rotatePDF = async () => {
  if (files.value.length === 0) return;
  isProcessing.value = true;
  const file = files.value[0]; // operate on first file

  try {
    const pdfDoc = await PDFDocument.load(file.data);
    const pages = pdfDoc.getPages();
    pages.forEach((page: any) => {
      const rotation = page.getRotation();
      const nextAngle = (rotation.angle + rotateAngle.value + 360) % 360;
      page.setRotation(degrees(nextAngle));
    });
    const pdfBytes = await pdfDoc.save();
    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${file.name.replace('.pdf', '')}_rotated.pdf`);
    message.success('PDF rotated');
  } catch (e) {
    console.error(e);
    message.error('Rotate failed');
  } finally {
    isProcessing.value = false;
  }
};

const compressPDF = async () => {
  if (files.value.length === 0) return;
  isProcessing.value = true;

  try {
    // pdf-lib does not support strong compression/resampling essentially.
    // We can only remove metadata or try object streams.
    const file = files.value[0];
    const pdfDoc = await PDFDocument.load(file.data);

    // Basic optimization
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setCreator('');

    // Does not support image resampling.
    // Saving minimal
    // Note: pdf-lib save options for compression are limited compared to ghostscript/python,
    // but we can try useObjectStreams: false is default? No, usually true helps?
    // Actually browsers tools implementation used simple save. UseObjectStreams=true reduces size slightly.

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

    if (pdfBytes.byteLength >= file.size) {
      message.info('Could not reduce size further (client-side limitation)');
    } else {
      message.success(`Compressed: ${Math.round((1 - pdfBytes.byteLength / file.size) * 100)}% reduction`);
    }

    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${file.name.replace('.pdf', '')}_compressed.pdf`);
  } catch (e) {
    console.error(e);
    message.error('Compression failed');
  } finally {
    isProcessing.value = false;
  }
};

const clearFiles = () => {
  files.value = [];
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
</script>

<template>
  <div class="pdf-tools">
    <n-card content-style="padding: 0;">
      <n-tabs type="line" size="large" :tabs-padding="20" pane-style="padding: 20px;" v-model:value="activeTab">
        <n-tab-pane name="merge" tab="Merge">
          <div class="tool-pane">
            <p>Combine multiple PDF files into one document.</p>
          </div>
        </n-tab-pane>
        <n-tab-pane name="split" tab="Split">
          <div class="tool-pane">
            <p>Split a PDF into multiple files.</p>
          </div>
        </n-tab-pane>
        <n-tab-pane name="rotate" tab="Rotate">
          <div class="tool-pane">
            <p>Rotate pages in your PDF.</p>
          </div>
        </n-tab-pane>
        <!--
              <n-tab-pane name="compress" tab="Compress">
                 <div class="tool-pane">
                     <p>Reduce file size (Basic).</p>
                 </div>
              </n-tab-pane>
              -->
      </n-tabs>
    </n-card>

    <div class="workspace mt-5">
      <!-- File List / Upload -->
      <div v-if="files.length > 0" class="file-list mb-5">
        <div class="file-list-header">
          <h3>Selected Files ({{ files.length }})</h3>
          <n-button size="small" type="error" ghost @click="clearFiles">Clear All</n-button>
        </div>
        <n-grid x-gap="12" y-gap="12" cols="1">
          <n-gi v-for="(file, index) in files" :key="file.id">
            <n-card size="small" class="file-item-card">
              <div class="file-item">
                <n-icon size="24" :component="FileText" class="mr-3 text-red-500" />
                <div class="file-info flex-1">
                  <div class="font-bold">{{ file.name }}</div>
                  <div class="text-xs text-gray-500">{{ formatSize(file.size) }} - {{ file.pages }} pages</div>
                </div>
                <div class="actions flex gap-2" v-if="activeTab === 'merge'">
                  <n-button circle size="tiny" quaternary @click="moveFile(index, -1)" :disabled="index === 0">
                    <template #icon><n-icon :component="ArrowsSort" style="transform: rotate(180deg)" /></template>
                  </n-button>
                  <n-button
                    circle
                    size="tiny"
                    quaternary
                    @click="moveFile(index, 1)"
                    :disabled="index === files.length - 1"
                  >
                    <template #icon><n-icon :component="ArrowsSort" /></template>
                  </n-button>
                </div>
                <n-button circle size="small" type="error" quaternary @click="removeFile(file.id)">
                  <template #icon><n-icon :component="Trash" /></template>
                </n-button>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <!-- Upload Area -->
      <div
        ref="dropZoneRef"
        class="drop-zone"
        :class="{ 'is-drag-over': isOverDropZone }"
        @click="($refs.fileInput as HTMLInputElement)?.click()"
        @dragenter="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="upload-content">
          <n-icon size="48" :component="FilePlus" />
          <p>Click or Drop PDF files here</p>
        </div>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="application/pdf,.pdf"
          class="hidden-input"
          @change="(e: any) => { onFilesDrop(e.target.files); e.target.value = ''; }"
        />
      </div>

      <!-- Action Area -->
      <div class="actions-panel mt-5">
        <n-card v-if="activeTab === 'merge'" title="Merge Options" size="small">
          <p class="mb-3 text-gray-500">Drag and drop files to reorder (or use arrow buttons), then click Merge.</p>
          <n-button type="primary" size="large" block @click="mergePDFs" :disabled="files.length < 2 || isProcessing">
            <template #icon><n-icon :component="Download" /></template>
            Merge PDFs
          </n-button>
        </n-card>

        <n-card v-if="activeTab === 'split'" title="Split Options" size="small">
          <n-form-item label="Page Ranges (e.g. 1-3, 5, 7-9)">
            <n-input v-model:value="splitRanges" placeholder="Leave empty to split all pages into separate files" />
          </n-form-item>
          <n-button type="primary" size="large" block @click="splitPDF" :disabled="files.length === 0 || isProcessing">
            <template #icon><n-icon :component="Download" /></template>
            Split PDF
          </n-button>
        </n-card>

        <n-card v-if="activeTab === 'rotate'" title="Rotate Options" size="small">
          <div class="flex gap-4 justify-center mb-4">
            <n-button :type="rotateAngle === 90 ? 'primary' : 'default'" @click="rotateAngle = 90">
              <template #icon><n-icon :component="RotateClockwise" /></template>
              90° CW
            </n-button>
            <n-button :type="rotateAngle === -90 ? 'primary' : 'default'" @click="rotateAngle = -90">
              <template #icon><n-icon :component="Rotate2" /></template>
              90° CCW
            </n-button>
          </div>
          <n-button type="primary" size="large" block @click="rotatePDF" :disabled="files.length === 0 || isProcessing">
            <template #icon><n-icon :component="Download" /></template>
            Rotate PDF
          </n-button>
        </n-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed var(--n-border-color);
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  background-color: var(--n-color-modal);
  transition: all 0.3s;
}
.drop-zone:hover,
.drop-zone.is-drag-over {
  border-color: var(--n-primary-color);
  background-color: rgba(var(--n-primary-color-rgb), 0.05);
}
.hidden-input {
  display: none;
}
.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}
.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.file-item {
  display: flex;
  align-items: center;
}
</style>

<script setup lang="ts">
import { useMessage, useThemeVars } from 'naive-ui';
import { computed, ref } from 'vue';
import DomPurify from 'dompurify';

const themeVars = useThemeVars();
const message = useMessage();
const fileInput = ref<HTMLInputElement | null>(null);
const svgContent = ref<string>(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>`);

const previewMarkup = computed(() =>
  DomPurify.sanitize(svgContent.value, {
    USE_PROFILES: { svg: true, svgFilters: true },
  }),
);

function openFilePicker() {
  fileInput.value?.click();
}

function loadSvgFile(file: File) {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  if (!isSvg) {
    message.error('Please upload a valid SVG file');
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    if (typeof loadEvent.target?.result === 'string') {
      svgContent.value = loadEvent.target.result;
      message.success('SVG loaded successfully');
    }
  };
  reader.readAsText(file);
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  loadSvgFile(file);
  target.value = '';
}

const isDragging = ref(false);
let dragCounter = 0;

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  dragCounter++;
  isDragging.value = true;
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
    isDragging.value = false;
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragCounter = 0;
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    loadSvgFile(file);
  }
}

async function copyCode() {
  await navigator.clipboard.writeText(svgContent.value);
  message.success('SVG code copied to clipboard');
}

function downloadSvg() {
  const blob = new Blob([svgContent.value], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'image.svg';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <c-card
    class="svg-tools-card relative"
    @dragenter="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Drag overlay -->
    <div
      v-if="isDragging"
      class="absolute inset-0 z-50 rounded-xl bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none"
    >
      <n-icon size="48" class="text-primary mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
      </n-icon>
      <p class="text-lg font-bold text-primary">Drop SVG file here</p>
    </div>

    <div class="editor-layout">
      <section class="panel">
        <div class="panel-header">
          <h3 class="panel-title">
            SVG Editor
          </h3>

          <div class="panel-actions">
            <input
              ref="fileInput"
              class="hidden"
              type="file"
              accept=".svg,image/svg+xml"
              @change="handleFileUpload"
            >
            <c-button size="tiny" secondary @click="openFilePicker">
              Upload
            </c-button>
            <c-button size="tiny" secondary @click="copyCode">
              Copy
            </c-button>
            <c-button size="tiny" primary @click="downloadSvg">
              Download
            </c-button>
          </div>
        </div>

        <c-input-text
          v-model:value="svgContent"
          class="editor-input"
          multiline
          placeholder="Paste SVG code here..."
          :rows="20"
        />
      </section>

      <section class="panel">
        <div class="panel-header">
          <h3 class="panel-title">
            Preview
          </h3>
        </div>

        <div class="checkerboard preview-surface">
          <div class="preview-artwork" v-html="previewMarkup" />
        </div>
      </section>
    </div>
  </c-card>
</template>

<style scoped>
.svg-tools-card {
  width: 100%;
  max-width: none;
  flex: 1 1 100%;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 24px;
  min-height: 600px;
}

.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.panel-title {
  margin: 0;
  color: v-bind('themeVars.textColor1');
  font-size: 1rem;
  font-weight: 700;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-input {
  flex: 1;
}

.editor-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
  font-size: 12px;
}

.preview-surface {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: auto;
  border: 1px dashed v-bind('themeVars.borderColor');
  border-radius: 18px;
  background-color: v-bind('themeVars.inputColor');
  padding: 20px;
}

.preview-artwork {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
}

.preview-artwork :deep(svg) {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.checkerboard {
  background-image:
    linear-gradient(45deg, rgba(31, 31, 40, 0.12) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(31, 31, 40, 0.12) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(31, 31, 40, 0.12) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(31, 31, 40, 0.12) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}

@media (max-width: 960px) {
  .editor-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .preview-surface {
    min-height: 320px;
  }
}
</style>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useDropZone } from '@vueuse/core';
import { removeBackground, type Config } from '@imgly/background-removal';
import { useMessage } from 'naive-ui';
import { Download, Trash, Eye, EyeOff, Upload } from '@vicons/tabler';

// Config for imgly
const config: Config = {
  device: 'gpu',
  model: 'isnet',
  output: {
    format: 'image/png',
    quality: 1,
  },
  progress: (key: string, current: number, total: number) => {
    // Optional: could handle detailed progress here
  },
};

type ImageItem = {
  id: string;
  name: string;
  original: string; // data URL
  processed: string | null; // object URL
  processedBlob: Blob | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number; // 0-100
};

const items = ref<ImageItem[]>([]);
const showOriginal = ref(false); // Toggle between original and processed
const processingAll = ref(false);
const message = useMessage();
const dropZoneRef = ref<HTMLElement | null>(null);

const generateId = () => Math.random().toString(36).substring(2, 9);

const processItem = async (item: ImageItem) => {
  if (item.status === 'processing' || item.status === 'done') return;

  item.status = 'processing';
  item.progress = 0;

  try {
    // Convert data URL to Blob
    const res = await fetch(item.original);
    const blob = await res.blob();

    // Remove background
    // Note: This might fetch WASM files from CDN by default if not locally hosted.
    // Ideally we should configure publicPath, but default CDN fits 'client-side' requirement for now.
    const resultBlob = await removeBackground(blob, {
      ...config,
      progress: (key: string, current: number, total: number) => {
        // Heuristic progress since library gives bytes
        if (total > 0) item.progress = Math.round((current / total) * 100);
      },
    });

    item.processedBlob = resultBlob;
    item.processed = URL.createObjectURL(resultBlob);
    item.status = 'done';
    item.progress = 100;
  } catch (err: any) {
    console.error('Processing failed:', err);
    item.status = 'error';
    message.error(`Failed to process ${item.name}: ${err.message}`);
  }
};

const onFilesDrop = async (files: File[] | null) => {
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    const reader = new FileReader();
    reader.onload = (e) => {
      const id = generateId();
      const newItem: ImageItem = {
        id,
        name: file.name,
        original: e.target?.result as string,
        processed: null,
        processedBlob: null,
        status: 'idle',
        progress: 0,
      };
      items.value.push(newItem);
      // Auto process
      processItem(newItem);
    };
    reader.readAsDataURL(file);
  }
};

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: onFilesDrop,
});

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    onFilesDrop(Array.from(input.files));
  }
  input.value = ''; // Reset
};

const downloadItem = (item: ImageItem) => {
  if (!item.processed || !item.processedBlob) return;
  const link = document.createElement('a');
  link.href = item.processed;
  const nameParts = item.name.split('.');
  const name = nameParts.slice(0, -1).join('.') + '_nobg.png';
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const removeItem = (id: string) => {
  const idx = items.value.findIndex((i) => i.id === id);
  if (idx !== -1) {
    const item = items.value[idx];
    if (item.processed) URL.revokeObjectURL(item.processed);
    items.value.splice(idx, 1);
  }
};

const clearAll = () => {
  items.value.forEach((item) => {
    if (item.processed) URL.revokeObjectURL(item.processed);
  });
  items.value = [];
};

onUnmounted(() => {
  clearAll();
});
</script>

<template>
  <div class="remove-bg-tool">
    <div
      ref="dropZoneRef"
      class="drop-zone"
      :class="{ 'is-drag-over': isOverDropZone }"
      @click="($refs.fileInput as HTMLInputElement)?.click()"
    >
      <div class="upload-content">
        <n-icon size="48" :component="Upload" />
        <p>Click or Drop images here</p>
        <p class="sub-text">Supports PNG, JPG, WEBP</p>
      </div>
      <input ref="fileInput" type="file" multiple accept="image/*" class="hidden-input" @change="handleFileSelect" />
    </div>

    <div v-if="items.length > 0" class="controls">
      <n-button @click="showOriginal = !showOriginal">
        <template #icon>
          <n-icon :component="showOriginal ? EyeOff : Eye" />
        </template>
        {{ showOriginal ? 'Show Result' : 'Show Original' }}
      </n-button>
      <n-button @click="clearAll" type="error" ghost>
        <template #icon>
          <n-icon :component="Trash" />
        </template>
        Clear All
      </n-button>
    </div>

    <div v-if="items.length > 0" class="image-grid">
      <n-card v-for="item in items" :key="item.id" size="small" class="image-card">
        <div class="image-wrapper">
          <img
            :src="showOriginal ? item.original : item.processed || item.original"
            class="preview-image"
            :class="{ 'opacity-50': item.status === 'processing', 'bg-checker': !showOriginal }"
          />

          <div v-if="item.status === 'processing'" class="loading-overlay">
            <n-spin size="medium" />
            <span>{{ item.progress }}%</span>
          </div>

          <div v-if="item.status === 'error'" class="error-overlay">Failed</div>
        </div>

        <div class="card-footer">
          <div class="file-name" :title="item.name">{{ item.name }}</div>
          <div class="actions">
            <n-button
              size="tiny"
              secondary
              type="primary"
              :disabled="item.status !== 'done'"
              @click="downloadItem(item)"
            >
              <template #icon><n-icon :component="Download" /></template>
              Download
            </n-button>
            <n-button size="tiny" quaternary circle type="error" @click="removeItem(item.id)">
              <template #icon><n-icon :component="Trash" /></template>
            </n-button>
          </div>
        </div>
      </n-card>
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
  transition: all 0.3s;
  background-color: var(--n-color-modal);
  margin-bottom: 20px;
}

.drop-zone:hover,
.drop-zone.is-drag-over {
  border-color: var(--n-primary-color);
  background-color: rgba(var(--n-primary-color-rgb), 0.1);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--n-text-color-3);
}

.sub-text {
  font-size: 12px;
  opacity: 0.8;
}

.hidden-input {
  display: none;
}

.controls {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 15px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.image-wrapper {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Checkerboard pattern for transparent background */
.bg-checker {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: black;
  font-weight: bold;
}

.card-footer {
  margin-top: 10px;
}

.file-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 5px;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

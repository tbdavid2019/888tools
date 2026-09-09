<script setup lang="ts">
import { useDropZone, useFileDialog } from '@vueuse/core';
import heic2any from 'heic2any';
import { useMessage } from 'naive-ui';
import { computed, ref, shallowRef } from 'vue';

const message = useMessage();
const mainElement = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const { open, onChange } = useFileDialog({
  accept: 'image/*,.heic',
  multiple: false,
});

onChange((files) => {
  if (files && files.length > 0) {
    processFile(files[0]);
  }
});

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
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
}

const currentImage = shallowRef<{
  url: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isHeic: boolean;
} | null>(null);

const processing = ref(false);
const converting = ref(false);
const convertedImage = shallowRef<{ url: string; size: number } | null>(null);

const targetFormat = ref('image/png');
const quality = ref(0.85);

const formatOptions = [
  { label: 'PNG', value: 'image/png' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'WebP', value: 'image/webp' },
];

const showQuality = computed(() => ['image/jpeg', 'image/webp'].includes(targetFormat.value));

const processFile = async (file: File) => {
  processing.value = true;
  convertedImage.value = null;
  try {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
    let url = '';
    
    if (isHeic) {
      try {
        const blob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
        });
        const jpgBlob = Array.isArray(blob) ? blob[0] : blob;
        url = URL.createObjectURL(jpgBlob);
      } catch (e) {
        throw new Error('Failed to parse HEIC image');
      }
    } else {
      url = URL.createObjectURL(file);
    }

    currentImage.value = {
      url,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      isHeic,
    };
  } catch (e: any) {
    message.error(e.message || 'Error processing image');
  } finally {
    processing.value = false;
  }
};

const convert = async () => {
  if (!currentImage.value) return;
  converting.value = true;
  try {
    const img = new Image();
    img.src = currentImage.value.url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL(targetFormat.value, quality.value);
    
    // Calculate size roughly
    const base64str = dataUrl.split(',')[1];
    const decodedStr = atob(base64str);
    const size = decodedStr.length;

    convertedImage.value = {
      url: dataUrl,
      size,
    };
    message.success('Conversion complete');
  } catch (e: any) {
    message.error('Conversion failed: ' + e.message);
  } finally {
    converting.value = false;
  }
};

const download = () => {
  if (!convertedImage.value || !currentImage.value) return;
  const link = document.createElement('a');
  link.href = convertedImage.value.url;
  
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const ext = extMap[targetFormat.value] || 'png';
  const namePart = currentImage.value.name.replace(/\.[^/.]+$/, '');
  link.download = `${namePart}_converted.${ext}`;
  link.click();
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<template>
  <c-card>
    <div
      ref="mainElement"
      class="relative"
      @dragenter="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Drag overlay when dragging image over loaded view -->
      <div
        v-if="currentImage && isOverDropZone"
        class="absolute inset-0 z-50 rounded-xl bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none"
      >
        <n-icon size="48" class="text-primary mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </n-icon>
        <p class="text-lg font-bold text-primary">Drop new image to convert</p>
      </div>

      <div
        v-if="!currentImage"
        class="p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200"
        :class="{
          'border-primary bg-primary/10 scale-[1.008] ring-2 ring-primary/20': isOverDropZone,
          'border-gray-300 dark:border-zinc-700 hover:border-primary hover:bg-gray-50/50 dark:hover:bg-zinc-800/20': !isOverDropZone
        }"
        @click="open()"
      >
        <div class="pointer-events-none flex flex-col items-center">
          <n-icon size="48" class="text-gray-400 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </n-icon>
          <p class="text-lg font-medium text-gray-700 dark:text-gray-200">
            Click or drop image here
          </p>
          <p class="text-xs text-gray-400 mt-1">Supports PNG, JPG, WebP, HEIC</p>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <n-card title="Original Image" size="small">
            <template #header-extra>
              <c-button size="tiny" secondary @click="currentImage = null; convertedImage = null">Remove</c-button>
            </template>
            <div class="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative">
              <img :src="currentImage.url" class="max-w-full max-h-full object-contain" />
              <div v-if="processing" class="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                Processing...
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-500 flex justify-between">
              <span>{{ currentImage.name }}</span>
              <span>{{ formatSize(currentImage.size) }}</span>
            </div>
          </n-card>
          
          <n-card title="Settings" size="small" class="mt-4">
            <n-form-item label="Target Format">
              <c-select v-model:value="targetFormat" :options="formatOptions" />
            </n-form-item>
            
            <n-form-item v-if="showQuality" label="Quality">
              <n-slider v-model:value="quality" :min="0.1" :max="1" :step="0.01" />
              <div class="ml-4 w-12 text-right">{{ Math.round(quality * 100) }}%</div>
            </n-form-item>

            <c-button class="w-full mt-2" @click="convert" :disabled="converting || processing">
              {{ converting ? 'Converting...' : 'Convert' }}
            </c-button>
          </n-card>
        </div>

        <div>
          <n-card title="Converted Image" size="small" class="h-full">
            <div class="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              <img v-if="convertedImage" :src="convertedImage.url" class="max-w-full max-h-full object-contain" />
              <div v-else class="text-gray-400 flex flex-col items-center">
                <n-icon size="40" class="mb-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></n-icon>
                <span>Result will appear here</span>
              </div>
            </div>
             <div v-if="convertedImage" class="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Size: {{ formatSize(convertedImage.size) }}</span>
              <span :class="{'text-green-500': convertedImage.size < currentImage.size, 'text-red-500': convertedImage.size >= currentImage.size}">
                {{ convertedImage.size < currentImage.size ? '-' : '+' }}{{ Math.abs(Math.round((convertedImage.size - currentImage.size) / currentImage.size * 100)) }}%
              </span>
            </div>
            
            <div class="mt-4" v-if="convertedImage">
              <c-button class="w-full" primary @click="download">Download Processed Image</c-button>
            </div>
          </n-card>
        </div>
      </div>
    </div>
  </c-card>
</template>

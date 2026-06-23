<script setup lang="ts">
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { onBeforeUnmount, onMounted } from 'vue';
import { useClipboard } from '@vueuse/core';

const fileInput = ref<HTMLInputElement | null>(null);
const previewRef = ref<HTMLDivElement | null>(null);
const cameraEnabled = ref(false);
const scanning = ref(false);
const results = ref<{ text: string; ts: number }[]>([]);
const error = ref<string>('');
const cameraId = ref<string | null>(null);
const availableCameras = ref<{ id: string; label: string }[]>([]);

let scanner: Html5Qrcode | null = null;

const addResult = (text: string) => {
  results.value.unshift({ text, ts: Date.now() });
};

const stopCamera = async () => {
  if (scanner) {
    if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      await scanner.stop();
    }
    try {
      await scanner.clear();
    } catch (err) {
      // ignore clear errors
    }
    scanner = null;
  }
  scanning.value = false;
  cameraEnabled.value = false;
};

const startCamera = async () => {
  if (!previewRef.value) return;
  error.value = '';
  scanning.value = true;
  scanner = new Html5Qrcode(previewRef.value.id, {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  });
  try {
    const cams = await Html5Qrcode.getCameras();
    availableCameras.value = cams.map(c => ({ id: c.id, label: c.label || c.id }));
    const id = cameraId.value ?? cams[0]?.id;
    if (!id) throw new Error('No camera found');
    cameraId.value = id;
    await scanner.start(
      { deviceId: { exact: id } },
      { fps: 10 },
      (decodedText) => {
        addResult(decodedText);
      },
      undefined,
    );
    cameraEnabled.value = true;
  } catch (e: any) {
    error.value = e?.message ?? String(e);
    scanning.value = false;
    cameraEnabled.value = false;
  }
};

const decodeFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    error.value = '貼上的不是圖片檔';
    return;
  }
  error.value = '';
  await stopCamera();
  try {
    const id = previewRef.value?.id ?? 'qr-preview';
    const html5 = new Html5Qrcode(id);
    const res = await html5.scanFile(file, true);
    addResult(res);
  } catch (err: any) {
    error.value = err?.message ?? 'Failed to decode image';
  }
};

const onFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await decodeFile(file);
  target.value = '';
};

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  const fileItem = Array.from(items).find(
    item => item.kind === 'file' && item.type.startsWith('image/'),
  );
  const file = fileItem?.getAsFile();
  if (file) {
    await decodeFile(file);
  }
};

const clearAll = async () => {
  results.value = [];
  error.value = '';
  await stopCamera();
  cameraEnabled.value = false;
};

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onBeforeUnmount(() => {
  stopCamera();
  window.removeEventListener('paste', handlePaste);
});

const { copy } = useClipboard();
</script>

<template>
  <c-card>
    <n-grid x-gap="12" y-gap="12" cols="1 700:3">
      <n-gi span="2">
        <div flex gap-3 items-center mb-3>
          <input ref="fileInput" type="file" accept="image/*" @change="onFileChange" />
          <c-button @click="() => fileInput?.click()">上傳圖片</c-button>
          <c-button secondary @click="startCamera" :disabled="scanning">開啟相機掃描</c-button>
          <c-button tertiary @click="clearAll">清除</c-button>
        </div>
        <div class="hint">支援直接貼上圖片（Clipboard）後自動解析。</div>

        <div v-if="availableCameras.length > 0" flex gap-2 items-center mb-2>
          <span>Camera:</span>
          <c-select v-model:value="cameraId" :options="availableCameras.map(c => ({ label: c.label, value: c.id }))" w-240px />
        </div>

        <div v-if="error" text-red-500 text-sm mb-2>{{ error }}</div>

        <n-card title="解析結果" size="small">
          <div v-if="results.length === 0" text-neutral-500>尚無結果</div>
          <div v-else class="results">
            <div v-for="item in results" :key="item.ts" class="result-item">
              <div class="result-text">{{ item.text }}</div>
              <div class="result-meta">
                {{ new Date(item.ts).toLocaleString() }}
                <c-button size="tiny" tertiary @click="copy(item.text)">複製</c-button>
              </div>
            </div>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <div ref="previewRef" id="qr-preview" class="preview-box" />
      </n-gi>
    </n-grid>
  </c-card>
</template>

<style scoped lang="less">
.preview-box {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}
.results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
}
.hint {
  color: #666;
  font-size: 12px;
  margin-top: -4px;
  margin-bottom: 12px;
}
.result-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
}
.result-text {
  word-break: break-all;
}
.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #888;
  margin-top: 4px;
}
</style>

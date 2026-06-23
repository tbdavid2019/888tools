<script setup lang="ts">
import bwipjs from 'bwip-js';
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';

const message = useMessage();

const barcodeTypes = [
  { label: 'PDF417', value: 'pdf417' },
  { label: 'QR Code', value: 'qrcode' },
  { label: 'Data Matrix', value: 'datamatrix' },
  { label: 'Code 128', value: 'code128' },
  { label: 'EAN-13', value: 'ean13' },
  { label: 'UPC-A', value: 'upca' },
  { label: 'Aztec Code', value: 'azteccode' },
  { label: 'Code 39', value: 'code39' },
  { label: 'ITF-14', value: 'itf14' },
];

const textAlignOptions = [
  { label: 'Center', value: 'center' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Justify', value: 'justify' },
  { label: 'Off', value: 'off' },
];

const text = ref('https://tool.david888.com');
const barcodeType = ref('pdf417');
const pdf417Columns = ref(0); // 0 = auto
const scale = ref(4);
const height = ref(15);
const paddingX = ref(10);
const paddingY = ref(10);
const backgroundColor = ref('#ffffff');
const barColor = ref('#000000');
const includeText = ref(true);
const textAlign = ref('center');
const altText = ref(''); // Alt text below barcode
const customOptions = ref('{}');

const canvasRef = ref<HTMLCanvasElement | null>(null);

const renderBarcode = () => {
  if (!canvasRef.value) return;

  try {
    let customOpts = {};
    try {
      customOpts = JSON.parse(customOptions.value);
    } catch (e) {
      console.warn('Invalid JSON in custom options');
    }

    // PDF417 specific options
    if (barcodeType.value === 'pdf417' && pdf417Columns.value > 0) {
      (customOpts as any).columns = pdf417Columns.value;
    }

    const options: any = {
      bcid: barcodeType.value,
      text: text.value,
      scale: scale.value,
      height: height.value,
      paddingwidth: paddingX.value,
      paddingheight: paddingY.value,
      backgroundcolor: backgroundColor.value.slice(1), // Remove #
      barcolor: barColor.value.slice(1), // Remove #
      includetext: includeText.value,
      textxalign: textAlign.value,
      ...customOpts,
    };

    // Only add alttext if it has a value
    if (altText.value && altText.value.trim()) {
      options.alttext = altText.value;
    }

    // Remove background color if transparent (not supported directly by hex slice, but simple check)
    if (backgroundColor.value === 'transparent') {
      delete (options as any).backgroundcolor;
    }

    (bwipjs as unknown as { toCanvas: (canvas: HTMLCanvasElement, options: Record<string, unknown>) => void })
      .toCanvas(canvasRef.value, options);
  } catch (e: any) {
    // console.error(e);
    // Don't spam messages on every keystroke error, but maybe show in UI?
    // For now, allow transient errors which are common when typing
  }
};

watch([
  text,
  barcodeType,
  pdf417Columns,
  scale,
  height,
  paddingX,
  paddingY,
  backgroundColor,
  barColor,
  includeText,
  altText,
  textAlign,
  customOptions,
], () => {
  renderBarcode();
});

onMounted(() => {
  renderBarcode();
});

const downloadPNG = () => {
  if (!canvasRef.value) return;
  const link = document.createElement('a');
  link.download = `barcode-${barcodeType.value}-${Date.now()}.png`;
  link.href = canvasRef.value.toDataURL('image/png');
  link.click();
};

const downloadJPEG = () => {
  if (!canvasRef.value) return;
  const link = document.createElement('a');
  link.download = `barcode-${barcodeType.value}-${Date.now()}.jpg`;
  link.href = canvasRef.value.toDataURL('image/jpeg', 0.95);
  link.click();
};
</script>

<template>
  <div>
    <div style="padding: 20px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px;">
      <canvas ref="canvasRef"></canvas>
      <div style="margin-top: 16px; text-align: center; display: flex; gap: 12px; justify-content: center;">
        <c-button @click="downloadPNG">
          Download PNG
        </c-button>
        <c-button @click="downloadJPEG">
          Download JPEG
        </c-button>
      </div>
    </div>

    <c-card>
      <c-input-text
        v-model:value="text"
        label="Text / Data:"
        multiline
        rows="3"
        autosize
        placeholder="Enter content..."
        mb-6
      />

      <n-form label-placement="left" label-width="140">
        <n-form-item label="Barcode Type:">
          <n-select v-model:value="barcodeType" :options="barcodeTypes" />
        </n-form-item>

        <n-form-item label="PDF417 Columns (0=Auto):" v-if="barcodeType === 'pdf417'">
          <n-input-number v-model:value="pdf417Columns" :min="0" :max="30" />
        </n-form-item>

        <c-conf-toggle v-model:value="includeText" title="Include Text" />

        <n-form-item label="Text Alignment:" v-if="includeText">
          <n-select v-model:value="textAlign" :options="textAlignOptions" />
        </n-form-item>

        <n-form-item label="Alt Text:">
          <n-input v-model:value="altText" placeholder="Optional text below barcode" />
        </n-form-item>

        <n-form-item label="Scale (Size):">
          <n-input-number v-model:value="scale" :min="1" :max="10" />
        </n-form-item>

        <n-form-item label="Bar Height (mm):">
          <n-input-number v-model:value="height" :min="1" :max="100" />
        </n-form-item>
        
        <n-form-item label="Padding X:">
          <n-input-number v-model:value="paddingX" :min="0" />
        </n-form-item>

        <n-form-item label="Padding Y:">
          <n-input-number v-model:value="paddingY" :min="0" />
        </n-form-item>

        <n-form-item label="Bar Color:">
          <n-color-picker v-model:value="barColor" :show-alpha="false" />
        </n-form-item>

        <n-form-item label="Background Color:">
          <n-color-picker v-model:value="backgroundColor" :show-alpha="false" />
        </n-form-item>

        <n-form-item label="Custom Options (JSON):">
          <n-input v-model:value="customOptions" type="textarea" placeholder="{}" />
        </n-form-item>
      </n-form>
    </c-card>
  </div>
</template>

<style scoped>
/* No custom styles needed - canvas displays at natural size */
</style>

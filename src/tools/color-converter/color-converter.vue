<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Colord } from 'colord';
import { colord, extend } from 'colord';
import { useMessage, useThemeVars } from 'naive-ui';
import _ from 'lodash';
import cmykPlugin from 'colord/plugins/cmyk';
import hwbPlugin from 'colord/plugins/hwb';
import namesPlugin from 'colord/plugins/names';
import lchPlugin from 'colord/plugins/lch';
import {
  IconCheck,
  IconColorPicker,
  IconCopy,
  IconPhoto,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-vue';
import { buildColorFormat } from './color-converter.models';
import {
  findClosestPantone,
  type PantoneColor,
  type PantoneMatch,
  searchPantoneColors,
} from './pantone-database';
import { deltaE2000, hexToLab, hexToRgb, rgbToCmyk, rgbToHex } from './delta-e-2000';
import { useCopy } from '@/composable/copy';

extend([cmykPlugin, hwbPlugin, namesPlugin, lchPlugin]);
const themeVars = useThemeVars();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

// Current Active Hex (Reactive Root)
const currentHex = ref('#1EA54C');
const currentColor = ref<Colord>(colord('#1EA54C'));

const formats = {
  picker: buildColorFormat({
    label: 'color picker',
    format: (v: Colord) => v.toHex(),
    type: 'color-picker',
  }),
  hex: buildColorFormat({
    label: 'hex',
    format: (v: Colord) => v.toHex(),
    placeholder: 'e.g. #ff0000',
  }),
  rgb: buildColorFormat({
    label: 'rgb',
    format: (v: Colord) => v.toRgbString(),
    placeholder: 'e.g. rgb(255, 0, 0)',
  }),
  cmyk: buildColorFormat({
    label: 'cmyk',
    format: (v: Colord) => v.toCmykString(),
    placeholder: 'e.g. cmyk(0, 100%, 100%, 0)',
  }),
  hsl: buildColorFormat({
    label: 'hsl',
    format: (v: Colord) => v.toHslString(),
    placeholder: 'e.g. hsl(0, 100%, 50%)',
  }),
  hwb: buildColorFormat({
    label: 'hwb',
    format: (v: Colord) => v.toHwbString(),
    placeholder: 'e.g. hwb(0, 0%, 0%)',
  }),
  lch: buildColorFormat({
    label: 'lch',
    format: (v: Colord) => v.toLchString(),
    placeholder: 'e.g. lch(53.24, 104.55, 40.85)',
  }),
  name: buildColorFormat({
    label: 'name',
    format: (v: Colord) => v.toName({ closest: true }) ?? 'Unknown',
    placeholder: 'e.g. red',
  }),
};

// ==========================================
// CSS Named Color Precision & Approximation
// ==========================================
interface CssNameInfo {
  name: string;
  isExact: boolean;
  standardHex: string;
  deltaE: number;
}

const cssNameInfo = computed<CssNameInfo | null>(() => {
  const c = currentColor.value;
  if (!c || !c.isValid()) {
    return null;
  }

  const exactName = c.toName();
  const closestName = c.toName({ closest: true });
  if (!closestName) {
    return null;
  }

  const isExact = Boolean(exactName && exactName.toLowerCase() === closestName.toLowerCase());
  const standardHex = colord(closestName).toHex().toUpperCase();
  const inputHex = c.toHex().toUpperCase();
  const dE = Number(deltaE2000(hexToLab(inputHex), hexToLab(standardHex)).toFixed(1));

  return {
    name: closestName,
    isExact,
    standardHex,
    deltaE: dE,
  };
});

// ==========================================
// Delta E 2000 Pantone Matching Logic
// ==========================================
const pantoneMatches = ref<PantoneMatch[]>([]);
const bestPantoneMatch = computed<PantoneMatch | null>(() => pantoneMatches.value[0] ?? null);
const secondaryPantoneMatches = computed<PantoneMatch[]>(() => pantoneMatches.value.slice(1, 7));

function calculatePantoneMatches(hex: string) {
  try {
    pantoneMatches.value = findClosestPantone(hex, 8);
  }
  catch (e) {
    pantoneMatches.value = [];
  }
}

function updateColorValue(value: Colord | undefined, omitLabel?: string) {
  if (value === undefined || !value.isValid()) {
    return;
  }

  currentColor.value = value;
  currentHex.value = value.toHex().toUpperCase();

  _.forEach(formats, ({ value: valueRef, format }, key) => {
    if (key !== omitLabel) {
      valueRef.value = format(value);
    }
  });

  calculatePantoneMatches(currentHex.value);
}

function applyNewHex(hex: string) {
  const parsed = colord(hex);
  if (parsed.isValid()) {
    updateColorValue(parsed);
  }
}

// Initialize default color values
updateColorValue(colord('#1EA54C'));

// Pantone Reverse Lookup
const pantoneSearchQuery = ref('');
const pantoneSearchResults = computed<PantoneColor[]>(() => {
  if (!pantoneSearchQuery.value.trim()) {
    return [];
  }
  return searchPantoneColors(pantoneSearchQuery.value, 8);
});

// Copy Feedback
const copiedCode = ref<string | null>(null);
async function copyText(text: string, label: string) {
  await copy(text);
  copiedCode.value = text;
  setTimeout(() => {
    if (copiedCode.value === text) {
      copiedCode.value = null;
    }
  }, 2000);
  message.success(`已複製 ${label}: ${text}`);
}

// ==========================================
// Native Screen EyeDropper API
// ==========================================
const isNativeEyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

async function openScreenEyeDropper() {
  if (isNativeEyeDropperSupported) {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        applyNewHex(result.sRGBHex);
        message.success(`已從螢幕滴管取得顏色: ${result.sRGBHex.toUpperCase()}`);
      }
    }
    catch (e) {
      // User cancelled, ignore
    }
  }
  else {
    message.info('您的瀏覽器不支援原生螢幕滴管（僅 Chrome / Edge 支援），已為您開啟「圖片/截圖取色滴管」！');
    showImageDropper.value = true;
  }
}

// ==========================================
// Screenshot & Image Dropper with 8x Loupe
// ==========================================
const showImageDropper = ref(false);
const imageCanvasRef = ref<HTMLCanvasElement | null>(null);
const loupeCanvasRef = ref<HTMLCanvasElement | null>(null);
const isImageLoaded = ref(false);
const recentSampledColors = ref<string[]>([]);
const isHoveringCanvas = ref(false);

const loupePos = ref({ x: 0, y: 0, canvasX: 0, canvasY: 0 });
const hoverHex = ref('#FFFFFF');
const hoverRgb = ref('rgb(255, 255, 255)');

let originalImage: HTMLImageElement | null = null;

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    loadImageFile(target.files[0]);
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    loadImageFile(e.dataTransfer.files[0]);
  }
}

function loadImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('請上傳有效的圖片或截圖檔案 (PNG, JPG, WebP, SVG)');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      isImageLoaded.value = true;
      nextTick(() => renderImageToCanvas());
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function renderImageToCanvas() {
  const canvas = imageCanvasRef.value;
  if (!canvas || !originalImage) {
    return;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  // Determine optimal display resolution
  const maxWidth = Math.min(800, window.innerWidth - 60);
  const scale = originalImage.width > maxWidth ? maxWidth / originalImage.width : 1;

  canvas.width = originalImage.width * scale;
  canvas.height = originalImage.height * scale;

  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
}

function onCanvasMouseMove(e: MouseEvent) {
  const canvas = imageCanvasRef.value;
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left);
  const y = Math.floor(e.clientY - rect.top);

  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    isHoveringCanvas.value = false;
    return;
  }

  isHoveringCanvas.value = true;
  loupePos.value = {
    x: e.clientX,
    y: e.clientY,
    canvasX: x,
    canvasY: y,
  };

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
  hoverHex.value = hex;
  hoverRgb.value = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

  // Draw 8x magnified loupe
  renderLoupe(x, y);
}

function renderLoupe(cx: number, cy: number) {
  const loupeCanvas = loupeCanvasRef.value;
  const imageCanvas = imageCanvasRef.value;
  if (!loupeCanvas || !imageCanvas) {
    return;
  }

  const lCtx = loupeCanvas.getContext('2d');
  if (!lCtx) {
    return;
  }

  const sampleRadius = 5; // 11x11 sample area
  const sampleSize = sampleRadius * 2 + 1;
  const loupeSize = 110;

  lCtx.imageSmoothingEnabled = false;
  lCtx.clearRect(0, 0, loupeSize, loupeSize);

  // Draw magnified image patch
  lCtx.drawImage(
    imageCanvas,
    cx - sampleRadius,
    cy - sampleRadius,
    sampleSize,
    sampleSize,
    0,
    0,
    loupeSize,
    loupeSize,
  );

  // Center crosshair
  const mid = loupeSize / 2;
  const centerPixSize = loupeSize / sampleSize;

  lCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  lCtx.lineWidth = 1.5;
  lCtx.strokeRect(mid - centerPixSize / 2, mid - centerPixSize / 2, centerPixSize, centerPixSize);

  lCtx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  lCtx.lineWidth = 1;
  lCtx.strokeRect(mid - centerPixSize / 2 - 1, mid - centerPixSize / 2 - 1, centerPixSize + 2, centerPixSize + 2);
}

function onCanvasClick() {
  const hex = hoverHex.value;
  applyNewHex(hex);

  if (!recentSampledColors.value.includes(hex)) {
    recentSampledColors.value.unshift(hex);
    if (recentSampledColors.value.length > 12) {
      recentSampledColors.value.pop();
    }
  }

  message.success(`已擷取截圖像素顏色: ${hex}`);
}

function onCanvasMouseLeave() {
  isHoveringCanvas.value = false;
}

// Global Clipboard Paste Listener
function handleGlobalPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) {
    return;
  }

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        showImageDropper.value = true;
        loadImageFile(file);
        message.success('已讀取剪貼簿截圖，移動滑鼠即可在畫面上放大精確取色！');
        break;
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('paste', handleGlobalPaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handleGlobalPaste);
});
</script>

<template>
  <div class="color-converter-container">
    <!-- Top Action & Hero Swatch Bar -->
    <div class="converter-hero-card">
      <div class="hero-left">
        <div class="hero-swatch-box" :style="{ backgroundColor: currentHex }">
          <span class="hero-swatch-hex" :style="{ color: currentColor.isDark() ? '#ffffff' : '#0f172a' }">
            {{ currentHex }}
          </span>
        </div>
        <div class="hero-info-text">
          <div class="hero-title-row">
            <span class="hero-color-title">{{ formats.name.value.value || 'Custom Color' }}</span>
            <n-tag size="small" :type="currentColor.isDark() ? 'info' : 'warning'" round>
              {{ currentColor.isDark() ? '深色調 (Dark)' : '淺色調 (Light)' }}
            </n-tag>
          </div>
          <div class="hero-color-sub">
            <span>RGB: {{ formats.rgb.value.value }}</span>
            <span>·</span>
            <span>CMYK: {{ formats.cmyk.value.value }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Dropper Action Buttons -->
      <div class="hero-actions">
        <n-button
          class="eyedropper-btn native-eyedropper-btn"
          type="primary"
          size="medium"
          @click="openScreenEyeDropper"
        >
          <template #icon>
            <n-icon :component="IconColorPicker" />
          </template>
          螢幕滴管取色
        </n-button>

        <n-button
          class="eyedropper-btn screenshot-eyedropper-btn"
          size="medium"
          :secondary="!showImageDropper"
          :type="showImageDropper ? 'primary' : 'default'"
          @click="showImageDropper = !showImageDropper"
        >
          <template #icon>
            <n-icon :component="IconPhoto" />
          </template>
          截圖 / 圖片取色滴管
        </n-button>
      </div>
    </div>

    <!-- Collapsible Interactive Screenshot & Image Eyedropper with 8x Loupe -->
    <n-collapse-transition :show="showImageDropper">
      <div class="screenshot-dropper-panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <span class="panel-title">圖片 / 截圖滴管取色 (8x 放大鏡)</span>
            <span class="panel-desc">支援按 Ctrl+V / Cmd+V 直接貼上剪貼簿截圖，或上傳品牌視覺與設計圖稿</span>
          </div>
          <div class="panel-header-actions">
            <label class="upload-trigger-btn">
              <span>上傳新圖片</span>
              <input type="file" accept="image/*" class="hidden-file-input" @change="handleFileSelect">
            </label>
            <n-button size="small" quaternary circle @click="showImageDropper = false">
              <template #icon>
                <n-icon :component="IconX" />
              </template>
            </n-button>
          </div>
        </div>

        <!-- Dropzone / Empty State -->
        <div
          v-if="!isImageLoaded"
          class="image-dropzone"
          @dragover.prevent
          @drop="handleDrop"
        >
          <n-icon size="44" :component="IconPhoto" class="dropzone-icon" />
          <div class="dropzone-text-primary">拖曳圖片至此，或按 Cmd+V / Ctrl+V 貼上截圖</div>
          <div class="dropzone-text-secondary">支援 PNG, JPG, WebP, SVG, AVIF 等格式</div>
          <label class="dropzone-upload-btn">
            選擇檔案
            <input type="file" accept="image/*" class="hidden-file-input" @change="handleFileSelect">
          </label>
        </div>

        <!-- Canvas Inspection View -->
        <div v-else class="canvas-viewport-wrap">
          <div class="canvas-scroll-container">
            <canvas
              ref="imageCanvasRef"
              class="inspected-image-canvas"
              @mousemove="onCanvasMouseMove"
              @mouseleave="onCanvasMouseLeave"
              @click="onCanvasClick"
            />
          </div>

          <!-- Floating 8x Precision Loupe -->
          <div
            v-show="isHoveringCanvas"
            class="floating-loupe-widget"
            :style="{
              left: `${loupePos.canvasX + 16}px`,
              top: `${loupePos.canvasY + 16}px`,
            }"
          >
            <canvas ref="loupeCanvasRef" width="110" height="110" class="loupe-canvas" />
            <div class="loupe-color-badge" :style="{ backgroundColor: hoverHex }">
              <span :style="{ color: colord(hoverHex).isDark() ? '#ffffff' : '#0f172a' }">
                {{ hoverHex }}
              </span>
            </div>
            <div class="loupe-rgb-text">{{ hoverRgb }}</div>
            <div class="loupe-hint">點擊選取</div>
          </div>

          <!-- History strip of colors extracted from this image -->
          <div v-if="recentSampledColors.length > 0" class="sampled-history-bar">
            <span class="history-label">截圖取色紀錄:</span>
            <div class="history-swatches">
              <button
                v-for="hex in recentSampledColors"
                :key="hex"
                class="history-swatch-pill"
                type="button"
                :title="`點擊載入 ${hex}`"
                @click="applyNewHex(hex)"
              >
                <span class="swatch-mini-dot" :style="{ backgroundColor: hex }" />
                <span class="swatch-mini-hex">{{ hex }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </n-collapse-transition>

    <!-- Main Workspace: Color Formats + Pantone Delta E 2000 Matching -->
    <div class="main-sections-grid">
      <!-- Section 1: Standard Color Formats Card -->
      <c-card class="formats-card">
        <template #header>
          <div class="section-card-title">顏色模型格式轉換</div>
        </template>

        <template v-for="({ label, parse, placeholder, validation, type }, key) in formats" :key="key">
          <input-copyable
            v-if="type === 'text'"
            v-model:value="formats[key].value.value"
            :test-id="`input-${key}`"
            :label="key === 'name' ? (cssNameInfo?.isExact ? 'NAME (精確):' : 'NAME (近似):') : `${label.toUpperCase()}:`"
            label-position="left"
            label-width="105px"
            label-align="right"
            :placeholder="placeholder"
            :validation="validation"
            raw-text
            clearable
            mt-2
            @update:value="(v: string) => updateColorValue(parse(v), key)"
          />

          <!-- Special Callout for CSS Name (Exact vs. Approximate) -->
          <div v-if="key === 'name' && cssNameInfo" class="css-name-notice-wrap">
            <div v-if="!cssNameInfo.isExact" class="css-name-notice-box is-approximate">
              <div class="notice-header">
                <div class="notice-title-row">
                  <span class="notice-icon">⚠️</span>
                  <span class="notice-title">近似色名標註：<strong>{{ cssNameInfo.name }}</strong></span>
                  <n-tag size="tiny" type="warning" round class="notice-tag">非精確色碼</n-tag>
                </div>
                <span class="notice-delta-e">色差 ΔE ≈ {{ cssNameInfo.deltaE }}</span>
              </div>

              <div class="notice-compare-row">
                <div class="swatch-item-box">
                  <span class="swatch-circle" :style="{ backgroundColor: currentHex }" />
                  <span class="swatch-text-meta">
                    <span class="meta-label">目前輸入色</span>
                    <code class="meta-code">{{ currentHex }}</code>
                  </span>
                </div>
                <span class="swatch-unequal-sign">≠</span>
                <div class="swatch-item-box">
                  <span class="swatch-circle" :style="{ backgroundColor: cssNameInfo.standardHex }" />
                  <span class="swatch-text-meta">
                    <span class="meta-label">CSS {{ cssNameInfo.name }} 標準色</span>
                    <code class="meta-code">{{ cssNameInfo.standardHex }}</code>
                  </span>
                </div>
              </div>

              <div class="notice-explanation">
                <strong>注意：</strong>目前輸入之 <code>{{ currentHex }}</code> 並非 W3C 標準 CSS 具名色彩。上欄顯示之「<strong>{{ cssNameInfo.name }}</strong>」為感知最接近之近似色名。若直接在 CSS 樣式中寫 <code>color: {{ cssNameInfo.name }};</code>，瀏覽器將渲染為其官方標準色碼 <code>{{ cssNameInfo.standardHex }}</code>，顏色會與原色不同。如需 100% 精準色彩，請直接使用 HEX 或 RGB。
              </div>

              <div class="notice-actions-row">
                <n-button size="small" secondary type="warning" @click="applyNewHex(cssNameInfo.standardHex)">
                  套用 {{ cssNameInfo.name }} 標準色碼 ({{ cssNameInfo.standardHex }})
                </n-button>
                <n-button size="small" secondary @click="copyText(cssNameInfo.name, 'CSS 色名')">
                  複製純色名: {{ cssNameInfo.name }}
                </n-button>
                <n-button size="small" secondary @click="copyText(cssNameInfo.standardHex, '標準色碼')">
                  複製標準色碼: {{ cssNameInfo.standardHex }}
                </n-button>
              </div>
            </div>

            <div v-else class="css-name-notice-box is-exact">
              <div class="notice-header">
                <div class="notice-title-row">
                  <span class="notice-icon">✓</span>
                  <span class="notice-title">標準 CSS 命名色彩：<strong>{{ cssNameInfo.name }}</strong></span>
                  <n-tag size="tiny" type="success" round class="notice-tag">100% 精確吻合</n-tag>
                </div>
              </div>
              <div class="notice-explanation">
                此色彩完全符合 W3C CSS 官方標準命名定義（標準色碼 <code>{{ cssNameInfo.standardHex }}</code>，ΔE = 0），可安全在 CSS 中直接以 <code>color: {{ cssNameInfo.name }};</code> 使用。
              </div>
            </div>
          </div>

          <n-form-item
            v-else-if="type === 'color-picker'"
            :label="`${label.toUpperCase()}:`"
            label-width="90"
            label-placement="left"
            :show-feedback="false"
          >
            <n-color-picker
              v-model:value="formats[key].value.value"
              placement="bottom-end"
              @update:value="(v: string) => updateColorValue(parse(v), key)"
            />
          </n-form-item>
        </template>
      </c-card>

      <!-- Section 2: Pure Client-Side Delta E 2000 Pantone Matching -->
      <c-card class="pantone-matching-card">
        <template #header>
          <div class="pantone-card-header">
            <div>
              <div class="section-card-title">潘通 (Pantone) 色碼精準配對</div>
              <div class="pantone-card-subtitle">
                採用 CIE Delta E 2000 (CIEDE2000) 感知色差演算法，在 CIE L*a*b* 色彩空間精準比對。
              </div>
            </div>
          </div>
        </template>

        <!-- Top 1 Best Match Hero Card -->
        <div v-if="bestPantoneMatch" class="best-match-hero">
          <div class="split-swatch-container">
            <div class="split-swatch-half input-half" :style="{ backgroundColor: currentHex }">
              <span class="split-swatch-label" :style="{ color: currentColor.isDark() ? '#ffffff' : '#0f172a' }">
                原始輸入
              </span>
              <span class="split-swatch-code" :style="{ color: currentColor.isDark() ? '#ffffff' : '#0f172a' }">
                {{ currentHex }}
              </span>
            </div>
            <div class="split-swatch-half match-half" :style="{ backgroundColor: bestPantoneMatch.hex }">
              <span class="split-swatch-label" :style="{ color: colord(bestPantoneMatch.hex).isDark() ? '#ffffff' : '#0f172a' }">
                最接近潘通
              </span>
              <span class="split-swatch-code" :style="{ color: colord(bestPantoneMatch.hex).isDark() ? '#ffffff' : '#0f172a' }">
                {{ bestPantoneMatch.hex }}
              </span>
            </div>
          </div>

          <!-- Match Details -->
          <div class="best-match-content">
            <div class="best-match-top-row">
              <div class="best-match-titles">
                <span class="pantone-code-main">{{ bestPantoneMatch.code }}</span>
                <span class="pantone-name-main">{{ bestPantoneMatch.name }}</span>
              </div>
              <div class="delta-e-score-badge" :style="{ borderColor: bestPantoneMatch.assessment.color, color: bestPantoneMatch.assessment.color }">
                <span class="delta-e-number">ΔE {{ bestPantoneMatch.deltaE }}</span>
                <span class="delta-e-label">{{ bestPantoneMatch.assessment.labelZh }}</span>
              </div>
            </div>

            <div class="delta-e-explanation-text">
              {{ bestPantoneMatch.assessment.descriptionZh }}
            </div>

            <div class="pantone-values-row">
              <span class="val-tag">HEX: {{ bestPantoneMatch.hex }}</span>
              <span class="val-tag">RGB: {{ bestPantoneMatch.rgb }}</span>
              <span class="val-tag">CMYK: {{ bestPantoneMatch.cmyk }}</span>
              <span class="val-tag category-tag">{{ bestPantoneMatch.category }}</span>
            </div>

            <!-- Fast Copy Action Buttons -->
            <div class="match-actions-row">
              <n-button
                size="small"
                class="copy-act-btn"
                @click="copyText(bestPantoneMatch.code, '潘通色碼')"
              >
                <template #icon>
                  <n-icon :component="copiedCode === bestPantoneMatch.code ? IconCheck : IconCopy" />
                </template>
                複製色碼
              </n-button>

              <n-button
                size="small"
                class="copy-act-btn"
                @click="copyText(bestPantoneMatch.hex, 'HEX')"
              >
                複製 HEX
              </n-button>

              <n-button
                size="small"
                class="copy-act-btn"
                @click="copyText(bestPantoneMatch.cmyk, 'CMYK')"
              >
                複製 CMYK
              </n-button>

              <n-button
                size="small"
                type="primary"
                secondary
                class="apply-match-btn"
                @click="applyNewHex(bestPantoneMatch.hex)"
              >
                套用此潘通色
              </n-button>
            </div>
          </div>
        </div>

        <!-- Alternative Pantone Matches Grid -->
        <div v-if="secondaryPantoneMatches.length > 0" class="secondary-matches-section">
          <div class="sub-section-title">其他相近潘通候選色 (ΔE 2000 排序)</div>
          <div class="secondary-grid">
            <div
              v-for="match in secondaryPantoneMatches"
              :key="match.code"
              class="secondary-match-card"
              @click="applyNewHex(match.hex)"
            >
              <div class="match-swatch-thumb" :style="{ backgroundColor: match.hex }" />
              <div class="match-thumb-info">
                <span class="match-thumb-code">{{ match.code }}</span>
                <span class="match-thumb-name">{{ match.name }}</span>
                <div class="match-thumb-meta">
                  <span class="match-thumb-de" :style="{ color: match.assessment.color }">
                    ΔE {{ match.deltaE }}
                  </span>
                  <span class="match-thumb-hex">{{ match.hex }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reverse Pantone Lookup / Search -->
        <div class="pantone-lookup-box">
          <div class="sub-section-title">潘通色庫搜尋與反向轉換</div>
          <n-input
            v-model:value="pantoneSearchQuery"
            clearable
            placeholder="搜尋潘通色號或名稱 (例如：19-4052, 286, Peach, Mocha, Warm Red)..."
          >
            <template #prefix>
              <n-icon :component="IconSearch" />
            </template>
          </n-input>

          <div v-if="pantoneSearchResults.length > 0" class="lookup-results-list">
            <div
              v-for="res in pantoneSearchResults"
              :key="res.code"
              class="lookup-item"
              @click="applyNewHex(res.hex)"
            >
              <span class="lookup-dot" :style="{ backgroundColor: res.hex }" />
              <span class="lookup-code">{{ res.code }}</span>
              <span class="lookup-name">{{ res.name }}</span>
              <span class="lookup-hex">{{ res.hex }}</span>
              <n-button size="tiny" quaternary>載入</n-button>
            </div>
          </div>
        </div>
      </c-card>
    </div>
  </div>
</template>

<style scoped>
.color-converter-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

/* ===================================================
   Top Hero Swatch Bar
   =================================================== */
.converter-hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 16px;
  background: v-bind('themeVars.cardColor');
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  gap: 16px;
  flex-wrap: wrap;
}

:global(.dark) .converter-hero-card {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-swatch-box {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.hero-swatch-hex {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.hero-info-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-color-title {
  font-size: var(--type-card-title);
  font-weight: 800;
  text-transform: capitalize;
}

.hero-color-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-meta);
  color: #64748b;
}

:global(.dark) .hero-color-sub {
  color: #94a3b8;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.eyedropper-btn {
  font-weight: 700;
  border-radius: 8px;
}

/* ===================================================
   Screenshot / Image Dropper Panel
   =================================================== */
.screenshot-dropper-panel {
  border-radius: 16px;
  background: v-bind('themeVars.cardColor');
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

:global(.dark) .screenshot-dropper-panel {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  font-size: var(--type-body);
  font-weight: 800;
}

.panel-desc {
  font-size: var(--type-meta);
  color: #64748b;
}

:global(.dark) .panel-desc {
  color: #94a3b8;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hidden-file-input {
  display: none;
}

.upload-trigger-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  font-weight: 600;
  font-size: var(--type-meta);
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-trigger-btn:hover {
  background: rgba(59, 130, 246, 0.2);
}

:global(.dark) .upload-trigger-btn {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.image-dropzone {
  border: 2px dashed rgba(100, 116, 139, 0.3);
  border-radius: 12px;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.image-dropzone:hover {
  border-color: #3b82f6;
}

.dropzone-icon {
  color: #64748b;
  margin-bottom: 4px;
}

.dropzone-text-primary {
  font-weight: 700;
  font-size: var(--type-control);
}

.dropzone-text-secondary {
  font-size: var(--type-meta);
  color: #64748b;
}

.dropzone-upload-btn {
  margin-top: 10px;
  padding: 8px 18px;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
  font-size: var(--type-meta);
  cursor: pointer;
}

/* Canvas Viewport */
.canvas-viewport-wrap {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.04);
}

.canvas-scroll-container {
  max-height: 480px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.inspected-image-canvas {
  cursor: crosshair;
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Floating Precision 8x Loupe */
.floating-loupe-widget {
  position: absolute;
  pointer-events: none;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(8px);
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transform: translate(10px, 10px);
}

.loupe-canvas {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.loupe-color-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  font-weight: 800;
}

.loupe-rgb-text {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  color: #cbd5e1;
}

.loupe-hint {
  font-size: var(--type-caption);
  color: #94a3b8;
  font-weight: 600;
}

.sampled-history-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: v-bind('themeVars.cardColor');
  flex-wrap: wrap;
}

:global(.dark) .sampled-history-bar {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.history-label {
  font-size: var(--type-meta);
  font-weight: 700;
}

.history-swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.history-swatch-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(100, 116, 139, 0.3);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-swatch-pill:hover {
  transform: translateY(-1px);
  border-color: #3b82f6;
}

.swatch-mini-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.swatch-mini-hex {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  font-weight: 600;
}

/* ===================================================
   Main Sections Grid
   =================================================== */
.main-sections-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 1024px) {
  .main-sections-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.section-card-title {
  font-size: var(--type-body);
  font-weight: 800;
}

.pantone-card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pantone-card-subtitle {
  font-size: var(--type-meta);
  color: #64748b;
  font-weight: normal;
}

:global(.dark) .pantone-card-subtitle {
  color: #94a3b8;
}

/* ===================================================
   Delta E 2000 Best Match Hero Card
   =================================================== */
.best-match-hero {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 20px;
  background: rgba(0, 0, 0, 0.02);
}

:global(.dark) .best-match-hero {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.split-swatch-container {
  display: flex;
  height: 90px;
  width: 100%;
}

.split-swatch-half {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
}

.split-swatch-label {
  font-size: var(--type-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.split-swatch-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-label);
  font-weight: 800;
}

.best-match-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.best-match-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.best-match-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pantone-code-main {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-subheading);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #0284c7;
}

:global(.dark) .pantone-code-main {
  color: #38bdf8;
}

.pantone-name-main {
  font-size: var(--type-body);
  font-weight: 700;
}

.delta-e-score-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid;
  background: rgba(255, 255, 255, 0.1);
}

.delta-e-number {
  font-size: var(--type-subheading);
  font-weight: 900;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.delta-e-label {
  font-size: var(--type-caption);
  font-weight: 700;
}

.delta-e-explanation-text {
  font-size: var(--type-meta);
  color: #475569;
  line-height: 1.4;
}

:global(.dark) .delta-e-explanation-text {
  color: #94a3b8;
}

.pantone-values-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.val-tag {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

:global(.dark) .val-tag {
  background: rgba(255, 255, 255, 0.08);
}

.category-tag {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

:global(.dark) .category-tag {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.match-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

:global(.dark) .match-actions-row {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.copy-act-btn {
  font-weight: 700;
  border-radius: 6px;
}

.apply-match-btn {
  font-weight: 700;
  margin-left: auto;
}

/* ===================================================
   Alternative Pantone Matches Grid
   =================================================== */
.secondary-matches-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

:global(.dark) .secondary-matches-section {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.sub-section-title {
  font-size: var(--type-label);
  font-weight: 700;
  margin-bottom: 10px;
  color: #334155;
}

:global(.dark) .sub-section-title {
  color: #cbd5e1;
}

.secondary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.secondary-match-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.015);
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-match-card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

:global(.dark) .secondary-match-card {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

:global(.dark) .secondary-match-card:hover {
  border-color: #60a5fa;
  background: rgba(59, 130, 246, 0.15);
}

.match-swatch-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.match-thumb-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.match-thumb-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-thumb-name {
  font-size: var(--type-caption);
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .match-thumb-name {
  color: #94a3b8;
}

.match-thumb-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  font-weight: 700;
}

.match-thumb-hex {
  color: #64748b;
}

/* ===================================================
   Pantone Lookup
   =================================================== */
.pantone-lookup-box {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

:global(.dark) .pantone-lookup-box {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.lookup-results-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.lookup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  transition: background 0.2s ease;
}

.lookup-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

:global(.dark) .lookup-item {
  background: rgba(255, 255, 255, 0.04);
}

:global(.dark) .lookup-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.lookup-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.lookup-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-meta);
  font-weight: 700;
}

.lookup-name {
  font-size: var(--type-meta);
  color: #64748b;
  flex: 1;
}

:global(.dark) .lookup-name {
  color: #94a3b8;
}

.lookup-hex {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-caption);
  color: #64748b;
}

:deep(.c-input-text .input-wrapper) {
  background-color: v-bind('themeVars.inputColor') !important;
  border-color: v-bind('themeVars.borderColor') !important;
}

:deep(.c-input-text .input),
:deep(.c-input-text textarea) {
  color: v-bind('themeVars.textColor1') !important;
}

:deep(.c-input-text .input::placeholder),
:deep(.c-input-text textarea::placeholder) {
  color: v-bind('themeVars.textColor3') !important;
}

/* ===================================================
   CSS Named Color Precision & Approximation Callout
   =================================================== */
.css-name-notice-wrap {
  margin-top: 10px;
  margin-bottom: 6px;
}

.css-name-notice-box {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: var(--type-body);
  line-height: 1.5;
  transition: all 0.2s ease;
}

.css-name-notice-box.is-approximate {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #92400e;
}

:global(.dark) .css-name-notice-box.is-approximate {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fde68a;
}

.css-name-notice-box.is-exact {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #065f46;
}

:global(.dark) .css-name-notice-box.is-exact {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
  color: #a7f3d0;
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.notice-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}

.notice-delta-e {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: var(--type-meta);
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.15);
}

.notice-compare-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  flex-wrap: wrap;
}

:global(.dark) .notice-compare-row {
  background: rgba(0, 0, 0, 0.2);
}

.swatch-item-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

:global(.dark) .swatch-circle {
  border-color: rgba(255, 255, 255, 0.2);
}

.swatch-text-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.meta-label {
  font-size: var(--type-caption);
  opacity: 0.8;
}

.meta-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 800;
  font-size: var(--type-caption);
}

.swatch-unequal-sign {
  font-weight: 900;
  font-size: var(--type-body);
  opacity: 0.7;
}

.notice-explanation {
  font-size: var(--type-body);
  line-height: var(--leading-body);
  margin: 6px 0 10px 0;
  opacity: 0.95;
}

.notice-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

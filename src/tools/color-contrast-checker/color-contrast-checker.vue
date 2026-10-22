<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage, useThemeVars } from 'naive-ui';
import { useStorage } from '@vueuse/core';
import {
  IconAlertCircle,
  IconArrowsExchange,
  IconBookmark,
  IconCheck,
  IconColorPicker,
  IconCopy,
  IconRotate,
  IconSparkles,
  IconStar,
  IconTrash,
  IconX,
} from '@tabler/icons-vue';
import {
  evaluateWcagLevels,
  getColorName,
  getContrastRatio,
  getLuminance,
  hexToHslChannels,
  hexToRgbChannels,
  hslChannelsToHex,
  isValidColor,
  normalizeHex,
  rgbChannelsToHex,
  type SavedSwatchPair,
  suggestAccessibleColors,
} from './color-contrast-checker.models';
import { useCopy } from '@/composable/copy';

const { t, locale } = useI18n();
const themeVars = useThemeVars();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

// Curated Initial Presets
const DEFAULT_PRESETS: SavedSwatchPair[] = [
  {
    id: 'preset-2md-dark',
    name: '2md Deep Blue & Saffron',
    backgroundHex: '#17324D',
    foregroundHex: '#FFB010',
  },
  {
    id: 'preset-2md-light',
    name: '2md Cream & Ink',
    backgroundHex: '#FFF9E8',
    foregroundHex: '#2B251A',
  },
  {
    id: 'preset-2md-midnight',
    name: '2md Midnight & Sand',
    backgroundHex: '#101B27',
    foregroundHex: '#F5EEDC',
  },
  {
    id: 'preset-classic-blue',
    name: 'Pure White & IBM Blue',
    backgroundHex: '#FFFFFF',
    foregroundHex: '#0F62FE',
  },
];

// Persistent User Swatches with defensive validation
const savedSwatches = useStorage<SavedSwatchPair[]>(
  'wcag-contrast-saved-swatches',
  DEFAULT_PRESETS,
);

if (
  !Array.isArray(savedSwatches.value)
  || savedSwatches.value.some(
    item =>
      !item
      || typeof item.id !== 'string'
      || typeof item.backgroundHex !== 'string'
      || typeof item.foregroundHex !== 'string',
  )
) {
  savedSwatches.value = [...DEFAULT_PRESETS];
}

// Reactive State: Background & Foreground HEX
const backgroundHex = ref('#17324D');
const foregroundHex = ref('#FFB010');
const bgHexInput = ref('#17324D');
const fgHexInput = ref('#FFB010');

// Slider Modes: 'hsl' | 'rgb'
const bgMode = ref<'hsl' | 'rgb'>('hsl');
const fgMode = ref<'hsl' | 'rgb'>('hsl');

// Channel states
const bgHsl = ref(hexToHslChannels(backgroundHex.value));
const bgRgb = ref(hexToRgbChannels(backgroundHex.value));

const fgHsl = ref(hexToHslChannels(foregroundHex.value));
const fgRgb = ref(hexToRgbChannels(foregroundHex.value));

// Editable preview copy with locale reactivity
const previewHeading = ref(t('tools.color-contrast-checker.preview.largeTitleSample'));
const previewBody = ref(t('tools.color-contrast-checker.preview.normalBodySample'));
const isHeadingDirty = ref(false);
const isBodyDirty = ref(false);

watch(locale, () => {
  if (!isHeadingDirty.value) {
    previewHeading.value = t('tools.color-contrast-checker.preview.largeTitleSample');
  }
  if (!isBodyDirty.value) {
    previewBody.value = t('tools.color-contrast-checker.preview.normalBodySample');
  }
});

// EyeDropper API Detection
const isEyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

// Guard against loop updates
let isUpdatingInternally = false;

function isCompleteColorInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hexCandidate = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hexCandidate) && isValidColor(hexCandidate)) {
    return hexCandidate;
  }
  if (/^(?:rgb|hsl)a?\([^)]+\)$/i.test(trimmed) && isValidColor(trimmed)) {
    return trimmed;
  }
  return null;
}

function syncBackgroundFromHex(hex: string) {
  if (isUpdatingInternally) return;
  isUpdatingInternally = true;
  const norm = normalizeHex(hex, backgroundHex.value);
  backgroundHex.value = norm;
  bgHexInput.value = norm;
  bgHsl.value = hexToHslChannels(norm);
  bgRgb.value = hexToRgbChannels(norm);
  isUpdatingInternally = false;
}

function syncForegroundFromHex(hex: string) {
  if (isUpdatingInternally) return;
  isUpdatingInternally = true;
  const norm = normalizeHex(hex, foregroundHex.value);
  foregroundHex.value = norm;
  fgHexInput.value = norm;
  fgHsl.value = hexToHslChannels(norm);
  fgRgb.value = hexToRgbChannels(norm);
  isUpdatingInternally = false;
}

function onBgHexInputChange(val: string) {
  bgHexInput.value = val;
  const candidate = isCompleteColorInput(val);
  if (candidate) {
    if (isUpdatingInternally) return;
    isUpdatingInternally = true;
    const norm = normalizeHex(candidate, backgroundHex.value);
    backgroundHex.value = norm;
    bgHsl.value = hexToHslChannels(norm);
    bgRgb.value = hexToRgbChannels(norm);
    isUpdatingInternally = false;
  }
}

function onBgHexInputBlur() {
  bgHexInput.value = backgroundHex.value;
}

function onFgHexInputChange(val: string) {
  fgHexInput.value = val;
  const candidate = isCompleteColorInput(val);
  if (candidate) {
    if (isUpdatingInternally) return;
    isUpdatingInternally = true;
    const norm = normalizeHex(candidate, foregroundHex.value);
    foregroundHex.value = norm;
    fgHsl.value = hexToHslChannels(norm);
    fgRgb.value = hexToRgbChannels(norm);
    isUpdatingInternally = false;
  }
}

function onFgHexInputBlur() {
  fgHexInput.value = foregroundHex.value;
}

function safeChannel(val: number | null | undefined, min: number, max: number): number {
  if (val == null || typeof val !== 'number' || Number.isNaN(val)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(val)));
}

function onBgHslChange() {
  if (isUpdatingInternally) return;
  isUpdatingInternally = true;
  const h = safeChannel(bgHsl.value.h, 0, 360);
  const s = safeChannel(bgHsl.value.s, 0, 100);
  const l = safeChannel(bgHsl.value.l, 0, 100);
  bgHsl.value = { h, s, l };
  const newHex = hslChannelsToHex(h, s, l);
  backgroundHex.value = newHex;
  bgHexInput.value = newHex;
  bgRgb.value = hexToRgbChannels(newHex);
  isUpdatingInternally = false;
}

function onBgRgbChange() {
  if (isUpdatingInternally) return;
  isUpdatingInternally = true;
  const r = safeChannel(bgRgb.value.r, 0, 255);
  const g = safeChannel(bgRgb.value.g, 0, 255);
  const b = safeChannel(bgRgb.value.b, 0, 255);
  bgRgb.value = { r, g, b };
  const newHex = rgbChannelsToHex(r, g, b);
  backgroundHex.value = newHex;
  bgHexInput.value = newHex;
  bgHsl.value = hexToHslChannels(newHex);
  isUpdatingInternally = false;
}

function onFgHslChange() {
  if (isUpdatingInternally) return;
  isUpdatingInternally = true;
  const h = safeChannel(fgHsl.value.h, 0, 360);
  const s = safeChannel(fgHsl.value.s, 0, 100);
  const l = safeChannel(fgHsl.value.l, 0, 100);
  fgHsl.value = { h, s, l };
  const newHex = hslChannelsToHex(h, s, l);
  foregroundHex.value = newHex;
  fgHexInput.value = newHex;
  fgRgb.value = hexToRgbChannels(newHex);
  isUpdatingInternally = false;
}

function onFgRgbChange() {
  if (isUpdatingInternally) return;
  isUpdatingInternally = true;
  const r = safeChannel(fgRgb.value.r, 0, 255);
  const g = safeChannel(fgRgb.value.g, 0, 255);
  const b = safeChannel(fgRgb.value.b, 0, 255);
  fgRgb.value = { r, g, b };
  const newHex = rgbChannelsToHex(r, g, b);
  foregroundHex.value = newHex;
  fgHexInput.value = newHex;
  fgHsl.value = hexToHslChannels(newHex);
  isUpdatingInternally = false;
}

// Computeds
const contrastRatio = computed(() => getContrastRatio(backgroundHex.value, foregroundHex.value));
const wcagEval = computed(() => evaluateWcagLevels(contrastRatio.value));
const isPoorContrast = computed(() => contrastRatio.value < 3.0);

const bgLuminance = computed(() => getLuminance(backgroundHex.value));
const fgLuminance = computed(() => getLuminance(foregroundHex.value));

const bgName = computed(() => getColorName(backgroundHex.value));
const fgName = computed(() => getColorName(foregroundHex.value));

// Smart Auto-Fix Suggestions
const suggestionsAA = computed(() => suggestAccessibleColors(backgroundHex.value, foregroundHex.value, 4.5));
const suggestionsAAA = computed(() => suggestAccessibleColors(backgroundHex.value, foregroundHex.value, 7.0));
const hasAnySuggestion = computed(() =>
  Boolean(
    (!wcagEval.value.aaNormal && (suggestionsAA.value.suggestedForeground || suggestionsAA.value.suggestedBackground))
    || suggestionsAAA.value.suggestedForeground
    || suggestionsAAA.value.suggestedBackground,
  ),
);

// Actions
function reverseColors() {
  const oldBg = backgroundHex.value;
  const oldFg = foregroundHex.value;
  syncBackgroundFromHex(oldFg);
  syncForegroundFromHex(oldBg);
}

function saveCurrentColors() {
  const bg = backgroundHex.value;
  const fg = foregroundHex.value;
  const exists = savedSwatches.value.some(
    (item) => item.backgroundHex === bg && item.foregroundHex === fg,
  );
  if (exists) {
    message.warning(t('tools.color-contrast-checker.actions.swatchExists'));
    return;
  }
  savedSwatches.value.unshift({
    id: `custom-${Date.now()}`,
    name: `${bg} / ${fg}`,
    backgroundHex: bg,
    foregroundHex: fg,
  });
  message.success(t('tools.color-contrast-checker.actions.swatchSaved'));
}

function removeSwatch(id: string) {
  savedSwatches.value = savedSwatches.value.filter((s) => s.id !== id);
  message.info(t('tools.color-contrast-checker.actions.swatchRemoved'));
}

function resetToDefaultPresets() {
  savedSwatches.value = [...DEFAULT_PRESETS];
  message.success(t('tools.color-contrast-checker.actions.resetSwatches'));
}

function applySwatch(swatch: SavedSwatchPair) {
  syncBackgroundFromHex(swatch.backgroundHex);
  syncForegroundFromHex(swatch.foregroundHex);
}

async function copyCssVariables() {
  const css = `:root {
  --color-background: ${backgroundHex.value};
  --color-foreground: ${foregroundHex.value};
  --contrast-ratio: ${contrastRatio.value.toFixed(2)};
  --wcag-grade: '${wcagEval.value.overallGrade}';
}`;
  await copy(css);
  message.success(t('tools.color-contrast-checker.actions.cssCopied'));
}

async function copyHex(hex: string) {
  await copy(hex);
  message.success(`${t('tools.color-contrast-checker.actions.colorCopied')}: ${hex}`);
}

async function pickColorWithEyeDropper(target: 'bg' | 'fg') {
  if (!isEyeDropperSupported) {
    message.warning(t('tools.color-contrast-checker.controls.eyedropperNotSupported'));
    return;
  }
  try {
    // @ts-expect-error EyeDropper is supported in Chromium browsers
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();
    if (result && result.sRGBHex) {
      if (target === 'bg') {
        syncBackgroundFromHex(result.sRGBHex);
      } else {
        syncForegroundFromHex(result.sRGBHex);
      }
    }
  } catch {
    // User cancelled eyedropper
  }
}

// Suggestions Application
function applySuggestedFg(newFg: string | null) {
  if (newFg) syncForegroundFromHex(newFg);
}

function applySuggestedBg(newBg: string | null) {
  if (newBg) syncBackgroundFromHex(newBg);
}

// Grade Badge Color
const gradeTagType = computed(() => {
  switch (wcagEval.value.overallGrade) {
    case 'AAA':
      return 'success';
    case 'AA':
      return 'info';
    case 'AA Large':
      return 'warning';
    default:
      return 'error';
  }
});
</script>

<template>
  <div class="contrast-checker-container">
    <!-- 1. Top Score & WCAG Grades Banner -->
    <section
      class="score-banner"
      :style="{
        backgroundColor: backgroundHex,
        color: foregroundHex,
        borderColor: isPoorContrast ? themeVars.borderColor : 'transparent',
      }"
    >
      <div v-if="isPoorContrast" class="poor-contrast-warning">
        <n-icon :component="IconAlertCircle" size="18" />
        <span>{{ t('tools.color-contrast-checker.scoreBanner.poorContrastWarning') }}</span>
      </div>

      <div class="banner-content" :class="{ 'with-backdrop': isPoorContrast }">
        <!-- Left: Contrast Ratio & Meta -->
        <div class="banner-left">
          <div class="preview-aa-glyph">Aa</div>
          <div class="score-meta-block">
            <div class="ratio-heading-row">
              <span class="ratio-number">{{ contrastRatio.toFixed(2) }} : 1</span>
              <n-tag :type="gradeTagType" size="medium" round class="grade-pill">
                {{ wcagEval.overallGrade }}
              </n-tag>
            </div>
            <div class="color-attributes-list">
              <div class="color-attr-item">
                <span class="attr-bullet" :style="{ backgroundColor: backgroundHex }" />
                <span class="attr-label">{{ t('tools.color-contrast-checker.controls.background') }}:</span>
                <span class="attr-value">{{ backgroundHex }}</span>
                <span class="attr-sub">({{ t('tools.color-contrast-checker.scoreBanner.luminance') }}: {{ bgLuminance }}{{ bgName ? ` · ${bgName}` : '' }})</span>
              </div>
              <div class="color-attr-item">
                <span class="attr-bullet" :style="{ backgroundColor: foregroundHex }" />
                <span class="attr-label">{{ t('tools.color-contrast-checker.controls.foreground') }}:</span>
                <span class="attr-value">{{ foregroundHex }}</span>
                <span class="attr-sub">({{ t('tools.color-contrast-checker.scoreBanner.luminance') }}: {{ fgLuminance }}{{ fgName ? ` · ${fgName}` : '' }})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: 5 WCAG Level Badges -->
        <div class="banner-right">
          <div class="wcag-badge-card" :class="wcagEval.aaLarge ? 'badge-pass' : 'badge-fail'">
            <div class="badge-status-icon">
              <n-icon :component="wcagEval.aaLarge ? IconCheck : IconX" size="16" />
            </div>
            <div class="badge-texts">
              <div class="badge-title-line">
                <span class="badge-name">{{ t('tools.color-contrast-checker.levels.aaLarge') }}</span>
                <span class="badge-status">{{ wcagEval.aaLarge ? t('tools.color-contrast-checker.levels.pass') : t('tools.color-contrast-checker.levels.fail') }}</span>
              </div>
              <span class="badge-desc">{{ t('tools.color-contrast-checker.levels.aaLargeDesc') }}</span>
            </div>
          </div>

          <div class="wcag-badge-card" :class="wcagEval.aaNormal ? 'badge-pass' : 'badge-fail'">
            <div class="badge-status-icon">
              <n-icon :component="wcagEval.aaNormal ? IconCheck : IconX" size="16" />
            </div>
            <div class="badge-texts">
              <div class="badge-title-line">
                <span class="badge-name">{{ t('tools.color-contrast-checker.levels.aaNormal') }}</span>
                <span class="badge-status">{{ wcagEval.aaNormal ? t('tools.color-contrast-checker.levels.pass') : t('tools.color-contrast-checker.levels.fail') }}</span>
              </div>
              <span class="badge-desc">{{ t('tools.color-contrast-checker.levels.aaNormalDesc') }}</span>
            </div>
          </div>

          <div class="wcag-badge-card" :class="wcagEval.aaaLarge ? 'badge-pass' : 'badge-fail'">
            <div class="badge-status-icon">
              <n-icon :component="wcagEval.aaaLarge ? IconCheck : IconX" size="16" />
            </div>
            <div class="badge-texts">
              <div class="badge-title-line">
                <span class="badge-name">{{ t('tools.color-contrast-checker.levels.aaaLarge') }}</span>
                <span class="badge-status">{{ wcagEval.aaaLarge ? t('tools.color-contrast-checker.levels.pass') : t('tools.color-contrast-checker.levels.fail') }}</span>
              </div>
              <span class="badge-desc">{{ t('tools.color-contrast-checker.levels.aaaLargeDesc') }}</span>
            </div>
          </div>

          <div class="wcag-badge-card" :class="wcagEval.aaaNormal ? 'badge-pass' : 'badge-fail'">
            <div class="badge-status-icon">
              <n-icon :component="wcagEval.aaaNormal ? IconCheck : IconX" size="16" />
            </div>
            <div class="badge-texts">
              <div class="badge-title-line">
                <span class="badge-name">{{ t('tools.color-contrast-checker.levels.aaaNormal') }}</span>
                <span class="badge-status">{{ wcagEval.aaaNormal ? t('tools.color-contrast-checker.levels.pass') : t('tools.color-contrast-checker.levels.fail') }}</span>
              </div>
              <span class="badge-desc">{{ t('tools.color-contrast-checker.levels.aaaNormalDesc') }}</span>
            </div>
          </div>

          <div class="wcag-badge-card" :class="wcagEval.uiComponents ? 'badge-pass' : 'badge-fail'">
            <div class="badge-status-icon">
              <n-icon :component="wcagEval.uiComponents ? IconCheck : IconX" size="16" />
            </div>
            <div class="badge-texts">
              <div class="badge-title-line">
                <span class="badge-name">{{ t('tools.color-contrast-checker.levels.uiComponents') }}</span>
                <span class="badge-status">{{ wcagEval.uiComponents ? t('tools.color-contrast-checker.levels.pass') : t('tools.color-contrast-checker.levels.fail') }}</span>
              </div>
              <span class="badge-desc">{{ t('tools.color-contrast-checker.levels.uiComponentsDesc') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Actions & Saved Swatches Bar -->
    <section class="toolbar-section">
      <div class="action-buttons-row">
        <n-button secondary size="medium" @click="reverseColors">
          <template #icon><n-icon :component="IconArrowsExchange" /></template>
          {{ t('tools.color-contrast-checker.actions.reverse') }}
        </n-button>

        <n-button secondary size="medium" @click="saveCurrentColors">
          <template #icon><n-icon :component="IconBookmark" /></template>
          {{ t('tools.color-contrast-checker.actions.save') }}
        </n-button>

        <n-button secondary size="medium" @click="copyCssVariables">
          <template #icon><n-icon :component="IconCopy" /></template>
          {{ t('tools.color-contrast-checker.actions.copyCss') }}
        </n-button>

        <n-button tertiary size="medium" @click="resetToDefaultPresets">
          <template #icon><n-icon :component="IconRotate" /></template>
          {{ t('tools.color-contrast-checker.actions.resetSwatches') }}
        </n-button>
      </div>

      <!-- Swatches List -->
      <div class="swatches-wrap">
        <div
          v-for="swatch in savedSwatches"
          :key="swatch.id"
          class="swatch-pill"
          :class="{
            'active-swatch':
              swatch.backgroundHex === backgroundHex && swatch.foregroundHex === foregroundHex,
          }"
          @click="applySwatch(swatch)"
        >
          <div class="swatch-circle-preview">
            <span class="split-bg" :style="{ backgroundColor: swatch.backgroundHex }" />
            <span class="split-fg" :style="{ backgroundColor: swatch.foregroundHex }" />
          </div>
          <span class="swatch-label">
            {{ swatch.backgroundHex }} / {{ swatch.foregroundHex }}
          </span>
          <span class="swatch-ratio">
            {{ getContrastRatio(swatch.backgroundHex, swatch.foregroundHex).toFixed(1) }}:1
          </span>
          <button
            v-if="!swatch.id.startsWith('preset-')"
            type="button"
            class="swatch-delete-btn"
            :title="t('tools.color-contrast-checker.actions.removeSwatchTooltip')"
            :aria-label="t('tools.color-contrast-checker.actions.removeSwatchTooltip')"
            @click.stop="removeSwatch(swatch.id)"
          >
            <n-icon :component="IconTrash" size="14" />
          </button>
        </div>
      </div>
    </section>

    <!-- 3. Two-Column Color Controls -->
    <section class="controls-grid">
      <!-- Background Column -->
      <div class="control-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <span class="color-role-indicator" :style="{ backgroundColor: backgroundHex }" />
            <h3 class="panel-title">{{ t('tools.color-contrast-checker.controls.background') }}</h3>
          </div>
          <n-radio-group v-model:value="bgMode" size="small">
            <n-radio-button value="hsl">HSL</n-radio-button>
            <n-radio-button value="rgb">RGB</n-radio-button>
          </n-radio-group>
        </div>

        <!-- HEX Input & Color Picker Trigger -->
        <div class="input-tool-row">
          <div class="color-picker-trigger" :style="{ backgroundColor: backgroundHex }">
            <input
              type="color"
              :value="backgroundHex"
              :aria-label="`${t('tools.color-contrast-checker.controls.colorPicker')} (${t('tools.color-contrast-checker.controls.background')})`"
              :title="t('tools.color-contrast-checker.controls.colorPicker')"
              class="native-color-input"
              @input="(e: any) => syncBackgroundFromHex(e.target.value)"
            />
          </div>

          <n-input
            :value="bgHexInput"
            size="large"
            :placeholder="t('tools.color-contrast-checker.controls.hexPlaceholder')"
            class="hex-text-input"
            @update:value="onBgHexInputChange"
            @blur="onBgHexInputBlur"
          />

          <n-button
            secondary
            size="large"
            :aria-label="`${t('tools.color-contrast-checker.actions.colorCopied')} (${backgroundHex})`"
            :title="backgroundHex"
            @click="copyHex(backgroundHex)"
          >
            <template #icon><n-icon :component="IconCopy" /></template>
          </n-button>

          <n-button
            v-if="isEyeDropperSupported"
            secondary
            size="large"
            :aria-label="t('tools.color-contrast-checker.controls.eyedropper')"
            :title="t('tools.color-contrast-checker.controls.eyedropper')"
            @click="pickColorWithEyeDropper('bg')"
          >
            <template #icon><n-icon :component="IconColorPicker" /></template>
          </n-button>
        </div>

        <!-- Sliders: HSL Mode -->
        <div v-if="bgMode === 'hsl'" class="sliders-container">
          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.hue') }}</span>
              <span class="tabular-val">{{ bgHsl.h }}°</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="bgHsl.h"
                :min="0"
                :max="360"
                :step="1"
                class="hue-slider"
                @update:value="onBgHslChange"
              />
              <n-input-number
                v-model:value="bgHsl.h"
                :min="0"
                :max="360"
                size="small"
                class="channel-input-number"
                @update:value="onBgHslChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.saturation') }}</span>
              <span class="tabular-val">{{ bgHsl.s }}%</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="bgHsl.s"
                :min="0"
                :max="100"
                :step="1"
                @update:value="onBgHslChange"
              />
              <n-input-number
                v-model:value="bgHsl.s"
                :min="0"
                :max="100"
                size="small"
                class="channel-input-number"
                @update:value="onBgHslChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.lightness') }}</span>
              <span class="tabular-val">{{ bgHsl.l }}%</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="bgHsl.l"
                :min="0"
                :max="100"
                :step="1"
                @update:value="onBgHslChange"
              />
              <n-input-number
                v-model:value="bgHsl.l"
                :min="0"
                :max="100"
                size="small"
                class="channel-input-number"
                @update:value="onBgHslChange"
              />
            </div>
          </div>
        </div>

        <!-- Sliders: RGB Mode -->
        <div v-else class="sliders-container">
          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.red') }}</span>
              <span class="tabular-val">{{ bgRgb.r }}</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="bgRgb.r"
                :min="0"
                :max="255"
                :step="1"
                @update:value="onBgRgbChange"
              />
              <n-input-number
                v-model:value="bgRgb.r"
                :min="0"
                :max="255"
                size="small"
                class="channel-input-number"
                @update:value="onBgRgbChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.green') }}</span>
              <span class="tabular-val">{{ bgRgb.g }}</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="bgRgb.g"
                :min="0"
                :max="255"
                :step="1"
                @update:value="onBgRgbChange"
              />
              <n-input-number
                v-model:value="bgRgb.g"
                :min="0"
                :max="255"
                size="small"
                class="channel-input-number"
                @update:value="onBgRgbChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.blue') }}</span>
              <span class="tabular-val">{{ bgRgb.b }}</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="bgRgb.b"
                :min="0"
                :max="255"
                :step="1"
                @update:value="onBgRgbChange"
              />
              <n-input-number
                v-model:value="bgRgb.b"
                :min="0"
                :max="255"
                size="small"
                class="channel-input-number"
                @update:value="onBgRgbChange"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Foreground Column -->
      <div class="control-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <span class="color-role-indicator" :style="{ backgroundColor: foregroundHex }" />
            <h3 class="panel-title">{{ t('tools.color-contrast-checker.controls.foreground') }}</h3>
          </div>
          <n-radio-group v-model:value="fgMode" size="small">
            <n-radio-button value="hsl">HSL</n-radio-button>
            <n-radio-button value="rgb">RGB</n-radio-button>
          </n-radio-group>
        </div>

        <!-- HEX Input & Color Picker Trigger -->
        <div class="input-tool-row">
          <div class="color-picker-trigger" :style="{ backgroundColor: foregroundHex }">
            <input
              type="color"
              :value="foregroundHex"
              :aria-label="`${t('tools.color-contrast-checker.controls.colorPicker')} (${t('tools.color-contrast-checker.controls.foreground')})`"
              :title="t('tools.color-contrast-checker.controls.colorPicker')"
              class="native-color-input"
              @input="(e: any) => syncForegroundFromHex(e.target.value)"
            />
          </div>

          <n-input
            :value="fgHexInput"
            size="large"
            :placeholder="t('tools.color-contrast-checker.controls.hexPlaceholder')"
            class="hex-text-input"
            @update:value="onFgHexInputChange"
            @blur="onFgHexInputBlur"
          />

          <n-button
            secondary
            size="large"
            :aria-label="`${t('tools.color-contrast-checker.actions.colorCopied')} (${foregroundHex})`"
            :title="foregroundHex"
            @click="copyHex(foregroundHex)"
          >
            <template #icon><n-icon :component="IconCopy" /></template>
          </n-button>

          <n-button
            v-if="isEyeDropperSupported"
            secondary
            size="large"
            :aria-label="t('tools.color-contrast-checker.controls.eyedropper')"
            :title="t('tools.color-contrast-checker.controls.eyedropper')"
            @click="pickColorWithEyeDropper('fg')"
          >
            <template #icon><n-icon :component="IconColorPicker" /></template>
          </n-button>
        </div>

        <!-- Sliders: HSL Mode -->
        <div v-if="fgMode === 'hsl'" class="sliders-container">
          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.hue') }}</span>
              <span class="tabular-val">{{ fgHsl.h }}°</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="fgHsl.h"
                :min="0"
                :max="360"
                :step="1"
                class="hue-slider"
                @update:value="onFgHslChange"
              />
              <n-input-number
                v-model:value="fgHsl.h"
                :min="0"
                :max="360"
                size="small"
                class="channel-input-number"
                @update:value="onFgHslChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.saturation') }}</span>
              <span class="tabular-val">{{ fgHsl.s }}%</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="fgHsl.s"
                :min="0"
                :max="100"
                :step="1"
                @update:value="onFgHslChange"
              />
              <n-input-number
                v-model:value="fgHsl.s"
                :min="0"
                :max="100"
                size="small"
                class="channel-input-number"
                @update:value="onFgHslChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.lightness') }}</span>
              <span class="tabular-val">{{ fgHsl.l }}%</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="fgHsl.l"
                :min="0"
                :max="100"
                :step="1"
                @update:value="onFgHslChange"
              />
              <n-input-number
                v-model:value="fgHsl.l"
                :min="0"
                :max="100"
                size="small"
                class="channel-input-number"
                @update:value="onFgHslChange"
              />
            </div>
          </div>
        </div>

        <!-- Sliders: RGB Mode -->
        <div v-else class="sliders-container">
          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.red') }}</span>
              <span class="tabular-val">{{ fgRgb.r }}</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="fgRgb.r"
                :min="0"
                :max="255"
                :step="1"
                @update:value="onFgRgbChange"
              />
              <n-input-number
                v-model:value="fgRgb.r"
                :min="0"
                :max="255"
                size="small"
                class="channel-input-number"
                @update:value="onFgRgbChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.green') }}</span>
              <span class="tabular-val">{{ fgRgb.g }}</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="fgRgb.g"
                :min="0"
                :max="255"
                :step="1"
                @update:value="onFgRgbChange"
              />
              <n-input-number
                v-model:value="fgRgb.g"
                :min="0"
                :max="255"
                size="small"
                class="channel-input-number"
                @update:value="onFgRgbChange"
              />
            </div>
          </div>

          <div class="slider-row">
            <div class="slider-meta">
              <span>{{ t('tools.color-contrast-checker.controls.blue') }}</span>
              <span class="tabular-val">{{ fgRgb.b }}</span>
            </div>
            <div class="slider-with-number">
              <n-slider
                v-model:value="fgRgb.b"
                :min="0"
                :max="255"
                :step="1"
                @update:value="onFgRgbChange"
              />
              <n-input-number
                v-model:value="fgRgb.b"
                :min="0"
                :max="255"
                size="small"
                class="channel-input-number"
                @update:value="onFgRgbChange"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Smart Auto-Fix Suggestions -->
    <section class="suggestions-section">
      <div class="section-header-compact">
        <div class="section-title-with-icon">
          <n-icon :component="IconSparkles" size="20" class="sparkle-icon" />
          <h3 class="section-title">{{ t('tools.color-contrast-checker.suggestions.title') }}</h3>
        </div>
        <p class="section-desc">{{ t('tools.color-contrast-checker.suggestions.subtitle') }}</p>
      </div>

      <!-- If already AAA -->
      <div v-if="wcagEval.aaaNormal" class="success-alert-card">
        <div class="alert-icon-badge">
          <n-icon :component="IconCheck" size="18" />
        </div>
        <div class="alert-texts">
          <h4 class="alert-title">{{ t('tools.color-contrast-checker.suggestions.allPassedTitle') }}</h4>
          <p class="alert-p">{{ t('tools.color-contrast-checker.suggestions.allPassedDesc') }}</p>
        </div>
      </div>

      <!-- If mid-range luminance prevents single-color AAA fix -->
      <div v-else-if="!hasAnySuggestion" class="info-alert-card">
        <div class="info-icon-badge">
          <n-icon :component="IconAlertCircle" size="18" />
        </div>
        <div class="alert-texts">
          <h4 class="alert-title">{{ t('tools.color-contrast-checker.suggestions.noSingleColorFixTitle') }}</h4>
          <p class="alert-p">{{ t('tools.color-contrast-checker.suggestions.noSingleColorFixDesc') }}</p>
        </div>
      </div>

      <!-- Suggestions Grid -->
      <div v-else class="suggestions-cards-grid">
        <!-- Target AA Suggestions -->
        <div v-if="!wcagEval.aaNormal && suggestionsAA.suggestedForeground" class="suggestion-card">
          <div class="card-lead">
            <span class="suggestion-target">{{ t('tools.color-contrast-checker.suggestions.fixForegroundAA') }}</span>
            <n-tag type="info" size="small" round>
              {{ suggestionsAA.fgRatio?.toFixed(1) }}:1
            </n-tag>
          </div>
          <div class="swatch-suggestion-row">
            <div class="color-sample-box" :style="{ backgroundColor: suggestionsAA.suggestedForeground }">
              <span
                class="sample-text"
                :style="{ color: backgroundHex }"
              >Aa</span>
            </div>
            <div class="sample-details">
              <span class="sample-hex">{{ suggestionsAA.suggestedForeground }}</span>
              <span class="sample-sub">{{ t('tools.color-contrast-checker.controls.foreground') }}</span>
            </div>
            <n-button
              type="primary"
              size="medium"
              class="apply-btn"
              @click="applySuggestedFg(suggestionsAA.suggestedForeground)"
            >
              {{ t('tools.color-contrast-checker.suggestions.applySuggestion') }}
            </n-button>
          </div>
        </div>

        <!-- Target AAA Foreground Suggestion -->
        <div v-if="suggestionsAAA.suggestedForeground" class="suggestion-card">
          <div class="card-lead">
            <span class="suggestion-target">{{ t('tools.color-contrast-checker.suggestions.fixForegroundAAA') }}</span>
            <n-tag type="success" size="small" round>
              {{ suggestionsAAA.fgRatio?.toFixed(1) }}:1
            </n-tag>
          </div>
          <div class="swatch-suggestion-row">
            <div class="color-sample-box" :style="{ backgroundColor: suggestionsAAA.suggestedForeground }">
              <span
                class="sample-text"
                :style="{ color: backgroundHex }"
              >Aa</span>
            </div>
            <div class="sample-details">
              <span class="sample-hex">{{ suggestionsAAA.suggestedForeground }}</span>
              <span class="sample-sub">{{ t('tools.color-contrast-checker.controls.foreground') }}</span>
            </div>
            <n-button
              type="primary"
              size="medium"
              class="apply-btn"
              @click="applySuggestedFg(suggestionsAAA.suggestedForeground)"
            >
              {{ t('tools.color-contrast-checker.suggestions.applySuggestion') }}
            </n-button>
          </div>
        </div>

        <!-- Target AA Background Suggestion -->
        <div v-if="!wcagEval.aaNormal && suggestionsAA.suggestedBackground" class="suggestion-card">
          <div class="card-lead">
            <span class="suggestion-target">{{ t('tools.color-contrast-checker.suggestions.fixBackgroundAA') }}</span>
            <n-tag type="info" size="small" round>
              {{ suggestionsAA.bgRatio?.toFixed(1) }}:1
            </n-tag>
          </div>
          <div class="swatch-suggestion-row">
            <div class="color-sample-box" :style="{ backgroundColor: suggestionsAA.suggestedBackground }">
              <span
                class="sample-text"
                :style="{ color: foregroundHex }"
              >Aa</span>
            </div>
            <div class="sample-details">
              <span class="sample-hex">{{ suggestionsAA.suggestedBackground }}</span>
              <span class="sample-sub">{{ t('tools.color-contrast-checker.controls.background') }}</span>
            </div>
            <n-button
              type="primary"
              size="medium"
              class="apply-btn"
              @click="applySuggestedBg(suggestionsAA.suggestedBackground)"
            >
              {{ t('tools.color-contrast-checker.suggestions.applySuggestion') }}
            </n-button>
          </div>
        </div>

        <!-- Target AAA Background Suggestion -->
        <div v-if="suggestionsAAA.suggestedBackground" class="suggestion-card">
          <div class="card-lead">
            <span class="suggestion-target">{{ t('tools.color-contrast-checker.suggestions.fixBackgroundAAA') }}</span>
            <n-tag type="success" size="small" round>
              {{ suggestionsAAA.bgRatio?.toFixed(1) }}:1
            </n-tag>
          </div>
          <div class="swatch-suggestion-row">
            <div class="color-sample-box" :style="{ backgroundColor: suggestionsAAA.suggestedBackground }">
              <span
                class="sample-text"
                :style="{ color: foregroundHex }"
              >Aa</span>
            </div>
            <div class="sample-details">
              <span class="sample-hex">{{ suggestionsAAA.suggestedBackground }}</span>
              <span class="sample-sub">{{ t('tools.color-contrast-checker.controls.background') }}</span>
            </div>
            <n-button
              type="primary"
              size="medium"
              class="apply-btn"
              @click="applySuggestedBg(suggestionsAAA.suggestedBackground)"
            >
              {{ t('tools.color-contrast-checker.suggestions.applySuggestion') }}
            </n-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. Live Copy & UI Components Preview -->
    <section class="preview-section">
      <div class="section-header-compact">
        <h3 class="section-title">{{ t('tools.color-contrast-checker.preview.title') }}</h3>
        <p class="section-desc">{{ t('tools.color-contrast-checker.preview.subtitle') }}</p>
      </div>

      <div
        class="live-preview-stage"
        :style="{
          backgroundColor: backgroundHex,
          color: foregroundHex,
          borderColor: themeVars.borderColor,
        }"
      >
        <!-- Large Text (24px bold) -->
        <div class="stage-block">
          <div class="block-tag-line">
            <span class="block-label">{{ t('tools.color-contrast-checker.preview.largeTitleEditHint') }}</span>
            <span class="block-pass-flag" :class="wcagEval.aaLarge ? 'flag-pass' : 'flag-fail'">
              {{ wcagEval.aaLarge ? t('tools.color-contrast-checker.preview.passAaLarge') : t('tools.color-contrast-checker.preview.failAaLarge') }}
            </span>
          </div>
          <input
            v-model="previewHeading"
            :aria-label="t('tools.color-contrast-checker.preview.largeTitleEditHint')"
            class="live-editable-title"
            :style="{ color: foregroundHex }"
            @input="isHeadingDirty = true"
          />
        </div>

        <!-- Normal Text (16px regular) -->
        <div class="stage-block">
          <div class="block-tag-line">
            <span class="block-label">{{ t('tools.color-contrast-checker.preview.normalBodyEditHint') }}</span>
            <span class="block-pass-flag" :class="wcagEval.aaNormal ? 'flag-pass' : 'flag-fail'">
              {{ wcagEval.aaNormal ? t('tools.color-contrast-checker.preview.passAaNormal') : t('tools.color-contrast-checker.preview.failAaNormal') }}
            </span>
          </div>
          <textarea
            v-model="previewBody"
            rows="3"
            :aria-label="t('tools.color-contrast-checker.preview.normalBodyEditHint')"
            class="live-editable-textarea"
            :style="{ color: foregroundHex }"
            @input="isBodyDirty = true"
          />
        </div>

        <!-- UI Components & Form Elements (3:1 SC 1.4.11) -->
        <div class="stage-block last-stage-block">
          <div class="block-tag-line">
            <span class="block-label">{{ t('tools.color-contrast-checker.preview.componentsTitle') }}</span>
            <span class="block-pass-flag" :class="wcagEval.uiComponents ? 'flag-pass' : 'flag-fail'">
              {{ wcagEval.uiComponents ? t('tools.color-contrast-checker.preview.passUi') : t('tools.color-contrast-checker.preview.failUi') }}
            </span>
          </div>

          <div class="components-preview-row">
            <!-- Primary Solid Button -->
            <button
              type="button"
              class="preview-solid-btn"
              :style="{
                backgroundColor: foregroundHex,
                color: backgroundHex,
              }"
            >
              <n-icon :component="IconCheck" size="18" />
              <span>{{ t('tools.color-contrast-checker.preview.buttonFilled') }}</span>
            </button>

            <!-- Outlined Button -->
            <button
              type="button"
              class="preview-outlined-btn"
              :style="{
                borderColor: foregroundHex,
                color: foregroundHex,
              }"
            >
              <n-icon :component="IconStar" size="18" />
              <span>{{ t('tools.color-contrast-checker.preview.buttonOutlined') }}</span>
            </button>

            <!-- Status Badge -->
            <span
              class="preview-badge-chip"
              :style="{
                borderColor: foregroundHex,
                color: foregroundHex,
              }"
            >
              {{ t('tools.color-contrast-checker.preview.tagBadge') }}
            </span>

            <!-- Sample Input -->
            <div
              class="preview-input-box"
              :style="{
                borderColor: foregroundHex,
                color: foregroundHex,
              }"
            >
              <span class="preview-input-text">{{ t('tools.color-contrast-checker.preview.inputPlaceholder') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contrast-checker-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 1. Score & Grades Banner */
.score-banner {
  border-radius: 16px;
  padding: 32px 28px;
  border: 1px solid transparent;
  transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.poor-contrast-warning {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px 14px;
  border-radius: 8px;
  background-color: #2b251a;
  color: #fff9e8;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

@media (min-width: 960px) {
  .banner-content {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.banner-content.with-backdrop {
  background: rgba(16, 27, 39, 0.92);
  color: #f5eedc !important;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 249, 232, 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.banner-content.with-backdrop .preview-aa-glyph {
  color: #ffb010;
}

.banner-content.with-backdrop .ratio-number {
  color: #fff9e8;
}

.banner-content.with-backdrop .attr-label,
.banner-content.with-backdrop .attr-value {
  color: #f5eedc;
}

.banner-content.with-backdrop .attr-sub {
  color: #c9bda3;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.preview-aa-glyph {
  font-size: 72px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -2px;
  user-select: none;
}

.score-meta-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ratio-heading-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ratio-number {
  font-size: 42px;
  line-height: 1.1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
}

.grade-pill {
  font-weight: 700;
  letter-spacing: 0.5px;
}

.color-attributes-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-attr-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.attr-bullet {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.attr-label {
  font-weight: 600;
}

.attr-value {
  font-family: monospace;
  font-weight: 700;
}

.attr-sub {
  opacity: 0.82;
  font-size: 12px;
}

/* 5 WCAG Level Badges */
.banner-right {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  min-width: 280px;
}

@media (min-width: 600px) and (max-width: 959px) {
  .banner-right {
    grid-template-columns: repeat(2, 1fr);
  }
}

.wcag-badge-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(16, 27, 39, 0.9);
  color: #fff9e8;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 249, 232, 0.22);
  transition: all 0.2s ease;
}

.with-backdrop .wcag-badge-card {
  background: rgba(255, 255, 255, 0.06);
  color: #fff9e8;
}

.badge-pass .badge-status-icon {
  background-color: #15803d;
  color: #ffffff;
}

.badge-fail .badge-status-icon {
  background-color: #b91c1c;
  color: #ffffff;
}

.badge-status-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-texts {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.badge-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-name {
  font-size: 13px;
  font-weight: 700;
}

.badge-status {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-pass .badge-status {
  color: #4ade80;
}

.badge-fail .badge-status {
  color: #f87171;
}

.badge-desc {
  font-size: 11px;
  opacity: 0.78;
}

/* 2. Actions & Swatches Bar */
.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-buttons-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.swatches-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.swatch-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 9999px;
  background-color: var(--n-color, rgba(128, 128, 128, 0.08));
  border: 1px solid var(--n-border-color, rgba(128, 128, 128, 0.2));
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.swatch-pill:hover {
  transform: translateY(-1px);
  border-color: #ffb010;
}

.swatch-pill.active-swatch {
  border-color: #ffb010;
  box-shadow: 0 0 0 2px rgba(255, 176, 16, 0.25);
}

.swatch-circle-preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.split-bg,
.split-fg {
  width: 50%;
  height: 100%;
}

.swatch-label {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
}

.swatch-ratio {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.swatch-delete-btn {
  background: none;
  border: none;
  padding: 2px;
  margin-left: 2px;
  cursor: pointer;
  opacity: 0.55;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: opacity 0.2s;
}

.swatch-delete-btn:hover {
  opacity: 1;
  color: #ef4444;
}

/* 3. Controls Grid */
.controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 860px) {
  .controls-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.control-panel {
  padding: 22px;
  border-radius: 14px;
  background-color: var(--n-color, rgba(128, 128, 128, 0.05));
  border: 1px solid var(--n-border-color, rgba(128, 128, 128, 0.18));
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-role-indicator {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.input-tool-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-picker-trigger {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  cursor: pointer;
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.15);
}

.native-color-input {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 70px;
  height: 70px;
  opacity: 0;
  cursor: pointer;
}

.hex-text-input {
  flex: 1;
  font-family: monospace;
  font-weight: 700;
}

.hex-hash-prefix {
  font-weight: 700;
  opacity: 0.6;
}

.sliders-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slider-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}

.tabular-val {
  font-variant-numeric: tabular-nums;
  font-family: monospace;
}

.slider-with-number {
  display: flex;
  align-items: center;
  gap: 14px;
}

.slider-with-number .n-slider {
  flex: 1;
}

.channel-input-number {
  width: 90px;
}

:deep(.hue-slider .n-slider-rail) {
  background: linear-gradient(
    to right,
    #ff0000 0%,
    #ffff00 17%,
    #00ff00 33%,
    #00ffff 50%,
    #0000ff 67%,
    #ff00ff 83%,
    #ff0000 100%
  ) !important;
  opacity: 0.85;
}

/* 4. Suggestions Section */
.suggestions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sparkle-icon {
  color: #ffb010;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.section-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.75;
}

.success-alert-card,
.info-alert-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  background-color: var(--n-color, rgba(128, 128, 128, 0.06));
  border: 1px solid var(--n-border-color, rgba(128, 128, 128, 0.22));
}

.alert-icon-badge,
.info-icon-badge {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffffff;
}

.alert-icon-badge {
  background-color: #15803d;
}

.info-icon-badge {
  background-color: #17324d;
}

.alert-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.alert-p {
  margin: 0;
  font-size: 13px;
  opacity: 0.88;
}

.suggestions-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 680px) {
  .suggestions-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.suggestion-card {
  padding: 16px 18px;
  border-radius: 12px;
  background-color: var(--n-color, rgba(128, 128, 128, 0.05));
  border: 1px solid var(--n-border-color, rgba(128, 128, 128, 0.18));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-lead {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.suggestion-target {
  font-size: 13px;
  font-weight: 700;
}

.swatch-suggestion-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-sample-box {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.sample-text {
  font-size: 16px;
  font-weight: 800;
}

.sample-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.sample-hex {
  font-family: monospace;
  font-weight: 700;
  font-size: 14px;
}

.sample-sub {
  font-size: 11px;
  opacity: 0.7;
}

.apply-btn {
  flex-shrink: 0;
}

/* 5. Live Preview Section */
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.live-preview-stage {
  padding: 36px 30px;
  border-radius: 16px;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  gap: 28px;
  transition: background-color 0.25s ease, color 0.25s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

.stage-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block-tag-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.82;
}

.block-label {
  font-weight: 600;
}

.block-pass-flag {
  font-weight: 700;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 9999px;
}

.flag-pass {
  background-color: #101b27;
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.flag-fail {
  background-color: #101b27;
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.live-editable-title {
  background: transparent;
  border: none;
  outline: none;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.3;
  padding: 4px 0;
  width: 100%;
}

.live-editable-textarea {
  background: transparent;
  border: 1px dashed rgba(128, 128, 128, 0.25);
  border-radius: 8px;
  outline: none;
  font-size: 16px;
  line-height: 1.6;
  padding: 10px 12px;
  width: 100%;
  resize: vertical;
}

.components-preview-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 6px;
}

.preview-solid-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.preview-solid-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.preview-outlined-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 8px;
  background: transparent;
  border: 2px solid;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.preview-outlined-btn:hover {
  background-color: rgba(128, 128, 128, 0.08);
  transform: translateY(-1px);
}

.preview-badge-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1.5px solid;
  font-size: 13px;
  font-weight: 700;
}

.preview-input-box {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1.5px solid;
  background: rgba(128, 128, 128, 0.05);
  min-width: 200px;
}

.preview-input-text {
  font-size: 13px;
  opacity: 0.75;
}
</style>

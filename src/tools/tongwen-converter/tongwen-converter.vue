<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { NIcon, useMessage } from 'naive-ui';
import {
  ArrowsLeftRight,
  Copy,
  Check,
  Trash,
  ArrowRight,
  ArrowLeft,
  Bolt,
  Clipboard,
} from '@vicons/tabler';

import { convertOpenCC, type OpenCCDirection } from '@/services/opencc.service';
import { useCopy } from '@/composable/copy';
import { translate } from '@/plugins/i18n.plugin';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));
const primaryButtonText = computed(() => (styleStore.isDarkTheme ? '#2B251A' : '#FFF9E8'));

const STORAGE_KEY = 'tongwen-converter-direction';
const direction = useStorage<OpenCCDirection>(STORAGE_KEY, 's2t');

if (direction.value !== 's2t' && direction.value !== 't2s') {
  direction.value = 's2t';
}

const activeTab = ref<'input' | 'output'>('input');
const text = ref('');
const result = ref('');

watch(
  [text, direction],
  ([newText, newDirection]) => {
    if (!newText) {
      result.value = '';
      return;
    }
    result.value = convertOpenCC(newText, newDirection);
  },
  { immediate: true },
);

const { copy: copyResult, isJustCopied } = useCopy({ source: result });
const message = useMessage();

const inputStats = computed(() => {
  const val = text.value;
  const lines = val ? val.split('\n').length : 0;
  const chars = val.length;
  return { lines, chars };
});

const outputStats = computed(() => {
  const val = result.value;
  const lines = val ? val.split('\n').length : 0;
  const chars = val.length;
  return { lines, chars };
});

const inputStatsText = computed(() => {
  return `${inputStats.value.lines.toLocaleString()} ${translate('tools.tongwen-converter.hud.lines')} · ${inputStats.value.chars.toLocaleString()} ${translate('tools.tongwen-converter.hud.chars')}`;
});

const outputStatsText = computed(() => {
  return `${outputStats.value.lines.toLocaleString()} ${translate('tools.tongwen-converter.hud.lines')} · ${outputStats.value.chars.toLocaleString()} ${translate('tools.tongwen-converter.hud.chars')}`;
});

const swapDirection = () => {
  direction.value = direction.value === 's2t' ? 't2s' : 's2t';
  if (text.value) {
    result.value = convertOpenCC(text.value, direction.value);
  }
};

const setDirection = (newDir: OpenCCDirection) => {
  if (direction.value === newDir) {
    return;
  }
  direction.value = newDir;
  if (text.value) {
    result.value = convertOpenCC(text.value, direction.value);
  }
};

const clearAll = () => {
  text.value = '';
  result.value = '';
  activeTab.value = 'input';
};

// 貼上事件：自動轉換並立即切換至結果分頁
function handlePaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text');
  if (pasted) {
    text.value = pasted;
    result.value = convertOpenCC(pasted, direction.value);
    activeTab.value = 'output';
    const toastMsg = direction.value === 's2t'
      ? translate('tools.tongwen-converter.toast.pastedAndSwitchedTraditional')
      : translate('tools.tongwen-converter.toast.pastedAndSwitchedSimplified');
    message?.success?.(toastMsg);
  }
}

async function pasteFromClipboard() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        text.value = clipText;
        result.value = convertOpenCC(clipText, direction.value);
        activeTab.value = 'output';
        const toastMsg = direction.value === 's2t'
          ? translate('tools.tongwen-converter.toast.pastedAndSwitchedTraditional')
          : translate('tools.tongwen-converter.toast.pastedAndSwitchedSimplified');
        message?.success?.(toastMsg);
      }
      else {
        message?.warning?.(translate('tools.tongwen-converter.toast.clipboardEmpty'));
      }
    }
    else {
      message?.warning?.(translate('tools.tongwen-converter.toast.clipboardUnsupported'));
    }
  }
  catch (err) {
    console.error('Failed to read clipboard:', err);
    message?.error?.(translate('tools.tongwen-converter.toast.clipboardError'));
  }
}

function convertAndSwitch() {
  if (!text.value) {
    return;
  }
  result.value = convertOpenCC(text.value, direction.value);
  activeTab.value = 'output';
}

async function convertAndCopy() {
  if (!text.value) {
    return;
  }
  result.value = convertOpenCC(text.value, direction.value);
  const toastMsg = direction.value === 's2t'
    ? translate('tools.tongwen-converter.toast.copiedTraditional')
    : translate('tools.tongwen-converter.toast.copiedSimplified');
  await copyResult(undefined, { notificationMessage: toastMsg });
}

async function handleCopyOutput() {
  if (!result.value) {
    return;
  }
  const toastMsg = direction.value === 's2t'
    ? translate('tools.tongwen-converter.toast.copiedTraditional')
    : translate('tools.tongwen-converter.toast.copiedSimplified');
  await copyResult(undefined, { notificationMessage: toastMsg });
}
</script>

<template>
  <c-card :title="translate('tools.tongwen-converter.title')">
    <!-- 單一統合控制頂列 (2md Unified Header) -->
    <div class="converter-header">
      <!-- 平鋪式方向切換 (Tiled Direction Switcher) -->
      <div class="direction-control">
        <span class="control-label">{{ translate('tools.tongwen-converter.directionLabel') }}</span>
        <div class="segmented-pill-group">
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ active: direction === 's2t' }"
            @click="setDirection('s2t')"
          >
            <span>簡體</span>
            <span class="arrow-glyph">➔</span>
            <span>繁體</span>
          </button>
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ active: direction === 't2s' }"
            @click="setDirection('t2s')"
          >
            <span>繁體</span>
            <span class="arrow-glyph">➔</span>
            <span>簡體</span>
          </button>
        </div>
        <button
          type="button"
          class="icon-action-btn"
          :title="translate('tools.tongwen-converter.buttons.swap')"
          @click="swapDirection"
        >
          <n-icon size="16">
            <ArrowsLeftRight />
          </n-icon>
        </button>
      </div>

      <!-- 視圖切換 (View Switch Tabs) -->
      <div class="view-tabs-control">
        <div class="segmented-pill-group">
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ active: activeTab === 'input' }"
            @click="activeTab = 'input'"
          >
            <span>{{ direction === 's2t' ? '原始文 (簡)' : '原始文 (繁)' }}</span>
            <span v-if="text" class="count-badge font-mono">{{ inputStats.lines }}行</span>
          </button>
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ active: activeTab === 'output' }"
            @click="activeTab = 'output'"
          >
            <span>{{ direction === 's2t' ? '轉換結果 (繁)' : '轉換結果 (簡)' }}</span>
            <span v-if="result" class="check-badge font-bold">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 狀態與快捷動作工具列 (Action Toolbar) -->
    <div class="action-toolbar">
      <!-- 原文狀態工具列 -->
      <div class="toolbar-left">
        <template v-if="activeTab === 'input'">
          <button type="button" class="tool-btn" @click="pasteFromClipboard">
            <n-icon size="15"><Clipboard /></n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.paste') }}</span>
          </button>
          <button type="button" class="tool-btn" :disabled="!text" @click="clearAll">
            <n-icon size="15"><Trash /></n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.clear') }}</span>
          </button>
          <div v-if="text" class="hud-pill font-mono">
            {{ inputStatsText }}
          </div>
        </template>

        <template v-else>
          <button type="button" class="tool-btn" @click="activeTab = 'input'">
            <n-icon size="15"><ArrowLeft /></n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.backToInput') }}</span>
          </button>
          <button type="button" class="tool-btn" @click="clearAll">
            <n-icon size="15"><Trash /></n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.clear') }}</span>
          </button>
          <div v-if="result" class="hud-pill font-mono">
            {{ outputStatsText }}
          </div>
        </template>
      </div>

      <!-- 右側核心動作 -->
      <div class="toolbar-right">
        <template v-if="activeTab === 'input'">
          <button
            type="button"
            class="tool-btn"
            :disabled="!text"
            @click="convertAndCopy"
          >
            <n-icon size="15" :style="{ color: activePalette.saffron }"><Bolt /></n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.convertAndCopy') }}</span>
          </button>

          <button
            type="button"
            class="tool-btn primary"
            :disabled="!text"
            @click="convertAndSwitch"
          >
            <span>{{ translate('tools.tongwen-converter.buttons.convertAndSwitch') }}</span>
            <n-icon size="14"><ArrowRight /></n-icon>
          </button>
        </template>

        <template v-else>
          <button
            type="button"
            class="tool-btn primary highlight-copy"
            :disabled="!result"
            @click="handleCopyOutput"
          >
            <n-icon size="16">
              <Check v-if="isJustCopied" />
              <Copy v-else />
            </n-icon>
            <span>{{ isJustCopied ? translate('tools.tongwen-converter.buttons.copied') : translate('tools.tongwen-converter.buttons.copy') }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 內容展示區 -->
    <div v-show="activeTab === 'input'">
      <c-input-text
        v-model:value="text"
        :placeholder="translate('tools.tongwen-converter.placeholder')"
        multiline
        raw-text
        :rows="14"
        class="converter-textarea"
        @paste="handlePaste"
      />
    </div>

    <div v-show="activeTab === 'output'">
      <c-input-text
        v-model:value="result"
        multiline
        raw-text
        readonly
        :rows="14"
        class="converter-textarea"
        :placeholder="translate('tools.tongwen-converter.placeholderOutput')"
      />
    </div>

    <p class="note-text">
      {{ translate('tools.tongwen-converter.note') }}
    </p>
  </c-card>
</template>

<style scoped>
.converter-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid v-bind('activePalette.border');
}

.direction-control,
.view-tabs-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 1.05rem;
  font-weight: 700;
  color: v-bind('activePalette.textMuted');
  font-family: inherit;
}

/* 2md Segmented Pill Group */
.segmented-pill-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: v-bind('activePalette.surfaceMuted');
  border: 1.5px solid v-bind('activePalette.border');
  border-radius: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.segmented-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: v-bind('activePalette.textMuted');
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 650;
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
}

.segmented-pill-btn:hover {
  color: v-bind('activePalette.heading');
}

.segmented-pill-btn.active {
  background: v-bind('activePalette.button');
  color: v-bind('primaryButtonText');
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.arrow-glyph {
  opacity: 0.75;
  font-size: 14px;
}

.count-badge {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.12);
  color: inherit;
}

.check-badge {
  color: #10b981;
  font-size: 16px;
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px;
  border-radius: 10px;
  border: 1.5px solid v-bind('activePalette.border');
  background: v-bind('activePalette.surface');
  color: v-bind('activePalette.textMuted');
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-action-btn:hover {
  background: v-bind('activePalette.surfaceMuted');
  color: v-bind('activePalette.heading');
  border-color: v-bind('activePalette.button');
}

/* Action Toolbar */
.action-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  border: 1.5px solid v-bind('activePalette.border');
  background: v-bind('activePalette.surface');
  color: v-bind('activePalette.text');
  font-size: 1.05rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.tool-btn:hover:not(:disabled) {
  background: v-bind('activePalette.surfaceMuted');
  border-color: v-bind('activePalette.button');
}

.tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-btn.primary {
  background: v-bind('activePalette.button');
  color: v-bind('primaryButtonText');
  border-color: v-bind('activePalette.button');
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.tool-btn.primary:hover:not(:disabled) {
  background: v-bind('activePalette.buttonHover');
  border-color: v-bind('activePalette.buttonHover');
}

.tool-btn.highlight-copy {
  padding: 9px 24px;
  font-size: 1.15rem;
  font-weight: 750;
}

/* HUD pill */
.hud-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 650;
  color: v-bind('activePalette.textMuted');
  background: v-bind('activePalette.surfaceMuted');
  border: 1.5px solid v-bind('activePalette.border');
  font-variant-numeric: tabular-nums;
  user-select: none;
}

/* Textarea override to perfectly match 2md */
.converter-textarea :deep(.input-wrapper) {
  min-height: 340px;
  max-height: 55vh;
  border-radius: 12px !important;
  border: 1.5px solid v-bind('activePalette.border') !important;
  background: v-bind('activePalette.surface') !important;
  transition: border-color 0.2s ease;
}

.converter-textarea :deep(.input-wrapper:focus-within) {
  border-color: v-bind('activePalette.button') !important;
  outline: 2px solid v-bind('activePalette.button') !important;
  outline-offset: -1px;
}

.converter-textarea :deep(textarea) {
  min-height: 340px;
  max-height: 55vh;
  overflow-y: auto !important;
  line-height: 1.75;
  font-family: 'JetBrains Mono', 'Maple Mono', 'Gen Jyuu Gothic', 'Noto Sans TC', sans-serif !important;
  font-size: 1.05rem;
  color: v-bind('activePalette.text') !important;
  padding: 14px 10px !important;
}

.converter-textarea :deep(textarea::placeholder) {
  color: v-bind('activePalette.textMuted');
  font-size: 1.05rem;
  opacity: 0.85;
}

.note-text {
  margin-top: 18px;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.75;
  color: v-bind('activePalette.text');
}
</style>

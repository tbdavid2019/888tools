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
    <!-- 單一統合控制頂列 (Unified Header Bar) -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/60 dark:border-zinc-700/60">
      <!-- 平鋪式方向選擇 (Tiled Direction Segmented Buttons) -->
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-medium text-slate-500 dark:text-zinc-400 mr-1">
          {{ translate('tools.tongwen-converter.directionLabel') }}:
        </span>
        <div class="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border-0"
            :class="direction === 's2t'
              ? 'bg-amber-500 text-white font-semibold shadow-sm'
              : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
            @click="setDirection('s2t')"
          >
            <span>簡體</span>
            <span class="opacity-70">➔</span>
            <span>繁體</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border-0"
            :class="direction === 't2s'
              ? 'bg-amber-500 text-white font-semibold shadow-sm'
              : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
            @click="setDirection('t2s')"
          >
            <span>繁體</span>
            <span class="opacity-70">➔</span>
            <span>簡體</span>
          </button>
        </div>
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition cursor-pointer flex items-center justify-center"
          :title="translate('tools.tongwen-converter.buttons.swap')"
          @click="swapDirection"
        >
          <n-icon class="text-sm">
            <ArrowsLeftRight />
          </n-icon>
        </button>
      </div>

      <!-- 視圖分頁切換 (View Switch Tabs) -->
      <div class="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700">
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border-0"
          :class="activeTab === 'input'
            ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white font-semibold shadow-sm'
            : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
          @click="activeTab = 'input'"
        >
          <span>{{ direction === 's2t' ? '原始文 (簡)' : '原始文 (繁)' }}</span>
          <span v-if="text" class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-zinc-600 text-slate-700 dark:text-zinc-200 font-mono">
            {{ inputStats.lines }}行
          </span>
        </button>

        <button
          type="button"
          class="px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border-0"
          :class="activeTab === 'output'
            ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white font-semibold shadow-sm'
            : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
          @click="activeTab = 'output'"
        >
          <span>{{ direction === 's2t' ? '轉換結果 (繁)' : '轉換結果 (簡)' }}</span>
          <span v-if="result" class="text-emerald-500 font-bold text-xs">✓</span>
        </button>
      </div>
    </div>

    <!-- 狀態與快捷動作工具列 (Action Toolbar) -->
    <div class="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
      <!-- 原文狀態工具列 -->
      <template v-if="activeTab === 'input'">
        <div class="flex flex-wrap items-center gap-2">
          <c-button secondary size="small" @click="pasteFromClipboard">
            <n-icon class="mr-1 text-sm">
              <Clipboard />
            </n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.paste') }}</span>
          </c-button>

          <c-button secondary size="small" :disabled="!text" @click="clearAll">
            <n-icon class="mr-1 text-sm">
              <Trash />
            </n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.clear') }}</span>
          </c-button>

          <!-- 即時 HUD -->
          <div
            v-if="text"
            class="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono flex items-center border border-slate-200/60 dark:border-zinc-700/60"
          >
            {{ inputStatsText }}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <c-button secondary size="small" :disabled="!text" @click="convertAndCopy">
            <n-icon class="mr-1 text-amber-500">
              <Bolt />
            </n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.convertAndCopy') }}</span>
          </c-button>

          <c-button type="primary" size="small" :disabled="!text" @click="convertAndSwitch">
            <span>{{ translate('tools.tongwen-converter.buttons.convertAndSwitch') }}</span>
            <n-icon class="ml-1 text-xs">
              <ArrowRight />
            </n-icon>
          </c-button>
        </div>
      </template>

      <!-- 結果狀態工具列 -->
      <template v-else>
        <div class="flex flex-wrap items-center gap-2">
          <c-button secondary size="small" @click="activeTab = 'input'">
            <n-icon class="mr-1 text-sm">
              <ArrowLeft />
            </n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.backToInput') }}</span>
          </c-button>

          <c-button secondary size="small" @click="clearAll">
            <n-icon class="mr-1 text-sm">
              <Trash />
            </n-icon>
            <span>{{ translate('tools.tongwen-converter.buttons.clear') }}</span>
          </c-button>

          <!-- 即時 HUD -->
          <div
            v-if="result"
            class="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono flex items-center border border-slate-200/60 dark:border-zinc-700/60"
          >
            {{ outputStatsText }}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <c-button
            type="primary"
            size="small"
            :disabled="!result"
            class="font-medium !px-4"
            @click="handleCopyOutput"
          >
            <n-icon class="mr-1 text-base">
              <Check v-if="isJustCopied" />
              <Copy v-else />
            </n-icon>
            <span>{{ isJustCopied ? translate('tools.tongwen-converter.buttons.copied') : translate('tools.tongwen-converter.buttons.copy') }}</span>
          </c-button>
        </div>
      </template>
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

    <p mt-3 text-xs text-secondary opacity-80>
      {{ translate('tools.tongwen-converter.note') }}
    </p>
  </c-card>
</template>

<style scoped>
.converter-textarea :deep(.input-wrapper) {
  min-height: 320px;
  max-height: 55vh;
  align-items: stretch;
}

.converter-textarea :deep(textarea) {
  min-height: 320px;
  max-height: 55vh;
  overflow-y: auto !important;
  line-height: 1.6;
  font-family: inherit;
  font-size: 14px;
}
</style>

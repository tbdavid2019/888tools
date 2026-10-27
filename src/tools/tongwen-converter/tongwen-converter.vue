<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { NTabs, NTabPane, NIcon, useMessage } from 'naive-ui';
import {
  ArrowsLeftRight,
  Copy,
  Check,
  Trash,
  ArrowRight,
  ArrowLeft,
  Bolt,
  Clipboard,
  Rocket,
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

const directionOptions = computed(() => [
  { label: translate('tools.tongwen-converter.directions.s2t'), value: 's2t' as const },
  { label: translate('tools.tongwen-converter.directions.t2s'), value: 't2s' as const },
]);

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

const inputTabTitle = computed(() => {
  const base = direction.value === 's2t'
    ? translate('tools.tongwen-converter.tabs.sourceSimplified')
    : translate('tools.tongwen-converter.tabs.sourceTraditional');

  if (text.value) {
    return `${base} (${text.value.length.toLocaleString()})`;
  }
  return base;
});

const outputTabTitle = computed(() => {
  const base = direction.value === 's2t'
    ? translate('tools.tongwen-converter.tabs.targetTraditional')
    : translate('tools.tongwen-converter.tabs.targetSimplified');

  if (result.value) {
    return `${base} ✓`;
  }
  return base;
});

const inputStatsText = computed(() => {
  return `${inputStats.value.lines.toLocaleString()} ${translate('tools.tongwen-converter.hud.lines')} · ${inputStats.value.chars.toLocaleString()} ${translate('tools.tongwen-converter.hud.chars')}`;
});

const outputStatsText = computed(() => {
  return `${outputStats.value.lines.toLocaleString()} ${translate('tools.tongwen-converter.hud.lines')} · ${outputStats.value.chars.toLocaleString()} ${translate('tools.tongwen-converter.hud.chars')}`;
});

const swapDirection = () => {
  direction.value = direction.value === 's2t' ? 't2s' : 's2t';
};

const clearAll = () => {
  text.value = '';
  result.value = '';
};

async function pasteFromClipboard() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        text.value = clipText;
        message?.success?.(translate('tools.tongwen-converter.toast.pastedSuccess'));
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
  const toastMsg = translate('tools.tongwen-converter.toast.copiedResult');
  await copyResult(undefined, { notificationMessage: toastMsg });
}
</script>

<template>
  <c-card :title="translate('tools.tongwen-converter.title')">
    <!-- 頂部：轉換方向與切換按鈕 -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2">
        <c-select
          v-model:value="direction"
          :options="directionOptions"
          :label="translate('tools.tongwen-converter.directionLabel')"
          class="w-52"
        />
        <c-button secondary @click="swapDirection">
          <n-icon class="mr-1 text-base">
            <ArrowsLeftRight />
          </n-icon>
          <span>{{ translate('tools.tongwen-converter.buttons.swap') }}</span>
        </c-button>
      </div>
    </div>

    <!-- 雙分頁架構 (Two-Tab Flow) -->
    <n-tabs v-model:value="activeTab" type="segment" animated class="mb-3">
      <!-- 分頁 1: 原文 (Input) -->
      <n-tab-pane name="input" :tab="inputTabTitle">
        <div class="flex flex-col gap-2 pt-2">
          <!-- 工具列 -->
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <!-- 左側動作與即時 HUD -->
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
                class="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono flex items-center border border-slate-200/60 dark:border-zinc-700/60"
              >
                {{ inputStatsText }}
              </div>
            </div>

            <!-- 右側動作 -->
            <div class="flex flex-wrap items-center gap-2 ml-auto">
              <c-button secondary size="small" :disabled="!text" @click="convertAndCopy">
                <n-icon class="mr-1 text-amber-500">
                  <Bolt />
                </n-icon>
                <span>{{ translate('tools.tongwen-converter.buttons.convertAndCopy') }}</span>
              </c-button>

              <c-button type="primary" size="small" :disabled="!text" @click="convertAndSwitch">
                <n-icon class="mr-1">
                  <Rocket />
                </n-icon>
                <span>{{ translate('tools.tongwen-converter.buttons.convertAndSwitch') }}</span>
                <n-icon class="ml-1 text-xs">
                  <ArrowRight />
                </n-icon>
              </c-button>
            </div>
          </div>

          <!-- 輸入框 (受控高度，內部滾動) -->
          <c-input-text
            v-model:value="text"
            :placeholder="translate('tools.tongwen-converter.placeholder')"
            multiline
            raw-text
            :rows="14"
            class="converter-textarea"
          />
        </div>
      </n-tab-pane>

      <!-- 分頁 2: 轉換結果 (Output) -->
      <n-tab-pane name="output" :tab="outputTabTitle">
        <div class="flex flex-col gap-2 pt-2">
          <!-- 工具列 -->
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <!-- 左側返回與即時 HUD -->
            <div class="flex flex-wrap items-center gap-2">
              <c-button secondary size="small" @click="activeTab = 'input'">
                <n-icon class="mr-1 text-sm">
                  <ArrowLeft />
                </n-icon>
                <span>{{ translate('tools.tongwen-converter.buttons.backToInput') }}</span>
              </c-button>

              <!-- 即時 HUD -->
              <div
                class="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono flex items-center border border-slate-200/60 dark:border-zinc-700/60"
              >
                {{ outputStatsText }}
              </div>
            </div>

            <!-- 右側核心動作：複製結果 -->
            <div class="flex flex-wrap items-center gap-2 ml-auto">
              <c-button
                type="primary"
                size="small"
                :disabled="!result"
                class="font-medium"
                @click="handleCopyOutput"
              >
                <n-icon class="mr-1 text-base">
                  <Check v-if="isJustCopied" />
                  <Copy v-else />
                </n-icon>
                <span>{{ isJustCopied ? translate('tools.tongwen-converter.buttons.copied') : translate('tools.tongwen-converter.buttons.copy') }}</span>
              </c-button>
            </div>
          </div>

          <!-- 結果展示框 (唯讀、受控高度，內部滾動) -->
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
      </n-tab-pane>
    </n-tabs>

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

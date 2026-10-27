<script setup lang="ts">
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import { useCommandPaletteStore } from './command-palette.store';
import type { PaletteOption } from './command-palette.types';
import { useAppTheme } from '@/ui/theme/themes';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const props = withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
});

const isModalOpen = ref(false);
const inputRef = ref();
const router = useRouter();
const isMac = computed(() => window.navigator.userAgent.toLowerCase().includes('mac'));
const appTheme = useAppTheme();
const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

const commandPaletteStore = useCommandPaletteStore();
const { searchPrompt, filteredSearchResult } = storeToRefs(commandPaletteStore);

const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.key === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }

    if (e.metaKey && e.key === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }
  },
});

whenever(isModalOpen, () => inputRef.value?.focus());

whenever(keys.ctrl_k, open);
whenever(keys.meta_k, open);
whenever(keys.escape, close);

const selectedOptionIndex = ref(0);
const resultsContainerRef = ref<HTMLElement | null>(null);

const flattenedOptions = computed<PaletteOption[]>(() =>
  _.chain(filteredSearchResult.value).values().flatten().value(),
);

watch(searchPrompt, () => {
  selectedOptionIndex.value = 0;
});

watch(selectedOptionIndex, () => {
  nextTick(() => {
    const activeEl = resultsContainerRef.value?.querySelector('[aria-selected="true"]') as HTMLElement | null;
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  });
});

function open() {
  return isModalOpen.value = true;
}

function close() {
  isModalOpen.value = false;
  searchPrompt.value = '';
}

function handleKeydown(event: KeyboardEvent) {
  const { key } = event;
  const isEnterPressed = key === 'Enter';
  const isArrowUpOrDown = ['ArrowUp', 'ArrowDown'].includes(key);
  const isArrowDown = key === 'ArrowDown';

  if (isArrowUpOrDown) {
    event.preventDefault();
    const increment = isArrowDown ? 1 : -1;
    const maxIndex = Math.max(flattenedOptions.value.length - 1, 0);

    selectedOptionIndex.value = Math.min(Math.max(selectedOptionIndex.value + increment, 0), maxIndex);

    return;
  }

  if (isEnterPressed) {
    const option = flattenedOptions.value[selectedOptionIndex.value];

    activateOption(option);
  }
}

function getOptionIndex(option: PaletteOption) {
  return flattenedOptions.value.indexOf(option);
}

async function activateOption(option?: PaletteOption) {
  if (!option) {
    return;
  }

  const { closeOnSelect } = option;

  if (option.action) {
    option.action();

    if (closeOnSelect) {
      close();
    }

    return;
  }

  const closeAfterNavigation = closeOnSelect || _.isUndefined(closeOnSelect);

  if (option.to) {
    await router.push(option.to);

    if (closeAfterNavigation) {
      close();
    }
    return;
  }

  if (option.href) {
    window.open(option.href, '_blank');

    if (closeAfterNavigation) {
      close();
    }
  }
}
</script>

<template>
  <div :class="props.compact ? 'compact-shell' : 'w-full flex-1'">
    <c-tooltip v-if="props.compact" :tooltip="$t('search.label')" position="right">
      <c-button circle @click="isModalOpen = true">
        <icon-mdi-search />
      </c-button>
    </c-tooltip>

    <c-button v-else w-full important:justify-start @click="isModalOpen = true">
      <span flex items-center gap-3 font-medium :style="{ color: activePalette.text }">

        <icon-mdi-search />
        {{ $t('search.label') }}

        <span hidden flex-1 border border-current rounded border-solid px-5px py-3px sm:inline :style="{ opacity: 0.85 }">
          {{ isMac ? 'Cmd' : 'Ctrl' }}&nbsp;+&nbsp;K
        </span>
      </span>
    </c-button>

    <c-modal
      v-model:open="isModalOpen"
      class="palette-modal"
      :style="{ backgroundColor: appTheme.background, opacity: 1 }"
      shadow-xl
      important:max-w-650px
      important:pa-12px
      @keydown="handleKeydown"
    >
      <c-input-text ref="inputRef" v-model:value="searchPrompt" raw-text placeholder="Type to search a tool or a command..." autofocus clearable />

      <div ref="resultsContainerRef" class="results-container max-h-65vh overflow-y-auto pr-1">
        <div v-for="(options, category) in filteredSearchResult" :key="category">
          <div ml-3 mt-3 text-sm font-bold :style="{ color: styleStore.isDarkTheme ? '#FFB010' : '#17324D' }">
            {{ category }}
          </div>
          <command-palette-option v-for="option in options" :key="option.name" :option="option" :selected="selectedOptionIndex === getOptionIndex(option)" @activated="activateOption" />
        </div>
      </div>
    </c-modal>
  </div>
</template>

<style scoped lang="less">
.compact-shell {
  display: flex;
  justify-content: center;
}

.c-input-text {
  font-size: var(--type-subheading);

  ::v-deep(.input-wrapper) {
      padding: 4px;
      padding-left: 18px;
  }
}

.c-modal--overlay {
  align-items: flex-start !important;
  padding-top: 80px;
}
</style>

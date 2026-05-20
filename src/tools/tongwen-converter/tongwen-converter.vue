<script setup lang="ts">
import { convertOpenCC, type OpenCCDirection } from '@/services/opencc.service';
import { useCopy } from '@/composable/copy';
import { translate } from '@/plugins/i18n.plugin';

const direction = ref<OpenCCDirection>('s2t');
const text = ref('');

const directionOptions = computed(() => [
  { label: translate('tools.tongwen-converter.directions.s2t'), value: 's2t' as const },
  { label: translate('tools.tongwen-converter.directions.t2s'), value: 't2s' as const },
]);

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
const { copy: copyResult } = useCopy({ source: result });

const swapDirection = () => {
  direction.value = direction.value === 's2t' ? 't2s' : 's2t';
};

const clearAll = () => {
  text.value = '';
};
</script>

<template>
  <c-card :title="translate('tools.tongwen-converter.title')">
    <div flex flex-wrap gap-3 items-center>
      <c-select
        v-model:value="direction"
        :options="directionOptions"
        :label="translate('tools.tongwen-converter.directionLabel')"
        w-56
      />
      <c-button tertiary @click="swapDirection">
        {{ translate('tools.tongwen-converter.buttons.swap') }}
      </c-button>
    </div>

    <c-input-text
      v-model:value="text"
      :label="translate('tools.tongwen-converter.inputLabel')"
      :placeholder="translate('tools.tongwen-converter.placeholder')"
      multiline
      autosize
      raw-text
      mt-3
    />

    <c-input-text
      v-model:value="result"
      :label="translate('tools.tongwen-converter.outputLabel')"
      multiline
      autosize
      raw-text
      readonly
      mt-3
    />

    <div mt-3 flex justify-end gap-2>
      <c-button tertiary :disabled="!text" @click="clearAll">
        {{ translate('tools.tongwen-converter.buttons.clear') }}
      </c-button>
      <c-button :disabled="!result" @click="copyResult()">
        {{ translate('tools.tongwen-converter.buttons.copy') }}
      </c-button>
    </div>

    <p mt-3 text-sm text-secondary>
      {{ translate('tools.tongwen-converter.note') }}
    </p>
  </c-card>
</template>

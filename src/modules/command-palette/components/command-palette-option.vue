<script setup lang="ts">
import type { PaletteOption } from '../command-palette.types';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const props = withDefaults(defineProps<{ option: PaletteOption; selected?: boolean }>(), {
  selected: false,
});
const emit = defineEmits(['activated']);
const { option, selected } = toRefs(props);
const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

function activate() {
  // Emit the option itself, rather than the ref returned by toRefs(). This keeps
  // navigation targets intact when the palette is rendered in a nested layout.
  emit('activated', props.option);
}
</script>

<template>
  <div
    role="option"
    :aria-selected="selected"
    class="palette-option w-full flex cursor-pointer items-center overflow-hidden rounded pa-3 transition"
    :class="{ 'is-selected': selected }"
    @click="activate"
  >
    <component :is="option.icon" v-if="option.icon" mr-3 h-30px w-30px shrink-0 class="option-icon" />

    <div flex-1 overflow-hidden>
      <div truncate font-bold lh-tight class="option-name">
        {{ option.name }}
      </div>

      <div v-if="option.description" truncate lh-tight class="option-description">
        {{ option.description }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.palette-option {
  color: v-bind('activePalette.text');
  background: transparent;

  .option-icon {
    color: v-bind('activePalette.textMuted');
  }

  .option-description {
    color: v-bind('activePalette.textMuted');
    margin-top: 3px;
  }

  &:hover,
  &.is-selected {
    background: #FFB010 !important;
    color: #2B251A !important;

    .option-icon,
    .option-name,
    .option-description {
      color: #2B251A !important;
    }
  }
}
</style>

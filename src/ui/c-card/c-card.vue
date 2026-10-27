<script lang="ts" setup>
import { useTheme } from './c-card.theme';
import { useStyleStore } from '@/stores/style.store';

const props = defineProps<{
  title?: string
}>();

const { title } = toRefs(props);

const theme = useTheme();
const styleStore = useStyleStore();
const effectiveOpacity = computed(() => (styleStore.isDarkTheme ? styleStore.cardOpacity : Math.max(styleStore.cardOpacity, 0.92)));

const backgroundColor = computed(() => {
  const opacity = effectiveOpacity.value;
  const color = theme.value.backgroundColor;
  // Replace the alpha value in rgba() string
  return color.replace(/[\d.]+\)$/, `${opacity})`);
});
</script>

<template>
  <div class="c-card">
    <div v-if="title" class="c-card-title">
      {{ title }}
    </div>
    <slot />
  </div>
</template>

<style lang="less" scoped>
.c-card {
  background-color: v-bind('backgroundColor');
  border: 1.5px solid v-bind('theme.borderColor');
  border-radius: 20px;
  padding: 24px;
  font-size: 1.02rem;
  line-height: 1.7;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(79, 58, 14, 0.08);

  &-title {
    font-size: 1.45rem;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 20px;
  }
}
</style>

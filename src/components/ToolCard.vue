<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';

const props = defineProps<{ tool: Tool & { category: string } }>();
const { tool } = toRefs(props);
const theme = useThemeVars();
</script>

<template>
  <router-link :to="tool.path" class="decoration-none">
    <c-card class="tool-card h-full transition transition-duration-0.5s !border-2px !hover:border-primary">
      <div flex items-center justify-between>
        <n-icon class="text-neutral-400 dark:text-neutral-600" size="40" :component="tool.icon" />

        <div flex items-center gap-8px>
          <div
            v-if="tool.isNew"
            class="rounded-full px-8px py-3px text-xs text-white dark:text-neutral-800"
            :style="{
              'background-color': theme.primaryColor,
            }"
          >
            {{ $t('toolCard.new') }}
          </div>

          <FavoriteButton :tool="tool" />
        </div>
      </div>

      <div class="tool-title truncat my-8px">
        {{ tool.name }}
      </div>

      <div class="tool-description line-clamp-2">
        {{ tool.description }}
      </div>
    </c-card>
  </router-link>
</template>

<style scoped lang="less">
.tool-card {
  min-height: 246px;
}

.tool-title {
  color: v-bind('theme.textColor1');
  font-weight: 600;
  font-size: 1.85rem;
  line-height: 1.2;
}

.tool-description {
  color: v-bind('theme.textColor2');
  font-size: 1.02rem;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .tool-card {
    min-height: 220px;
  }

  .tool-title {
    font-size: 1.5rem;
  }

  .tool-description {
    font-size: 0.98rem;
    line-height: 1.6;
  }
}
</style>

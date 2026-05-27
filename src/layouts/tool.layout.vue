<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import type { HeadObject } from '@vueuse/head';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import { useStyleStore } from '@/stores/style.store';
import { warmPalette } from '@/theme/palette';

const route = useRoute();
const toolStore = useToolStore();
const styleStore = useStyleStore();

const layoutBackgroundColor = computed(() => {
  if (!styleStore.isBingWallpaperEnabled) return 'transparent';
  return `rgba(${warmPalette.glassBackgroundRgb}, ${styleStore.cardOpacity})`;
});

const head = computed<HeadObject>(() => ({
  title: `${route.meta.name} - Tool.David888.com`,
  meta: [
    {
      name: 'description',
      content: route.meta?.description as string,
    },
    {
      name: 'keywords',
      content: ((route.meta.keywords ?? []) as string[]).join(','),
    },
  ],
}));
useHead(head);
const { t } = useI18n();

const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));

const currentTool = computed(() => toolStore.tools.find(tool => tool.path === route.path));
const category = computed(() => currentTool.value?.category);
const isWideLayout = computed(() => ['/lyric-player'].includes(route.path));
const contentMaxWidth = computed(() => (isWideLayout.value ? '1180px' : '600px'));
const contentFlexBasis = computed(() => (isWideLayout.value ? '1180px' : '600px'));
</script>

<template>
  <BaseLayout>
    <div class="tool-layout">
      <div class="tool-header" :class="{ 'glass-effect': styleStore.isBingWallpaperEnabled }">
        <div flex flex-nowrap items-center justify-between>
          <n-h1>
            {{ toolTitle }}
          </n-h1>

          <div>
            <FavoriteButton :tool="{ name: route.meta.name, path: route.path } as Tool" />
          </div>
        </div>

        <div class="separator" />

        <div class="description">
          {{ toolDescription }}
        </div>
      </div>
    </div>

    <div class="tool-content" :class="{ 'glass-effect': styleStore.isBingWallpaperEnabled }">
      <slot />
    </div>

    <div v-if="category" class="tool-breadcrumb" :class="{ 'glass-effect': styleStore.isBingWallpaperEnabled }">
      <router-link to="/" class="breadcrumb-link">
        <n-text depth="3">
          {{ category }}
        </n-text>
      </router-link>
      <n-text depth="3" class="breadcrumb-separator">
        >
      </n-text>
      <n-text depth="1">
        {{ toolTitle }}
      </n-text>
    </div>
  </BaseLayout>
</template>

<style lang="less" scoped>
.tool-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  max-width: v-bind('contentMaxWidth');
  margin: 0 auto;
  box-sizing: border-box;

  &.glass-effect {
    background-color: v-bind('layoutBackgroundColor');
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 24px;
    padding: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border: 1px solid v-bind('warmPalette.overlayBorder');
  }

  ::v-deep(& > *) {
    flex: 0 1 v-bind('contentFlexBasis');
  }
}

.tool-layout {
  max-width: v-bind('contentMaxWidth');
  margin: 0 auto;
  box-sizing: border-box;

  .tool-header {
    padding: 40px 30px;
    width: 100%;
    border-radius: 24px;
    transition: background-color 0.3s;

    &.glass-effect {
      background-color: v-bind('layoutBackgroundColor');
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      margin-bottom: 20px;
    }

    .n-h1 {
      opacity: 0.9;
      font-size: 40px;
      font-weight: 400;
      margin: 0;
      line-height: 1;
      color: v-bind('warmPalette.heading');
    }

    .separator {
      width: 200px;
      height: 2px;
      background: v-bind('warmPalette.accent');
      opacity: 0.45;

      margin: 10px 0;
    }

    .description {
      margin: 0;
      opacity: 0.9;
      color: v-bind('warmPalette.text');
    }
  }
}

.tool-breadcrumb {
  margin-top: 64px;
  padding: 20px 32px;
  text-align: center;
  font-size: 14px;
  border-top: 1px solid rgba(128, 128, 128, 0.1);
  border-radius: 24px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;

  &.glass-effect {
    background-color: v-bind('layoutBackgroundColor');
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: v-bind('warmPalette.shadow');
    border-top: none;
    border: 1px solid v-bind('warmPalette.overlayBorder');
  }

  .breadcrumb-link {
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.7;
    }
  }

  .breadcrumb-separator {
    margin: 0 12px;
    opacity: 0.4;
  }
}
</style>

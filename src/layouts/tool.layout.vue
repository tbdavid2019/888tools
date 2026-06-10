<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import type { HeadObject } from '@vueuse/head';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const route = useRoute();
const toolStore = useToolStore();
const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

const layoutBackgroundColor = computed(() => {
  if (!styleStore.isBingWallpaperEnabled) {
    return 'transparent';
  }
  return `rgba(${activePalette.value.glassBackgroundRgb}, ${styleStore.cardOpacity})`;
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
const contentMaxWidth = computed(() => '1180px');
const contentFlexBasis = computed(() => '520px');
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
  width: 100%;
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
    border: 1px solid v-bind('activePalette.overlayBorder');
  }

  ::v-deep(& > *) {
    flex: 0 1 v-bind('contentFlexBasis');
  }
}

.tool-layout {
  width: 100%;
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
      color: v-bind('activePalette.heading');
    }

    .separator {
      width: 200px;
      height: 2px;
      background: v-bind('activePalette.accent');
      opacity: 0.45;

      margin: 10px 0;
    }

    .description {
      margin: 0;
      opacity: 0.9;
      color: v-bind('activePalette.text');
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
    box-shadow: v-bind('activePalette.shadow');
    border-top: none;
    border: 1px solid v-bind('activePalette.overlayBorder');
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

@media (max-width: 700px) {
  .tool-content {
    gap: 12px;

    &.glass-effect {
      padding: 18px;
      border-radius: 20px;
    }

    ::v-deep(& > *) {
      flex-basis: 100%;
      min-width: 0;
    }
  }

  .tool-layout .tool-header {
    padding: 28px 20px;

    .n-h1 {
      font-size: 32px;
      line-height: 1.1;
    }

    .separator {
      width: 120px;
    }
  }

  .tool-breadcrumb {
    margin-top: 32px;
    padding: 14px 18px;
    max-width: 100%;
  }
}
</style>

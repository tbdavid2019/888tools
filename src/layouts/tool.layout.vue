<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import type { HeadObject } from '@vueuse/head';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import ToolCard from '@/components/ToolCard.vue';
import type { Tool } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';
import { config } from '@/config';

const route = useRoute();
const toolStore = useToolStore();
const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

onMounted(() => {
  if (route.path) {
    toolStore.addToolToRecent(route.path);
  }
});

watch(() => route.path, (newPath) => {
  if (newPath) {
    toolStore.addToolToRecent(newPath);
  }
});

const layoutBackgroundColor = computed(() => {
  if (!styleStore.isBingWallpaperEnabled) {
    return 'transparent';
  }
  const opacity = styleStore.isDarkTheme ? styleStore.cardOpacity : Math.max(styleStore.cardOpacity, 0.9);
  return `rgba(${activePalette.value.glassBackgroundRgb}, ${opacity})`;
});

const siteTitleSuffix = computed(() => {
  return '888 TOOL';
});

const head = computed<HeadObject>(() => ({
  title: `${route.meta.name} - ${siteTitleSuffix.value}`,
  link: [
    {
      rel: 'canonical',
      href: `${config.app.siteOrigin}${route.path}`,
    },
  ],
  meta: [
    {
      name: 'description',
      content: route.meta?.description as string,
    },
    {
      name: 'keywords',
      content: ((route.meta.keywords ?? []) as string[]).join(','),
    },
    {
      property: 'og:url',
      content: `${config.app.siteOrigin}${route.path}`,
    },
  ],
}));
useHead(head);
const { t } = useI18n();
const { locale } = useI18n();

const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));
const isZh = computed(() => locale.value.startsWith('zh'));
const recommendedTools = computed(() => [...toolStore.tools]
  .filter(tool => tool.path !== route.path)
  .sort(() => Math.random() - 0.5)
  .slice(0, 4));

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

    <section class="recommended-tools" aria-labelledby="recommended-tools-title">
      <div class="recommended-tools-heading">
        <div>
          <h2 id="recommended-tools-title">
            {{ isZh ? '隨機推薦工具' : 'Recommended Tools' }}
          </h2>
          <p>
            {{ isZh ? '再試試這些工具，探索更多可能。' : 'Explore a few more tools you may find useful.' }}
          </p>
        </div>
        <span class="recommended-tools-badge">{{ isZh ? '為你挑選' : 'Picked for you' }}</span>
      </div>

      <div class="recommended-tools-grid">
        <ToolCard v-for="tool in recommendedTools" :key="tool.path" :tool="tool" />
      </div>
    </section>
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

.recommended-tools {
  width: 100%;
  max-width: v-bind('contentMaxWidth');
  margin: 28px auto 0;
  padding: 24px 0 12px;
}

.recommended-tools-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: v-bind('activePalette.heading');
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  p {
    margin: 5px 0 0;
    color: v-bind('activePalette.textMuted');
    font-size: 15px;
  }
}

.recommended-tools-badge {
  flex: 0 0 auto;
  border: 1px solid v-bind('activePalette.overlayBorder');
  border-radius: 999px;
  padding: 6px 12px;
  color: v-bind('activePalette.textMuted');
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.recommended-tools-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.recommended-tools-grid :deep(.tool-card) {
  min-height: 220px;
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

  .recommended-tools {
    margin-top: 20px;
    padding-top: 18px;
  }

  .recommended-tools-heading {
    align-items: flex-start;
    flex-direction: column;

    h2 {
      font-size: 22px;
    }
  }

  .recommended-tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 480px) {
  .recommended-tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>

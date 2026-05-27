<script lang="ts" setup>
import { NIcon } from 'naive-ui';

import { RouterLink } from 'vue-router';
import { Home2, Menu2 } from '@vicons/tabler';

import { storeToRefs } from 'pinia';
import HeroGradient from '../assets/hero-gradient.svg?component';
import MenuLayout from '../components/MenuLayout.vue';
import NavbarButtons from '../components/NavbarButtons.vue';
import AppearanceSettings from '../components/AppearanceSettings.vue';
import { useStyleStore } from '@/stores/style.store';
import { config } from '@/config';
import { warmPalette } from '@/theme/palette';
import type { ToolCategory } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import CollapsibleToolMenu from '@/components/CollapsibleToolMenu.vue';

const styleStore = useStyleStore();

const { t } = useI18n();

const layoutBackgroundColor = computed(() => {
  if (!styleStore.isBingWallpaperEnabled) return 'transparent';
  return `rgba(${warmPalette.glassBackgroundRgb}, ${styleStore.cardOpacity})`;
});

const toolStore = useToolStore();
const { favoriteTools, toolsByCategory } = storeToRefs(toolStore);

const tools = computed<ToolCategory[]>(() => [
  ...(favoriteTools.value.length > 0 ? [{ name: t('tools.categories.favorite-tools'), components: favoriteTools.value }] : []),
  ...toolsByCategory.value,
]);

const allToolsCount = computed(() => {
  return toolsByCategory.value.reduce((acc, category) => acc + category.components.length, 0);
});
</script>

<template>
  <MenuLayout class="menu-layout" :class="{ isSmallScreen: styleStore.isSmallScreen }">
    <template #sider>
      <RouterLink to="/" class="hero-wrapper">
        <HeroGradient class="gradient" />
        <div class="text-wrapper">
          <div class="title">
            888 Tool
          </div>
          <div class="divider" />
          <div class="subtitle">
            {{ $t('home.subtitle') }}
          </div>
        </div>
      </RouterLink>

      <div class="sider-content">
        <div v-if="styleStore.isSmallScreen" flex flex-col items-center>
          <locale-selector w="90%" />

          <div flex justify-center>
            <NavbarButtons />
          </div>
        </div>

        <CollapsibleToolMenu :tools-by-category="tools" />
        
        <div class="tool-count">
          {{ $t('home.availableApps', { count: allToolsCount }) }}
        </div>

        <AppearanceSettings />
      </div>
    </template>

    <template #content>
      <div flex items-center justify-center gap-2 class="navbar-wrapper">
        <c-button
          circle
          variant="text"
          :aria-label="$t('home.toggleMenu')"
          @click="styleStore.isMenuCollapsed = !styleStore.isMenuCollapsed"
        >
          <NIcon size="25" :component="Menu2" />
        </c-button>

        <c-tooltip :tooltip="$t('home.home')" position="bottom">
          <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
            <NIcon size="25" :component="Home2" />
          </c-button>
        </c-tooltip>

        <c-tooltip :tooltip="$t('home.uiLib')" position="bottom">
          <c-button v-if="config.app.env === 'development'" to="/c-lib" circle variant="text" :aria-label="$t('home.uiLib')">
            <icon-mdi:brush-variant text-20px />
          </c-button>
        </c-tooltip>

        <command-palette />

        <locale-selector v-if="!styleStore.isSmallScreen" />

        <div>
          <NavbarButtons v-if="!styleStore.isSmallScreen" />
        </div>
      </div>
      <slot />
    </template>
  </MenuLayout>
</template>

<style lang="less" scoped>
// ::v-deep(.n-layout-scroll-container) {
//     @percent: 4%;
//     @position: 25px;
//     @size: 50px;
//     @color: #eeeeee25;
//     background-image: radial-gradient(@color @percent, transparent @percent),
//         radial-gradient(@color @percent, transparent @percent);
//     background-position: 0 0, @position @position;
//     background-size: @size @size;
// }

.support-button {
  background: rgb(37, 99, 108);
  background: linear-gradient(48deg, rgba(37, 99, 108, 1) 0%, rgba(59, 149, 111, 1) 60%, rgba(20, 160, 88, 1) 100%);
  color: #fff !important;
  transition: padding ease 0.2s !important;

  &:hover {
    color: #fff;
    padding-left: 30px;
    padding-right: 30px;
  }
}

.footer {
  text-align: center;
  color: #838587;
  margin-top: 20px;
  padding: 20px 0;
}

.sider-content {
  padding-top: 160px;
  padding-bottom: 200px;
}

.navbar-wrapper {
  position: relative;
  z-index: 1000;
  padding: 8px 16px;
  border-radius: 24px;
  background-color: v-bind('layoutBackgroundColor');
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  margin: 10px auto 20px;
  width: fit-content;
  border: 1px solid v-bind('warmPalette.overlayBorder');
  box-shadow: v-bind('warmPalette.shadow');
}

.hero-wrapper {
  position: absolute;
  display: block;
  left: 0;
  width: 100%;
  z-index: 10;
  overflow: hidden;

  .gradient {
    margin-top: -65px;
  }

  .text-wrapper {
    position: absolute;
    left: 0;
    width: 100%;
    text-align: center;
    top: 16px;
    color: #fffaf0;
    text-shadow: 0 2px 10px rgba(61, 52, 33, 0.28);

    .title {
      font-size: clamp(16px, 1.5vw, 21px);
      font-weight: 700;
      color: #fffdf7;
      letter-spacing: 0.04em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 12px;
    }

    .divider {
      width: 42px;
      height: 2px;
      border-radius: 4px;
      background-color: rgba(255, 249, 242, 0.92);
      margin: 0 auto 5px;
    }

    .subtitle {
      font-size: 12px;
      line-height: 1.35;
      color: rgba(255, 249, 242, 0.96);
      padding: 0 16px;
    }
  }
}

.tool-count {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: v-bind('warmPalette.textMuted');
  padding-bottom: 20px;
}
</style>

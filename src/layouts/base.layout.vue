<script lang="ts" setup>
import { NIcon } from 'naive-ui';

import { RouterLink } from 'vue-router';
import { Home2, LayoutSidebarLeftCollapse, LayoutSidebarLeftExpand } from '@vicons/tabler';

import { storeToRefs } from 'pinia';
import MenuLayout from '../components/MenuLayout.vue';
import NavbarButtons from '../components/NavbarButtons.vue';
import AppearanceSettings from '../components/AppearanceSettings.vue';
import { useStyleStore } from '@/stores/style.store';
import { config } from '@/config';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';
import type { ToolCategory } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import CollapsibleToolMenu from '@/components/CollapsibleToolMenu.vue';

const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

const { t } = useI18n();

const layoutBackgroundColor = computed(() => {
  if (!styleStore.isBingWallpaperEnabled) {
    return 'transparent';
  }
  return `rgba(${activePalette.value.glassBackgroundRgb}, ${styleStore.cardOpacity})`;
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
  <MenuLayout class="menu-layout" :class="{ isSmallScreen: styleStore.isSmallScreen, isCollapsed: styleStore.isMenuCollapsed }">
    <template #sider>
      <div class="sider-header">
        <RouterLink to="/" class="hero-wrapper" :class="{ collapsed: styleStore.isMenuCollapsed }">
          <div class="text-wrapper">
            <div v-if="!styleStore.isMenuCollapsed" class="eyebrow">
              Workspace
            </div>
            <div class="title">
              {{ styleStore.isMenuCollapsed ? '888' : '888 Tool' }}
            </div>
            <div v-if="!styleStore.isMenuCollapsed" class="subtitle">
              {{ $t('home.subtitle') }}
            </div>
          </div>
        </RouterLink>

        <c-tooltip
          :tooltip="styleStore.isMenuCollapsed ? $t('home.toggleMenu') : $t('home.toggleMenu')"
          position="right"
        >
          <c-button
            class="sider-toggle"
            circle
            variant="text"
            :aria-label="$t('home.toggleMenu')"
            @click="styleStore.isMenuCollapsed = !styleStore.isMenuCollapsed"
          >
            <NIcon size="20" :component="styleStore.isMenuCollapsed ? LayoutSidebarLeftExpand : LayoutSidebarLeftCollapse" />
          </c-button>
        </c-tooltip>
      </div>

      <div class="sider-content" :class="{ collapsed: styleStore.isMenuCollapsed }">
        <div v-if="styleStore.isSmallScreen && !styleStore.isMenuCollapsed" flex flex-col items-center>
          <locale-selector w="90%" />

          <div flex justify-center>
            <NavbarButtons />
          </div>
        </div>

        <CollapsibleToolMenu :tools-by-category="tools" />

        <div v-if="!styleStore.isMenuCollapsed" class="tool-count">
          {{ $t('home.availableApps', { count: allToolsCount }) }}
        </div>

        <AppearanceSettings />
      </div>
    </template>

    <template #content>
      <div flex items-center justify-center gap-2 class="navbar-wrapper">
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
  padding: 112px 14px 28px;

  &.collapsed {
    padding: 104px 8px 20px;
  }
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
  box-shadow: v-bind('activePalette.shadow');
  border: 1px solid v-bind('activePalette.overlayBorder');
}

.hero-wrapper {
  position: absolute;
  display: block;
  left: 16px;
  right: 32px;
  top: 14px;
  z-index: 10;
  min-height: 72px;
  text-decoration: none;

  &.collapsed {
    left: 8px;
    right: 28px;
    min-height: 64px;

    .text-wrapper {
      align-items: center;
      text-align: center;
      padding: 2px 4px;
    }

    .title {
      font-size: 16px;
      letter-spacing: 0.08em;
    }
  }

  .text-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 0;
    color: #fffaf0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);

    .eyebrow {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(255, 249, 242, 0.8);
    }

    .title {
      font-size: clamp(17px, 1.35vw, 22px);
      font-weight: 800;
      color: #fffdf7;
      letter-spacing: 0.03em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .subtitle {
      max-width: 16ch;
      font-size: 12px;
      line-height: 1.4;
      color: rgba(255, 249, 242, 0.94);
    }
  }
}

.tool-count {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: v-bind('activePalette.textMuted');
  padding: 8px 8px 18px;
}

.sider-header {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 94px;
}

.sider-toggle {
  position: absolute;
  top: 22px;
  right: -14px;
  z-index: 30;
  color: rgba(255, 249, 242, 0.94);
  background: rgba(20, 28, 30, 0.78);
  backdrop-filter: blur(8px);
  border: 1px solid v-bind('activePalette.overlayBorder');
  box-shadow: v-bind('activePalette.shadow');
}

@media (max-width: 900px) {
  .sider-content {
    padding-top: 116px;

    &.collapsed {
      padding-top: 108px;
    }
  }
}
</style>

<script lang="ts" setup>
import { NIcon } from 'naive-ui';

import { RouterLink } from 'vue-router';
import { Home2, LayoutSidebarLeftCollapse, LayoutSidebarLeftExpand, Menu2 } from '@vicons/tabler';

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
  const opacity = styleStore.isDarkTheme ? styleStore.cardOpacity : Math.max(styleStore.cardOpacity, 0.9);
  return `rgba(${activePalette.value.glassBackgroundRgb}, ${opacity})`;
});

const toolStore = useToolStore();
const { favoriteTools, toolsByCategory, tools: allTools } = storeToRefs(toolStore);
const route = useRoute();

const tools = computed<ToolCategory[]>(() => [
  ...(favoriteTools.value.length > 0 ? [{ name: t('tools.categories.favorite-tools'), components: favoriteTools.value }] : []),
  ...toolsByCategory.value,
]);

const allToolsCount = computed(() => {
  return toolsByCategory.value.reduce((acc, category) => acc + category.components.length, 0);
});

const currentTool = computed(() => allTools.value.find(tool => tool.path === route.path));
const breadcrumbItems = computed(() => {
  if (!route.meta?.isTool) {
    return [
      { label: t('home.home'), to: '/' },
      { label: t('home.categories.allTools') },
    ];
  }

  return [
    { label: t('home.home'), to: '/' },
    { label: currentTool.value?.category ?? '' },
    { label: currentTool.value?.name ?? String(route.meta.name ?? '') },
  ].filter(item => item.label);
});
</script>

<template>
  <MenuLayout class="menu-layout" :class="{ isSmallScreen: styleStore.isSmallScreen, isCollapsed: styleStore.isMenuCollapsed }">
    <template #sider>
      <div class="sider-container">
        <c-tooltip
          :tooltip="styleStore.isMenuCollapsed ? $t('home.toggleMenu') : $t('home.toggleMenu')"
          position="right"
          class="sider-toggle-tooltip"
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

        <div class="sider-content" :class="{ collapsed: styleStore.isMenuCollapsed }">
        <div v-if="!styleStore.isMenuCollapsed" class="sider-controls sider-card">
          <div class="sider-controls-row">
            <c-tooltip :tooltip="$t('home.home')" position="bottom">
              <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
                <NIcon size="22" :component="Home2" />
              </c-button>
            </c-tooltip>

            <c-tooltip v-if="config.app.env === 'development'" :tooltip="$t('home.uiLib')" position="bottom">
              <c-button to="/c-lib" circle variant="text" :aria-label="$t('home.uiLib')">
                <icon-mdi:brush-variant text-18px />
              </c-button>
            </c-tooltip>

            <NavbarButtons />
          </div>

          <command-palette />
        </div>

        <div v-else class="sider-controls-collapsed">
          <c-tooltip :tooltip="$t('home.home')" position="right">
            <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
              <NIcon size="20" :component="Home2" />
            </c-button>
          </c-tooltip>

          <c-tooltip v-if="config.app.env === 'development'" :tooltip="$t('home.uiLib')" position="right">
            <c-button to="/c-lib" circle variant="text" :aria-label="$t('home.uiLib')">
              <icon-mdi:brush-variant text-18px />
            </c-button>
          </c-tooltip>

          <command-palette v-if="!styleStore.isSmallScreen" compact />
          <NavbarButtons />
        </div>

        <div v-if="!styleStore.isMenuCollapsed" class="sider-menu-card sider-card">
          <CollapsibleToolMenu :tools-by-category="tools" />
          <div class="tool-count">
            {{ $t('home.availableApps', { count: allToolsCount }) }}
          </div>
        </div>
        <CollapsibleToolMenu v-else :tools-by-category="tools" />

        <AppearanceSettings />
      </div>
      </div>
    </template>

    <template #content>
      <div v-if="styleStore.isSmallScreen && styleStore.isMenuCollapsed" class="mobile-topbar">
        <c-button circle variant="text" :aria-label="$t('home.toggleMenu')" @click="styleStore.isMenuCollapsed = !styleStore.isMenuCollapsed">
          <NIcon size="22" :component="Menu2" />
        </c-button>

        <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
          <NIcon size="22" :component="Home2" />
        </c-button>

        <command-palette compact />

        <NavbarButtons />
      </div>

      <div class="page-breadcrumb">
        <template v-for="(item, index) in breadcrumbItems" :key="`${item.label}-${index}`">
          <router-link v-if="item.to" :to="item.to" class="breadcrumb-link">
            <n-icon v-if="index === 0" size="16" class="breadcrumb-home" :component="Home2" />
            <span>{{ item.label }}</span>
          </router-link>
          <span v-else class="breadcrumb-current">{{ item.label }}</span>

          <span v-if="index < breadcrumbItems.length - 1" class="breadcrumb-separator">/</span>
        </template>
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
  padding: 0 12px 24px;

  &.collapsed {
    padding: 0 6px 20px;
  }
}

.sider-card {
  border-radius: 20px;
  background: v-bind('styleStore.isDarkTheme ? "rgba(42, 42, 55, 0.78)" : "rgba(220, 215, 186, 0.82)"');
  border: 1px solid v-bind('activePalette.border');
  box-shadow: v-bind('activePalette.shadow');
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.sider-controls {
  margin: 0 0 10px;
  padding: 12px;
}

.sider-menu-card {
  margin: 0 0 10px;
  padding: 12px 10px 6px;
}

.sider-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 10px;
}

.sider-controls-collapsed {
  margin: 0 0 10px;
  padding: 10px 6px;
  border-radius: 20px;
  background: v-bind('styleStore.isDarkTheme ? "rgba(42, 42, 55, 0.78)" : "rgba(220, 215, 186, 0.82)"');
  border: 1px solid v-bind('activePalette.border');
  box-shadow: v-bind('activePalette.shadow');
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 1180px;
  margin: 4px auto 18px;
  padding: 10px 16px;
  border-radius: 18px;
  background-color: v-bind('layoutBackgroundColor');
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: v-bind('activePalette.shadow');
  border: 1px solid v-bind('activePalette.overlayBorder');
  color: v-bind('activePalette.textMuted');
  font-size: 16px;
  line-height: 1.4;
}

.mobile-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto 12px;
  padding: 10px 12px;
  border-radius: 18px;
  background-color: v-bind('layoutBackgroundColor');
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: v-bind('activePalette.shadow');
  border: 1px solid v-bind('activePalette.overlayBorder');
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.breadcrumb-home {
  opacity: 0.88;
}

.breadcrumb-current {
  color: v-bind('activePalette.text');
  font-weight: 700;
}

.breadcrumb-separator {
  opacity: 0.45;
}

.tool-count {
  margin-top: 10px;
  text-align: center;
  font-size: 13px;
  color: v-bind('activePalette.textMuted');
  padding: 8px 8px 6px;
  border-top: 1px solid v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"');
}

.sider-container {
  position: relative;
  height: 100%;
}

.sider-toggle-tooltip {
  position: absolute !important;
  top: 14px;
  right: -14px;
  z-index: 50;
}

.sider-toggle {
  color: rgba(255, 249, 242, 0.94);
  background: rgba(20, 28, 30, 0.78);
  backdrop-filter: blur(8px);
  border: 1px solid v-bind('activePalette.overlayBorder');
  box-shadow: v-bind('activePalette.shadow');
}

@media (max-width: 900px) {
  .sider-toggle-tooltip {
    display: none;
  }

  .sider-content {
    padding-top: 6px;

    &.collapsed {
      padding-top: 4px;
    }
  }

  .page-breadcrumb {
    margin-bottom: 14px;
    padding: 10px 12px;
    gap: 8px;
    font-size: 15px;
    overflow-x: auto;
  }
}
</style>

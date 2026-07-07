<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { RouterLink, useRoute } from 'vue-router';
import MenuIconItem from './MenuIconItem.vue';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';
import { useStyleStore } from '@/stores/style.store';
import type { Tool, ToolCategory } from '@/tools/tools.types';

const props = withDefaults(defineProps<{ toolsByCategory?: ToolCategory[] }>(), { toolsByCategory: () => [] });
const { toolsByCategory } = toRefs(props);
const route = useRoute();
const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));
const isMenuCollapsed = computed(() => styleStore.isMenuCollapsed);

const makeLabel = (tool: Tool) => () => h(RouterLink, { to: tool.path }, { default: () => tool.name });
const makeIcon = (tool: Tool) => () => h(MenuIconItem, { tool });

const collapsedCategories = useStorage<Record<string, boolean>>(
  'menu-tool-option:collapsed-categories:v2',
  {},
  undefined,
  {
    deep: true,
    serializer: {
      read: v => (v ? JSON.parse(v) : null),
      write: v => JSON.stringify(v),
    },
  },
);

function toggleCategoryCollapse({ name }: { name: string }) {
  collapsedCategories.value[name] = !collapsedCategories.value[name];
}

const menuOptions = computed(() =>
  toolsByCategory.value.map(({ name, components }) => ({
    name,
    isCollapsed: collapsedCategories.value[name] ?? true,
    tools: components.map(tool => ({
      label: makeLabel(tool),
      icon: makeIcon(tool),
      key: tool.path,
    })),
  })),
);

const collapsedMenuOptions = computed(() =>
  toolsByCategory.value.flatMap(({ components }) =>
    components.map(tool => ({
      label: makeLabel(tool),
      icon: makeIcon(tool),
      key: tool.path,
    })),
  ),
);
</script>

<template>
  <div v-if="isMenuCollapsed" class="collapsed-menu-shell">
    <n-menu
      class="menu collapsed-menu"
      :value="route.path"
      :collapsed="true"
      :collapsed-width="74"
      :collapsed-icon-size="22"
      :options="collapsedMenuOptions"
      :indent="8"
    />
  </div>

  <template v-else>
    <div v-for="{ name, tools, isCollapsed } of menuOptions" :key="name">
      <div class="menu-category" @click="toggleCategoryCollapse({ name })">
        <span :class="{ 'rotate-0': isCollapsed, 'rotate-90': !isCollapsed }" text-16px lh-1 op-50 transition-transform>
          <icon-mdi-chevron-right />
        </span>

        <span class="menu-category-label">
          {{ name }}
        </span>
      </div>

      <n-collapse-transition :show="!isCollapsed">
        <div class="menu-wrapper">
          <div class="toggle-bar" @click="toggleCategoryCollapse({ name })" />

          <n-menu
            class="menu"
            :value="route.path"
            :collapsed-width="74"
            :collapsed-icon-size="22"
            :options="tools"
            :indent="8"
            :default-expand-all="true"
          />
        </div>
      </n-collapse-transition>
    </div>
  </template>
</template>

<style scoped lang="less">
.collapsed-menu-shell {
  padding-top: 8px;
}

.menu-wrapper {
  display: flex;
  flex-direction: row;
  margin-bottom: 8px;

  .menu {
    flex: 1;
    margin-bottom: 5px;

    ::v-deep(.n-menu-item-content-header) {
      font-size: 16px;
      line-height: 1.55;
      font-weight: 550;
    }

    ::v-deep(.n-menu-item-content::before) {
      left: 0;
      right: 13px;
    }

    ::v-deep(.n-menu-item-content) {
      min-height: 38px;
    }
  }

  .toggle-bar {
    width: 24px;
    opacity: 0.1;
    transition: opacity ease 0.2s;
    position: relative;
    cursor: pointer;

    &::before {
      width: 2px;
      height: 100%;
      content: ' ';
      background-color: v-bind('activePalette.textMuted');
      border-radius: 2px;
      position: absolute;
      top: 0;
      left: 14px;
    }

    &:hover {
      opacity: 0.5;
    }
  }
}

.collapsed-menu {
  ::v-deep(.n-menu-item-content) {
    justify-content: center;
  }

  ::v-deep(.n-menu-item-content-header) {
    display: none;
  }

  ::v-deep(.n-menu-item-content__icon) {
    margin-right: 0;
  }
}

.menu-category {
  margin-top: 14px;
  margin-left: 8px;
  display: flex;
  cursor: pointer;
  align-items: center;
  opacity: 0.72;
}

.menu-category-label {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0.02em;
}
</style>

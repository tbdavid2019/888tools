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
const selectedItemTextColor = computed(() => (styleStore.isDarkTheme ? activePalette.value.button : activePalette.value.buttonPressed));
const selectedItemBackground = computed(() => (styleStore.isDarkTheme ? 'rgba(126, 156, 216, 0.18)' : 'rgba(75, 103, 161, 0.18)'));

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
    count: components.length,
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

const activeCategoryName = computed(() =>
  toolsByCategory.value.find(category =>
    category.components.some(tool => tool.path === route.path),
  )?.name,
);

watch(
  [() => route.path, toolsByCategory, activeCategoryName],
  ([, categories, activeName]) => {
    if (!activeName) {
      return;
    }

    collapsedCategories.value = categories.reduce<Record<string, boolean>>((acc, category) => {
      acc[category.name] = category.name !== activeName;
      return acc;
    }, {});
  },
  { immediate: true, deep: true },
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
    <div v-for="{ name, tools, count, isCollapsed } of menuOptions" :key="name" class="category-group">
      <div
        class="menu-category-btn"
        :class="{ 'is-open': !isCollapsed }"
        @click="toggleCategoryCollapse({ name })"
      >
        <div class="category-left">
          <span class="category-chevron" :class="{ 'is-rotated': !isCollapsed }">
            <icon-mdi-chevron-right />
          </span>
          <span class="menu-category-label">{{ name }}</span>
        </div>
        <span class="category-count-pill">{{ count }}</span>
      </div>

      <n-collapse-transition :show="!isCollapsed">
        <div class="menu-items-container">
          <n-menu
            class="modern-menu"
            :value="route.path"
            :collapsed-width="74"
            :collapsed-icon-size="20"
            :options="tools"
            :indent="6"
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

.category-group {
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}

.menu-category-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: v-bind('activePalette.text');
  opacity: 0.85;

  &:hover {
    opacity: 1;
    background: v-bind('styleStore.isDarkTheme ? "rgba(126, 156, 216, 0.12)" : "rgba(75, 103, 161, 0.1)"');
  }

  &.is-open {
    opacity: 1;
  }
}

.category-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-chevron {
  display: inline-flex;
  font-size: 16px;
  line-height: 1;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.6;

  &.is-rotated {
    transform: rotate(90deg);
    opacity: 0.95;
  }
}

.menu-category-label {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.category-count-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  background: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"');
  color: v-bind('activePalette.textMuted');
  line-height: 1.4;
}

.menu-items-container {
  padding-left: 8px;
  margin: 2px 0 6px;

  .modern-menu {
    ::v-deep(.n-menu-item) {
      margin-top: 2px;
      margin-bottom: 2px;
    }

    ::v-deep(.n-menu-item-content) {
      min-height: 38px;
      border-radius: 10px;
      padding-left: 8px !important;
      padding-right: 8px !important;
      transition: all 0.15s ease;

      &::before {
        left: 0;
        right: 0;
        border-radius: 10px;
      }
    }

    ::v-deep(.n-menu-item-content-header) {
      font-size: 14px;
      line-height: 1.45;
      font-weight: 500;
    }

    ::v-deep(.n-menu-item-content--selected) {
      color: v-bind('selectedItemTextColor') !important;
      font-weight: 700;

      &::before {
        background-color: v-bind('selectedItemBackground') !important;
      }

      .n-menu-item-content-header {
        color: v-bind('selectedItemTextColor') !important;
        font-weight: 650;
      }

      .n-menu-item-content__icon {
        color: v-bind('selectedItemTextColor') !important;
      }
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

  ::v-deep(.n-menu-item-content--selected::before) {
    background-color: v-bind('selectedItemBackground') !important;
  }

  ::v-deep(.n-menu-item-content--selected .n-menu-item-content__icon) {
    color: v-bind('selectedItemTextColor') !important;
  }
}
</style>

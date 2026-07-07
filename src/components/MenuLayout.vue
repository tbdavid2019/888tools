<script setup lang="ts">
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isMenuCollapsed, isSmallScreen } = toRefs(styleStore);
const collapsedWidth = computed(() => (isSmallScreen.value ? 0 : 74));
const siderPosition = computed(() => (isSmallScreen.value ? 'absolute' : 'static'));
</script>

<template>
  <n-layout has-sider>
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="collapsedWidth"
      :width="268"
      :collapsed="isMenuCollapsed"
      :show-trigger="false"
      :native-scrollbar="false"
      :position="siderPosition"
      content-style="height: 100%;"
    >
      <slot name="sider" />
    </n-layout-sider>
    <n-layout class="content">
      <div v-if="isSmallScreen && !isMenuCollapsed" class="mobile-overlay" @click="isMenuCollapsed = true" />
      <slot name="content" />
    </n-layout>
  </n-layout>
</template>

<style lang="less" scoped>
.mobile-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.42);
}

.n-layout-sider {
  z-index: 60;
}

.content {
  position: relative;

  ::v-deep(.n-layout-scroll-container) {
    padding: clamp(18px, 2vw, 28px);
  }
}

.n-layout {
  height: 100vh;
}
</style>

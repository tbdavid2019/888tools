<script setup lang="ts">
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isMenuCollapsed } = toRefs(styleStore);
</script>

<template>
  <n-layout has-sider>
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="74"
      :width="268"
      :collapsed="isMenuCollapsed"
      :show-trigger="false"
      :native-scrollbar="false"
      content-style="height: 100%;"
    >
      <slot name="sider" />
    </n-layout-sider>
    <n-layout class="content">
      <slot name="content" />
    </n-layout>
  </n-layout>
</template>

<style lang="less" scoped>
.content {
  ::v-deep(.n-layout-scroll-container) {
    padding: clamp(18px, 2vw, 28px);
  }
}

.n-layout {
  height: 100vh;
}
</style>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { NGlobalStyle, NMessageProvider, NNotificationProvider, darkTheme } from 'naive-ui';
import { darkThemeOverrides, lightThemeOverrides } from './themes';
import { layouts } from './layouts';
import { useStyleStore } from './stores/style.store';
import BingBackground from './components/BingBackground.vue';
import { warmPalette } from './theme/palette';

const route = useRoute();
const layout = computed(() => route?.meta?.layout ?? layouts.base);
const styleStore = useStyleStore();

const theme = computed(() => (styleStore.isDarkTheme ? darkTheme : null));
const themeOverrides = computed(() => (styleStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides));

const { locale } = useI18n();

const layoutBackgroundColor = computed(() => {
  const opacity = styleStore.cardOpacity; // Use raw opacity for better contrast
  return `rgba(${warmPalette.glassBackgroundRgb}, ${opacity})`;
});

syncRef(
  locale,
  useStorage('locale', locale),
);
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <div :class="{ 'with-wallpaper': styleStore.isBingWallpaperEnabled }" style="min-height: 100vh;">
      <NGlobalStyle />
      <BingBackground />
      <NMessageProvider placement="bottom">
        <NNotificationProvider placement="bottom-right">
          <component :is="layout">
            <RouterView />
          </component>
        </NNotificationProvider>
      </NMessageProvider>
    </div>
  </n-config-provider>
</template>

<style>
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
  background-color: transparent !important;
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: transparent !important;
}

* {
  box-sizing: border-box;
}

/* Global overrides for Naive UI layouts when wallpaper is enabled */
.with-wallpaper .n-layout, 
.with-wallpaper .n-layout-scroll-container {
  background-color: transparent !important;
}

.with-wallpaper .n-layout-sider {
  background-color: v-bind('layoutBackgroundColor') !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid rgba(128, 128, 128, 0.2);
}
</style>

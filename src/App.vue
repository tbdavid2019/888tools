<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { NGlobalStyle, NMessageProvider, NNotificationProvider, darkTheme } from 'naive-ui';
import { darkThemeOverrides, lightThemeOverrides } from './themes';
import { layouts } from './layouts';
import { useStyleStore } from './stores/style.store';
import BingBackground from './components/BingBackground.vue';
import PwaInstallPrompt from './components/PwaInstallPrompt.vue';
import PwaUpdatePrompt from './components/PwaUpdatePrompt.vue';
import { kanagawaDarkPalette, kanagawaLightPalette } from './theme/palette';

const route = useRoute();
const layout = computed(() => route?.meta?.layout ?? layouts.base);
const isHomePage = computed(() => route.name === 'home');
const styleStore = useStyleStore();

const theme = computed(() => (styleStore.isDarkTheme ? darkTheme : null));
const themeOverrides = computed(() => (styleStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides));
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));

const { locale } = useI18n();

const layoutBackgroundColor = computed(() => {
  if (!styleStore.isBingWallpaperEnabled) {
    return activePalette.value.background;
  }
  const opacity = styleStore.cardOpacity; // Use raw opacity for better contrast
  return `rgba(${activePalette.value.glassBackgroundRgb}, ${opacity})`;
});

const bodyBackgroundColor = computed(() => (styleStore.isBingWallpaperEnabled ? 'transparent' : activePalette.value.background));

const storedLocale = useStorage('locale', 'zh-TW');
if (storedLocale.value === 'zh') {
  storedLocale.value = 'zh-TW';
}
syncRef(
  locale,
  storedLocale,
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
          <PwaInstallPrompt />
          <PwaUpdatePrompt :is-home-page="isHomePage" />
        </NNotificationProvider>
      </NMessageProvider>
    </div>
  </n-config-provider>
</template>

<style>
:root {
  --type-display: 4.5rem;
  --type-metric-strong: 2.625rem;
  --type-metric: 2.25rem;
  --type-metric-compact: 1.75rem;
  --type-page-title: clamp(2rem, 3.2vw, 2.25rem);
  --type-section-title: 1.5rem;
  --type-card-title: 1.25rem;
  --type-subheading: 1.125rem;
  --type-body: 1rem;
  --type-control: 0.9375rem;
  --type-label: 0.875rem;
  --type-meta: 0.8125rem;
  --type-caption: 0.75rem;
  --leading-body: 1.6;
}

@font-face {
  font-family: 'Maple Mono';
  src: url('/fonts/MapleMono-wght-VF.woff2') format('woff2');
  font-display: swap;
  font-style: normal;
  font-weight: 100 900;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Medium.woff2') format('woff2');
  font-display: swap;
  font-style: normal;
  font-weight: 500;
}

@font-face {
  font-family: 'Gen Jyuu Gothic';
  src: url('/fonts/GenJyuuGothic-Medium.woff2') format('woff2');
  font-display: swap;
  font-style: normal;
  font-weight: 500;
}

body {
  min-height: 100%;
  margin: 0;
  padding: 0;
  background-color: v-bind('bodyBackgroundColor');
  color: v-bind('activePalette.text');
  font-family: 'JetBrains Mono', 'Maple Mono', 'Gen Jyuu Gothic', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  font-size: var(--type-body);
  line-height: var(--leading-body);
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: v-bind('bodyBackgroundColor');
  color: v-bind('activePalette.text');
  font-family: 'JetBrains Mono', 'Maple Mono', 'Gen Jyuu Gothic', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
}

#app,
.n-config-provider {
  font-family: 'JetBrains Mono', 'Maple Mono', 'Gen Jyuu Gothic', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  background-color: v-bind('bodyBackgroundColor');
  color: v-bind('activePalette.text');
}

* {
  box-sizing: border-box;
}

button,
input,
select,
textarea {
  font: inherit;
}

/* Global overrides for Naive UI layouts */
.with-wallpaper .n-layout,
.with-wallpaper .n-layout-scroll-container {
  background-color: transparent !important;
}

.n-layout-sider {
  background-color: v-bind('layoutBackgroundColor') !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid v-bind('activePalette.overlayBorder') !important;
}
</style>

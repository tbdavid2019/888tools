import { useDark, useMediaQuery, useStorage, useToggle } from '@vueuse/core';
import { defineStore } from 'pinia';

export const useStyleStore = defineStore('style', () => {
  const isDarkTheme = useDark({ initialValue: 'light' });
  const toggleDark = useToggle(isDarkTheme);
  const isSmallScreen = useMediaQuery('(max-width: 900px)');
  const desktopMenuCollapsed = useStorage('desktopMenuCollapsed', false);
  const mobileMenuCollapsed = ref(true);
  const isBingWallpaperEnabled = useStorage('isBingWallpaperEnabled:v2', false);
  const cardOpacity = useStorage('cardOpacity', 0.95);

  const isMenuCollapsed = computed({
    get: () => (isSmallScreen.value ? mobileMenuCollapsed.value : desktopMenuCollapsed.value),
    set: (value: boolean) => {
      if (isSmallScreen.value) {
        mobileMenuCollapsed.value = value;
        return;
      }

      desktopMenuCollapsed.value = value;
    },
  });

  watch(isSmallScreen, (smallScreen) => {
    if (smallScreen) {
      mobileMenuCollapsed.value = true;
    }
  });

  return {
    isDarkTheme,
    toggleDark,
    isMenuCollapsed,
    isSmallScreen,
    isBingWallpaperEnabled,
    cardOpacity,
  };
});

import { useDark, useMediaQuery, useStorage, useToggle } from '@vueuse/core';
import { defineStore } from 'pinia';

export const useStyleStore = defineStore('style', () => {
  const isDarkTheme = useDark({ initialValue: 'light' });
  const toggleDark = useToggle(isDarkTheme);
  const isSmallScreen = useMediaQuery('(max-width: 900px)');
  const isMenuCollapsed = useStorage('isMenuCollapsed', isSmallScreen.value);
  const isBingWallpaperEnabled = useStorage('isBingWallpaperEnabled', true);
  const cardOpacity = useStorage('cardOpacity', 0.8);

  return {
    isDarkTheme,
    toggleDark,
    isMenuCollapsed,
    isSmallScreen,
    isBingWallpaperEnabled,
    cardOpacity,
  };
});

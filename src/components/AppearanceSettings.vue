<script setup lang="ts">
import { IconAdjustmentsHorizontal, IconPhoto } from '@tabler/icons-vue';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const styleStore = useStyleStore();
const activePalette = computed(() => (styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette));
</script>

<template>
  <div v-if="!styleStore.isMenuCollapsed" class="appearance-settings">
    <div class="section-title">
      {{ $t('home.settings.title') }}
    </div>
    <div class="setting-item">
      <span class="label">{{ $t('home.settings.wallpaper') }}</span>
      <n-switch v-model:value="styleStore.isBingWallpaperEnabled" size="small" />
    </div>
    <div class="setting-item flex-col">
      <div class="label-row">
        <span class="label">{{ $t('home.settings.cardOpacity') }}</span>
        <span class="value">{{ Math.round(styleStore.cardOpacity * 100) }}%</span>
      </div>
      <n-slider v-model:value="styleStore.cardOpacity" :min="0.1" :max="1" :step="0.01" :tooltip="false" />
    </div>
  </div>

  <div v-else class="appearance-settings-collapsed">
    <c-tooltip :tooltip="$t('home.settings.wallpaper')" position="right">
      <c-button
        circle
        variant="text"
        :aria-label="$t('home.settings.wallpaper')"
        @click="styleStore.isBingWallpaperEnabled = !styleStore.isBingWallpaperEnabled"
      >
        <n-icon size="20" :component="IconPhoto" />
      </c-button>
    </c-tooltip>

    <c-tooltip :tooltip="`${$t('home.settings.cardOpacity')}: ${Math.round(styleStore.cardOpacity * 100)}%`" position="right">
      <div class="opacity-pill">
        <n-icon size="16" :component="IconAdjustmentsHorizontal" />
        <span>{{ Math.round(styleStore.cardOpacity * 100) }}</span>
      </div>
    </c-tooltip>
  </div>
</template>

<style scoped lang="less">
.appearance-settings {
  padding: 18px 16px 20px;
  margin-top: 12px;
  background: v-bind('styleStore.isDarkTheme ? "rgba(42, 42, 55, 0.78)" : "rgba(220, 215, 186, 0.82)"');
  border: 1px solid v-bind('activePalette.border');
  border-radius: 20px;
  box-shadow: v-bind('activePalette.shadow');

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: v-bind('activePalette.heading');
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 12px;

    &.flex-col {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      margin-bottom: 0;
    }
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: 15px;
    color: v-bind('activePalette.text');
  }

  .value {
    font-size: 14px;
    color: v-bind('activePalette.textMuted');
  }
}

.appearance-settings-collapsed {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.opacity-pill {
  width: 42px;
  min-height: 42px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: v-bind('styleStore.isDarkTheme ? "rgba(42, 42, 55, 0.78)" : "rgba(220, 215, 186, 0.82)"');
  border: 1px solid v-bind('activePalette.border');
  box-shadow: v-bind('activePalette.shadow');
  color: v-bind('activePalette.textMuted');
  font-size: 10px;
  font-weight: 700;
}
</style>

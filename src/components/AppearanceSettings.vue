<script setup lang="ts">
import { useStyleStore } from '@/stores/style.store';
import { warmPalette } from '@/theme/palette';

const styleStore = useStyleStore();
</script>

<template>
  <div class="appearance-settings">
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
</template>

<style scoped lang="less">
.appearance-settings {
  padding: 18px 16px 20px;
  margin-top: 12px;
  background: rgba(255, 252, 247, 0.78);
  border: 1px solid v-bind('warmPalette.border');
  border-radius: 20px;
  box-shadow: v-bind('warmPalette.shadow');

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: v-bind('warmPalette.heading');
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
    color: v-bind('warmPalette.text');
  }

  .value {
    font-size: 14px;
    color: v-bind('warmPalette.textMuted');
  }
}
</style>

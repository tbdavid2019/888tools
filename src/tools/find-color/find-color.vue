<script setup lang="ts">
import { ref, computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useMessage, useThemeVars } from 'naive-ui';
import { palettes, type Palette } from './palettes';

const themeVars = useThemeVars();

const { copy } = useClipboard();
const message = useMessage();

const activeRegion = ref('All');
const activeMode = ref('All');

// Default to the first palette (Cloud Dancer - Light)
const selectedPalette = ref<Palette>(palettes[0]);

const regions = ['All', 'Global', 'Western', 'Japanese', 'Taiwan', 'Korean', 'Nordic', 'Mediterranean', 'Middle East'];
const modes = ['All', 'light', 'dark'];

const filteredPalettes = computed(() => {
  return palettes.filter(p => {
    const regionMatch = activeRegion.value === 'All' || p.region === activeRegion.value;
    const modeMatch = activeMode.value === 'All' || p.mode === activeMode.value;
    return regionMatch && modeMatch;
  });
});

const copyColor = async (hex: string, label: string) => {
  await copy(hex);
  message.success(`已複製 ${label} 色碼: ${hex}`);
};

const applyPalette = (palette: Palette) => {
  selectedPalette.value = palette;
  message.success(`已套用配色方案: ${palette.name}`);
};

const mockupStyle = computed(() => {
  const p = selectedPalette.value;
  return {
    backgroundColor: p.colors.background,
    color: p.colors.text,
    '--heading-color': p.colors.heading,
    '--button-bg-color': p.colors.button,
    '--button-text-color': p.colors.background,
    '--accent-color': p.colors.accent,
    '--text-color': p.colors.text,
  };
});
</script>

<template>
  <div class="find-color-container">
    <!-- Filter Section -->
    <div class="filters-card">
      <div class="filter-group">
        <span class="filter-label">地理與文化風格：</span>
        <n-space>
          <n-button
            v-for="region in regions"
            :key="region"
            :type="activeRegion === region ? 'primary' : 'default'"
            size="small"
            secondary
            @click="activeRegion = region"
          >
            {{ region === 'All' ? '全部' : region }}
          </n-button>
        </n-space>
      </div>

      <div class="filter-group" style="margin-top: 12px;">
        <span class="filter-label">亮色/暗色模式：</span>
        <n-space>
          <n-button
            v-for="mode in modes"
            :key="mode"
            :type="activeMode === mode ? 'primary' : 'default'"
            size="small"
            secondary
            @click="activeMode = mode"
          >
            {{ mode === 'All' ? '全部' : mode === 'light' ? '亮色模式' : '暗色模式' }}
          </n-button>
        </n-space>
      </div>
    </div>

    <!-- Main Workspace Layout -->
    <div class="workspace-grid">
      <!-- Left side: Palette List -->
      <div class="palette-list-container">
        <n-grid :cols="1" :y-gap="16" :x-gap="16" responsive="screen" item-responsive>
          <n-grid-item v-for="p in filteredPalettes" :key="p.id">
            <n-card class="palette-card" :segmented="{ content: true }">
              <template #header>
                <div class="card-header-title">
                  <span class="palette-name">{{ p.name }}</span>
                  <div class="badge-row">
                    <n-tag size="small" :type="p.mode === 'light' ? 'warning' : 'info'" round>
                      {{ p.mode === 'light' ? 'Light' : 'Dark' }}
                    </n-tag>
                    <n-tag size="small" type="success" round>
                      {{ p.region }}
                    </n-tag>
                  </div>
                </div>
              </template>

              <!-- Planets Swatches Display -->
              <div class="planets-wrapper">
                <div class="planets-canvas">
                  <!-- Background Planet -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div
                        class="planet planet-bg"
                        :style="{ backgroundColor: p.colors.background, border: '1px solid rgba(0,0,0,0.1)' }"
                        @click="copyColor(p.colors.background, '背景色')"
                      ></div>
                    </template>
                    <span>背景色 (Background): {{ p.colors.background }} - 點擊複製</span>
                  </n-tooltip>

                  <!-- Heading Planet -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div
                        class="planet planet-heading"
                        :style="{ backgroundColor: p.colors.heading }"
                        @click="copyColor(p.colors.heading, '標題文字')"
                      ></div>
                    </template>
                    <span>標題文字 (Heading): {{ p.colors.heading }} - 點擊複製</span>
                  </n-tooltip>

                  <!-- Text Planet -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div
                        class="planet planet-text"
                        :style="{ backgroundColor: p.colors.text }"
                        @click="copyColor(p.colors.text, '內文文字')"
                      ></div>
                    </template>
                    <span>內文文字 (Text): {{ p.colors.text }} - 點擊複製</span>
                  </n-tooltip>

                  <!-- Button Planet -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div
                        class="planet planet-button"
                        :style="{ backgroundColor: p.colors.button }"
                        @click="copyColor(p.colors.button, '主要按鈕')"
                      ></div>
                    </template>
                    <span>主要按鈕 (Button): {{ p.colors.button }} - 點擊複製</span>
                  </n-tooltip>

                  <!-- Accent Planet -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div
                        class="planet planet-accent"
                        :style="{ backgroundColor: p.colors.accent }"
                        @click="copyColor(p.colors.accent, '強調/提示')"
                      ></div>
                    </template>
                    <span>強調色 (Accent): {{ p.colors.accent }} - 點擊複製</span>
                  </n-tooltip>
                </div>
              </div>

              <div class="card-footer">
                <span class="source-tag">來源：{{ p.source }}</span>
                <n-button size="small" type="primary" @click="applyPalette(p)">
                  套用配色預覽
                </n-button>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>
      </div>

      <!-- Right side: Sticky Mockup Preview -->
      <div class="preview-container">
        <div class="sticky-wrapper">
          <div class="preview-header-bar">
            <span>✨ 即時配色套用效果 (網頁模型展示)</span>
            <n-tag type="warning" size="small">{{ selectedPalette.name }}</n-tag>
          </div>

          <div class="mockup-frame" :style="mockupStyle">
            <!-- Simulated Landing Page -->
            <div class="mockup-nav">
              <span class="logo">✦ Aurora Studio</span>
              <div class="links">
                <span>首頁</span>
                <span>案例</span>
                <span>關於我們</span>
              </div>
            </div>

            <div class="mockup-hero">
              <span class="hero-badge">2026 POPULAR DESIGN TREND</span>
              <h1 class="hero-title">Make Your Designs Feel Alive</h1>
              <p class="hero-desc">
                探索 2026 年度最受歡迎的色彩組合。點擊左側的「套用配色預覽」可即時變更此網頁設計模型的配色樣式，協助您評估在真實 UI 中的視覺表現。
              </p>
              <div class="hero-actions">
                <button class="btn btn-primary">立即體驗</button>
                <button class="btn btn-outline">了解更多</button>
              </div>
            </div>

            <div class="mockup-features">
              <div class="feature-card">
                <h3>01 / 簡約視覺美學</h3>
                <p>將色彩的心理感受融入精準的排版比例中，呈現極致高級感。</p>
              </div>
              <div class="feature-card">
                <h3>02 / 無障礙對比度</h3>
                <p>我們精選的色標方案均考量了標題與內文之間的可讀性與對比。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.find-color-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.filters-card {
  background: v-bind('themeVars?.cardColor || "#ffffff"');
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-label {
  font-weight: 500;
  min-width: 130px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 900px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

.palette-list-container {
  max-height: 800px;
  overflow-y: auto;
  padding-right: 8px;
}

.palette-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.palette-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.card-header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
  gap: 8px;
}

.palette-name {
  font-size: 1.1rem;
  font-weight: 600;
}

.badge-row {
  display: flex;
  gap: 6px;
}

.planets-wrapper {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 8px 0;
  border: 1px dashed rgba(0, 0, 0, 0.05);
}

.planets-canvas {
  position: relative;
  width: 240px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.planet {
  position: absolute;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.planet:hover {
  transform: scale(1.15);
  z-index: 10;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.planet-bg {
  width: 90px;
  height: 90px;
  z-index: 1;
}

.planet-heading {
  width: 70px;
  height: 70px;
  left: 20px;
  top: 15px;
  z-index: 2;
}

.planet-text {
  width: 60px;
  height: 60px;
  right: 25px;
  top: 20px;
  z-index: 3;
}

.planet-button {
  width: 50px;
  height: 50px;
  left: 35px;
  bottom: 20px;
  z-index: 4;
}

.planet-accent {
  width: 42px;
  height: 42px;
  right: 35px;
  bottom: 15px;
  z-index: 5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.source-tag {
  font-size: 0.8rem;
  opacity: 0.7;
}

.preview-container {
  position: sticky;
  top: 20px;
}

.sticky-wrapper {
  background: v-bind('themeVars?.cardColor || "#ffffff"');
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
}

.preview-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
}

.mockup-frame {
  border-radius: 8px;
  padding: 24px;
  min-height: 480px;
  transition: background-color 0.4s ease, color 0.4s ease;
  display: flex;
  flex-direction: column;
  gap: 32px;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.mockup-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 12px;
}

.mockup-nav .logo {
  font-weight: 700;
}

.mockup-nav .links {
  display: flex;
  gap: 16px;
  opacity: 0.8;
}

.mockup-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.hero-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}

.hero-title {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--heading-color);
  margin: 0;
}

.hero-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  opacity: 0.9;
  color: var(--text-color);
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  border: none;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--text-color);
  color: var(--text-color);
}

.btn-outline:hover {
  background: rgba(0, 0, 0, 0.02);
}

.mockup-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 20px;
}

.feature-card h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color);
  margin: 0 0 6px 0;
}

.feature-card p {
  font-size: 0.82rem;
  line-height: 1.5;
  opacity: 0.8;
  margin: 0;
}
</style>

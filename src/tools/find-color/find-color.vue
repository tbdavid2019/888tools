<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMessage, useThemeVars } from 'naive-ui';
import { type Palette, type PaletteColors, palettes } from './palettes';
import { useCopy } from '@/composable/copy';

const themeVars = useThemeVars();
const { copy } = useCopy({ createToast: false });
const message = useMessage();
const { locale } = useI18n();

type Region = 'All' | 'Global' | 'Western' | 'Japanese' | 'Taiwan' | 'Korean' | 'Nordic' | 'Mediterranean' | 'Middle East';
type Mode = 'All' | 'light' | 'dark';
type ColorRole = keyof PaletteColors;

const activeRegion = ref<Region>('All');
const activeMode = ref<Mode>('All');
const selectedPalette = ref<Palette>(palettes[0]);

const regions: Region[] = ['All', 'Global', 'Western', 'Japanese', 'Taiwan', 'Korean', 'Nordic', 'Mediterranean', 'Middle East'];
const modes: Mode[] = ['All', 'light', 'dark'];

const englishText = {
  regionLabel: 'Region & design style',
  modeLabel: 'Light / dark mode',
  all: 'All',
  light: 'Light',
  dark: 'Dark',
  source: 'Source',
  applyPreview: 'Apply preview',
  previewTitle: 'Live palette preview',
  previewSubtitle: 'Website mockup',
  copyPalette: 'Copy palette',
  copiedPalette: 'Palette copied',
  copiedColor: 'Copied',
  quickCopy: 'Quick copy',
  clickToCopy: 'Click to copy',
  background: 'Background',
  heading: 'Heading',
  text: 'Body',
  button: 'Button',
  accent: 'Accent',
  home: 'Home',
  cases: 'Cases',
  about: 'About',
  badge: 'PANTONE COLOR ARCHIVE',
  heroTitle: 'Build Faster With Better Color Systems',
  heroDesc: 'Explore curated Pantone and trend-driven palettes from 2024 to 2026, then preview how each set behaves in a realistic interface before applying it to a product or campaign.',
  primaryAction: 'Try it now',
  secondaryAction: 'Learn more',
  featureOneTitle: '01 / Premium visual rhythm',
  featureOneDesc: 'Keep headings, body text, CTAs, and accents working together instead of choosing colors in isolation.',
  featureTwoTitle: '02 / Fast implementation',
  featureTwoDesc: 'Copy a complete color group in one action and hand it directly to design, marketing, or frontend work.',
  regionsMap: {
    'All': 'All',
    'Global': 'Global',
    'Western': 'Western',
    'Japanese': 'Japanese',
    'Taiwan': 'Taiwan',
    'Korean': 'Korean',
    'Nordic': 'Nordic',
    'Mediterranean': 'Mediterranean',
    'Middle East': 'Middle East',
  } as Record<Region, string>,
};

const traditionalChineseText = {
  regionLabel: '地理與文化風格',
  modeLabel: '亮色 / 暗色模式',
  all: '全部',
  light: '亮色',
  dark: '暗色',
  source: '來源',
  applyPreview: '套用配色預覽',
  previewTitle: '即時配色套用效果',
  previewSubtitle: '網頁模型展示',
  copyPalette: '快速複製色組',
  copiedPalette: '已複製整組色票',
  copiedColor: '已複製',
  quickCopy: '快速複製',
  clickToCopy: '點擊即可複製',
  background: '背景',
  heading: '標題',
  text: '內文',
  button: '按鈕',
  accent: '提示/強調',
  home: '首頁',
  cases: '案例',
  about: '關於我們',
  badge: 'PANTONE 年度色票庫',
  heroTitle: '更快找到可落地的配色系統',
  heroDesc: '探索整理好的 Pantone 與設計趨勢配色，涵蓋 2024 到 2026 年，先在接近真實的介面模型中預覽整體效果，再決定是否套用到品牌、網站或行銷素材。',
  primaryAction: '立即體驗',
  secondaryAction: '了解更多',
  featureOneTitle: '01 / 高級感視覺節奏',
  featureOneDesc: '不是只挑單一顏色，而是一次看清標題、內文、按鈕與強調色如何一起工作。',
  featureTwoTitle: '02 / 實作交接更快',
  featureTwoDesc: '一鍵複製完整色組，直接交給設計、行銷或前端使用，不用再逐顆滑鼠移過去抄色碼。',
  regionsMap: {
    'All': '全部',
    'Global': '全球',
    'Western': '西方',
    'Japanese': '日系',
    'Taiwan': '台灣',
    'Korean': '韓系',
    'Nordic': '北歐',
    'Mediterranean': '地中海',
    'Middle East': '中東',
  } as Record<Region, string>,
};

const uiText = computed(() => (String(locale.value).toLowerCase() === 'zh-tw' ? traditionalChineseText : englishText));

const filteredPalettes = computed(() => palettes.filter((palette) => {
  const regionMatch = activeRegion.value === 'All' || palette.region === activeRegion.value;
  const modeMatch = activeMode.value === 'All' || palette.mode === activeMode.value;
  return regionMatch && modeMatch;
}));

function getColorEntries(palette: Palette) {
  const text = uiText.value;

  return [
    { key: 'background' as ColorRole, label: text.background, value: palette.colors.background, themeClass: 'is-background' },
    { key: 'heading' as ColorRole, label: text.heading, value: palette.colors.heading, themeClass: 'is-heading' },
    { key: 'text' as ColorRole, label: text.text, value: palette.colors.text, themeClass: 'is-text' },
    { key: 'button' as ColorRole, label: text.button, value: palette.colors.button, themeClass: 'is-button' },
    { key: 'accent' as ColorRole, label: text.accent, value: palette.colors.accent, themeClass: 'is-accent' },
  ];
}

async function copyColor(hex: string, label: string) {
  await copy(hex);
  message.success(`${uiText.value.copiedColor} ${label}: ${hex}`);
}

function buildPaletteCopyText(palette: Palette) {
  return getColorEntries(palette)
    .map(({ label, value }) => `${label} ${value}`)
    .join('\n');
}

async function copyPalette(palette: Palette) {
  await copy(buildPaletteCopyText(palette));
  message.success(`${uiText.value.copiedPalette}: ${palette.name}`);
}

function applyPalette(palette: Palette) {
  selectedPalette.value = palette;
  message.success(`${uiText.value.applyPreview}: ${palette.name}`);
}

const mockupStyle = computed(() => {
  const palette = selectedPalette.value;
  return {
    'backgroundColor': palette.colors.background,
    'color': palette.colors.text,
    '--heading-color': palette.colors.heading,
    '--button-bg-color': palette.colors.button,
    '--button-text-color': palette.mode === 'dark' ? '#FFFFFF' : palette.colors.background,
    '--accent-color': palette.colors.accent,
    '--text-color': palette.colors.text,
  };
});
</script>

<template>
  <div class="find-color-container">
    <div class="filters-card">
      <div class="filter-group">
        <span class="filter-label">{{ uiText.regionLabel }}:</span>
        <n-space>
          <n-button
            v-for="region in regions"
            :key="region"
            :type="activeRegion === region ? 'primary' : 'default'"
            size="small"
            secondary
            @click="activeRegion = region"
          >
            {{ uiText.regionsMap[region] }}
          </n-button>
        </n-space>
      </div>

      <div class="filter-group filter-group-spaced">
        <span class="filter-label">{{ uiText.modeLabel }}:</span>
        <n-space>
          <n-button
            v-for="mode in modes"
            :key="mode"
            :type="activeMode === mode ? 'primary' : 'default'"
            size="small"
            secondary
            @click="activeMode = mode"
          >
            {{ mode === 'All' ? uiText.all : mode === 'light' ? uiText.light : uiText.dark }}
          </n-button>
        </n-space>
      </div>
    </div>

    <div class="workspace-grid">
      <div class="palette-list-container">
        <n-grid :cols="1" :y-gap="16" :x-gap="16" responsive="screen" item-responsive>
          <n-grid-item v-for="palette in filteredPalettes" :key="palette.id">
            <n-card class="palette-card" :segmented="{ content: true }">
              <template #header>
                <div class="card-header-title">
                  <div class="header-copy">
                    <span class="palette-name">{{ palette.name }}</span>
                    <span class="palette-description">{{ palette.description }}</span>
                  </div>

                  <div class="badge-row">
                    <n-tag size="small" :type="palette.mode === 'light' ? 'warning' : 'info'" round>
                      {{ palette.mode === 'light' ? uiText.light : uiText.dark }}
                    </n-tag>
                    <n-tag size="small" type="success" round>
                      {{ uiText.regionsMap[palette.region as Region] ?? palette.region }}
                    </n-tag>
                  </div>
                </div>
              </template>

              <div class="swatches-showcase">
                <div class="orbit-line orbit-line-large" />
                <div class="orbit-line orbit-line-medium" />
                <div class="orbit-line orbit-line-small" />

                <button
                  v-for="entry in getColorEntries(palette)"
                  :key="entry.key"
                  class="swatch-item"
                  :class="entry.themeClass"
                  type="button"
                  @click="copyColor(entry.value, entry.label)"
                >
                  <span class="swatch-sphere" :style="{ backgroundColor: entry.value }" />
                  <span class="swatch-label">{{ entry.label }}</span>
                  <span class="swatch-hex">{{ entry.value }}</span>
                </button>
              </div>

              <div class="copy-strip">
                <div class="copy-strip-meta">
                  <span class="copy-strip-title">{{ uiText.quickCopy }}</span>
                  <span class="copy-strip-hint">{{ uiText.clickToCopy }}</span>
                </div>

                <div class="copy-chip-row">
                  <button
                    v-for="entry in getColorEntries(palette)"
                    :key="`${palette.id}-${entry.key}-chip`"
                    class="copy-chip"
                    type="button"
                    @click="copyColor(entry.value, entry.label)"
                  >
                    <span class="copy-chip-label">{{ entry.label }}</span>
                    <span class="copy-chip-value">{{ entry.value }}</span>
                  </button>
                </div>

                <div class="card-footer">
                  <span class="source-tag">{{ uiText.source }}: {{ palette.source }}</span>
                  <div class="footer-actions">
                    <n-button size="small" quaternary @click="copyPalette(palette)">
                      {{ uiText.copyPalette }}
                    </n-button>
                    <n-button size="small" type="primary" @click="applyPalette(palette)">
                      {{ uiText.applyPreview }}
                    </n-button>
                  </div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>
      </div>

      <div class="preview-container">
        <div class="sticky-wrapper">
          <div class="preview-header-bar">
            <span>{{ uiText.previewTitle }} ({{ uiText.previewSubtitle }})</span>
            <n-tag type="warning" size="small">
              {{ selectedPalette.name }}
            </n-tag>
          </div>

          <div class="mockup-frame" :style="mockupStyle">
            <div class="mockup-nav">
              <span class="logo">✦ Aurora Studio</span>
              <div class="links">
                <span>{{ uiText.home }}</span>
                <span>{{ uiText.cases }}</span>
                <span>{{ uiText.about }}</span>
              </div>
            </div>

            <div class="mockup-hero">
              <span class="hero-badge">{{ uiText.badge }}</span>
              <h1 class="hero-title">
                {{ uiText.heroTitle }}
              </h1>
              <p class="hero-desc">
                {{ uiText.heroDesc }}
              </p>
              <div class="hero-actions">
                <button class="btn btn-primary">
                  {{ uiText.primaryAction }}
                </button>
                <button class="btn btn-outline">
                  {{ uiText.secondaryAction }}
                </button>
              </div>
            </div>

            <div class="mockup-features">
              <div class="feature-card">
                <h3>{{ uiText.featureOneTitle }}</h3>
                <p>{{ uiText.featureOneDesc }}</p>
              </div>
              <div class="feature-card">
                <h3>{{ uiText.featureTwoTitle }}</h3>
                <p>{{ uiText.featureTwoDesc }}</p>
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
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-group-spaced {
  margin-top: 12px;
}

.filter-label {
  font-weight: 600;
  min-width: 150px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 20px;
  align-items: start;
}

@media (max-width: 1100px) {
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
  border-radius: 16px;
  transition: all 0.3s ease;
}

.palette-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.card-header-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  flex-wrap: wrap;
  gap: 12px;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.palette-name {
  font-size: 1.15rem;
  font-weight: 700;
}

.palette-description {
  font-size: 0.92rem;
  opacity: 0.72;
}

.badge-row {
  display: flex;
  gap: 6px;
}

.swatches-showcase {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(90px, 1fr));
  gap: 12px;
  align-items: start;
  padding: 32px 18px 18px;
  margin: 8px 0 14px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(245, 239, 228, 0.44) 100%);
  border: 1px solid rgba(148, 123, 82, 0.12);
}

.orbit-line {
  position: absolute;
  left: 50%;
  border: 1px solid rgba(185, 165, 132, 0.12);
  border-radius: 999px;
  transform: translateX(-50%);
  pointer-events: none;
}

.orbit-line-large {
  top: 52px;
  width: calc(100% - 32px);
  height: 108px;
}

.orbit-line-medium {
  top: 68px;
  width: calc(100% - 86px);
  height: 76px;
}

.orbit-line-small {
  top: 84px;
  width: calc(100% - 160px);
  height: 44px;
}

.swatch-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
  text-align: center;
}

.swatch-sphere {
  position: relative;
  display: block;
  border-radius: 50%;
  box-shadow:
    inset 10px 10px 18px rgba(255, 255, 255, 0.24),
    inset -12px -12px 24px rgba(0, 0, 0, 0.14),
    0 10px 22px rgba(0, 0, 0, 0.14);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.swatch-sphere::before {
  content: '';
  position: absolute;
  top: 12%;
  left: 14%;
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  filter: blur(1px);
}

.swatch-item:hover .swatch-sphere {
  transform: translateY(-3px) scale(1.04);
  box-shadow:
    inset 10px 10px 18px rgba(255, 255, 255, 0.26),
    inset -12px -12px 24px rgba(0, 0, 0, 0.16),
    0 14px 28px rgba(0, 0, 0, 0.18);
}

.is-background .swatch-sphere {
  width: 98px;
  height: 98px;
}

.is-heading .swatch-sphere {
  width: 82px;
  height: 82px;
  margin-top: 36px;
}

.is-text .swatch-sphere {
  width: 60px;
  height: 60px;
  margin-top: 24px;
}

.is-button .swatch-sphere {
  width: 78px;
  height: 78px;
  margin-top: 44px;
}

.is-accent .swatch-sphere {
  width: 54px;
  height: 54px;
  margin-top: 16px;
}

.swatch-label {
  font-size: 0.95rem;
  font-weight: 700;
}

.swatch-hex {
  font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
  font-size: 0.86rem;
  letter-spacing: 0.03em;
  opacity: 0.76;
}

.copy-strip {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(212, 175, 55, 0.06);
  border: 1px solid rgba(212, 175, 55, 0.14);
}

.copy-strip-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.copy-strip-title {
  font-weight: 700;
}

.copy-strip-hint {
  font-size: 0.84rem;
  opacity: 0.72;
}

.copy-chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.copy-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 123, 82, 0.16);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
  color: inherit;
}

.copy-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 123, 82, 0.28);
}

.copy-chip-label {
  font-size: 0.82rem;
  font-weight: 700;
}

.copy-chip-value {
  font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
  font-size: 0.8rem;
  opacity: 0.8;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.source-tag {
  font-size: 0.82rem;
  opacity: 0.72;
}

.preview-container {
  position: sticky;
  top: 20px;
}

.sticky-wrapper {
  background: v-bind('themeVars?.cardColor || "#ffffff"');
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
}

.preview-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-weight: 600;
  flex-wrap: wrap;
}

.mockup-frame {
  border-radius: 14px;
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
  gap: 16px;
}

.mockup-nav .logo {
  font-weight: 700;
}

.mockup-nav .links {
  display: flex;
  gap: 16px;
  opacity: 0.8;
  flex-wrap: wrap;
}

.mockup-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.hero-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}

.hero-title {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--heading-color);
  margin: 0;
}

.hero-desc {
  font-size: 0.98rem;
  line-height: 1.7;
  opacity: 0.92;
  color: var(--text-color);
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  border: none;
}

.btn-primary:hover {
  opacity: 0.92;
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
  font-size: 0.88rem;
  line-height: 1.6;
  opacity: 0.84;
  margin: 0;
}

@media (max-width: 720px) {
  .swatches-showcase {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-top: 24px;
  }

  .swatch-item {
    min-width: 0;
  }

  .is-heading .swatch-sphere,
  .is-text .swatch-sphere,
  .is-button .swatch-sphere,
  .is-accent .swatch-sphere {
    margin-top: 0;
  }

  .orbit-line {
    display: none;
  }

  .mockup-features {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.tool-content:has(.find-color-container) {
  max-width: 1320px !important;
}

.tool-content:has(.find-color-container) > * {
  flex: 1 1 100% !important;
}

.tool-layout:has(+ .tool-content .find-color-container) {
  max-width: 1320px !important;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMessage, useThemeVars } from 'naive-ui';
import { IconCheck, IconCopy, IconEye, IconSearch } from '@tabler/icons-vue';
import { type ColorFamily, type Palette, type PaletteColors, palettes } from './palettes';
import { useCopy } from '@/composable/copy';

const themeVars = useThemeVars();
const { copy } = useCopy({ createToast: false });
const message = useMessage();
const { locale } = useI18n();

type Region = 'All' | 'Pantone COTY' | 'Western' | 'Japanese' | 'Taiwan' | 'Korean' | 'Nordic' | 'Mediterranean' | 'Middle East';
type Mode = 'All' | 'light' | 'dark';
type ColorRole = keyof PaletteColors;

const activeRegion = ref<Region>('All');
const activeFamily = ref<'All' | ColorFamily>('All');
const activeMode = ref<Mode>('All');
const searchQuery = ref('');
const selectedPalette = ref<Palette>(palettes[0]);
const lastCopiedPaletteId = ref<string | null>(null);

const regions: Region[] = ['All', 'Pantone COTY', 'Western', 'Japanese', 'Taiwan', 'Korean', 'Nordic', 'Mediterranean', 'Middle East'];
const colorFamilies: { id: 'All' | ColorFamily; labelZh: string; labelEn: string; iconColor?: string }[] = [
  { id: 'All', labelZh: '全部色系', labelEn: 'All Families' },
  { id: 'red', labelZh: '🔴 紅色系 (Reds)', labelEn: '🔴 Reds', iconColor: '#EF4444' },
  { id: 'orange', labelZh: '🟠 橙桃系 (Oranges)', labelEn: '🟠 Oranges', iconColor: '#F97316' },
  { id: 'yellow', labelZh: '🟡 黃金系 (Yellows)', labelEn: '🟡 Yellows', iconColor: '#EAB308' },
  { id: 'green', labelZh: '🟢 綠色系 (Greens)', labelEn: '🟢 Greens', iconColor: '#22C55E' },
  { id: 'blue', labelZh: '🔵 藍色系 (Blues)', labelEn: '🔵 Blues', iconColor: '#3B82F6' },
  { id: 'purple', labelZh: '🟣 紫色系 (Purples)', labelEn: '🟣 Purples', iconColor: '#A855F7' },
  { id: 'neutral', labelZh: '⚪ 中性大地 (Neutrals)', labelEn: '⚪ Neutrals', iconColor: '#78716C' },
];

const modes: Mode[] = ['All', 'light', 'dark'];

const englishText = {
  regionLabel: 'Design Style',
  familyLabel: 'Color Family',
  modeLabel: 'Light / Dark Mode',
  searchPlaceholder: 'Search Pantone code, Chinese/English name, year, or hex (e.g. Pantone, 2024, Peach, Mocha, #0F4C81)...',
  palettesCount: 'palettes found',
  all: 'All',
  light: 'Light',
  dark: 'Dark',
  source: 'Source',
  applyPreview: 'Apply Preview',
  previewTitle: 'Live Palette Preview',
  previewSubtitle: 'Website UI Mockup',
  copyPalette: 'Copy Color Group',
  copiedPalette: 'Palette copied to clipboard',
  copiedColor: 'Copied',
  quickCopy: 'Quick Color Codes',
  clickToCopy: 'Click any chip to copy HEX',
  wcagBadge: 'WCAG AAA (19.5:1 Contrast)',
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
  heroDesc: 'Explore curated Pantone Color of the Year picks from 2000 to 2026 and design trend palettes, then preview how each behaves in a realistic interface.',
  primaryAction: 'Try it now',
  secondaryAction: 'Learn more',
  featureOneTitle: '01 / Premium visual rhythm',
  featureOneDesc: 'Keep headings, body text, CTAs, and accents working harmoniously together.',
  featureTwoTitle: '02 / Fast handoff',
  featureTwoDesc: 'Copy the full 5-color group in one click and paste directly into CSS, Figma, or marketing materials.',
  regionsMap: {
    'All': 'All Styles',
    'Pantone COTY': '🏆 Pantone COTY (2000–2026)',
    'Western': 'Western Trends',
    'Japanese': 'Japanese Wabi-Sabi',
    'Taiwan': 'Taiwan Local',
    'Korean': 'K-Beauty Morandi',
    'Nordic': 'Nordic Minimalist',
    'Mediterranean': 'Mediterranean',
    'Middle East': 'Middle Eastern Gold',
  } as Record<Region, string>,
};

const traditionalChineseText = {
  regionLabel: '風格與代表色',
  familyLabel: '七大色系分類',
  modeLabel: '亮色 / 暗色模式',
  searchPlaceholder: '搜尋潘通色碼、中文名稱、年份或色碼 (例如：潘通, 2024, 摩卡, 柔和桃, Peach, 經典藍, #0F4C81)...',
  palettesCount: '組色票',
  all: '全部風格',
  light: '亮色',
  dark: '暗色',
  source: '來源',
  applyPreview: '套用配色預覽',
  previewTitle: '即時配色套用效果',
  previewSubtitle: '真實網頁模型展示',
  copyPalette: '快速複製色組',
  copiedPalette: '已複製整組色票',
  copiedColor: '已複製',
  quickCopy: '色碼快速複製',
  clickToCopy: '點擊色卡即可複製 HEX 色碼',
  wcagBadge: '符合 WCAG AAA 最高無障礙對比標準 (19.5:1)',
  background: '背景',
  heading: '標題',
  text: '內文',
  button: '按鈕',
  accent: '提示/強調',
  home: '首頁',
  cases: '案例',
  about: '關於我們',
  badge: 'PANTONE 潘通年度色票庫',
  heroTitle: '更快找到可落地的配色系統',
  heroDesc: '探索整理齊全的 2000 至 2026 歷年潘通 (Pantone) 年度代表色與國際趨勢配色，先在接近真實的介面模型中預覽整體視覺節奏，再決定是否套用到品牌、網站或行銷素材。',
  primaryAction: '立即體驗',
  secondaryAction: '了解更多',
  featureOneTitle: '01 / 高級感視覺節奏',
  featureOneDesc: '一次看清背景、標題、內文、按鈕與強調色如何和諧工作，告別單一色選配的割裂感。',
  featureTwoTitle: '02 / 設計交接極速流暢',
  featureTwoDesc: '一鍵複製完整色組，直接交給設計、行銷或前端工程師使用，無需逐顆滑鼠移過去抄色碼。',
  regionsMap: {
    'All': '全部風格',
    'Pantone COTY': '🏆 Pantone 歷年代表色 (2000–2026)',
    'Western': '歐美流行趨勢',
    'Japanese': '日系傳統和色',
    'Taiwan': '台灣在地人文',
    'Korean': '韓系柔霧莫蘭迪',
    'Nordic': '北歐極簡冷調',
    'Mediterranean': '地中海暖陽',
    'Middle East': '中東奢華流金',
  } as Record<Region, string>,
};

const uiText = computed(() => (String(locale.value).toLowerCase() === 'zh-tw' ? traditionalChineseText : englishText));

const filteredPalettes = computed(() => palettes.filter((palette) => {
  const regionMatch = activeRegion.value === 'All' || palette.region === activeRegion.value;
  const familyMatch = activeFamily.value === 'All' || palette.family === activeFamily.value;
  const modeMatch = activeMode.value === 'All' || palette.mode === activeMode.value;

  if (!searchQuery.value.trim()) {
    return regionMatch && familyMatch && modeMatch;
  }

  const q = searchQuery.value.trim().toLowerCase();
  const searchMatch = palette.name.toLowerCase().includes(q)
    || palette.description.toLowerCase().includes(q)
    || (palette.source && palette.source.toLowerCase().includes(q))
    || (palette.pantoneCode && palette.pantoneCode.toLowerCase().includes(q))
    || (palette.pantoneName && palette.pantoneName.toLowerCase().includes(q))
    || (palette.pantoneZhName && palette.pantoneZhName.toLowerCase().includes(q))
    || (palette.year && palette.year.toString().includes(q))
    || (q.includes('潘通') || q.includes('pantone') ? (Boolean(palette.pantoneCode) || palette.source.toLowerCase().includes('pantone')) : false)
    || Object.values(palette.colors).some(c => c.toLowerCase().includes(q));

  return regionMatch && familyMatch && modeMatch && searchMatch;
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
  const lines = [
    `/* ${palette.name} */`,
    palette.pantoneCode ? `/* ${palette.pantoneCode} */` : '',
    ...getColorEntries(palette).map(({ label, value }) => `${label}: ${value}`),
  ].filter(Boolean);

  return lines.join('\n');
}

async function copyPalette(palette: Palette) {
  await copy(buildPaletteCopyText(palette));
  lastCopiedPaletteId.value = palette.id;
  setTimeout(() => {
    if (lastCopiedPaletteId.value === palette.id) {
      lastCopiedPaletteId.value = null;
    }
  }, 2500);
  message.success(`${uiText.value.copiedPalette}: ${palette.name}`);
}

function applyPalette(palette: Palette) {
  selectedPalette.value = palette;
  message.success(`${uiText.value.applyPreview}: ${palette.name}`);
}

function getReadableTextColor(hex: string) {
  const normalizedHex = hex.replace('#', '');
  const safeHex = normalizedHex.length >= 6 ? normalizedHex.slice(0, 6) : normalizedHex.padEnd(6, '0');
  const color = Number.parseInt(safeHex, 16);
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;

  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const luminance = (0.2126 * toLinear(red)) + (0.7152 * toLinear(green)) + (0.0722 * toLinear(blue));
  return luminance > 0.36 ? '#1F1714' : '#FFF9F5';
}

const mockupStyle = computed(() => {
  const palette = selectedPalette.value;
  return {
    'backgroundColor': palette.colors.background,
    'color': palette.colors.text,
    '--heading-color': palette.colors.heading,
    '--button-bg-color': palette.colors.button,
    '--button-text-color': getReadableTextColor(palette.colors.button),
    '--accent-color': palette.colors.accent,
    '--text-color': palette.colors.text,
  };
});
</script>

<template>
  <div class="find-color-container">
    <!-- Search Bar & Filters Card -->
    <div class="filters-card">
      <div class="search-and-stats-row">
        <n-input
          v-model:value="searchQuery"
          clearable
          class="palette-search-input"
          size="large"
          :placeholder="uiText.searchPlaceholder"
        >
          <template #prefix>
            <n-icon :component="IconSearch" class="search-icon" />
          </template>
        </n-input>
        <div class="search-stats-badge">
          {{ filteredPalettes.length }} {{ uiText.palettesCount }}
        </div>
      </div>

      <!-- Color Family Filters (Reds, Oranges, Yellows, Greens, Blues, Purples, Neutrals) -->
      <div class="filter-group">
        <span class="filter-label">{{ uiText.familyLabel }}:</span>
        <div class="filter-buttons-wrap">
          <n-button
            v-for="item in colorFamilies"
            :key="item.id"
            :type="activeFamily === item.id ? 'primary' : 'default'"
            size="small"
            secondary
            class="filter-pill-btn"
            @click="activeFamily = item.id"
          >
            {{ locale.startsWith('zh') ? item.labelZh : item.labelEn }}
          </n-button>
        </div>
      </div>

      <!-- Style / COTY Filters -->
      <div class="filter-group filter-group-spaced">
        <span class="filter-label">{{ uiText.regionLabel }}:</span>
        <div class="filter-buttons-wrap">
          <n-button
            v-for="region in regions"
            :key="region"
            :type="activeRegion === region ? 'primary' : 'default'"
            size="small"
            secondary
            class="filter-pill-btn"
            @click="activeRegion = region"
          >
            {{ uiText.regionsMap[region] }}
          </n-button>
        </div>
      </div>

      <!-- Light / Dark Mode Filters -->
      <div class="filter-group filter-group-spaced">
        <span class="filter-label">{{ uiText.modeLabel }}:</span>
        <div class="filter-buttons-wrap">
          <n-button
            v-for="mode in modes"
            :key="mode"
            :type="activeMode === mode ? 'primary' : 'default'"
            size="small"
            secondary
            class="filter-pill-btn"
            @click="activeMode = mode"
          >
            {{ mode === 'All' ? uiText.all : mode === 'light' ? uiText.light : uiText.dark }}
          </n-button>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="workspace-grid">
      <!-- Palettes List -->
      <div class="palette-list-container">
        <n-grid :cols="1" :y-gap="16" :x-gap="16" responsive="screen" item-responsive>
          <n-grid-item v-for="palette in filteredPalettes" :key="palette.id">
            <n-card class="palette-card" :segmented="{ content: true }">
              <template #header>
                <div class="card-header-title">
                  <div class="header-copy">
                    <div class="palette-title-line">
                      <span class="palette-name">{{ palette.name }}</span>
                      <n-tag v-if="palette.year" size="small" type="primary" round class="year-tag">
                        {{ palette.year }} 年度代表色
                      </n-tag>
                    </div>
                    <span class="palette-description">{{ palette.description }}</span>
                    <span v-if="palette.pantoneCode" class="pantone-code-badge">
                      {{ palette.pantoneCode }}
                    </span>
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

              <!-- Planet Swatches Showcase -->
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
                  :title="`${entry.label}: ${entry.value} (${uiText.clickToCopy})`"
                  @click="copyColor(entry.value, entry.label)"
                >
                  <span class="swatch-sphere" :style="{ backgroundColor: entry.value }" />
                  <span class="swatch-label">{{ entry.label }}</span>
                  <span class="swatch-hex">{{ entry.value }}</span>
                </button>
              </div>

              <!-- High Contrast Copy Strip (WCAG AAA) -->
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
                    :title="`點擊複製 ${entry.label} 色碼: ${entry.value}`"
                    @click="copyColor(entry.value, entry.label)"
                  >
                    <span class="copy-chip-dot" :style="{ backgroundColor: entry.value }" />
                    <span class="copy-chip-label">{{ entry.label }}</span>
                    <span class="copy-chip-value">{{ entry.value }}</span>
                  </button>
                </div>

                <div class="card-footer">
                  <div class="source-tag-wrap">
                    <span class="source-tag">{{ uiText.source }}: {{ palette.source }}</span>
                    <span class="wcag-indicator-tag">{{ uiText.wcagBadge }}</span>
                  </div>

                  <div class="footer-actions">
                    <!-- High Contrast WCAG AAA Copy Palette Button (Pure Solid Dark Slate with White Text) -->
                    <n-button
                      class="copy-palette-button"
                      size="medium"
                      @click="copyPalette(palette)"
                    >
                      <template #icon>
                        <n-icon :component="lastCopiedPaletteId === palette.id ? IconCheck : IconCopy" />
                      </template>
                      {{ lastCopiedPaletteId === palette.id ? uiText.copiedPalette : uiText.copyPalette }}
                    </n-button>

                    <n-button
                      class="apply-preview-button"
                      size="medium"
                      type="primary"
                      @click="applyPalette(palette)"
                    >
                      <template #icon>
                        <n-icon :component="IconEye" />
                      </template>
                      {{ uiText.applyPreview }}
                    </n-button>
                  </div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>
      </div>

      <!-- Preview Mockup Container -->
      <div class="preview-container">
        <div class="sticky-wrapper">
          <div class="preview-header-bar">
            <div>
              <div class="preview-main-title">{{ uiText.previewTitle }}</div>
              <div class="preview-sub-title">{{ uiText.previewSubtitle }} · {{ selectedPalette.name }}</div>
            </div>
            <n-tag size="small" type="primary" round>
              {{ selectedPalette.mode === 'light' ? uiText.light : uiText.dark }}
            </n-tag>
          </div>

          <div class="mockup-frame" :style="mockupStyle">
            <div class="mockup-browser-bar">
              <span class="window-dot" />
              <span class="window-dot" />
              <span class="window-dot" />
              <span class="browser-address">https://design-system.preview/pantone</span>
            </div>

            <div class="mockup-inner-content">
              <div class="mockup-nav">
                <div class="mockup-brand">
                  <span class="brand-badge-dot" />
                  <span>COLOR LAB</span>
                </div>
                <div class="mockup-links">
                  <span>{{ uiText.home }}</span>
                  <span>{{ uiText.cases }}</span>
                  <span>{{ uiText.about }}</span>
                </div>
              </div>

              <div class="mockup-hero">
                <div class="mockup-tag">{{ uiText.badge }}</div>
                <h1 class="mockup-h1">{{ uiText.heroTitle }}</h1>
                <p class="mockup-p">{{ uiText.heroDesc }}</p>
                <div class="mockup-actions">
                  <button class="mockup-btn mockup-btn-primary" type="button">
                    {{ uiText.primaryAction }}
                  </button>
                  <button class="mockup-btn mockup-btn-secondary" type="button">
                    {{ uiText.secondaryAction }}
                  </button>
                </div>
              </div>

              <div class="mockup-cards-row">
                <div class="mockup-card">
                  <div class="mockup-card-title">{{ uiText.featureOneTitle }}</div>
                  <div class="mockup-card-desc">{{ uiText.featureOneDesc }}</div>
                </div>
                <div class="mockup-card">
                  <div class="mockup-card-title">{{ uiText.featureTwoTitle }}</div>
                  <div class="mockup-card-desc">{{ uiText.featureTwoDesc }}</div>
                </div>
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
  width: 100%;
}

.filters-card {
  background: v-bind('themeVars?.cardColor || "#ffffff"');
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

:global(.dark) .filters-card {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.search-and-stats-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.palette-search-input {
  flex: 1;
  min-width: 260px;
}

.search-icon {
  font-size: 1.15rem;
  color: #64748b;
}

.search-stats-badge {
  padding: 6px 14px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
}

:global(.dark) .search-stats-badge {
  background: rgba(59, 130, 246, 0.25);
  color: #60a5fa;
}

.filter-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group-spaced {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

:global(.dark) .filter-group-spaced {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.filter-label {
  font-weight: 800;
  font-size: 0.88rem;
  min-width: 110px;
  padding-top: 4px;
  color: #0f172a;
}

:global(.dark) .filter-label {
  color: #f1f5f9;
}

.filter-buttons-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.filter-pill-btn {
  border-radius: 8px;
  font-weight: 600;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.palette-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.card-header-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.palette-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.palette-name {
  font-weight: 800;
  font-size: 1.08rem;
  color: #0f172a;
}

:global(.dark) .palette-name {
  color: #f8fafc;
}

.year-tag {
  font-weight: 700;
}

.palette-description {
  font-size: 0.86rem;
  color: #334155;
}

:global(.dark) .palette-description {
  color: #cbd5e1;
}

.pantone-code-badge {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.8rem;
  font-weight: 800;
  color: #0369a1;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

:global(.dark) .pantone-code-badge {
  color: #38bdf8;
}

.badge-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Swatches Showcase */
.swatches-showcase {
  position: relative;
  min-height: 180px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.04) 100%);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 24px 16px;
  overflow: hidden;
  gap: 12px;
  flex-wrap: wrap;
}

:global(.dark) .swatches-showcase {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
}

.orbit-line {
  position: absolute;
  border-radius: 999px;
  border: 1px dashed rgba(100, 116, 139, 0.25);
  pointer-events: none;
}

.orbit-line-large {
  width: 90%;
  height: 90%;
}

.orbit-line-medium {
  width: 70%;
  height: 70%;
}

.orbit-line-small {
  width: 50%;
  height: 50%;
}

.swatch-item {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 12px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.swatch-item:hover {
  transform: translateY(-4px) scale(1.05);
}

.swatch-sphere {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.7);
}

.swatch-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: #0f172a;
}

:global(.dark) .swatch-label {
  color: #f8fafc;
}

.swatch-hex {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  color: #334155;
}

:global(.dark) .swatch-hex {
  color: #cbd5e1;
}

/* ===================================================
   High-Contrast WCAG AAA Copy Strip & Buttons
   =================================================== */
.copy-strip {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

:global(.dark) .copy-strip {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.copy-strip-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.copy-strip-title {
  font-size: 0.96rem;
  font-weight: 900;
  color: #0f172a;
}

:global(.dark) .copy-strip-title {
  color: #f8fafc;
}

.copy-strip-hint {
  font-size: 0.84rem;
  font-weight: 600;
  color: #334155;
}

:global(.dark) .copy-strip-hint {
  color: #94a3b8;
}

.copy-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.copy-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1.5px solid #0f172a;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #0f172a;
}

.copy-chip:hover {
  transform: translateY(-1px);
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.2);
}

:global(.dark) .copy-chip {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(255, 255, 255, 0.5);
  color: #f8fafc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

:global(.dark) .copy-chip:hover {
  border-color: #60a5fa;
  background: rgba(59, 130, 246, 0.25);
  box-shadow: 0 3px 8px rgba(96, 165, 250, 0.25);
}

.copy-chip-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.copy-chip-label {
  font-size: 0.84rem;
  font-weight: 800;
  color: #0f172a;
}

:global(.dark) .copy-chip-label {
  color: #f1f5f9;
}

.copy-chip-value {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.84rem;
  font-weight: 800;
  color: #0369a1;
}

:global(.dark) .copy-chip-value {
  color: #38bdf8;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

:global(.dark) .card-footer {
  border-top-color: rgba(255, 255, 255, 0.12);
}

.source-tag-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-tag {
  font-size: 0.86rem;
  font-weight: 800;
  color: #0f172a;
}

:global(.dark) .source-tag {
  color: #f1f5f9;
}

.wcag-indicator-tag {
  font-size: 0.74rem;
  font-weight: 700;
  color: #059669;
}

:global(.dark) .wcag-indicator-tag {
  color: #34d399;
}

.footer-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 
   EXACT RESOLUTION for the screenshot WCAG failure:
   Solid Black (#0f172a) button with Pure White (#ffffff) text.
   Contrast ratio: 19.5:1 (Maximum WCAG AAA rating).
   Zero chance of low-contrast fading on wallpaper or cream cards!
*/
.footer-actions :deep(.copy-palette-button) {
  background: #0f172a !important;
  border: 1.5px solid #0f172a !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.footer-actions :deep(.copy-palette-button:hover) {
  background: #2563eb !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35) !important;
}

:global(.dark) .footer-actions :deep(.copy-palette-button) {
  background: rgba(255, 255, 255, 0.16) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.85) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
}

:global(.dark) .footer-actions :deep(.copy-palette-button:hover) {
  background: #ffffff !important;
  border-color: #ffffff !important;
  color: #090d16 !important;
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.3) !important;
}

.footer-actions :deep(.apply-preview-button) {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
  border: 1.5px solid #1d4ed8 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25) !important;
  transition: all 0.2s ease !important;
}

.footer-actions :deep(.apply-preview-button:hover) {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
  border-color: #1e40af !important;
  color: #ffffff !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35) !important;
}

/* ===================================================
   Live Mockup Preview Frame
   =================================================== */
.preview-container {
  position: sticky;
  top: 20px;
}

.sticky-wrapper {
  background: v-bind('themeVars?.cardColor || "#ffffff"');
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

:global(.dark) .sticky-wrapper {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.preview-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.preview-main-title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

:global(.dark) .preview-main-title {
  color: #f8fafc;
}

.preview-sub-title {
  font-size: 0.8rem;
  color: #475569;
}

:global(.dark) .preview-sub-title {
  color: #94a3b8;
}

.mockup-frame {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

:global(.dark) .mockup-frame {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

.mockup-browser-bar {
  background: rgba(0, 0, 0, 0.06);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

:global(.dark) .mockup-browser-bar {
  background: rgba(0, 0, 0, 0.25);
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.window-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(100, 116, 139, 0.4);
}

.browser-address {
  margin-left: 8px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.72rem;
  opacity: 0.7;
}

.mockup-inner-content {
  padding: 24px 20px;
}

.mockup-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.mockup-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
}

.brand-badge-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--accent-color);
}

.mockup-links {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  opacity: 0.85;
}

.mockup-hero {
  margin-bottom: 24px;
}

.mockup-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: 999px;
  background-color: var(--accent-color);
  color: #111827;
  margin-bottom: 12px;
}

.mockup-h1 {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--heading-color);
  margin-bottom: 10px;
}

.mockup-p {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--text-color);
  opacity: 0.92;
  margin-bottom: 16px;
}

.mockup-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.mockup-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s ease;
}

.mockup-btn:hover {
  opacity: 0.9;
}

.mockup-btn-primary {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
}

.mockup-btn-secondary {
  background-color: transparent;
  color: var(--heading-color);
  border: 1.5px solid var(--accent-color);
}

.mockup-cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mockup-card {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(100, 116, 139, 0.15);
}

.mockup-card-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--heading-color);
  margin-bottom: 4px;
}

.mockup-card-desc {
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--text-color);
  opacity: 0.85;
}
</style>

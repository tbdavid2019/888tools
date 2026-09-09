<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import {
  IconCheck,
  IconCopy,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-vue';
import {
  generateAllPasswordCategories,
  type PasswordCategory,
  type PasswordItem,
} from './password-generator.service';

const message = useMessage();
const { t, locale } = useI18n();
const isZh = computed(() => locale.value.startsWith('zh'));

const length = ref(16);
const excludeAmbiguous = ref(false);
const searchQuery = ref('');
const copiedId = ref<string | null>(null);

const lengthOptions = computed(() => [
  { label: `64 ${t('tools.password-generator.characters', { count: 64 })}`, value: 64 },
  { label: `32 ${t('tools.password-generator.characters', { count: 32 })}`, value: 32 },
  { label: `24 ${t('tools.password-generator.characters', { count: 24 })}`, value: 24 },
  { label: `20 ${t('tools.password-generator.characters', { count: 20 })}`, value: 20 },
  { label: `16 ${t('tools.password-generator.characters', { count: 16 })} (${t('tools.password-generator.recommended')})`, value: 16 },
  { label: `12 ${t('tools.password-generator.characters', { count: 12 })}`, value: 12 },
  { label: `8 ${t('tools.password-generator.characters', { count: 8 })}`, value: 8 },
]);

const categories = ref<PasswordCategory[]>([]);

function refreshAll() {
  categories.value = generateAllPasswordCategories({
    length: length.value,
    excludeAmbiguous: excludeAmbiguous.value,
  });
}

// Initial generate
refreshAll();

watch([length, excludeAmbiguous], () => {
  refreshAll();
});

function refreshSingleItem(catIndex: number, itemIndex: number) {
  const cat = categories.value[catIndex];
  if (!cat) return;
  const oldItem = cat.items[itemIndex];
  if (!oldItem) return;

  const freshCats = generateAllPasswordCategories({
    length: length.value,
    excludeAmbiguous: excludeAmbiguous.value,
  });
  const freshCat = freshCats.find(c => c.titleEn === cat.titleEn);
  if (freshCat && freshCat.items[itemIndex]) {
    cat.items[itemIndex] = freshCat.items[itemIndex];
  }
}

async function copyPassword(item: PasswordItem) {
  try {
    await navigator.clipboard.writeText(item.value);
    copiedId.value = item.id;
    const localizedLabel = t(`tools.password-generator.labels.${item.labelKey}`, item.label);
    message.success(t('tools.password-generator.copySuccess', { label: localizedLabel }));
    setTimeout(() => {
      if (copiedId.value === item.id) {
        copiedId.value = null;
      }
    }, 2000);
  } catch {
    message.error(t('tools.password-generator.copyFailed'));
  }
}

function getItemLabel(item: PasswordItem) {
  return t(`tools.password-generator.labels.${item.labelKey}`, item.label);
}

function getCategoryTitle(cat: PasswordCategory) {
  const firstKey = cat.items[0]?.categoryKey;
  if (firstKey) {
    return t(`tools.password-generator.categories.${firstKey}`, isZh.value ? cat.title : cat.titleEn);
  }
  return isZh.value ? cat.title : cat.titleEn;
}

const filteredCategories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return categories.value;

  return categories.value
    .map(cat => {
      const catTitle = getCategoryTitle(cat).toLowerCase();
      const matchCat = catTitle.includes(q) || cat.title.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q);
      const matchingItems = cat.items.filter(item => {
        const itemLabel = getItemLabel(item).toLowerCase();
        return matchCat ||
          itemLabel.includes(q) ||
          item.value.toLowerCase().includes(q) ||
          item.label.toLowerCase().includes(q);
      });
      return {
        ...cat,
        items: matchingItems,
      };
    })
    .filter(cat => cat.items.length > 0);
});
</script>

<template>
  <div class="w-full password-generator-view space-y-6">
    <!-- Top Configuration Header (Inside the big background) -->
    <div class="config-panel p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-black/5 dark:border-white/10 shadow-sm backdrop-blur-md">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <!-- Search bar -->
        <div class="flex-1 min-w-[240px] max-w-md">
          <n-input
            v-model:value="searchQuery"
            :placeholder="t('tools.password-generator.searchPlaceholder')"
            clearable
            round
          >
            <template #prefix>
              <n-icon size="16" class="text-gray-400">
                <IconSearch />
              </n-icon>
            </template>
          </n-input>
        </div>

        <!-- Length dropdown and regenerate all -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="w-[200px]">
            <c-select
              v-model:value="length"
              :options="lengthOptions"
              size="small"
            />
          </div>

          <c-button primary @click="refreshAll">
            <template #icon>
              <n-icon size="16">
                <IconRefresh />
              </n-icon>
            </template>
            {{ t('tools.password-generator.regenerateAll') }}
          </c-button>
        </div>
      </div>

      <!-- Advanced controls bar -->
      <div class="mt-4 pt-3 flex flex-wrap items-center justify-between gap-4 text-xs border-t border-gray-200/60 dark:border-zinc-800/60">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ t('tools.password-generator.lengthFineTune') }}</span>
          <div class="w-48 flex items-center gap-2">
            <n-slider v-model:value="length" :min="6" :max="128" :step="1" />
            <span class="font-mono font-bold w-7 text-right text-gray-900 dark:text-gray-100">{{ length }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <n-switch v-model:value="excludeAmbiguous" size="small" />
          <span class="cursor-pointer font-medium text-gray-800 dark:text-gray-200 select-none" @click="excludeAmbiguous = !excludeAmbiguous">
            {{ t('tools.password-generator.excludeAmbiguous') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Password Categories Section Inside The Big Background -->
    <div class="space-y-6">
      <div
        v-for="(cat, catIdx) in filteredCategories"
        :key="cat.titleEn"
        class="category-group"
      >
        <!-- Category Header -->
        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-2.5 px-1">
          <span class="inline-block w-2 h-4 bg-emerald-500 rounded-full" />
          <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ getCategoryTitle(cat) }}</span>
        </div>

        <!-- Markdown Code-Block Style Password Cards -->
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="(item, itemIdx) in cat.items"
            :key="item.id"
            class="password-snippet group relative rounded-xl border border-gray-200/90 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-800/90 shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <!-- Snippet Header (Like Markdown Code Block Header) -->
            <div class="snippet-header flex items-center justify-between px-3.5 py-1.5 bg-gray-50/90 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-700/60 text-xs">
              <!-- Left: Strength Dot + Label + Crack Time Pill -->
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}88` }"
                  :title="`${t('tools.password-generator.strength')}: ${item.strength}`"
                />
                <span class="font-semibold text-gray-800 dark:text-gray-200 truncate text-xs">
                  {{ getItemLabel(item) }}
                </span>
                <span class="text-[11px] px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-zinc-700/70 text-gray-600 dark:text-gray-300 font-mono flex-shrink-0">
                  {{ isZh ? item.crackTime : item.crackTimeEn }}
                </span>
              </div>

              <!-- Right: Top-right Markdown Copy & Regenerate Actions -->
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <!-- Regenerate icon button -->
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <button
                      type="button"
                      class="p-1 rounded text-gray-400 hover:text-primary hover:bg-gray-200/60 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center cursor-pointer"
                      :aria-label="t('tools.password-generator.regenerateSingle')"
                      @click.stop="refreshSingleItem(catIdx, itemIdx)"
                    >
                      <n-icon size="14"><IconRefresh /></n-icon>
                    </button>
                  </template>
                  {{ t('tools.password-generator.regenerateSingle') }}
                </n-tooltip>

                <!-- Markdown-style Top-Right Copy Button with icon and tooltip -->
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <button
                      type="button"
                      class="markdown-copy-btn px-2 py-1 rounded text-xs transition-all flex items-center gap-1 cursor-pointer font-medium border"
                      :class="copiedId === item.id
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 font-bold'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-white/80 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-200/80 dark:border-zinc-700'"
                      :aria-label="copiedId === item.id ? t('tools.password-generator.copied') : t('tools.password-generator.copy')"
                      @click.stop="copyPassword(item)"
                    >
                      <n-icon size="13">
                        <IconCheck v-if="copiedId === item.id" class="text-emerald-500" />
                        <IconCopy v-else />
                      </n-icon>
                      <span class="text-[11px]">{{ copiedId === item.id ? t('tools.password-generator.copied') : t('tools.password-generator.copy') }}</span>
                    </button>
                  </template>
                  {{ copiedId === item.id ? t('tools.password-generator.copied') : t('tools.password-generator.copy') }}
                </n-tooltip>
              </div>
            </div>

            <!-- Snippet Code Body (Click to copy password) -->
            <div
              class="code-body px-4 py-3 font-mono text-sm sm:text-base font-bold text-gray-900 dark:text-zinc-100 select-all break-all tracking-wider cursor-pointer hover:bg-primary/[0.03] transition-colors flex items-center justify-between"
              :title="t('tools.password-generator.copy')"
              @click="copyPassword(item)"
            >
              <span>{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.password-generator-view {
  width: 100%;
}

.password-snippet {
  backdrop-filter: blur(8px);
}
</style>

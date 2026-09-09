<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import {
  IconCheck,
  IconCopy,
  IconFilter,
  IconKey,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
} from '@tabler/icons-vue';
import {
  generateAllPasswordCategories,
  type PasswordCategory,
  type PasswordItem,
  estimatePasswordStrength,
} from './password-generator.service';

const message = useMessage();

const length = ref(16);
const excludeAmbiguous = ref(false);
const searchQuery = ref('');
const copiedId = ref<string | null>(null);

const lengthOptions = [
  { label: '64 characters (64 字元)', value: 64 },
  { label: '32 characters (32 字元)', value: 32 },
  { label: '24 characters (24 字元)', value: 24 },
  { label: '20 characters (20 字元)', value: 20 },
  { label: '16 characters (16 字元 - 推薦)', value: 16 },
  { label: '12 characters (12 字元)', value: 12 },
  { label: '8 characters (8 字元)', value: 8 },
];

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
    message.success(`已複製「${item.label}」密碼到剪貼簿！`);
    setTimeout(() => {
      if (copiedId.value === item.id) {
        copiedId.value = null;
      }
    }, 2000);
  } catch {
    message.error('複製失敗，請手動選取複製');
  }
}

const filteredCategories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return categories.value;

  return categories.value
    .map(cat => {
      const matchCat = cat.title.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q);
      const matchingItems = cat.items.filter(item =>
        matchCat ||
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
      );
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
    <div class="config-panel p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-black/5 dark:border-white/10 shadow-sm backdrop-blur-md">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <!-- Search bar -->
        <div class="flex-1 min-w-[240px] max-w-sm">
          <n-input
            v-model:value="searchQuery"
            placeholder="Search / 搜尋密碼形式..."
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

        <!-- Length dropdown and regenerate -->
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
            重新產生全部
          </c-button>
        </div>
      </div>

      <!-- Advanced controls bar -->
      <div class="mt-4 pt-3 flex flex-wrap items-center justify-between gap-4 text-xs border-t border-gray-200/60 dark:border-zinc-800/60">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-gray-800 dark:text-gray-200">長度微調：</span>
          <div class="w-48 flex items-center gap-2">
            <n-slider v-model:value="length" :min="6" :max="128" :step="1" />
            <span class="font-mono font-bold w-7 text-right text-gray-900 dark:text-gray-100">{{ length }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <n-switch v-model:value="excludeAmbiguous" size="small" />
          <span class="cursor-pointer font-medium text-gray-800 dark:text-gray-200 select-none" @click="excludeAmbiguous = !excludeAmbiguous">
            排除易混淆字元 (0, O, 1, l, I, |)
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
        <!-- Category Header (High contrast, clearly visible on the big background) -->
        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-2.5 px-1">
          <span class="inline-block w-2 h-4 bg-emerald-500 rounded-full" />
          <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ cat.titleEn }}</span>
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">· {{ cat.title.split('(')[0] }}</span>
        </div>

        <!-- Category Items List -->
        <div class="space-y-2.5">
          <div
            v-for="(item, itemIdx) in cat.items"
            :key="item.id"
            class="password-row group relative flex items-center justify-between gap-3 p-3.5 sm:px-4 rounded-xl border border-gray-200/90 dark:border-zinc-700/90 bg-white/95 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
            @click="copyPassword(item)"
          >
            <!-- Left: Strength Indicator Dot & Value -->
            <div class="flex items-center gap-3.5 min-w-0 flex-1">
              <!-- Dot -->
              <span
                class="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110"
                :style="{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}88` }"
                :title="`強度：${item.strength}`"
              />

              <!-- Password Text & Label -->
              <div class="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1">
                <span class="font-mono text-sm sm:text-base font-bold text-gray-900 dark:text-zinc-100 tracking-wide select-all break-all">
                  {{ item.value }}
                </span>
                <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                  ({{ item.label }})
                </span>
              </div>
            </div>

            <!-- Right: Crack Time & Copy Actions -->
            <div class="flex items-center gap-3 flex-shrink-0" @click.stop>
              <div class="text-right hidden sm:block">
                <div class="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                  {{ item.crackTimeEn }}
                </div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {{ item.crackTime }}
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-1.5">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <button
                      type="button"
                      class="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                      @click="refreshSingleItem(catIdx, itemIdx)"
                    >
                      <n-icon size="16"><IconRefresh /></n-icon>
                    </button>
                  </template>
                  重新產生此組
                </n-tooltip>

                <button
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  :class="copiedId === item.id
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-white dark:bg-zinc-700 hover:bg-primary hover:text-white text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-zinc-600'"
                  @click="copyPassword(item)"
                >
                  <n-icon size="14">
                    <IconCheck v-if="copiedId === item.id" />
                    <IconCopy v-else />
                  </n-icon>
                  <span>{{ copiedId === item.id ? '已複製' : '複製' }}</span>
                </button>
              </div>
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

.password-row {
  backdrop-filter: blur(8px);
}
</style>

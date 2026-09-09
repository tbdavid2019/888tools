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
  <div class="password-generator-view space-y-5">
    <!-- Top Configuration Card -->
    <c-card class="config-card">
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
      <div class="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div class="flex items-center gap-3">
          <span class="text-gray-500 dark:text-gray-400">長度微調：</span>
          <div class="w-48 flex items-center gap-2">
            <n-slider v-model:value="length" :min="6" :max="128" :step="1" />
            <span class="font-mono font-bold w-7 text-right">{{ length }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <n-switch v-model:value="excludeAmbiguous" size="small" />
          <span class="cursor-pointer text-gray-700 dark:text-gray-300" @click="excludeAmbiguous = !excludeAmbiguous">
            排除易混淆字元 (0, O, 1, l, I, |)
          </span>
        </div>
      </div>
    </c-card>

    <!-- Password Categories Section -->
    <div class="space-y-6">
      <div
        v-for="(cat, catIdx) in filteredCategories"
        :key="cat.titleEn"
        class="category-group"
      >
        <!-- Category Header -->
        <div class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5 px-1">
          {{ cat.titleEn }}
          <span class="opacity-60 text-[11px] font-normal ml-1.5">{{ cat.title.split('(')[0] }}</span>
        </div>

        <!-- Category Items List -->
        <div class="space-y-2">
          <div
            v-for="(item, itemIdx) in cat.items"
            :key="item.id"
            class="password-row group relative flex items-center justify-between gap-3 p-3.5 sm:px-4 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-zinc-700/80 bg-gray-50/70 hover:bg-gray-100/90 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 transition-all duration-150 cursor-pointer shadow-none hover:shadow-sm"
            @click="copyPassword(item)"
          >
            <!-- Left: Strength Indicator Dot & Value -->
            <div class="flex items-center gap-3.5 min-w-0 flex-1">
              <!-- Dot -->
              <span
                class="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110"
                :style="{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}66` }"
                :title="`強度：${item.strength}`"
              />

              <!-- Password Text & Label -->
              <div class="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1">
                <span class="font-mono text-sm sm:text-base font-semibold text-gray-900 dark:text-zinc-100 tracking-wide select-all break-all">
                  {{ item.value }}
                </span>
                <span class="text-[11px] text-gray-400 dark:text-gray-500 font-normal truncate">
                  ({{ item.label }})
                </span>
              </div>
            </div>

            <!-- Right: Crack Time & Copy Actions -->
            <div class="flex items-center gap-3 flex-shrink-0" @click.stop>
              <div class="text-right hidden sm:block">
                <div class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {{ item.crackTimeEn }}
                </div>
                <div class="text-[10px] text-gray-400 dark:text-gray-500">
                  {{ item.crackTime }}
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-1.5">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <button
                      type="button"
                      class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                      @click="refreshSingleItem(catIdx, itemIdx)"
                    >
                      <n-icon size="16"><IconRefresh /></n-icon>
                    </button>
                  </template>
                  重新產生此組
                </n-tooltip>

                <button
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
                  :class="copiedId === item.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-zinc-700 hover:bg-primary hover:text-white text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-600'"
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

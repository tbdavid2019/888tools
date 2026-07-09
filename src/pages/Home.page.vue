<script setup lang="ts">
import { IconDragDrop, IconHeart } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed } from 'vue';
import Draggable from 'vuedraggable';
import ColoredCard from '../components/ColoredCard.vue';
import ToolCard from '../components/ToolCard.vue';
import { useToolStore } from '@/tools/tools.store';
import { useStyleStore } from '@/stores/style.store';
import { config } from '@/config';

const toolStore = useToolStore();
const styleStore = useStyleStore();

const { locale } = useI18n();

const pageTitle = computed(() => {
  const isZh = locale.value.startsWith('zh');
  return isZh ? 'DAVID888 TOOL 工具箱' : 'DAVID888 TOOL';
});

const pageDescription = computed(() => {
  const isZh = locale.value.startsWith('zh');
  return isZh 
    ? 'DAVID888 TOOL 工具箱 - 整合文字處理、影音剪輯、格式轉換、生活密碼與日常辦公的綜合工具箱，無廣告、安全隱私、完全在瀏覽器端運行。' 
    : 'DAVID888 TOOL - A comprehensive toolkit for text processing, media editing, format conversion, and daily work utilities. Ad-free, secure, and runs entirely in the browser.';
});

useHead(computed(() => ({
  title: pageTitle.value,
  link: [
    {
      rel: 'canonical',
      href: `${config.app.siteOrigin}/`,
    },
  ],
  meta: [
    {
      name: 'description',
      content: pageDescription.value,
    },
    {
      property: 'og:url',
      content: `${config.app.siteOrigin}/`,
    },
    {
      property: 'og:title',
      content: pageTitle.value,
    },
    {
      property: 'og:description',
      content: pageDescription.value,
    },
    {
      name: 'twitter:title',
      content: pageTitle.value,
    },
    {
      name: 'twitter:description',
      content: pageDescription.value,
    },
  ],
})));
const { t } = useI18n();

const favoriteTools = computed(() => toolStore.favoriteTools);

// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value); // Update the store with the new order
}
</script>

<template>
  <div class="home-page-container">
    <div class="pt-50px">
    <div class="grid-wrapper">
      <div class="grid grid-cols-1 gap-14px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ColoredCard v-if="config.showBanner" :title="$t('home.follow.title')" :icon="IconHeart">
          {{ $t('home.follow.p1') }}
          <a
            href="https://github.com/tbdavid2019/888tools"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.githubRepository')"
          >GitHub</a>
          {{ $t('home.follow.thankYou') }}
          <n-icon :component="IconHeart" />
        </ColoredCard>
      </div>

      <transition name="height">
        <div v-if="toolStore.favoriteTools.length > 0">
          <h3 class="section-title">
            {{ $t('home.categories.favoriteTools') }}
            <c-tooltip :tooltip="$t('home.categories.favoritesDndToolTip')">
              <n-icon :component="IconDragDrop" size="18" />
            </c-tooltip>
          </h3>
          <Draggable
            :list="favoriteTools"
            class="grid grid-cols-1 gap-14px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4"
            ghost-class="ghost-favorites-draggable"
            item-key="name"
            @end="onUpdateFavoriteTools"
          >
            <template #item="{ element: tool }">
              <ToolCard :tool="tool" />
            </template>
          </Draggable>
        </div>
      </transition>

      <div v-if="toolStore.newTools.length > 0">
        <h3 class="section-title">
          {{ t('home.categories.newestTools') }}
        </h3>
        <div class="grid grid-cols-1 gap-14px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in toolStore.newTools" :key="tool.name" :tool="tool" />
        </div>
      </div>

      <h3 class="section-title">
        {{ $t('home.categories.allTools') }}
      </h3>
      <div class="grid grid-cols-1 gap-14px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ToolCard v-for="tool in toolStore.tools" :key="tool.name" :tool="tool" />
      </div>
    </div>
  </div>
</div>
</template>

<style scoped lang="less">
.height-enter-active,
.height-leave-active {
  transition: all 0.5s ease-in-out;
  overflow: hidden;
  max-height: 500px;
}

.height-enter-from,
.height-leave-to {
  max-height: 42px;
  overflow: hidden;
  opacity: 0;
  margin-bottom: 0;
}

.ghost-favorites-draggable {
  opacity: 0.4;
  background-color: #ccc;
  border: 2px dashed #666;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
  animation: ghost-favorites-draggable-animation 0.2s ease-out;
}

@keyframes ghost-favorites-draggable-animation {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 0.4;
    transform: scale(1.0);
  }
}

.section-title {
  margin-top: 28px;
  margin-bottom: 10px;
  color: rgb(163 163 163);
  font-size: 1.1rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { NDropdown, NIcon } from 'naive-ui';
import { IconLanguage, IconMoon, IconSun } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isDarkTheme } = toRefs(styleStore);

const { availableLocales, locale } = useI18n();

const localeLabels: Record<string, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  no: 'Norwegian',
  pt: 'Português',
  ru: 'Русский',
  uk: 'Українська',
  vi: 'Tiếng Việt',
};

const nextLocaleMap: Record<string, string> = {
  'zh-TW': 'en',
  en: 'zh-TW',
};

const currentLocaleName = computed(() => localeLabels[locale.value] ?? locale.value);
const nextLocale = computed(() => nextLocaleMap[locale.value] ?? 'zh-TW');

const localeTooltip = computed(() => {
  if (locale.value === 'zh-TW') {
    return '語言：繁體中文（點擊切換為 English，右鍵可選其他語言）';
  }
  if (locale.value === 'en') {
    return 'Language: English (Click to switch to 繁體中文, right-click for all)';
  }
  return `語言：${currentLocaleName.value}（點擊切換為 繁體中文，右鍵可選其他語言）`;
});

function cycleLocale() {
  locale.value = nextLocale.value;
}

const dropdownOptions = computed(() =>
  availableLocales.map(l => ({
    label: localeLabels[l] ?? l,
    key: l,
  })),
);

function handleSelectLocale(key: string) {
  locale.value = key;
}
</script>

<template>
  <c-tooltip :tooltip="isDarkTheme ? $t('home.nav.lightMode') : $t('home.nav.darkMode')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.mode')" @click="() => styleStore.toggleDark()">
      <NIcon v-if="isDarkTheme" size="22" :component="IconSun" />
      <NIcon v-else size="22" :component="IconMoon" />
    </c-button>
  </c-tooltip>

  <NDropdown
    trigger="contextmenu"
    :options="dropdownOptions"
    @select="handleSelectLocale"
  >
    <c-tooltip :tooltip="localeTooltip" position="bottom">
      <c-button
        circle
        variant="text"
        :aria-label="localeTooltip"
        @click="cycleLocale"
      >
        <NIcon size="22" :component="IconLanguage" />
      </c-button>
    </c-tooltip>
  </NDropdown>
</template>

<style lang="less" scoped>
.n-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>


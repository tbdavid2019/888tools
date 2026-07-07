<script setup lang="ts">
const props = withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
});

const { availableLocales, locale } = useI18n();

const localesLong: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  no: 'Norwegian',
  pt: 'Português',
  ru: 'Русский',
  uk: 'Українська',
  zh: '简体中文',
  'zh-TW': '繁體中文',
  vi: 'Tiếng Việt',
};

const localeOptions = computed(() =>
  availableLocales.map(locale => ({
    label: localesLong[locale] ?? locale,
    value: locale,
  })),
);

const compactLabel = computed(() => String(locale.value).toUpperCase().replace('-', ''));
</script>

<template>
  <c-select
    v-model:value="locale"
    :options="localeOptions"
    placeholder="Select a language"
    :class="[props.compact ? 'w-56px' : 'w-100px', { compact: props.compact }]"
  >
    <template v-if="props.compact" #displayed-value>
      <span class="compact-value">{{ compactLabel }}</span>
    </template>
  </c-select>
</template>

<style scoped lang="less">
.compact {
  ::v-deep(.c-select-input) {
    padding: 0 8px;
  }

  ::v-deep(.chevron) {
    display: none;
  }
}

.compact-value {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>

<script setup lang="ts">
import { useHead } from '@vueuse/head';
import { config } from '@/config';

useHead({
  title: 'About - Tool.David888.com',
  link: [
    {
      rel: 'canonical',
      href: `${config.app.siteOrigin}/about`,
    },
  ],
});
</script>

<template>
  <c-markdown :markdown="$t('about.content')" mx-auto mt-50px max-w-600px />
</template>

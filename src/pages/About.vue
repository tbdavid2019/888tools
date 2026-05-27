<script setup lang="ts">
import { useHead } from '@vueuse/head';

useHead({ title: 'About - Tool.David888.com' });
</script>

<template>
  <c-markdown :markdown="$t('about.content')" mx-auto mt-50px max-w-600px />
</template>

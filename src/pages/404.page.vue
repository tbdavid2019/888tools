<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';

useHead({ title: '404 頁面不存在 - 888 TOOL' });

const route = useRoute();
const router = useRouter();
const isClearing = ref(false);

async function forceClearCacheAndReload() {
  isClearing.value = true;
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    if (window.caches) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
    // Hard reload with cache buster
    window.location.href = window.location.pathname + '?_t=' + Date.now();
  } catch (err) {
    window.location.reload();
  }
}

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center p-4">
    <div
      class="max-w-md w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-gray-200/80 dark:border-zinc-700/80 shadow-2xl rounded-3xl p-8 text-center space-y-6"
    >
      <div class="inline-flex p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/60 dark:border-amber-800/40 shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div class="space-y-2">
        <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {{ $t('404.notFound') }}
        </h1>
        <div v-if="route.fullPath" class="text-xs font-mono px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-lg inline-block break-all max-w-full">
          {{ route.fullPath }}
        </div>
      </div>

      <div class="text-sm text-gray-600 dark:text-gray-300 space-y-1 leading-relaxed">
        <p class="font-medium text-gray-800 dark:text-gray-200">
          {{ $t('404.sorry') }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ $t('404.maybe') }}
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          class="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:opacity-90 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          :disabled="isClearing"
          @click="forceClearCacheAndReload"
        >
          <svg v-if="!isClearing" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span v-else class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          <span>強制清除快取並重整</span>
        </button>

        <button
          type="button"
          class="w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium text-sm bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 transition-all cursor-pointer"
          @click="goHome"
        >
          {{ $t('404.backHome') }}
        </button>
      </div>
    </div>
  </div>
</template>

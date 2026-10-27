<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { IconRefresh } from '@tabler/icons-vue';
import { registerSW } from 'virtual:pwa-register';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

const styleStore = useStyleStore();
const palette = computed(() => styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette);
const isVisible = ref(false);
const isUpdating = ref(false);
let checkTimer: ReturnType<typeof setInterval> | undefined;
let registration: ServiceWorkerRegistration | undefined;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

async function checkForUpdates() {
  if (!registration || registration.installing || !navigator.onLine) {
    return;
  }
  try {
    await registration.update();
  }
  catch {
    // A lost connection should not interrupt the current tool.
  }
}

function checkWhenVisible() {
  if (document.visibilityState === 'visible') {
    checkForUpdates();
  }
}

async function applyUpdate() {
  if (!updateSW || isUpdating.value) {
    return;
  }
  isUpdating.value = true;
  try {
    await updateSW(true);
  }
  catch {
    isUpdating.value = false;
  }
}

onMounted(() => {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      isVisible.value = true;
    },
    onRegisteredSW(_swUrl, registered) {
      registration = registered;
      if (registration) {
        if (registration.waiting && navigator.serviceWorker.controller) {
          isVisible.value = true;
        }
        checkTimer = setInterval(checkForUpdates, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', checkWhenVisible);
        window.addEventListener('online', checkForUpdates);
      }
    },
  });
});

onBeforeUnmount(() => {
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  document.removeEventListener('visibilitychange', checkWhenVisible);
  window.removeEventListener('online', checkForUpdates);
});
</script>

<template>
  <Transition name="pwa-update">
    <aside v-if="isVisible" class="pwa-update-prompt" role="status" aria-live="polite">
      <div class="pwa-update-prompt__icon" aria-hidden="true">
        <IconRefresh :size="22" />
      </div>
      <div class="pwa-update-prompt__content">
        <strong>{{ $t('pwaUpdate.title') }}</strong>
        <p>{{ $t('pwaUpdate.description') }}</p>
        <div class="pwa-update-prompt__actions">
          <n-button size="small" :disabled="isUpdating" @click="isVisible = false">
            {{ $t('pwaUpdate.later') }}
          </n-button>
          <n-button size="small" type="primary" :loading="isUpdating" @click="applyUpdate">
            {{ $t('pwaUpdate.now') }}
          </n-button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-update-prompt {
  position: fixed;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 3000;
  display: flex;
  gap: 14px;
  width: min(380px, calc(100vw - 32px));
  padding: 18px;
  color: v-bind('palette.text');
  background: v-bind('palette.surface');
  border: 1px solid v-bind('palette.border');
  border-radius: 16px;
  box-shadow: 0 12px 36px rgb(0 0 0 / 18%);
}

.pwa-update-prompt__icon {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  min-width: 0;
  place-items: center;
  height: 42px;
  color: v-bind('palette.accent');
  background: v-bind('palette.background');
  border-radius: 12px;
}

.pwa-update-prompt__icon svg {
  width: 22px;
  height: 22px;
}

.pwa-update-prompt__content { min-width: 0; }
.pwa-update-prompt strong { font-size: var(--type-body); }
.pwa-update-prompt p { margin: 5px 0 16px; font-size: var(--type-meta); line-height: 1.5; }
.pwa-update-prompt__actions { display: flex; justify-content: flex-end; gap: 8px; }
.pwa-update-enter-active, .pwa-update-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.pwa-update-enter-from, .pwa-update-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 480px) {
  .pwa-update-prompt { right: 16px; bottom: max(16px, env(safe-area-inset-bottom)); }
}

@media (prefers-reduced-motion: reduce) {
  .pwa-update-enter-active, .pwa-update-leave-active { transition: none; }
}
</style>

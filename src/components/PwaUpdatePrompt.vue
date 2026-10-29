<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { IconRefresh } from '@tabler/icons-vue';
import { registerSW } from 'virtual:pwa-register';
import { useStyleStore } from '@/stores/style.store';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';
import { config } from '@/config';

const styleStore = useStyleStore();
const palette = computed(() => styleStore.isDarkTheme ? kanagawaDarkPalette : kanagawaLightPalette);
const isVisible = ref(false);
const isUpdating = ref(false);
const isChecking = ref(false);
const hasEditedPageData = ref(false);
const checkStatus = ref('');
let checkTimer: ReturnType<typeof setInterval> | undefined;
let registration: ServiceWorkerRegistration | undefined;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

async function checkForUpdates(manual = false) {
  if (manual && registration?.waiting) {
    isVisible.value = true;
  }
  if (!navigator.onLine) {
    if (manual) {
      checkStatus.value = 'pwaUpdate.offline';
    }
    return;
  }
  if (!registration || registration.installing || isChecking.value) {
    if (manual && !registration) {
      checkStatus.value = 'pwaUpdate.failed';
    }
    return;
  }
  isChecking.value = true;
  if (manual) {
    checkStatus.value = 'pwaUpdate.checking';
  }
  try {
    await registration.update();
    if (manual) {
      checkStatus.value = 'pwaUpdate.checked';
    }
  }
  catch {
    // A lost connection should not interrupt the current tool.
    if (manual) {
      checkStatus.value = navigator.onLine ? 'pwaUpdate.failed' : 'pwaUpdate.offline';
    }
  }
  finally {
    isChecking.value = false;
  }
}

function hasActiveEditor() {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement
    && (activeElement.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(activeElement.tagName));
}

function isHomePage() {
  const basePath = new URL(config.app.baseUrl, window.location.origin).pathname.replace(/\/+$/, '') || '/';
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  return currentPath === basePath;
}

function handleUpdateReady() {
  if (!isHomePage() || hasEditedPageData.value || hasActiveEditor()) {
    isVisible.value = true;
    return;
  }
  void applyUpdate();
}

function markPageDataEdited(event: Event) {
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
    hasEditedPageData.value = true;
  }
}

function checkWhenVisible() {
  if (document.visibilityState === 'visible') {
    checkForUpdates();
  }
}

function checkWhenOnline() {
  if (navigator.onLine) {
    void checkForUpdates();
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
  // Keep edits protected for the rest of this page session once a user changes a field.
  document.addEventListener('input', markPageDataEdited, true);
  document.addEventListener('change', markPageDataEdited, true);
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: handleUpdateReady,
    onRegisteredSW(_swUrl, registered) {
      registration = registered;
      if (registration) {
        if (registration.waiting && navigator.serviceWorker?.controller) {
          handleUpdateReady();
        }
        checkTimer = setInterval(checkForUpdates, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', checkWhenVisible);
        window.addEventListener('online', checkWhenOnline);
        window.addEventListener('offline', checkWhenOnline);
        // Check once as soon as registration is available, including on a fresh app opening.
        void checkForUpdates();
      }
    },
  });
});

onBeforeUnmount(() => {
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  document.removeEventListener('visibilitychange', checkWhenVisible);
  window.removeEventListener('online', checkWhenOnline);
  window.removeEventListener('offline', checkWhenOnline);
  document.removeEventListener('input', markPageDataEdited, true);
  document.removeEventListener('change', markPageDataEdited, true);
});
</script>

<template>
  <div class="pwa-version-control" role="group" :aria-label="$t('pwaUpdate.version')">
    <span>{{ $t('pwaUpdate.version') }} {{ config.app.gitSha }}</span>
    <n-button size="tiny" quaternary :loading="isChecking" :disabled="isChecking" @click="checkForUpdates(true)">
      {{ $t('pwaUpdate.check') }}
    </n-button>
    <span v-if="checkStatus" class="pwa-check-status" role="status" aria-live="polite">{{ $t(checkStatus) }}</span>
  </div>
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

.pwa-version-control {
  position: fixed;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 2999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 12px;
  color: v-bind('palette.text');
  background: v-bind('palette.surface');
  border: 1px solid v-bind('palette.border');
  border-radius: 999px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
  font-size: var(--type-caption);
}

.pwa-check-status {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  width: max-content;
  max-width: min(320px, calc(100vw - 32px));
  padding: 7px 10px;
  color: v-bind('palette.text');
  background: v-bind('palette.surface');
  border: 1px solid v-bind('palette.border');
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
  font-size: var(--type-caption);
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

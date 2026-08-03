<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { type BeforeInstallPromptEvent, createPwaInstallPrompt, isPwaInstalled } from '@/composable/pwaInstallPrompt';

const installPrompt = createPwaInstallPrompt();
const userAgent = navigator.userAgent;
const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent);
const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
const usesManualInstructions = computed(() => installPrompt.installMethod.value === 'manual');

function handleBeforeInstallPrompt(event: Event) {
  installPrompt.handleBeforeInstallPrompt(event as BeforeInstallPromptEvent);
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', installPrompt.handleAppInstalled);

  if (isSafari && !isPwaInstalled()) {
    installPrompt.showManualInstructions();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', installPrompt.handleAppInstalled);
});
</script>

<template>
  <n-modal v-model:show="installPrompt.isVisible.value" :mask-closable="false">
    <n-card
      class="pwa-install-prompt"
      title="安裝 888 TOOL"
      :bordered="false"
      role="dialog"
      aria-modal="true"
    >
      <p v-if="usesManualInstructions && isAppleMobile">
        請按 Safari 的「分享」按鈕，選擇「加入主畫面」完成安裝。
      </p>
      <p v-else-if="usesManualInstructions">
        請從 Safari 選單列選擇「檔案」→「加入 Dock」完成安裝。
      </p>
      <p v-else>
        安裝後可從主畫面快速開啟，並能離線使用已快取的工具。
      </p>

      <template #action>
        <div class="pwa-install-prompt__actions">
          <n-button @click="installPrompt.dismiss">
            稍後再說
          </n-button>
          <n-button v-if="!usesManualInstructions" type="primary" @click="installPrompt.install">
            立即安裝
          </n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
.pwa-install-prompt {
  width: min(420px, calc(100vw - 32px));
}

.pwa-install-prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

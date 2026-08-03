import { ref } from 'vue';

export interface BeforeInstallPromptEvent {
  preventDefault: () => void
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaDisplayEnvironment {
  matchMedia?: (query: string) => { matches: boolean }
  navigator?: { standalone?: boolean }
}

export function isPwaInstalled(browser: PwaDisplayEnvironment | undefined = typeof window === 'undefined' ? undefined : window) {
  return browser?.matchMedia?.('(display-mode: standalone)').matches === true
    || browser?.navigator?.standalone === true;
}

export function createPwaInstallPrompt(isInstalled = isPwaInstalled) {
  const isVisible = ref(false);
  const installMethod = ref<'manual' | 'native'>('native');
  let deferredPrompt: BeforeInstallPromptEvent | undefined;

  function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
    if (isInstalled()) {
      return;
    }

    event.preventDefault();
    deferredPrompt = event;
    installMethod.value = 'native';
    isVisible.value = true;
  }

  function showManualInstructions() {
    if (isInstalled()) {
      return;
    }

    installMethod.value = 'manual';
    isVisible.value = true;
  }

  async function install() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = undefined;
    isVisible.value = false;
  }

  function dismiss() {
    isVisible.value = false;
  }

  function handleAppInstalled() {
    deferredPrompt = undefined;
    isVisible.value = false;
  }

  return {
    dismiss,
    handleAppInstalled,
    handleBeforeInstallPrompt,
    install,
    installMethod,
    isVisible,
    showManualInstructions,
  };
}

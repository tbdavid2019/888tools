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

export const PWA_PROMPT_DISMISSED_KEY = '888tools_pwa_prompt_dismissed_at';
export const PWA_DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function isPromptDismissedRecently(
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage,
  cooldownMs: number = PWA_DISMISS_COOLDOWN_MS,
  now: number = Date.now(),
): boolean {
  if (!storage) {
    return false;
  }
  try {
    const raw = storage.getItem(PWA_PROMPT_DISMISSED_KEY);
    if (!raw) {
      return false;
    }
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) {
      return false;
    }
    return now - timestamp < cooldownMs;
  } catch {
    return false;
  }
}

export function recordPromptDismissed(
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage,
  now: number = Date.now(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PWA_PROMPT_DISMISSED_KEY, String(now));
  } catch {}
}

export function createPwaInstallPrompt(
  isInstalled = isPwaInstalled,
  isDismissed = isPromptDismissedRecently,
  recordDismissed = recordPromptDismissed,
) {
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

    if (isDismissed()) {
      return;
    }

    isVisible.value = true;
  }

  function showManualInstructions() {
    if (isInstalled() || isDismissed()) {
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
    recordDismissed();
    isVisible.value = false;
  }

  function handleAppInstalled() {
    recordDismissed();
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

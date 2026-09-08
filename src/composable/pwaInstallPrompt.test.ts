import { describe, expect, it, vi } from 'vitest';
import { createPwaInstallPrompt, isPwaInstalled } from './pwaInstallPrompt';

describe('createPwaInstallPrompt', () => {
  it('shows an install prompt when the browser reports the app is installable', async () => {
    const installPrompt = createPwaInstallPrompt();
    const prompt = vi.fn();
    const preventDefault = vi.fn();

    installPrompt.handleBeforeInstallPrompt({
      preventDefault,
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(installPrompt.isVisible.value).toBe(true);

    await installPrompt.install();

    expect(prompt).toHaveBeenCalledOnce();
    expect(installPrompt.isVisible.value).toBe(false);
  });

  it('hides the prompt when the user chooses not to install', () => {
    const installPrompt = createPwaInstallPrompt();

    installPrompt.handleBeforeInstallPrompt({
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });
    installPrompt.dismiss();

    expect(installPrompt.isVisible.value).toBe(false);
  });

  it('does not show an install prompt after the app has been installed', () => {
    const installPrompt = createPwaInstallPrompt(() => true);
    const preventDefault = vi.fn();

    installPrompt.handleBeforeInstallPrompt({
      preventDefault,
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(installPrompt.isVisible.value).toBe(false);

    installPrompt.showManualInstructions();

    expect(installPrompt.isVisible.value).toBe(false);
  });

  it('recognizes standalone display mode as an installed PWA', () => {
    expect(isPwaInstalled({
      matchMedia: () => ({ matches: true }),
      navigator: {},
    })).toBe(true);
  });

  it('records dismissal and suppresses prompt within 3-day cooldown', () => {
    let dismissed = false;
    const recordDismissed = vi.fn(() => {
      dismissed = true;
    });
    const isDismissed = vi.fn(() => dismissed);

    const installPrompt = createPwaInstallPrompt(() => false, isDismissed, recordDismissed);

    // Initial trigger
    installPrompt.handleBeforeInstallPrompt({
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });
    expect(installPrompt.isVisible.value).toBe(true);

    // User dismisses
    installPrompt.dismiss();
    expect(installPrompt.isVisible.value).toBe(false);
    expect(recordDismissed).toHaveBeenCalledOnce();

    // Next page reload / trigger during cooldown
    installPrompt.handleBeforeInstallPrompt({
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });
    // Should NOT be shown again!
    expect(installPrompt.isVisible.value).toBe(false);

    // Manual instructions (Safari) should also be suppressed!
    installPrompt.showManualInstructions();
    expect(installPrompt.isVisible.value).toBe(false);
  });
});

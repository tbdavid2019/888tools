import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import PwaUpdatePrompt from './PwaUpdatePrompt.vue';

const { registerSW, updateSW } = vi.hoisted(() => ({
  registerSW: vi.fn(),
  updateSW: vi.fn(async () => {}),
}));

vi.mock('virtual:pwa-register', () => ({ registerSW }));

describe('PwaUpdatePrompt', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function mountPrompt(isHomePage = true) {
    registerSW.mockReturnValue(updateSW);
    const wrapper = mount(PwaUpdatePrompt, {
      props: { isHomePage },
      global: {
        plugins: [createPinia()],
        mocks: { $t: (key: string) => key },
        stubs: {
          'n-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
      },
    });
    const options = registerSW.mock.calls[0][0];
    return { wrapper, options };
  }

  it('keeps a pending update available when page data has been edited', async () => {
    const { wrapper, options } = mountPrompt();
    const input = document.createElement('input');
    document.body.append(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);

    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    expect(updateSW).not.toHaveBeenCalled();

    await wrapper.find('.pwa-update-prompt').findAll('button')[0].trigger('click');
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);
    expect(updateSW).not.toHaveBeenCalled();

    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    await wrapper.find('.pwa-update-prompt').findAll('button')[1].trigger('click');
    expect(updateSW).toHaveBeenCalledOnce();
    expect(updateSW).toHaveBeenCalledWith(true);
    input.remove();
    wrapper.unmount();
  });

  it('activates a new version automatically when there are no edits in progress', () => {
    const { wrapper, options } = mountPrompt();
    options.onNeedRefresh();
    expect(updateSW).toHaveBeenCalledWith(true);
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps updates manual after visiting a tool and returning home', async () => {
    const { wrapper, options } = mountPrompt();
    await wrapper.setProps({ isHomePage: false });
    await wrapper.setProps({ isHomePage: true });
    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    expect(updateSW).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps updates manual while on a tool page, even without form edits', async () => {
    window.history.pushState({}, '', '/tools/example');
    const { wrapper, options } = mountPrompt(false);
    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    expect(updateSW).not.toHaveBeenCalled();
    wrapper.unmount();
    window.history.pushState({}, '', '/');
  });

  it('reopens an already waiting update from the manual check control', async () => {
    window.history.pushState({}, '', '/tools/example');
    const { wrapper, options } = mountPrompt(false);
    const update = vi.fn(async () => {});
    options.onRegisteredSW('/sw.js', { update, waiting: {} } as ServiceWorkerRegistration);
    await flushPromises();

    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    await wrapper.find('.pwa-update-prompt').findAll('button')[0].trigger('click');
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);

    await wrapper.find('.pwa-version-control button').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    await flushPromises();
    expect(update).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    window.history.pushState({}, '', '/');
  });

  it('reopens a waiting update after a later online check', async () => {
    const { wrapper, options } = mountPrompt();
    const update = vi.fn(async () => {});
    options.onRegisteredSW('/sw.js', { update, waiting: {} } as ServiceWorkerRegistration);
    await flushPromises();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);

    window.dispatchEvent(new Event('online'));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    wrapper.unmount();
  });

  it('reports when a worker is still installing', async () => {
    const { wrapper, options } = mountPrompt();
    const update = vi.fn(async () => {});
    options.onRegisteredSW('/sw.js', { update, installing: {} } as ServiceWorkerRegistration);
    await flushPromises();

    await wrapper.find('.pwa-version-control button').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-check-status').text()).toBe('pwaUpdate.installing');
    wrapper.unmount();
  });

  it('shows a retryable prompt when applying an update fails', async () => {
    const { wrapper, options } = mountPrompt();
    updateSW.mockRejectedValueOnce(new Error('activation failed'));
    options.onNeedRefresh();
    await flushPromises();

    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    expect(wrapper.find('.pwa-update-prompt__error').text()).toBe('pwaUpdate.applyFailed');
    await wrapper.find('.pwa-update-prompt').findAll('button')[1].trigger('click');
    await flushPromises();
    expect(updateSW).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('shows visible states for successful, offline, and failed manual checks', async () => {
    const { wrapper, options } = mountPrompt();
    const update = vi.fn(async () => {});
    options.onRegisteredSW('/sw.js', { update });
    await flushPromises();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await wrapper.find('.pwa-version-control button').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-check-status').text()).toBe('pwaUpdate.offline');

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    update.mockRejectedValueOnce(new Error('offline'));
    await wrapper.find('.pwa-version-control button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.pwa-check-status').text()).toBe('pwaUpdate.failed');

    await wrapper.find('.pwa-version-control button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.pwa-check-status').text()).toBe('pwaUpdate.checked');
    wrapper.unmount();
  });

  it('checks the registered worker when the app returns online', async () => {
    const { wrapper, options } = mountPrompt();
    const update = vi.fn(async () => {});
    options.onRegisteredSW('/sw.js', { update });
    await flushPromises();
    expect(update).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(update).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});

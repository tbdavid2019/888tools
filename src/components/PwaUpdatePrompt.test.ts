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

  function mountPrompt() {
    registerSW.mockReturnValue(updateSW);
    const wrapper = mount(PwaUpdatePrompt, {
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

  it('waits for approval before activating a new version', async () => {
    const { wrapper, options } = mountPrompt();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);

    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    expect(updateSW).not.toHaveBeenCalled();

    await wrapper.findAll('button')[0].trigger('click');
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(false);
    expect(updateSW).not.toHaveBeenCalled();

    options.onNeedRefresh();
    await wrapper.vm.$nextTick();
    await wrapper.findAll('button')[1].trigger('click');
    expect(updateSW).toHaveBeenCalledOnce();
    expect(updateSW).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it('checks the registered worker when the app returns online', async () => {
    const { wrapper, options } = mountPrompt();
    const update = vi.fn(async () => {});
    options.onRegisteredSW('/sw.js', { update });
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(update).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});

// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import Bip39Generator from './bip39-generator.vue';

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<any>('naive-ui');
  return {
    ...actual,
    useMessage: () => ({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    }),
  };
});

const i18n = createI18n({
  legacy: false,
  locale: 'zh-TW',
  messages: {
    'zh-TW': {
      'tools.bip39-generator.languageLabel': '語言：',
      'tools.bip39-generator.entropyLabel': 'Entropy (種子)：',
      'tools.bip39-generator.passphraseLabel': '助記詞片語 (Passphrase)：',
      'tools.bip39-generator.entropyCopied': 'Entropy 已複製到剪貼簿',
      'tools.bip39-generator.passphraseCopied': '助記詞已複製到剪貼簿',
      'tools.bip39-generator.chineseNoticeTitle': 'BIP-39 中文助記詞規範與相容性提醒',
      'tools.bip39-generator.chineseCharRuleLabel': '單字規範（官方標準）',
      'tools.bip39-generator.chineseCharRuleText': '依據比特幣 BIP-39 官方規範...',
      'tools.bip39-generator.compatLabel': '錢包相容性重要提醒',
      'tools.bip39-generator.chineseCompatText': '全球主流軟硬體錢包...',
      'tools.bip39-generator.nonEnglishNoticeTitle': '非英語助記詞相容性提醒',
      'tools.bip39-generator.nonEnglishCompatText': '主流軟硬體錢包...',
    },
  },
});

const CSelectStub = defineComponent({
  name: 'CSelect',
  props: ['value'],
  emits: ['update:value'],
  template: '<div class="c-select-stub"><slot /></div>',
});

const NAlertStub = defineComponent({
  name: 'NAlert',
  props: ['title', 'type'],
  template: '<div class="n-alert-stub" :data-title="title"><slot /></div>',
});

describe('bip39-generator.vue', () => {
  it('renders correctly with default English language without alerts', () => {
    const wrapper = mount(Bip39Generator, {
      global: {
        plugins: [i18n],
        stubs: {
          'c-select': CSelectStub,
          'c-input-text': true,
          'c-button': true,
          'n-grid': true,
          'n-gi': true,
          'n-form-item': true,
          'n-input-group': true,
          'n-icon': true,
        },
      },
    });

    expect(wrapper.find('.n-alert').exists()).toBe(false);
  });

  it('shows Chinese notice when Chinese traditional is selected', async () => {
    const wrapper = mount(Bip39Generator, {
      global: {
        plugins: [i18n],
        stubs: {
          'c-select': CSelectStub,
          'c-input-text': true,
          'c-button': true,
          'n-grid': true,
          'n-gi': true,
          'n-form-item': true,
          'n-input-group': true,
          'n-icon': true,
        },
      },
    });

    await wrapper.findComponent(CSelectStub).vm.$emit('update:value', 'Chinese traditional');
    await wrapper.vm.$nextTick();

    const alert = wrapper.find('.n-alert');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('BIP-39 中文助記詞規範與相容性提醒');
    expect(alert.text()).toContain('單字規範（官方標準）');
    expect(alert.text()).toContain('錢包相容性重要提醒');
  });

  it('shows non-English notice when Japanese is selected', async () => {
    const wrapper = mount(Bip39Generator, {
      global: {
        plugins: [i18n],
        stubs: {
          'c-select': CSelectStub,
          'c-input-text': true,
          'c-button': true,
          'n-grid': true,
          'n-gi': true,
          'n-form-item': true,
          'n-input-group': true,
          'n-icon': true,
        },
      },
    });

    await wrapper.findComponent(CSelectStub).vm.$emit('update:value', 'Japanese');
    await wrapper.vm.$nextTick();

    const alert = wrapper.find('.n-alert');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('非英語助記詞相容性提醒');
    expect(alert.text()).toContain('錢包相容性重要提醒');
    expect(alert.text()).not.toContain('單字規範');
  });

  it('hides notice when switching back to English', async () => {
    const wrapper = mount(Bip39Generator, {
      global: {
        plugins: [i18n],
        stubs: {
          'c-select': CSelectStub,
          'c-input-text': true,
          'c-button': true,
          'n-grid': true,
          'n-gi': true,
          'n-form-item': true,
          'n-input-group': true,
          'n-icon': true,
        },
      },
    });

    await wrapper.findComponent(CSelectStub).vm.$emit('update:value', 'Chinese traditional');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.n-alert').exists()).toBe(true);

    await wrapper.findComponent(CSelectStub).vm.$emit('update:value', 'English');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.n-alert').exists()).toBe(false);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { convertOpenCC } from '@/services/opencc.service';
import TongwenConverter from './tongwen-converter.vue';

// Setup in-memory localStorage if current test runtime lacks storage methods
const memStore = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => memStore.set(k, String(v)),
  removeItem: (k: string) => memStore.delete(k),
  clear: () => memStore.clear(),
  get length() {
    return memStore.size;
  },
  key: (i: number) => Array.from(memStore.keys())[i] ?? null,
};
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: safeStorage,
    writable: true,
    configurable: true,
  });
}
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: safeStorage,
    writable: true,
    configurable: true,
  });
}

if (typeof document !== 'undefined') {
  document.execCommand = vi.fn();
}
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('剪貼簿文字'),
    },
    writable: true,
    configurable: true,
  });
}

const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<any>('naive-ui');
  return {
    ...actual,
    useMessage: () => mockMessage,
    NIcon: defineComponent({
      name: 'NIcon',
      template: '<span class="n-icon-stub"><slot /></span>',
    }),
  };
});

const CCardStub = defineComponent({
  name: 'CCard',
  props: ['title'],
  template: '<div class="c-card-stub"><slot /></div>',
});

const CButtonStub = defineComponent({
  name: 'CButton',
  props: ['disabled', 'type', 'size', 'secondary', 'tertiary'],
  emits: ['click'],
  template: '<button class="c-button-stub" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
});

const CInputTextStub = defineComponent({
  name: 'CInputText',
  props: ['value', 'placeholder', 'multiline', 'rawText', 'readonly', 'rows'],
  emits: ['update:value', 'paste'],
  template: '<textarea class="c-input-text-stub" :value="value" :readonly="readonly" @input="$emit(\'update:value\', $event.target.value)" @paste="$emit(\'paste\', $event)" />',
});

describe('TongWen Converter using OpenCC', () => {
  it('should convert "发" to "發" by default (s2t)', async () => {
    const input = '发';
    const expected = '發';
    expect(convertOpenCC(input, 's2t')).toBe(expected);
  });

  it('should convert "理发" to "理髮" (phrase override)', async () => {
    const input = '理发';
    const expected = '理髮';
    expect(convertOpenCC(input, 's2t')).toBe(expected);
  });

  it('should convert "发现" to "發現" (default mapping)', async () => {
    const input = '发现';
    const expected = '發現';
    expect(convertOpenCC(input, 's2t')).toBe(expected);
  });

  it('should convert "头发" to "頭髮" (phrase override)', async () => {
    const input = '头发';
    const expected = '頭髮';
    expect(convertOpenCC(input, 's2t')).toBe(expected);
  });

  it('should conversion mixing phrases: "我发现他的头发理发了"', async () => {
    const input = '我发现他的头发理发了';
    const expected = '我發現他的頭髮理髮了';
    expect(convertOpenCC(input, 's2t')).toBe(expected);
  });

  it('should convert "千钧一发" to "千鈞一髮"', async () => {
    expect(convertOpenCC('千钧一发', 's2t')).toBe('千鈞一髮');
  });

  it('should convert "开发" to "開發"', async () => {
    expect(convertOpenCC('开发', 's2t')).toBe('開發');
  });

  it('should convert "问卷" to "問卷" (phrase override)', async () => {
    expect(convertOpenCC('问卷', 's2t')).toBe('問卷');
  });
});

describe('tongwen-converter.vue Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    safeStorage.clear();
    vi.clearAllMocks();
  });

  function createWrapper() {
    return mount(TongwenConverter, {
      global: {
        stubs: {
          'c-card': CCardStub,
          'c-button': CButtonStub,
          'c-input-text': CInputTextStub,
        },
      },
    });
  }

  it('mounts with default s2t direction and flat segmented buttons', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);

    // Direction segmented buttons
    expect(wrapper.text()).toContain('簡體➔繁體');
    expect(wrapper.text()).toContain('繁體➔簡體');
  });

  it('reads initial direction from localStorage if present', () => {
    safeStorage.setItem('tongwen-converter-direction', 't2s');
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('原始文 (繁)');
  });

  it('converts input text and updates HUD stats', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);
    expect(inputBoxes.length).toBe(2);

    inputBoxes[0].vm.$emit('update:value', '简体中文测试\n第二行');
    await nextTick();

    expect(inputBoxes[1].props('value')).toBe('簡體中文測試\n第二行');
    expect(wrapper.text()).toContain('2 行 · 10 字');
  });

  it('swaps direction between s2t and t2s and updates storage', async () => {
    const wrapper = createWrapper();
    const swapBtn = wrapper.find('button[title="切換方向"]');
    expect(swapBtn.exists()).toBe(true);

    await swapBtn.trigger('click');
    await nextTick();

    expect(safeStorage.getItem('tongwen-converter-direction')).toBe('t2s');
  });

  it('clears text and result when clear button is clicked', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);

    inputBoxes[0].vm.$emit('update:value', '测试');
    await nextTick();
    expect(inputBoxes[1].props('value')).toBe('測試');

    const buttons = wrapper.findAllComponents(CButtonStub);
    const clearBtn = buttons.find(b => b.text().includes('清空') || b.text().includes('clear'));
    expect(clearBtn).toBeDefined();

    await clearBtn!.trigger('click');
    await nextTick();

    expect(inputBoxes[0].props('value')).toBe('');
    expect(inputBoxes[1].props('value')).toBe('');
  });

  it('pastes from clipboard and automatically switches to output tab', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);

    const buttons = wrapper.findAllComponents(CButtonStub);
    const pasteBtn = buttons.find(b => b.text().includes('貼上剪貼簿') || b.text().includes('paste'));
    expect(pasteBtn).toBeDefined();

    await pasteBtn!.trigger('click');
    await nextTick();
    await nextTick();

    expect(inputBoxes[0].props('value')).toBe('剪貼簿文字');
    expect(inputBoxes[1].props('value')).toBe('剪貼簿文字');
    expect(mockMessage.success).toHaveBeenCalled();
  });

  it('handles paste event and automatically switches to output tab', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);

    const pasteEvent = {
      clipboardData: {
        getData: (format: string) => (format === 'text' ? '测试自动切页' : ''),
      },
    };

    inputBoxes[0].vm.$emit('paste', pasteEvent);
    await nextTick();

    expect(inputBoxes[0].props('value')).toBe('测试自动切页');
    expect(inputBoxes[1].props('value')).toBe('測試自動切頁');
    expect(mockMessage.success).toHaveBeenCalled();
  });
});

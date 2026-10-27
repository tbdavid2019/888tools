// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
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
    NTabs: defineComponent({
      name: 'NTabs',
      props: ['value', 'type', 'animated'],
      emits: ['update:value'],
      template: '<div class="n-tabs-stub" :data-active="value"><slot /></div>',
    }),
    NTabPane: defineComponent({
      name: 'NTabPane',
      props: ['name', 'tab'],
      template: '<div class="n-tab-pane-stub" :data-name="name" :data-tab="tab"><slot /></div>',
    }),
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

const CSelectStub = defineComponent({
  name: 'CSelect',
  props: ['value', 'options', 'label'],
  emits: ['update:value'],
  template: '<div class="c-select-stub"><slot /></div>',
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
  emits: ['update:value'],
  template: '<textarea class="c-input-text-stub" :value="value" :readonly="readonly" @input="$emit(\'update:value\', $event.target.value)" />',
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
    safeStorage.clear();
    vi.clearAllMocks();
  });

  function createWrapper() {
    return mount(TongwenConverter, {
      global: {
        stubs: {
          'c-card': CCardStub,
          'c-select': CSelectStub,
          'c-button': CButtonStub,
          'c-input-text': CInputTextStub,
        },
      },
    });
  }

  it('mounts with default s2t direction and input tab', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);

    const tabs = wrapper.find('.n-tabs-stub');
    expect(tabs.attributes('data-active')).toBe('input');

    const select = wrapper.findComponent(CSelectStub);
    expect(select.props('value')).toBe('s2t');
  });

  it('reads initial direction from localStorage if present', () => {
    safeStorage.setItem('tongwen-converter-direction', 't2s');
    const wrapper = createWrapper();
    const select = wrapper.findComponent(CSelectStub);
    expect(select.props('value')).toBe('t2s');
  });

  it('converts input text and updates HUD stats', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);
    expect(inputBoxes.length).toBe(2);

    // Tab 1 input textarea
    inputBoxes[0].vm.$emit('update:value', '简体中文测试\n第二行');
    await nextTick();

    // Result should automatically update via OpenCC watcher
    expect(inputBoxes[1].props('value')).toBe('簡體中文測試\n第二行');

    // Tab 1 pane should have char count in title
    const panes = wrapper.findAll('.n-tab-pane-stub');
    expect(panes[0].attributes('data-tab')).toContain('10');
    // Tab 2 pane should have ready checkmark
    expect(panes[1].attributes('data-tab')).toContain('✓');

    // Check HUD text in input tab
    expect(wrapper.text()).toContain('2 行 · 10 字');
  });

  it('swaps direction between s2t and t2s and updates storage', async () => {
    const wrapper = createWrapper();
    const select = wrapper.findComponent(CSelectStub);
    expect(select.props('value')).toBe('s2t');

    // Click swap direction button
    const buttons = wrapper.findAllComponents(CButtonStub);
    const swapBtn = buttons.find(b => b.text().includes('切換方向') || b.text().includes('swap'));
    expect(swapBtn).toBeDefined();

    await swapBtn!.trigger('click');
    await nextTick();

    expect(select.props('value')).toBe('t2s');
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

  it('switches to output tab when convertAndSwitch is clicked and can return', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);
    const tabs = wrapper.find('.n-tabs-stub');

    inputBoxes[0].vm.$emit('update:value', '测试');
    await nextTick();

    const buttons = wrapper.findAllComponents(CButtonStub);
    const switchBtn = buttons.find(b => b.text().includes('轉換前往結果') || b.text().includes('convertAndSwitch'));
    expect(switchBtn).toBeDefined();

    await switchBtn!.trigger('click');
    await nextTick();

    expect(tabs.attributes('data-active')).toBe('output');

    // Back to input tab button
    const backBtn = buttons.find(b => b.text().includes('返回修改原文') || b.text().includes('backToInput'));
    expect(backBtn).toBeDefined();

    await backBtn!.trigger('click');
    await nextTick();

    expect(tabs.attributes('data-active')).toBe('input');
  });

  it('triggers convertAndCopy without leaving input tab', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);
    const tabs = wrapper.find('.n-tabs-stub');

    inputBoxes[0].vm.$emit('update:value', '简体输入');
    await nextTick();

    const buttons = wrapper.findAllComponents(CButtonStub);
    const convertCopyBtn = buttons.find(b => b.text().includes('轉換並立即複製') || b.text().includes('convertAndCopy'));
    expect(convertCopyBtn).toBeDefined();

    await convertCopyBtn!.trigger('click');
    await nextTick();

    // Tab stays at input tab
    expect(tabs.attributes('data-active')).toBe('input');
    // Result is converted
    expect(inputBoxes[1].props('value')).toBe('簡體輸入');
  });

  it('pastes text from clipboard when paste button is clicked', async () => {
    const wrapper = createWrapper();
    const inputBoxes = wrapper.findAllComponents(CInputTextStub);

    const buttons = wrapper.findAllComponents(CButtonStub);
    const pasteBtn = buttons.find(b => b.text().includes('貼上剪貼簿') || b.text().includes('paste'));
    expect(pasteBtn).toBeDefined();

    await pasteBtn!.trigger('click');
    await nextTick();
    await nextTick();

    expect(inputBoxes[0].props('value')).toBe('剪貼簿文字');
    expect(mockMessage.success).toHaveBeenCalled();
  });
});

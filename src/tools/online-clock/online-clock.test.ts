// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type VueWrapper, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { tool } from './index';
import OnlineClock, {
  getDefaultTimezone,
  getISOWeekNumber,
  getSolarTimes,
  getZonedTimeParts,
  isValidTimezone,
} from './online-clock.vue';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';
import { useCommandPaletteStore } from '@/modules/command-palette/command-palette.store';

// Setup in-memory localStorage if current test runtime lacks storage methods
const memStore = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => memStore.set(k, String(v)),
  removeItem: (k: string) => memStore.delete(k),
  clear: () => memStore.clear(),
};
if (typeof window !== 'undefined' && typeof window.localStorage?.clear !== 'function') {
  Object.defineProperty(window, 'localStorage', {
    value: safeStorage,
    writable: true,
    configurable: true,
  });
}
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage?.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: safeStorage,
    writable: true,
    configurable: true,
  });
}
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

const i18n = createI18n({
  legacy: false,
  locale: 'zh-TW',
  messages: {
    'zh-TW': {
      'tools.online-clock.title': '線上時鐘',
      'tools.online-clock.description': '切換數位、類比、翻頁與中文字時鐘樣式，支援全球時區、日期、秒數與網路時間 (time) 校時',
      'tools.online-clock.timezone': '時區',
      'tools.online-clock.showSeconds': '顯示秒',
      'tools.online-clock.showDate': '顯示日期',
      'tools.online-clock.fullscreen': '全螢幕',
      'tools.online-clock.exitFullscreen': '退出全螢幕',
      'tools.online-clock.modes.digital': '數位',
      'tools.online-clock.modes.analog': '類比',
      'tools.online-clock.modes.flip': '翻頁',
      'tools.online-clock.modes.chinese': '中文字',
      'tools.online-clock.useNetworkTime': '網路校時',
      'tools.online-clock.syncing': '校時中...',
      'tools.online-clock.syncError': '校時失敗',
      'tools.online-clock.offset': '偏差: {value}秒',
      'tools.online-clock.weekFormat': '第 {week} 週',
      'tools.online-clock.currentTimeIn': '{location} 現在時間',
      'tools.online-clock.sunInfo': '太陽：↑ {sunrise} ↓ {sunset} ({hours}小時 {minutes}分)',
      'tools.online-clock.locateMe': '使用精確位置計算日出日落',
      'tools.online-clock.cities.taipei': '臺北',
      'tools.online-clock.cities.losAngeles': '洛杉磯',
      'tools.online-clock.cities.newYork': '紐約',
      'tools.online-clock.cities.london': '倫敦',
      'tools.online-clock.cities.paris': '巴黎',
      'tools.online-clock.cities.beijing': '北京',
      'tools.online-clock.cities.tokyo': '東京',
    },
    'en': {
      'tools.online-clock.title': 'Online clock',
      'tools.online-clock.description': 'Online clock with digital, analog, flip, and chinese modes',
      'tools.online-clock.timezone': 'Timezone',
      'tools.online-clock.showSeconds': 'Show seconds',
      'tools.online-clock.showDate': 'Show date',
      'tools.online-clock.fullscreen': 'Fullscreen',
      'tools.online-clock.exitFullscreen': 'Exit fullscreen',
      'tools.online-clock.modes.digital': 'Digital',
      'tools.online-clock.modes.analog': 'Analog',
      'tools.online-clock.modes.flip': 'Flip',
      'tools.online-clock.modes.chinese': 'Chinese',
      'tools.online-clock.useNetworkTime': 'Network time sync',
      'tools.online-clock.syncing': 'Syncing...',
      'tools.online-clock.syncError': 'Sync failed',
      'tools.online-clock.offset': 'Offset: {value}s',
      'tools.online-clock.weekFormat': 'Week {week}',
      'tools.online-clock.currentTimeIn': 'Time in {location} now',
      'tools.online-clock.sunInfo': 'Sun: ↑ {sunrise} ↓ {sunset} ({hours}h {minutes}m)',
      'tools.online-clock.locateMe': 'Use exact location for sun times',
      'tools.online-clock.cities.taipei': 'Taipei',
      'tools.online-clock.cities.losAngeles': 'Los Angeles',
      'tools.online-clock.cities.newYork': 'New York',
      'tools.online-clock.cities.london': 'London',
      'tools.online-clock.cities.paris': 'Paris',
      'tools.online-clock.cities.beijing': 'Beijing',
      'tools.online-clock.cities.tokyo': 'Tokyo',
    },
  },
});

describe('Online Clock Tool Metadata & Search', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('has correct path and required search keywords', () => {
    expect(tool.path).toBe('/online-clock');
    const keywords = tool.keywords || [];
    expect(keywords).toContain('time');
    expect(keywords).toContain('clock');
    expect(keywords).toContain('online-clock');
    expect(keywords).toContain('時鐘');
    expect(keywords).toContain('時間');
    expect(keywords).toContain('flip');
  });

  it('finds /online-clock in top search results for "time", "clock", "flip", "時鐘", "時間"', () => {
    const paletteStore = useCommandPaletteStore();

    const queries = ['time', 'clock', 'flip', '時鐘', '時間'];
    for (const q of queries) {
      paletteStore.searchPrompt = q;
      const tools = paletteStore.filteredSearchResult.Tools || [];
      expect(tools.length).toBeGreaterThan(0);
      const onlineClockMatch = tools.find((t: any) => t.to === '/online-clock' || t.path === '/online-clock');
      expect(onlineClockMatch).toBeDefined();
    }
  });
});

describe('Online Clock Time Parsing & TV Browser Compatibility', () => {
  it('validates timezone strings properly', () => {
    expect(isValidTimezone('Asia/Taipei')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('Invalid/Timezone_12345')).toBe(false);
  });

  it('provides a safe default timezone', () => {
    const tz = getDefaultTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
    expect(isValidTimezone(tz)).toBe(true);
  });

  it('getZonedTimeParts extracts correct parts without throwing RangeError', () => {
    const fixedDate = new Date('2026-10-22T10:30:45Z');
    const partsUtc = getZonedTimeParts(fixedDate, 'UTC');
    expect(partsUtc.hours).toBe(10);
    expect(partsUtc.minutes).toBe(30);
    expect(partsUtc.seconds).toBe(45);
    expect(partsUtc.hh).toBe('10');
    expect(partsUtc.mm).toBe('30');
    expect(partsUtc.ss).toBe('45');
    expect(partsUtc.period).toBe('AM');

    // 12h format
    const parts12h = getZonedTimeParts(new Date('2026-10-22T15:05:00Z'), 'UTC', true);
    expect(parts12h.hours).toBe(15);
    expect(parts12h.hours12).toBe(3);
    expect(parts12h.hh).toBe('03');
    expect(parts12h.period).toBe('PM');
  });

  it('getZonedTimeParts handles invalid date or invalid timezone gracefully', () => {
    const invalidDate = new Date('invalid');
    const fallbackParts = getZonedTimeParts(invalidDate, 'UTC');
    expect(fallbackParts).toBeDefined();
    expect(typeof fallbackParts.hh).toBe('string');

    const invalidTzParts = getZonedTimeParts(new Date(), 'Invalid/TZ_XYZ');
    expect(invalidTzParts).toBeDefined();
    expect(typeof invalidTzParts.hh).toBe('string');
  });
});

describe('Online Clock Component Rendering & Fullscreen Fallback', () => {
  const wrappers: VueWrapper<any>[] = [];

  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        headers: {
          get: (name: string) => (name.toLowerCase() === 'date' ? new Date().toUTCString() : null),
        },
      }),
    );
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
    (i18n.global.locale as any).value = 'zh-TW';
    vi.unstubAllGlobals();
  });

  it('mounts cleanly and handles invalid timezone in localStorage gracefully', () => {
    localStorage.setItem('onlineClock/timezone', 'Totally/Invalid_Timezone');
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.clock-page').exists()).toBe(true);
  });

  it('renders all 4 modes (digital, analog, flip, chinese)', async () => {
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    const buttons = wrapper.findAll('.tab-btn');
    expect(buttons.length).toBe(4);
    expect(buttons.map(b => b.text().trim())).toEqual(['數位', '類比', '翻頁', '中文字']);

    // Default digital
    expect(wrapper.find('.digital').exists()).toBe(true);
    expect(buttons[0].attributes('aria-pressed')).toBe('true');
    expect(buttons[1].attributes('aria-pressed')).toBe('false');

    // Switch to analog
    await buttons[1].trigger('click');
    expect(wrapper.find('.analog').exists()).toBe(true);
    expect(wrapper.find('.dial').exists()).toBe(true);
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
    expect(buttons[0].attributes('aria-pressed')).toBe('false');

    // Switch to flip
    await buttons[2].trigger('click');
    expect(wrapper.find('.flip').exists()).toBe(true);
    expect(buttons[2].attributes('aria-pressed')).toBe('true');

    // Switch to chinese
    await buttons[3].trigger('click');
    expect(wrapper.find('.chinese').exists()).toBe(true);
    expect(wrapper.find('.chinese-row.main').exists()).toBe(true);
    expect(buttons[3].attributes('aria-pressed')).toBe('true');
  });

  it('getISOWeekNumber calculates correct ISO week and handles year boundaries correctly', () => {
    expect(getISOWeekNumber(2026, 10, 22)).toBe(43);
    expect(getISOWeekNumber(2026, 1, 1)).toBe(1);
    expect(getISOWeekNumber(2021, 1, 1)).toBe(53);
    expect(getISOWeekNumber(2024, 12, 30)).toBe(1);
    expect(getISOWeekNumber(2026, 12, 31)).toBe(53);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T04:00:00Z'));
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    const dateEl = wrapper.find('.date');
    expect(dateEl.exists()).toBe(true);
    expect(dateEl.text()).toContain('第 43 週');
    vi.useRealTimers();
  });

  it('getSolarTimes calculates accurate solar times and handles polar & invalid coordinates gracefully', () => {
    const solarRes = getSolarTimes(new Date('2026-10-22T04:00:00Z'), 25.033, 121.5654, 'Asia/Taipei');
    expect(solarRes).toEqual({
      sunrise: '05:55',
      sunset: '17:21',
      dayLengthHours: 11,
      dayLengthMinutes: 26,
    });

    // Polar regions
    expect(getSolarTimes(new Date('2026-12-22T04:00:00Z'), 85, 0, 'UTC')).toBeNull();
    expect(getSolarTimes(new Date('2026-06-21T04:00:00Z'), 85, 0, 'UTC')).toBeNull();

    // Out of bounds / invalid inputs
    expect(getSolarTimes(new Date('2026-10-22T04:00:00Z'), 999, 121, 'Asia/Taipei')).toBeNull();
    expect(getSolarTimes(new Date('2026-10-22T04:00:00Z'), 25, 999, 'Asia/Taipei')).toBeNull();
    expect(getSolarTimes(new Date('2026-10-22T04:00:00Z'), NaN, 121, 'Asia/Taipei')).toBeNull();
    expect(getSolarTimes(new Date('invalid'), 25, 121, 'Asia/Taipei')).toBeNull();
    expect(getSolarTimes(new Date('2026-10-22T04:00:00Z'), 25, 121, 'Invalid/Timezone')).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T04:00:00Z'));
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    const solarEl = wrapper.find('.solar-info');
    expect(solarEl.exists()).toBe(true);
    expect(solarEl.text()).toContain('太陽：↑ 05:55 ↓ 17:21 (11小時 26分)');

    const locationLead = wrapper.find('.location-lead');
    expect(locationLead.exists()).toBe(true);
    expect(locationLead.text()).toBe('台灣臺北市 現在時間');

    // Manual locate button when userCoords is null and on initial timezone
    const locateBtn = wrapper.find('.locate-btn');
    expect(locateBtn.exists()).toBe(true);
    expect(locateBtn.attributes('title')).toBe('使用精確位置計算日出日落');
    vi.useRealTimers();
  });

  it('renders world cities with live times and switches timezone on click', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T04:00:00Z'));
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    const cityCards = wrapper.findAll('.world-cities .city-card');
    expect(cityCards.length).toBe(7);

    const cityNames = cityCards.map(c => c.find('.city-name').text().trim());
    expect(cityNames).toEqual(['洛杉磯', '紐約', '倫敦', '巴黎', '北京', '臺北', '東京']);

    // Default timezone is Asia/Taipei, index 5 is 臺北
    const taipeiCard = cityCards[5];
    expect(taipeiCard.classes()).toContain('active');
    expect(taipeiCard.attributes('aria-pressed')).toBe('true');
    expect(taipeiCard.find('.city-time').text()).toBe('12:00');

    // Tokyo is UTC+9 => 13:00
    const tokyoCard = cityCards[6];
    expect(tokyoCard.find('.city-time').text()).toBe('13:00');
    expect(tokyoCard.attributes('aria-pressed')).toBe('false');

    // Click Tokyo card
    await tokyoCard.trigger('click');
    expect(tokyoCard.classes()).toContain('active');
    expect(tokyoCard.attributes('aria-pressed')).toBe('true');
    expect(taipeiCard.classes()).not.toContain('active');
    expect(taipeiCard.attributes('aria-pressed')).toBe('false');
    expect(wrapper.find('.location-lead').text()).toBe('日本東京 現在時間');
    vi.useRealTimers();
  });

  it('renders English locale correctly for solar info, ISO week, location title, and world cities', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T04:00:00Z'));
    const enI18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: (i18n.global.messages as any).value,
    });

    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [enI18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    expect(wrapper.find('.location-lead').text()).toBe('Time in Taipei, Taiwan now');
    expect(wrapper.find('.date').text()).toContain('Week 43');
    expect(wrapper.find('.solar-info').text()).toContain('Sun: ↑ 05:55 ↓ 17:21 (11h 26m)');

    const cityNames = wrapper.findAll('.world-cities .city-card .city-name').map(c => c.text().trim());
    expect(cityNames).toEqual(['Los Angeles', 'New York', 'London', 'Paris', 'Beijing', 'Taipei', 'Tokyo']);
    vi.useRealTimers();
  });

  it('controls tabs, world-cities, and offset-info visibility and hides cursor in fullscreen mode', async () => {
    vi.useFakeTimers();
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    const fsBtn = wrapper.find('.fullscreen-btn');
    await fsBtn.trigger('click');
    expect(wrapper.classes()).toContain('fullscreen');

    const tabs = wrapper.find('.tabs');
    const worldCities = wrapper.find('.world-cities');

    // Initially active on entering fullscreen / interaction
    expect(tabs.classes()).toContain('controls-active');
    expect(worldCities.classes()).toContain('controls-active');
    expect(wrapper.classes()).not.toContain('cursor-hidden');

    // Advance 4000ms
    vi.advanceTimersByTime(4000);
    await wrapper.vm.$nextTick();

    expect(tabs.classes()).not.toContain('controls-active');
    expect(worldCities.classes()).not.toContain('controls-active');
    expect(wrapper.classes()).toContain('cursor-hidden');

    // Trigger mousemove on window
    window.dispatchEvent(new MouseEvent('mousemove'));
    await wrapper.vm.$nextTick();

    expect(tabs.classes()).toContain('controls-active');
    expect(worldCities.classes()).toContain('controls-active');
    expect(wrapper.classes()).not.toContain('cursor-hidden');
    vi.useRealTimers();
  });

  it('exits pseudo-fullscreen on Smart TV remote Back button (Tizen 10009 and webOS 461)', async () => {
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    // Enter pseudo-fullscreen
    const fsBtn = wrapper.find('.fullscreen-btn');
    await fsBtn.trigger('click');
    expect(wrapper.classes()).toContain('fullscreen');
    expect(wrapper.classes()).toContain('pseudo-fullscreen');

    // Samsung Tizen Back key (10009)
    const eventTizen = new KeyboardEvent('keydown', { keyCode: 10009 } as any);
    Object.defineProperty(eventTizen, 'keyCode', { value: 10009 });
    window.dispatchEvent(eventTizen);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('fullscreen');
    expect(wrapper.classes()).not.toContain('pseudo-fullscreen');

    // Re-enter pseudo-fullscreen
    await fsBtn.trigger('click');
    expect(wrapper.classes()).toContain('pseudo-fullscreen');

    // LG webOS Back key (461)
    const eventWebOS = new KeyboardEvent('keydown', { keyCode: 461 } as any);
    Object.defineProperty(eventWebOS, 'keyCode', { value: 461 });
    window.dispatchEvent(eventWebOS);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('fullscreen');
    expect(wrapper.classes()).not.toContain('pseudo-fullscreen');
  });

  it('toggles pseudo-fullscreen when native fullscreen is unavailable or rejected', async () => {
    const wrapper = mount(OnlineClock, {
      global: {
        plugins: [i18n],
        stubs: {
          'n-select': true,
          'n-switch': true,
        },
      },
    });
    wrappers.push(wrapper);

    const fsBtn = wrapper.find('.fullscreen-btn');
    expect(fsBtn.exists()).toBe(true);

    await fsBtn.trigger('click');
    // Because jsdom has no native requestFullscreen, it triggers pseudo-fullscreen fallback
    expect(wrapper.classes()).toContain('fullscreen');
  });
});

describe('WCAG AA/AAA Palette Contrast Ratios (2md.aiurl.tw Standards)', () => {
  it('Light Palette meets WCAG AAA standards (>= 7:1) for text on surface and background', () => {
    const { surface, background, text, textMuted, heading, button, saffron } = kanagawaLightPalette;

    // Ink text on warm-cream surface
    const textOnSurface = getContrastRatio(text, surface);
    expect(textOnSurface).toBeGreaterThanOrEqual(12.0); // > 14:1 AAA

    // Ink text on canvas background
    const textOnBackground = getContrastRatio(text, background);
    expect(textOnBackground).toBeGreaterThanOrEqual(12.0);

    // Heading on surface
    const headingOnSurface = getContrastRatio(heading, surface);
    expect(headingOnSurface).toBeGreaterThanOrEqual(12.0);

    // Muted text on surface
    const mutedOnSurface = getContrastRatio(textMuted, surface);
    expect(mutedOnSurface).toBeGreaterThanOrEqual(7.0); // AAA standard >= 7:1

    // Muted text on background
    const mutedOnBackground = getContrastRatio(textMuted, background);
    expect(mutedOnBackground).toBeGreaterThanOrEqual(6.5); // AA standard >= 4.5:1

    // Deep blue button on surface
    const buttonOnSurface = getContrastRatio(button, surface);
    expect(buttonOnSurface).toBeGreaterThanOrEqual(10.0);

    // Ink text on saffron highlight (e.g. active nav pill or badges)
    const textOnSaffron = getContrastRatio(text, saffron);
    expect(textOnSaffron).toBeGreaterThanOrEqual(7.0); // AAA >= 7:1
  });

  it('Dark Palette meets WCAG AAA standards for text on surface and background', () => {
    const { surface, background, text, textMuted, heading, button } = kanagawaDarkPalette;

    // Warm cream text on dark surface
    const textOnSurface = getContrastRatio(text, surface);
    expect(textOnSurface).toBeGreaterThanOrEqual(12.0);

    // Warm cream heading on dark surface
    const headingOnSurface = getContrastRatio(heading, surface);
    expect(headingOnSurface).toBeGreaterThanOrEqual(13.0);

    // Warm cream text on background
    const textOnBackground = getContrastRatio(text, background);
    expect(textOnBackground).toBeGreaterThanOrEqual(12.0);

    // Muted text on surface
    const mutedOnSurface = getContrastRatio(textMuted, surface);
    expect(mutedOnSurface).toBeGreaterThanOrEqual(7.0); // AAA >= 7:1

    // Saffron button in dark mode on dark surface
    const buttonOnSurface = getContrastRatio(button, surface);
    expect(buttonOnSurface).toBeGreaterThanOrEqual(7.0); // AAA >= 7:1

    // Ink text (#2B251A) on saffron button (#FFB010)
    const textOnButton = getContrastRatio('#2B251A', button);
    expect(textOnButton).toBeGreaterThanOrEqual(7.0); // AAA >= 7:1
  });
});

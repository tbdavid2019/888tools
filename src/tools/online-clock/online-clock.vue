<script lang="ts">
export interface ZonedTimeParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  hh: string;
  mm: string;
  ss: string;
  yearPad: string;
  monthPad: string;
  dayPad: string;
  period: string;
  hours12: number;
  hh12: string;
}

export function getDefaultTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string' && tz.trim().length > 0) {
      return tz;
    }
  } catch {
    // ignore
  }
  return 'Asia/Taipei';
}

export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
    return true;
  } catch {
    return false;
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function getZonedTimeParts(date: Date, timeZone: string, use12h = false): ZonedTimeParts {
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  let year = safeDate.getFullYear();
  let month = safeDate.getMonth() + 1;
  let day = safeDate.getDate();
  let hours = safeDate.getHours();
  let minutes = safeDate.getMinutes();
  let seconds = safeDate.getSeconds();

  try {
    const formatter = getFormatter(timeZone);
    const formattedParts = formatter.formatToParts(safeDate);
    for (const part of formattedParts) {
      if (part.type === 'year') year = parseInt(part.value, 10);
      else if (part.type === 'month') month = parseInt(part.value, 10);
      else if (part.type === 'day') day = parseInt(part.value, 10);
      else if (part.type === 'hour') hours = parseInt(part.value, 10) % 24;
      else if (part.type === 'minute') minutes = parseInt(part.value, 10);
      else if (part.type === 'second') seconds = parseInt(part.value, 10);
    }
  } catch {
    // fallback cleanly to safeDate local time
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  let hours12 = hours % 12;
  if (hours12 === 0) hours12 = 12;

  const displayHours = use12h ? hours12 : hours;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    hh: pad(displayHours),
    mm: pad(minutes),
    ss: pad(seconds),
    yearPad: String(year),
    monthPad: pad(month),
    dayPad: pad(day),
    period,
    hours12,
    hh12: pad(hours12),
  };
}
</script>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFullscreen, useLocalStorage, useNow, onKeyStroke } from '@vueuse/core';
import FlipCard from './FlipCard.vue';
import { useStyleStore } from '@/stores/style.store';

const { t, locale } = useI18n();
const styleStore = useStyleStore();

const mode = useLocalStorage<'digital' | 'analog' | 'flip' | 'chinese'>('onlineClock/mode', 'digital');
const showSeconds = useLocalStorage<boolean>('onlineClock/showSeconds', true);
const showDate = useLocalStorage<boolean>('onlineClock/showDate', true);
const use12HourFormat = useLocalStorage<boolean>('onlineClock/use12HourFormat', false);

const initialTimezone = getDefaultTimezone();
const timezone = useLocalStorage<string>('onlineClock/timezone', initialTimezone);
if (!isValidTimezone(timezone.value)) {
  timezone.value = initialTimezone;
}
watch(timezone, (newTz) => {
  if (!isValidTimezone(newTz)) {
    timezone.value = getDefaultTimezone();
  }
});

const useNetworkTime = useLocalStorage<boolean>('onlineClock/useNetworkTime', true);
const clockRef = ref<HTMLElement | null>(null);
const { isFullscreen, isSupported: isFullscreenSupported, toggle: toggleNativeFullscreen } = useFullscreen(clockRef);
const isPseudoFullscreen = ref(false);
const isClockFullscreen = computed(() => isFullscreen.value || isPseudoFullscreen.value);

watch(isFullscreen, (val) => {
  if (val) {
    isPseudoFullscreen.value = false;
  }
});

function hasActiveNativeFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return Boolean(
    isFullscreen.value
    || doc.fullscreenElement
    || doc.webkitFullscreenElement
    || doc.mozFullScreenElement
    || doc.msFullscreenElement,
  );
}

async function handleToggleFullscreen() {
  if (isPseudoFullscreen.value) {
    isPseudoFullscreen.value = false;
    return;
  }
  if (hasActiveNativeFullscreen()) {
    try {
      await toggleNativeFullscreen();
    } catch {
      // ignore
    }
    return;
  }
  if (!isFullscreenSupported.value) {
    isPseudoFullscreen.value = true;
    return;
  }
  try {
    await toggleNativeFullscreen();
    if (!hasActiveNativeFullscreen()) {
      isPseudoFullscreen.value = true;
    }
  } catch {
    isPseudoFullscreen.value = true;
  }
}

onKeyStroke(['Escape', 'Back', 'BrowserBack', 'GoBack'], () => {
  if (isPseudoFullscreen.value) {
    isPseudoFullscreen.value = false;
  }
});

const controlsVisible = ref(false);
let controlsTimer: any = null;
function showControlsTemporarily() {
  controlsVisible.value = true;
  if (controlsTimer) clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    controlsVisible.value = false;
  }, 4000);
}

const onUserInteraction = (e?: Event) => {
  if (e && e.type === 'keydown' && isPseudoFullscreen.value) {
    const ke = e as KeyboardEvent;
    // Support Samsung Tizen (10009) and LG webOS (461) hardware Back buttons
    if (ke.keyCode === 10009 || ke.keyCode === 461) {
      isPseudoFullscreen.value = false;
      return;
    }
  }
  if (isClockFullscreen.value) {
    showControlsTemporarily();
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
  }
});

onUnmounted(() => {
  if (controlsTimer) {
    clearTimeout(controlsTimer);
    controlsTimer = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onUserInteraction);
    window.removeEventListener('keydown', onUserInteraction);
    window.removeEventListener('touchstart', onUserInteraction);
    window.removeEventListener('pointerdown', onUserInteraction);
  }
});

const now = useNow({ interval: 1000 });
const { now: smoothNow, pause: pauseSmoothNow, resume: resumeSmoothNow } = useNow({
  interval: 'requestAnimationFrame',
  controls: true,
});

watch(
  mode,
  (currentMode) => {
    if (currentMode === 'analog') {
      resumeSmoothNow();
    } else {
      pauseSmoothNow();
    }
  },
  { immediate: true },
);

const timeOffset = ref(0);
const isSyncing = ref(false);
const syncError = ref(false);

const syncTime = async () => {
  if (!useNetworkTime.value) {
    timeOffset.value = 0;
    return;
  }

  isSyncing.value = true;
  syncError.value = false;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
  try {
    const start = Date.now();
    const response = await fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller?.signal,
    });
    const end = Date.now();

    const dateHeader = response.headers.get('date');
    if (!dateHeader) throw new Error('No Date header');

    const serverTime = new Date(dateHeader).getTime();
    if (Number.isNaN(serverTime)) throw new Error('Invalid Date header');

    const latency = (end - start) / 2;
    const estimatedServerTime = serverTime + latency;

    timeOffset.value = estimatedServerTime - end;
  } catch (e) {
    console.error('Time sync failed', e);
    syncError.value = true;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    isSyncing.value = false;
  }
};

watch(useNetworkTime, () => {
  if (useNetworkTime.value) {
    syncTime();
  } else {
    timeOffset.value = 0;
  }
});

onMounted(() => {
  if (useNetworkTime.value) {
    syncTime();
  }
});

const adjustedNow = computed(() => {
  if (timeOffset.value === 0) return now.value;
  return new Date(now.value.getTime() + timeOffset.value);
});

const smoothAdjustedNow = computed(() => {
  if (timeOffset.value === 0) return smoothNow.value;
  return new Date(smoothNow.value.getTime() + timeOffset.value);
});

const parts = computed(() => getZonedTimeParts(adjustedNow.value, timezone.value, use12HourFormat.value));

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateText = computed(() => {
  const p = parts.value;
  try {
    const cacheKey = `${locale.value}__${timezone.value}`;
    let fmt = dateFormatterCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        timeZone: timezone.value,
      });
      dateFormatterCache.set(cacheKey, fmt);
    }
    return fmt.format(adjustedNow.value);
  } catch {
    return `${p.yearPad}-${p.monthPad}-${p.dayPad}`;
  }
});

const timeText = computed(() => {
  const p = parts.value;
  return `${p.hh}:${p.mm}${showSeconds.value ? `:${p.ss}` : ''}${use12HourFormat.value ? ` ${p.period}` : ''}`;
});

const numberToChinese = (num: number) => {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return num
    .toString()
    .split('')
    .map(digit => digits[parseInt(digit, 10)])
    .join('');
};

const getChinesePeriod = (hour: number) => {
  if (hour < 6) return '凌晨';
  if (hour < 12) return '上午';
  if (hour === 12) return '中午';
  if (hour < 18) return '下午';
  return '晚上';
};

const chineseParts = computed(() => {
  const p = parts.value;
  const h = p.hours;
  const m = p.minutes;
  const s = p.seconds;

  const createChar = (char: string, type: 'period' | 'number' | 'unit') => ({ char, type });
  const strToChars = (str: string, type: 'period' | 'number' | 'unit') => str.split('').map(c => createChar(c, type));

  const res: { char: string; type: 'period' | 'number' | 'unit' }[] = [];

  if (use12HourFormat.value) {
    const period = getChinesePeriod(h);
    res.push(...strToChars(period, 'period'));
  }

  let displayH = h;
  if (use12HourFormat.value) {
    displayH = h % 12;
    if (displayH === 0) displayH = 12;
  }

  const getNaturalChinese = (num: number) => {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (num <= 10) {
      if (num === 10) return '十';
      return digits[num];
    }
    if (num < 20) {
      return `十${digits[num % 10]}`;
    }
    const unit = num % 10;
    if (unit === 0) return '二十';
    return `二十${digits[unit]}`;
  };

  res.push(...strToChars(getNaturalChinese(displayH), 'number'));
  res.push(createChar('時', 'unit'));

  res.push(...strToChars(numberToChinese(m), 'number'));
  res.push(createChar('分', 'unit'));

  if (showSeconds.value) {
    res.push(...strToChars(numberToChinese(s), 'number'));
    res.push(createChar('秒', 'unit'));
  }

  return res;
});

const timezones = computed(() => {
  const tzList =
    (Intl as any).supportedValuesOf?.('timeZone') ??
    [
      'UTC',
      'Asia/Taipei',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Shanghai',
      'Asia/Bangkok',
      'Asia/Jakarta',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Sao_Paulo',
      'Australia/Sydney',
    ];
  return tzList.map((tz: string) => ({ label: tz, value: tz }));
});

const hourRotation = computed(() => {
  const p = parts.value;
  const ms = mode.value === 'analog' ? smoothAdjustedNow.value.getMilliseconds() : 0;
  return (p.hours % 12) * 30
    + p.minutes * 0.5
    + p.seconds * (0.5 / 60)
    + ms * (0.5 / 60 / 1000);
});

const minuteRotation = computed(() => {
  const p = parts.value;
  const ms = mode.value === 'analog' ? smoothAdjustedNow.value.getMilliseconds() : 0;
  return p.minutes * 6
    + p.seconds * 0.1
    + ms * (0.1 / 1000);
});

const secondRotation = computed(() => {
  const p = parts.value;
  const ms = mode.value === 'analog' ? smoothAdjustedNow.value.getMilliseconds() : 0;
  return p.seconds * 6
    + ms * (6 / 1000);
});
</script>

<template>
  <div
    ref="clockRef"
    class="clock-page"
    :class="{
      fullscreen: isClockFullscreen,
      'pseudo-fullscreen': isPseudoFullscreen,
      'is-dark': styleStore.isDarkTheme,
    }"
  >
    <div class="header" :class="{ 'controls-active': controlsVisible }">
      <div class="title">{{ t('tools.online-clock.title') }}</div>
      <div class="controls">
        <n-select
          v-model:value="timezone"
          size="small"
          :options="timezones"
          filterable
          :placeholder="t('tools.online-clock.timezone')"
          class="tz"
        />
        <div class="control">
          <n-switch v-model:value="use12HourFormat" size="small" />
          <span>{{ use12HourFormat ? '12h' : '24h' }}</span>
        </div>
        <div class="control">
          <n-switch v-model:value="showSeconds" size="small" />
          <span>{{ t('tools.online-clock.showSeconds') }}</span>
        </div>
        <div class="control">
          <n-switch v-model:value="showDate" size="small" />
          <span>{{ t('tools.online-clock.showDate') }}</span>
        </div>
        <div class="control">
          <n-switch v-model:value="useNetworkTime" size="small" :loading="isSyncing" />
          <span>{{ t('tools.online-clock.useNetworkTime') }}</span>
          <button
            v-if="useNetworkTime"
            type="button"
            class="sync-btn"
            :disabled="isSyncing"
            :aria-label="t('tools.online-clock.useNetworkTime')"
            @click="syncTime"
          >
            <span class="icon-refresh" :class="{ spinning: isSyncing }">↻</span>
          </button>
        </div>
        <button type="button" class="fullscreen-btn" @click="handleToggleFullscreen">
          {{ isClockFullscreen ? t('tools.online-clock.exitFullscreen') : t('tools.online-clock.fullscreen') }}
        </button>
      </div>
    </div>

    <div v-if="useNetworkTime && timeOffset !== 0" class="offset-info">
      {{ t('tools.online-clock.offset', { value: (timeOffset / 1000).toFixed(2) }) }}
    </div>
    <div v-if="syncError" class="offset-info error">
      {{ t('tools.online-clock.syncError') }}
    </div>

    <div v-if="showDate" class="date">{{ dateText }}</div>

    <div v-if="mode === 'digital'" class="digital">
      <div class="digital-time">{{ timeText }}</div>
    </div>

    <div v-else-if="mode === 'analog'" class="analog">
      <div class="dial">
        <div class="ticks">
          <div v-for="n in 60" :key="n" class="tick-wrapper" :style="{ transform: `rotate(${n * 6}deg)` }">
            <div class="tick" :class="{ bold: n % 5 === 0 }" />
          </div>
        </div>
        <div class="numbers">
          <div v-for="n in 12" :key="n" class="number-wrapper" :style="{ transform: `rotate(${n * 30}deg)` }">
            <span class="number" :style="{ transform: `rotate(${-n * 30}deg)` }">{{ n }}</span>
          </div>
        </div>
        <div class="hand hour" :style="{ transform: `rotate(${hourRotation}deg)` }" />
        <div class="hand minute" :style="{ transform: `rotate(${minuteRotation}deg)` }" />
        <div class="hand second" :style="{ transform: `rotate(${secondRotation}deg)` }" />
        <div class="center-dot" />
      </div>
    </div>

    <div v-else-if="mode === 'flip'" class="flip">
      <div v-if="use12HourFormat" class="flip-period">
        {{ parts.period }}
      </div>
      <div class="flip-group">
        <FlipCard :value="parts.hh[0]" />
        <FlipCard :value="parts.hh[1]" />
      </div>
      <div class="flip-group">
        <FlipCard :value="parts.mm[0]" />
        <FlipCard :value="parts.mm[1]" />
      </div>
      <template v-if="showSeconds">
        <div class="flip-group">
          <FlipCard :value="parts.ss[0]" />
          <FlipCard :value="parts.ss[1]" />
        </div>
      </template>
    </div>

    <div v-else class="chinese">
      <div class="chinese-row main">
        <div
          v-for="(item, index) in chineseParts"
          :key="index"
          class="char-block"
          :class="[
            `type-${item.type}`,
            index % 2 === 0 ? 'even' : 'odd'
          ]"
        >
          {{ item.char }}
        </div>
      </div>
    </div>

    <div class="tabs">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: mode === 'digital' }"
        @click="mode = 'digital'"
      >
        {{ t('tools.online-clock.modes.digital') }}
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: mode === 'analog' }"
        @click="mode = 'analog'"
      >
        {{ t('tools.online-clock.modes.analog') }}
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: mode === 'flip' }"
        @click="mode = 'flip'"
      >
        {{ t('tools.online-clock.modes.flip') }}
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: mode === 'chinese' }"
        @click="mode = 'chinese'"
      >
        {{ t('tools.online-clock.modes.chinese') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Light Mode CSS variables (2md.aiurl.tw WCAG AAA Palette) */
.clock-page {
  --clock-bg: #FFF9E8;
  --clock-canvas: #FFF0CC;
  --clock-border: #17324D;
  --clock-card-border: #C9AD6A;
  --clock-text: #2B251A;
  --clock-muted: #5C503A;
  --clock-primary: #FFB010;
  --clock-primary-text: #2B251A;
  --clock-navy: #17324D;
  --clock-navy-text: #FFF9E8;
  --clock-clay: #9E3F17;
  --clock-dial-bg: #FFF0CC;
  --clock-dial-border: #17324D;
  --clock-tick-minor: #6B5B38;
  --clock-tick-major: #17324D;
  --clock-hand-hour: #17324D;
  --clock-hand-minute: #2B251A;
  --clock-hand-second: #A9471D;
  --clock-flip-bg: #17324D;
  --clock-flip-text: #FFF9E8;
  --clock-flip-border: #0F2336;

  background: var(--clock-bg);
  color: var(--clock-text);
  padding: 28px 16px 32px;
  border-radius: 16px;
  border: 1px solid var(--clock-card-border);
  box-shadow: 0 10px 26px rgba(43, 37, 26, 0.10);
  transition: background-color 0.2s ease, color 0.2s ease;
  box-sizing: border-box;
}

/* Dark Mode CSS variables */
.clock-page.is-dark {
  --clock-bg: #101B27;
  --clock-canvas: #172636;
  --clock-border: #385370;
  --clock-card-border: #385370;
  --clock-text: #FFF9E8;
  --clock-muted: #C9BDA3;
  --clock-primary: #FFB010;
  --clock-primary-text: #2B251A;
  --clock-navy: #172636;
  --clock-navy-text: #FFF9E8;
  --clock-clay: #FFB010;
  --clock-dial-bg: #172636;
  --clock-dial-border: #FFB010;
  --clock-tick-minor: #8FA6BF;
  --clock-tick-major: #FFB010;
  --clock-hand-hour: #FFF9E8;
  --clock-hand-minute: #C9BDA3;
  --clock-hand-second: #FFB010;
  --clock-flip-bg: #17324D;
  --clock-flip-text: #FFF9E8;
  --clock-flip-border: #385370;

  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.48);
}

.clock-page.fullscreen {
  width: 100vw;
  min-height: 100vh;
  border-radius: 0;
  border: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 32px 20px 40px;
  box-sizing: border-box;
}

.clock-page.pseudo-fullscreen {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

.header {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.clock-page.fullscreen .header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100%;
  padding: 20px 40px;
  background: linear-gradient(to bottom, rgba(23, 50, 77, 0.96), rgba(23, 50, 77, 0));
  color: #FFF9E8;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.clock-page.fullscreen .title,
.clock-page.fullscreen .control {
  color: #FFF9E8;
}

.clock-page.fullscreen .header:hover,
.clock-page.fullscreen .header:focus-within,
.clock-page.fullscreen .header.controls-active {
  opacity: 1;
  pointer-events: auto;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--clock-text);
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.control {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--clock-text);
  font-size: 13px;
  font-weight: 500;
}

.tz {
  width: 200px;
}

.fullscreen-btn,
.sync-btn {
  background: #FFB010;
  color: #2B251A;
  border: 2px solid #17324D;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-btn:hover,
.sync-btn:hover {
  background: #F2A600;
  transform: translateY(-1px);
}

.sync-btn {
  padding: 3px 8px;
  border-radius: 6px;
}

/* Font Families */
.date,
.digital-time,
.number,
.flip :deep(.digit),
.chinese-row.main {
  font-family: 'Maple Mono', 'JetBrains Mono', monospace !important;
}

.date {
  text-align: center;
  margin-top: 14px;
  color: var(--clock-muted);
  font-weight: 600;
  font-size: 16px;
}

.digital {
  margin: 32px 0 20px;
  text-align: center;
}

.digital-time {
  font-size: 72px;
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--clock-text);
  font-variant-numeric: tabular-nums;
}

.analog {
  display: flex;
  justify-content: center;
  margin: 28px 0 16px;
}

.clock-page.fullscreen .analog {
  width: 100%;
}

.dial {
  position: relative;
  width: 340px;
  height: 340px;
  width: min(420px, 80vw);
  height: min(420px, 80vw);
  border-radius: 50%;
  background: var(--clock-dial-bg);
  border: 3px solid var(--clock-dial-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}

.clock-page.fullscreen .dial {
  width: 600px;
  height: 600px;
  width: min(760px, 82vmin);
  height: min(760px, 82vmin);
}

.clock-page.fullscreen .date {
  font-size: 24px;
  font-size: clamp(16px, 3vw, 32px);
  margin-bottom: 2vh;
  color: var(--clock-text);
}

.clock-page.fullscreen .digital-time {
  font-size: 160px;
  font-size: clamp(80px, 20vw, 240px);
}

.clock-page.fullscreen .flip :deep(.flip-card) {
  width: 140px;
  width: clamp(80px, 14vw, 200px);
  height: 200px;
  height: clamp(120px, 20vw, 300px);
  font-size: 110px;
  font-size: clamp(60px, 10vw, 180px);
  perspective: 800px;
}

.clock-page.fullscreen .flip :deep(.digit) {
  line-height: 200px;
  line-height: clamp(120px, 20vw, 300px);
}

.ticks {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.tick-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 50%;
  transform-origin: bottom center;
}

.tick {
  position: absolute;
  top: 10px;
  left: -1px;
  width: 2px;
  height: 8px;
  background: var(--clock-tick-minor);
}

.tick.bold {
  height: 14px;
  width: 3px;
  left: -1.5px;
  background: var(--clock-tick-major);
}

.numbers {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

.number-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  width: 40px;
  margin-left: -20px;
  height: 50%;
  transform-origin: bottom center;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 28px;
}

.number {
  color: var(--clock-tick-major);
  font-weight: 700;
  font-size: 46px;
  font-size: clamp(36px, 5vw, 50px);
  display: block;
}

.hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform-origin: bottom center;
  border-radius: 6px;
}

.hand.hour {
  width: 10px;
  height: 24%;
  background: var(--clock-hand-hour);
  margin-left: -5px;
}

.hand.minute {
  width: 8px;
  height: 35%;
  background: var(--clock-hand-minute);
  margin-left: -4px;
}

.hand.second {
  width: 4px;
  height: 42%;
  background: var(--clock-hand-second);
  margin-left: -2px;
}

.center-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--clock-hand-second);
  border: 3px solid var(--clock-dial-border);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.flip {
  margin: 24px auto 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  gap: clamp(12px, 2vw, 24px);
  position: relative;
}

.flip-period {
  font-size: 24px;
  font-size: clamp(16px, 3vw, 32px);
  font-weight: 700;
  color: var(--clock-text);
  margin-right: 8px;
}

.flip-group {
  display: flex;
  gap: 8px;
}

.chinese {
  margin: 32px 0 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chinese-row {
  line-height: 1.2;
}

.chinese-row.main {
  font-size: 44px;
  font-size: clamp(24px, 5vw, 64px);
  font-weight: 700;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.char-block {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0 0.25em;
  min-width: 0.9em;
  height: 1.4em;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.char-block.odd {
  background: #17324D;
  color: #FFF9E8;
  border: 2px solid #17324D;
}

.char-block.even {
  background: var(--clock-canvas);
  color: var(--clock-text);
  border: 2px solid var(--clock-border);
}

.char-block.type-period {
  background: #FFB010;
  color: #2B251A;
  border: 2px solid #17324D;
  font-size: 0.65em;
  align-self: center;
  margin-top: 0.5em;
  font-weight: 700;
}

.char-block.type-unit {
  background: transparent;
  color: var(--clock-clay);
  font-weight: 800;
  font-size: 0.65em;
  align-self: center;
  margin-top: 0.5em;
  border: none;
}

.char-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.clock-page.fullscreen .chinese-row.main {
  font-size: 80px;
  font-size: clamp(40px, 10vw, 120px);
}

/* Tabs: section-nav design inspired by 2md.aiurl.tw */
.tabs {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  margin: 20px auto 0;
  background: var(--clock-navy);
  padding: 6px;
  border-radius: 12px;
  border: 2px solid var(--clock-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: fit-content;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--clock-navy-text);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  outline: none;
}

.tab-btn:hover {
  background: var(--clock-primary);
  color: var(--clock-primary-text);
}

.tab-btn:focus-visible,
.fullscreen-btn:focus-visible,
.sync-btn:focus-visible {
  outline: 3px solid var(--clock-primary);
  outline-offset: 2px;
}

.tab-btn.active {
  background: var(--clock-primary);
  color: var(--clock-primary-text);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 600px) {
  .controls {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .tz {
    width: 100%;
  }
}

.offset-info {
  text-align: center;
  font-size: 12px;
  color: var(--clock-muted);
  margin-top: 4px;
}

.offset-info.error {
  color: #ef4444;
}

.icon-refresh {
  display: inline-block;
  font-size: 14px;
  line-height: 1;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

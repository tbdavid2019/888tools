<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFullscreen, useLocalStorage, useNow } from '@vueuse/core';
import FlipCard from './FlipCard.vue';

const { t, locale } = useI18n();

const mode = useLocalStorage<'digital' | 'analog' | 'flip' | 'chinese'>('onlineClock/mode', 'digital');
const showSeconds = useLocalStorage<boolean>('onlineClock/showSeconds', true);
const showDate = useLocalStorage<boolean>('onlineClock/showDate', true);
const use12HourFormat = useLocalStorage<boolean>('onlineClock/use12HourFormat', false);
const timezone = useLocalStorage<string>('onlineClock/timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
const useNetworkTime = useLocalStorage<boolean>('onlineClock/useNetworkTime', true);
const clockRef = ref<HTMLElement | null>(null);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(clockRef);

const now = useNow({ interval: 1000 });
const smoothNow = useNow({ interval: 'requestAnimationFrame' });

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
  try {
    const start = Date.now();
    const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const end = Date.now();
    
    const dateHeader = response.headers.get('date');
    if (!dateHeader) throw new Error('No Date header');

    const serverTime = new Date(dateHeader).getTime();
    const latency = (end - start) / 2;
    const estimatedServerTime = serverTime + latency;
    
    // Offset = Server Time - Local Time
    timeOffset.value = estimatedServerTime - end;
  } catch (e) {
    console.error('Time sync failed', e);
    syncError.value = true;
  } finally {
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

const zonedNow = computed(() => {
  try {
    const iso = adjustedNow.value.toLocaleString('en-US', { timeZone: timezone.value });
    return new Date(iso);
  } catch (e) {
    console.warn('Timezone not supported, fallback to local', e);
    return adjustedNow.value;
  }
});

// For Analog Clock only (Smooth Animation)
const smoothAdjustedNow = computed(() => {
  if (timeOffset.value === 0) return smoothNow.value;
  return new Date(smoothNow.value.getTime() + timeOffset.value);
});

const smoothZonedNow = computed(() => {
  try {
    const iso = smoothAdjustedNow.value.toLocaleString('en-US', { timeZone: timezone.value });
    return new Date(iso);
  } catch (e) {
    return smoothAdjustedNow.value;
  }
});

const parts = computed(() => {
  const date = zonedNow.value;
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  if (use12HourFormat.value) {
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }

  const pad = (v: number) => v.toString().padStart(2, '0');
  return {
    hours,
    minutes,
    seconds,
    hh: pad(hours),
    mm: pad(minutes),
    ss: pad(seconds),
    date,
  };
});

const dateText = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'full', timeZone: timezone.value }).format(zonedNow.value),
);

const timeText = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds.value ? '2-digit' : undefined,
    hour12: use12HourFormat.value,
    timeZone: timezone.value,
  }).format(zonedNow.value),
);

// Chinese Clock Logic
const numberToChinese = (num: number) => {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return num
    .toString()
    .split('')
    .map(digit => digits[parseInt(digit)])
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
  const date = zonedNow.value;
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();

  const createChar = (char: string, type: 'period' | 'number' | 'unit') => ({ char, type });
  const strToChars = (str: string, type: 'period' | 'number' | 'unit') => str.split('').map(c => createChar(c, type));

  const parts: { char: string; type: 'period' | 'number' | 'unit' }[] = [];

  // Period (12h only)
  if (use12HourFormat.value) {
    const period = getChinesePeriod(h);
    parts.push(...strToChars(period, 'period'));
  }

  // Hour
  let displayH = h;
  if (use12HourFormat.value) {
      displayH = h % 12;
      if (displayH === 0) displayH = 12;
  }
  
  // Natural Chinese Number for Hour (0-23 or 1-12)
  const getNaturalChinese = (num: number) => {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (num <= 10) {
      if (num === 10) return '十';
      return digits[num];
    }
    if (num < 20) {
      return '十' + digits[num % 10];
    }
    // 20-23
    const unit = num % 10;
    if (unit === 0) return '二十';
    return '二十' + digits[unit];
  };

  parts.push(...strToChars(getNaturalChinese(displayH), 'number'));
  parts.push(createChar('時', 'unit'));

  // Minute
  parts.push(...strToChars(numberToChinese(m), 'number'));
  parts.push(createChar('分', 'unit'));

  // Second
  if (showSeconds.value) {
      parts.push(...strToChars(numberToChinese(s), 'number'));
      parts.push(createChar('秒', 'unit'));
  }

  return parts;
});

const timezones = computed(() => {
  // Keep list short enough but still useful; sorted so UX is predictable.
  const tzList =
    (Intl as any).supportedValuesOf?.('timeZone') ??
    [
      'UTC',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Sao_Paulo',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Jakarta',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Taipei',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Australia/Sydney',
    ];
  return tzList.map((tz: string) => ({ label: tz, value: tz }));
});

const hourRotation = computed(() => {
    // Use smoothZonedNow for continuous movement
    const date = smoothZonedNow.value;
    return (date.getHours() % 12) * 30 
      + date.getMinutes() * 0.5 
      + date.getSeconds() * (0.5 / 60)
      + date.getMilliseconds() * (0.5 / 60 / 1000);
});
const minuteRotation = computed(() => {
    // Use smoothZonedNow for continuous movement
    const date = smoothZonedNow.value;
    return date.getMinutes() * 6 
      + date.getSeconds() * 0.1
      + date.getMilliseconds() * (0.1 / 1000);
});
const secondRotation = computed(() => {
    // Use smoothZonedNow for continuous movement
    const date = smoothZonedNow.value;
    return date.getSeconds() * 6 
      + date.getMilliseconds() * (6 / 1000);
});

const flipDigits = computed(() => {
  const digits = `${parts.value.hh}${parts.value.mm}${showSeconds.value ? parts.value.ss : ''}`;
  return digits.split('');
});
</script>

<template>
  <div ref="clockRef" class="clock-page" :class="{ fullscreen: isFullscreen }">
    <div class="header">
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
          <c-button v-if="useNetworkTime" size="tiny" circle quaternary @click="syncTime">
            <span class="icon-refresh" :class="{ spinning: isSyncing }">↻</span>
          </c-button>
        </div>
        <c-button size="small" quaternary @click="toggleFullscreen">
          {{ isFullscreen ? t('tools.online-clock.exitFullscreen') : t('tools.online-clock.fullscreen') }}
        </c-button>
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
        <div class="hand hour" :style="{ '--rot': `${hourRotation}deg` }" />
        <div class="hand minute" :style="{ '--rot': `${minuteRotation}deg` }" />
        <div class="hand second" :style="{ '--rot': `${secondRotation}deg` }" />
        <div class="center-dot" />
      </div>
    </div>

    <div v-else-if="mode === 'flip'" class="flip">
      <div v-if="use12HourFormat" class="flip-period">
          {{ zonedNow.getHours() >= 12 ? 'PM' : 'AM' }}
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
      <c-button quaternary :type="mode === 'digital' ? 'primary' : 'default'" @click="mode = 'digital'">
        {{ t('tools.online-clock.modes.digital') }}
      </c-button>
      <c-button quaternary :type="mode === 'analog' ? 'primary' : 'default'" @click="mode = 'analog'">
        {{ t('tools.online-clock.modes.analog') }}
      </c-button>
      <c-button quaternary :type="mode === 'flip' ? 'primary' : 'default'" @click="mode = 'flip'">
        {{ t('tools.online-clock.modes.flip') }}
      </c-button>
      <c-button quaternary :type="mode === 'chinese' ? 'primary' : 'default'" @click="mode = 'chinese'">
        {{ '中文字時鐘' }}
      </c-button>
    </div>
  </div>
</template>

<style scoped>
.clock-page {
  background: #0e0f14;
  color: #d3d6dc;
  padding: 28px 16px 32px;
  border-radius: 16px;
}

.clock-page.fullscreen {
  width: 100vw;
  min-height: 100vh;
  border-radius: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 32px 20px 40px;
  box-sizing: border-box;
  color: #f5f6fa;
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
  width: 100%;
  max-width: 100%;
  padding: 20px 40px;
  background: linear-gradient(to bottom, rgba(14, 15, 20, 0.95), rgba(14, 15, 20, 0));
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.clock-page.fullscreen .header:hover {
  opacity: 1;
}

.title {
  font-size: 24px;
  font-weight: 700;
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.control {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e5e7eb;
  font-size: 13px;
}

.tz {
  width: 220px;
}

/* Font Updates */
.date,
.digital-time,
.number,
.flip :deep(.digit),
.chinese-row.main {
  font-family: 'Maple Mono', 'JetBrains Mono', monospace !important;
}

.date {
  text-align: center;
  margin-top: 12px;
  color: #9ba1ad;
}

.digital {
  margin: 32px 0 20px;
  text-align: center;
}

.digital-time {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 700;
  letter-spacing: 2px;
}

.analog {
  display: flex;
  justify-content: center;
  margin: 28px 0 12px;
}

.clock-page.fullscreen .analog {
  width: 100%;
}

.dial {
  position: relative;
  width: min(420px, 80vw);
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: radial-gradient(circle, #1c1f28 0%, #0f121a 70%);
  box-shadow: 0 0 0 2px #1f232d, inset 0 0 0 1px #2a2f3a;
}

.clock-page.fullscreen .dial {
  width: min(800px, 90vmin);
}

.clock-page.fullscreen .date {
  font-size: clamp(16px, 3vw, 32px);
  margin-bottom: 2vh;
}

.clock-page.fullscreen .digital-time {
  font-size: clamp(80px, 25vw, 300px);
}

.clock-page.fullscreen .flip :deep(.flip-card) {
  width: clamp(80px, 14vw, 200px);
  height: clamp(120px, 20vw, 300px);
  font-size: clamp(60px, 10vw, 180px);
  perspective: 800px;
}

.clock-page.fullscreen .flip :deep(.digit) {
  line-height: clamp(120px, 20vw, 300px);
}

.ticks {
  position: absolute;
  inset: 0;
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
  top: 12px;
  left: -1px;
  width: 2px;
  height: 10px;
  background: #3a404d;
  opacity: 0.6;
}

.tick.bold {
  height: 16px;
  width: 3px;
  left: -1.5px;
  background: #d3d6dc;
  opacity: 1;
}

.numbers {
  position: absolute;
  inset: 0;
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
  padding-top: 32px; /* Distance from edge */
}

.number {
  color: #cfd2d9;
  font-weight: 700;
  font-size: clamp(42px, 6vw, 54px);
  display: block;
}

.hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform-origin: bottom center;
  transform: rotate(var(--rot));
  border-radius: 6px;
}

.hand.hour {
  width: 10px;
  height: 24%;
  background: #d3d6dc;
  margin-left: -5px;
}

.hand.minute {
  width: 8px;
  height: 35%;
  background: #9ba1ad;
  margin-left: -4px;
}

.hand.second {
  width: 4px;
  height: 40%;
  background: #f59e0b;
  margin-left: -2px;
}

.center-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d3d6dc;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 4px #0f121a;
}

.flip {
  margin: 24px auto 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: clamp(12px, 2vw, 24px);
  position: relative;
}

.flip-period {
  font-size: clamp(16px, 3vw, 32px);
  font-weight: 700;
  color: #9ba1ad;
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
  font-size: clamp(24px, 5vw, 64px);
  font-weight: 700;
  color: #f5f6fa;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.char-block {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0 0.2em;
  min-width: 0.8em;
  height: 1.4em;
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* Odd/Even Coloring & Blocks */
.char-block.odd {
  background: rgba(255, 255, 255, 0.08);
  color: #f5f6fa;
}

.char-block.even {
  background: rgba(255, 255, 255, 0.03);
  color: #d3d6dc;
}

/* Semantic Styling */
.char-block.type-period {
  font-size: 0.6em;
  align-self: center;
  margin-top: 0.5em;
  color: #fbbf24; /* Amber */
  background: rgba(251, 191, 36, 0.1);
}

.char-block.type-unit {
  font-size: 0.6em;
  align-self: center;
  background: transparent;
  color: #9ba1ad;
  margin-top: 0.5em; /* visual alignment */
}

/* Hover effect */
.char-block:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.15);
}

.clock-page.fullscreen .chinese-row.main {
  font-size: clamp(40px, 10vw, 120px);
}

.tabs {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 18px;
  flex-wrap: wrap;
}

/* Force lighter text color for buttons in dark mode */
.tabs :deep(button),
.controls :deep(button) {
  color: #e0e0e0 !important;
}

.tabs :deep(button.n-button--primary-type) {
  color: #fff !important;
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
  color: #9ba1ad;
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

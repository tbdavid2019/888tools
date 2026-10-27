<script setup lang="ts">
import { useClipboard } from '@vueuse/core';

const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
const running = ref(false);
const remainingMs = ref(0);
const display = computed(() => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs.value / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => n.toString().padStart(2, '0'));
});

let timer: number | null = null;
const { copy } = useClipboard();

const totalMs = computed(() => ((hours.value * 60 + minutes.value) * 60 + seconds.value) * 1000);

const resetInput = () => {
  hours.value = 0;
  minutes.value = 0;
  seconds.value = 0;
};

const stop = () => {
  running.value = false;
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
};

const start = () => {
  const ms = totalMs.value;
  if (ms <= 0) return;
  stop();
  remainingMs.value = ms;
  running.value = true;
  const startAt = Date.now();
  timer = window.setInterval(() => {
    const elapsed = Date.now() - startAt;
    remainingMs.value = Math.max(0, ms - elapsed);
    if (remainingMs.value <= 0) {
      stop();
    }
  }, 100);
};

const cancel = () => {
  stop();
  remainingMs.value = 0;
};

const addSeconds = (v: number) => {
  const total = ((hours.value * 60 + minutes.value) * 60 + seconds.value) + v;
  if (total < 0) return;
  hours.value = Math.floor(total / 3600);
  minutes.value = Math.floor((total % 3600) / 60);
  seconds.value = total % 60;
};

const onCopy = async () => {
  const text = display.value.join(':');
  await copy(text);
};

onBeforeUnmount(stop);
</script>

<template>
  <c-card>
    <div class="title">{{ $t('tools.countdown-timer.title') }}</div>
    <div class="timer-card">
      <div class="columns">
        <div class="column">
          <div class="label">{{ $t('tools.countdown-timer.hours') }}</div>
          <input v-model.number="hours" type="number" min="0" class="time-input" />
        </div>
        <span class="dots">:</span>
        <div class="column">
          <div class="label">{{ $t('tools.countdown-timer.minutes') }}</div>
          <input v-model.number="minutes" type="number" min="0" max="59" class="time-input" />
        </div>
        <span class="dots">:</span>
        <div class="column">
          <div class="label">{{ $t('tools.countdown-timer.seconds') }}</div>
          <input v-model.number="seconds" type="number" min="0" max="59" class="time-input" />
        </div>
      </div>
      <div class="display">
        <span>{{ display[0] }}</span>
        <span>:</span>
        <span>{{ display[1] }}</span>
        <span>:</span>
        <span>{{ display[2] }}</span>
      </div>
    </div>

    <div class="actions">
      <c-button type="primary" @click="start" :disabled="running">{{ $t('tools.countdown-timer.start') }}</c-button>
      <c-button @click="cancel">{{ $t('tools.countdown-timer.cancel') }}</c-button>
      <c-button secondary @click="resetInput">{{ $t('tools.countdown-timer.reset') }}</c-button>
    </div>

    <div class="quick">
      <c-button tertiary @click="() => addSeconds(60)">+1:00</c-button>
      <c-button tertiary @click="() => addSeconds(300)">+5:00</c-button>
      <c-button tertiary @click="() => addSeconds(600)">+10:00</c-button>
      <c-button tertiary @click="() => addSeconds(3600)">+1h</c-button>
      <c-button tertiary @click="onCopy">{{ $t('tools.countdown-timer.copyRemaining') }}</c-button>
    </div>
  </c-card>
</template>

<style scoped lang="less">
.title {
  font-size: var(--type-section-title);
  font-weight: 600;
  margin-bottom: 12px;
}
.timer-card {
  background: #f7f7f7;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}
.columns {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.column {
  text-align: center;
}
.label {
  font-size: var(--type-caption);
  margin-bottom: 4px;
  color: #555;
}
.time-input {
  width: 90px;
  font-size: var(--type-section-title);
  text-align: center;
  padding: 8px;
}
.dots {
  font-size: var(--type-section-title);
  padding: 0 4px;
}
.display {
  margin-top: 12px;
  display: flex;
  gap: 6px;
  justify-content: center;
  font-size: var(--type-metric);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.quick {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
</style>

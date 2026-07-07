<script setup lang="ts">
import { useRafFn } from '@vueuse/core';

import { formatMs } from './chronometer.service';
import { useAppTheme } from '@/ui/theme/themes';

const isRunning = ref(false);
const counter = ref(0);
const appTheme = useAppTheme();

let previousRafDate = Date.now();
const { pause: pauseRaf, resume: resumeRaf } = useRafFn(
  () => {
    const deltaMs = Date.now() - previousRafDate;
    previousRafDate = Date.now();
    counter.value += deltaMs;
  },
  { immediate: false },
);

function resume() {
  previousRafDate = Date.now();
  resumeRaf();
  isRunning.value = true;
}

function pause() {
  pauseRaf();
  isRunning.value = false;
}
</script>

<template>
  <div>
    <c-card>
      <div class="duration">
        {{ formatMs(counter) }}
      </div>
    </c-card>
    <div mt-5 flex justify-center gap-3>
      <c-button v-if="!isRunning" type="primary" @click="resume">
        Start
      </c-button>
      <c-button v-else type="warning" @click="pause">
        Stop
      </c-button>

      <c-button @click="counter = 0">
        Reset
      </c-button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.duration {
  text-align: center;
  font-size: 44px;
  font-weight: 700;
  font-family: monospace;
  margin: 20px 0;
  color: v-bind('appTheme.text.baseColor');
}
</style>

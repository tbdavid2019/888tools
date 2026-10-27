<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  value: string;
}>();

const current = ref(props.value);
const next = ref(props.value);
const isFlipping = ref(false);
let flipTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.value,
  (newVal, oldVal) => {
    if (newVal === oldVal) return;
    if (flipTimer) {
      clearTimeout(flipTimer);
      flipTimer = null;
    }
    current.value = oldVal || newVal;
    next.value = newVal;
    isFlipping.value = true;

    flipTimer = setTimeout(() => {
      isFlipping.value = false;
      current.value = newVal;
      flipTimer = null;
    }, 600); // Match CSS animation duration
  },
);

onUnmounted(() => {
  if (flipTimer) {
    clearTimeout(flipTimer);
    flipTimer = null;
  }
});
</script>

<template>
  <div class="flip-card">
    <!-- Background Top: Shows the Next value (revealed when Top Leaf flips down) -->
    <div class="digit top-bg">{{ next }}</div>

    <!-- Background Bottom: Shows the Current value (covered when Bottom Leaf flips down) -->
    <div class="digit bottom-bg">{{ current }}</div>

    <!-- Top Leaf: Shows Current value. Flips down (0 -> -90) -->
    <div class="digit leaf-top" :class="{ flipping: isFlipping }">
      {{ current }}
      <div class="shadow-top"></div>
    </div>

    <!-- Bottom Leaf: Shows Next value. Flips down (90 -> 0) -->
    <div class="digit leaf-bottom" :class="{ flipping: isFlipping }">
      {{ next }}
      <div class="shadow-bottom"></div>
    </div>

    <!-- Divider line -->
    <div class="divider"></div>
  </div>
</template>

<style scoped>
.flip-card {
  position: relative;
  width: 72px;
  width: clamp(52px, 11vw, 92px);
  height: 104px;
  height: clamp(78px, 14vw, 128px);
  background: var(--clock-flip-bg, #17324D);
  border-radius: 8px;
  border: 1px solid var(--clock-flip-border, #0F2336);
  font-size: 48px;
  font-size: clamp(2.25rem, 7vw, 4rem);
  font-weight: 700;
  color: var(--clock-flip-text, #FFF9E8);
  perspective: 300px;
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.35);
}

.digit {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 50%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  background: var(--clock-flip-bg, #17324D);
  color: var(--clock-flip-text, #FFF9E8);
  backface-visibility: hidden;
  line-height: 104px;
  line-height: clamp(78px, 14vw, 128px); /* Line height = full card height to center text vertically across halves */
}

.top-bg {
  top: 0;
  align-items: flex-start;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  z-index: 1;
}

.bottom-bg {
  top: auto;
  bottom: 0;
  align-items: flex-end;
  border-radius: 0 0 8px 8px;
  z-index: 1;
}

.leaf-top {
  top: 0;
  align-items: flex-start;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  transform-origin: bottom;
  z-index: 2;
}

.leaf-top.flipping {
  animation: flipTop 0.3s ease-in forwards;
}

.leaf-bottom {
  top: auto;
  bottom: 0;
  align-items: flex-end;
  border-radius: 0 0 8px 8px;
  transform-origin: top;
  transform: rotateX(90deg); /* Initially hidden (flat up) */
  z-index: 2;
}

.leaf-bottom.flipping {
  animation: flipBottom 0.3s 0.3s ease-out forwards;
}

.shadow-top,
.shadow-bottom {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
}

.shadow-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 100%);
  opacity: 0;
}

.leaf-top.flipping .shadow-top {
  animation: showShadow 0.3s ease-in forwards;
}

.shadow-bottom {
  top: auto;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 100%);
  opacity: 1;
}

.leaf-bottom.flipping .shadow-bottom {
  animation: hideShadow 0.3s 0.3s ease-out forwards;
}

.divider {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  width: 100%;
  height: 1px;
  background: rgba(0, 0, 0, 0.4);
  z-index: 5;
}

@keyframes flipTop {
  0% {
    transform: rotateX(0deg);
  }
  100% {
    transform: rotateX(-90deg);
  }
}

@keyframes flipBottom {
  0% {
    transform: rotateX(90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

@keyframes showShadow {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes hideShadow {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
</style>

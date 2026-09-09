<script setup lang="ts">
import { useAudioStore } from '@/stores/audio.store';
import { storeToRefs } from 'pinia';
import { useMessage } from 'naive-ui';
import { ref, onBeforeUnmount, watch, computed } from 'vue';
import {
  PlayerPlay,
  PlayerPause,
  Upload,
  Volume,
  Volume3,
  Download,
  PlayerSkipBack,
  PlayerSkipForward,
  Sun,
  Moon,
  Radio,
  Trash,
} from '@vicons/tabler';

const store = useAudioStore();
const { audioFile, audioBuffer, isPlaying, volume, duration, currentTime, effects, selection } = storeToRefs(store);

const message = useMessage();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const audioContextRef = ref<AudioContext | null>(null);
const sourceNodeRef = ref<AudioBufferSourceNode | null>(null);
const gainNodeRef = ref<GainNode | null>(null);
const startTimeRef = ref<number>(0);
const pauseTimeRef = ref<number>(0);
const isSelecting = ref(false);
const selectionAnchor = ref(0);
const hasDragged = ref(false);
const dragThresholdSeconds = 0.08;
const isDragging = ref(false);
let dragCounter = 0;

const loadAudioFile = async (file: File) => {
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|aac|wma|opus)$/i.test(file.name);
  if (!isAudio) {
    message.error('Please select a valid audio file');
    return;
  }

  try {
    store.reset();
    store.setAudioFile(file);

    const arrayBuffer = await file.arrayBuffer();
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decodedBuffer = await context.decodeAudioData(arrayBuffer);

    audioContextRef.value = context;
    store.setAudioBuffer(decodedBuffer);
    store.setDuration(decodedBuffer.duration);
    store.setSelection({ start: 0, end: decodedBuffer.duration });

    message.success('Audio loaded successfully');
    drawWaveform();
  } catch (error) {
    console.error(error);
    message.error('Error loading audio file');
  }
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await loadAudioFile(file);
  target.value = '';
};

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  dragCounter++;
  isDragging.value = true;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDragging.value = false;
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragCounter = 0;
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    loadAudioFile(file);
  }
}

const drawWaveform = () => {
  if (!canvasRef.value || !audioBuffer.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = audioBuffer.value.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(0, amp);

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    ctx.lineTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }

  ctx.strokeStyle = '#2080f0';
  ctx.stroke();

  // Draw selection
  if (selection.value.end > 0) {
    const startX = (selection.value.start / duration.value) * width;
    const endX = (selection.value.end / duration.value) * width;
    ctx.fillStyle = 'rgba(32, 128, 240, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);
  }

  // Draw cursor
  const cursorX = (currentTime.value / duration.value) * width;
  ctx.beginPath();
  ctx.moveTo(cursorX, 0);
  ctx.lineTo(cursorX, height);
  ctx.strokeStyle = '#d03050';
  ctx.stroke();
};

const hasSelection = computed(() => selection.value.end > selection.value.start + 0.01);

const getActiveRange = () => {
  if (!audioBuffer.value) return { start: 0, end: 0 };
  if (selection.value.end > selection.value.start) {
    return { start: selection.value.start, end: selection.value.end };
  }
  return { start: 0, end: audioBuffer.value.duration };
};

const getTimeFromEvent = (e: MouseEvent) => {
  if (!canvasRef.value || !duration.value) return 0;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
  return (x / rect.width) * duration.value;
};

const updateSelection = (anchor: number, current: number) => {
  const start = Math.max(0, Math.min(anchor, current));
  const end = Math.min(duration.value, Math.max(anchor, current));
  store.setSelection({ start, end });
};

const handleCanvasMouseDown = (e: MouseEvent) => {
  if (!duration.value) return;
  if (isPlaying.value) stopPlayback();
  const time = getTimeFromEvent(e);
  isSelecting.value = true;
  hasDragged.value = false;
  selectionAnchor.value = time;
};

const handleCanvasMouseMove = (e: MouseEvent) => {
  if (!isSelecting.value) return;
  const time = getTimeFromEvent(e);
  if (Math.abs(time - selectionAnchor.value) >= dragThresholdSeconds) {
    hasDragged.value = true;
  }
  if (hasDragged.value) {
    updateSelection(selectionAnchor.value, time);
    drawWaveform();
  }
};

const handleCanvasMouseUp = (e: MouseEvent) => {
  if (!isSelecting.value) return;
  const time = getTimeFromEvent(e);
  if (hasDragged.value) {
    updateSelection(selectionAnchor.value, time);
    const start = Math.min(selectionAnchor.value, time);
    store.setCurrentTime(start);
    pauseTimeRef.value = start;
  } else {
    store.setCurrentTime(time);
    pauseTimeRef.value = time;
  }
  isSelecting.value = false;
  hasDragged.value = false;
  drawWaveform();
};

const handleCanvasMouseLeave = (e: MouseEvent) => {
  if (isSelecting.value) handleCanvasMouseUp(e);
};

const playPlayback = () => {
  if (!audioContextRef.value || !audioBuffer.value) return;

  if (audioContextRef.value.state === 'suspended') {
    audioContextRef.value.resume();
  }

  const source = audioContextRef.value.createBufferSource();
  source.buffer = audioBuffer.value;

  const outputGain = audioContextRef.value.createGain();
  outputGain.gain.value = volume.value;

  const echoEffect = effects.value.find((effect) => effect.type === 'echo');
  const reverbEffect = effects.value.find((effect) => effect.type === 'reverb');
  const fadeInEffect = effects.value.find((effect) => effect.type === 'fadeIn');
  const fadeOutEffect = effects.value.find((effect) => effect.type === 'fadeOut');

  if (echoEffect) {
    const delay = audioContextRef.value.createDelay(5);
    delay.delayTime.value = Math.min(0.8, Math.max(0.08, echoEffect.value));
    const feedback = audioContextRef.value.createGain();
    feedback.gain.value = 0.35;
    const wetGain = audioContextRef.value.createGain();
    wetGain.gain.value = 0.35;

    source.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(outputGain);
    source.connect(outputGain);
  } else {
    source.connect(outputGain);
  }

  if (reverbEffect) {
    const convolver = audioContextRef.value.createConvolver();
    convolver.buffer = createReverbBuffer(audioContextRef.value);
    const reverbGain = audioContextRef.value.createGain();
    reverbGain.gain.value = 0.25;
    source.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(outputGain);
  }

  outputGain.connect(audioContextRef.value.destination);

  sourceNodeRef.value = source;
  gainNodeRef.value = outputGain;

  // Start from currentTime
  const offset = currentTime.value;
  startTimeRef.value = audioContextRef.value.currentTime - offset;

  const remainingDuration = Math.max(0, duration.value - offset);
  if (fadeInEffect) {
    const fadeDuration = Math.min(remainingDuration, Math.max(0.05, fadeInEffect.value));
    outputGain.gain.setValueAtTime(0, audioContextRef.value.currentTime);
    outputGain.gain.linearRampToValueAtTime(volume.value, audioContextRef.value.currentTime + fadeDuration);
  } else {
    outputGain.gain.setValueAtTime(volume.value, audioContextRef.value.currentTime);
  }

  if (fadeOutEffect) {
    const fadeDuration = Math.min(remainingDuration, Math.max(0.05, fadeOutEffect.value));
    const fadeStart = audioContextRef.value.currentTime + Math.max(0, remainingDuration - fadeDuration);
    outputGain.gain.setValueAtTime(volume.value, fadeStart);
    outputGain.gain.linearRampToValueAtTime(0, fadeStart + fadeDuration);
  }

  source.start(0, offset);
  source.onended = () => {
    if (isPlaying.value) {
      // only trigger if natural end
      store.setIsPlaying(false);
      // Do not reset current time to 0 necessarily, but let's do it for loop feel
    }
  };

  store.setIsPlaying(true);
  requestAnimationFrame(updateTime);
};

const stopPlayback = () => {
  if (sourceNodeRef.value) {
    sourceNodeRef.value.stop();
    sourceNodeRef.value = null;
  }
  store.setIsPlaying(false);
  // Save current time
  if (audioContextRef.value) {
    pauseTimeRef.value = audioContextRef.value.currentTime - startTimeRef.value;
    store.setCurrentTime(pauseTimeRef.value);
  }
};

const togglePlayPause = () => {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    playPlayback();
  }
};

const updateTime = () => {
  if (!isPlaying.value || !audioContextRef.value) return;
  const now = audioContextRef.value.currentTime;
  const time = now - startTimeRef.value;

  if (time >= duration.value) {
    stopPlayback();
    store.setCurrentTime(0);
    pauseTimeRef.value = 0;
  } else {
    store.setCurrentTime(time);
    drawWaveform();
    requestAnimationFrame(updateTime);
  }
};

const applyTrimSelection = () => {
  if (!audioBuffer.value) return;
  const { start, end } = getActiveRange();
  if (end <= start) {
    message.warning('Select a range to trim');
    return;
  }
  const sampleRate = audioBuffer.value.sampleRate;
  const startIndex = Math.floor(start * sampleRate);
  const endIndex = Math.floor(end * sampleRate);
  const frameCount = Math.max(1, endIndex - startIndex);

  const context = audioContextRef.value ?? new (window.AudioContext || (window as any).webkitAudioContext)();
  audioContextRef.value = context;
  const trimmedBuffer = context.createBuffer(audioBuffer.value.numberOfChannels, frameCount, sampleRate);

  for (let channel = 0; channel < audioBuffer.value.numberOfChannels; channel++) {
    const channelData = audioBuffer.value.getChannelData(channel).slice(startIndex, endIndex);
    trimmedBuffer.getChannelData(channel).set(channelData);
  }

  store.setAudioBuffer(trimmedBuffer);
  store.setDuration(trimmedBuffer.duration);
  store.setSelection({ start: 0, end: trimmedBuffer.duration });
  store.setCurrentTime(0);
  pauseTimeRef.value = 0;
  drawWaveform();
  message.success('Trim applied');
};

const resetSelection = () => {
  store.setSelection({ start: 0, end: duration.value });
  drawWaveform();
};

const createReverbBuffer = (context: BaseAudioContext, durationSeconds = 1.4, decay = 2.2) => {
  const rate = context.sampleRate;
  const length = Math.floor(rate * durationSeconds);
  const impulse = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
};

const renderEditedAudio = async () => {
  if (!audioBuffer.value) return null;
  const { start, end } = getActiveRange();
  const sampleRate = audioBuffer.value.sampleRate;
  const durationSeconds = Math.max(0.01, end - start);
  const frameCount = Math.floor(durationSeconds * sampleRate);
  const offlineContext = new OfflineAudioContext(audioBuffer.value.numberOfChannels, frameCount, sampleRate);

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer.value;

  const output = offlineContext.createGain();
  output.gain.value = 1;

  const echoEffect = effects.value.find((effect) => effect.type === 'echo');
  const reverbEffect = effects.value.find((effect) => effect.type === 'reverb');
  const fadeInEffect = effects.value.find((effect) => effect.type === 'fadeIn');
  const fadeOutEffect = effects.value.find((effect) => effect.type === 'fadeOut');

  if (echoEffect) {
    const delay = offlineContext.createDelay(5);
    delay.delayTime.value = Math.min(0.8, Math.max(0.08, echoEffect.value));
    const feedback = offlineContext.createGain();
    feedback.gain.value = 0.35;
    const wetGain = offlineContext.createGain();
    wetGain.gain.value = 0.35;

    source.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(output);
    source.connect(output);
  } else {
    source.connect(output);
  }

  if (reverbEffect) {
    const convolver = offlineContext.createConvolver();
    convolver.buffer = createReverbBuffer(offlineContext);
    const reverbGain = offlineContext.createGain();
    reverbGain.gain.value = 0.25;
    source.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(output);
  }

  if (fadeInEffect) {
    const fadeDuration = Math.min(durationSeconds, Math.max(0.05, fadeInEffect.value));
    output.gain.setValueAtTime(0, 0);
    output.gain.linearRampToValueAtTime(1, fadeDuration);
  } else {
    output.gain.setValueAtTime(1, 0);
  }

  if (fadeOutEffect) {
    const fadeDuration = Math.min(durationSeconds, Math.max(0.05, fadeOutEffect.value));
    output.gain.setValueAtTime(1, Math.max(0, durationSeconds - fadeDuration));
    output.gain.linearRampToValueAtTime(0, durationSeconds);
  }

  output.connect(offlineContext.destination);
  source.start(0, start, durationSeconds);
  const renderedBuffer = await offlineContext.startRendering();
  return renderedBuffer;
};

watch(volume, (newVal) => {
  if (gainNodeRef.value) {
    gainNodeRef.value.gain.value = newVal;
  }
});

watch([selection, currentTime], () => {
  if (!isPlaying.value) {
    drawWaveform();
  }
});

const applyEffect = (type: 'fadeIn' | 'fadeOut' | 'echo' | 'reverb') => {
  const defaultValues: Record<string, number> = {
    fadeIn: 1.5,
    fadeOut: 1.5,
    echo: 0.25,
    reverb: 1.2,
  };
  store.addEffect({ type, value: defaultValues[type] ?? 1 });
  message.success(`Effect ${type} added`);
};

const removeEffect = (id: string) => {
  store.removeEffect(id);
};

const writeString = (view: DataView, offset: number, value: string) => {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
};

const audioBufferToWav = (buffer: AudioBuffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const downloadAudio = async () => {
  if (!audioFile.value || !audioBuffer.value) return;
  const renderedBuffer = await renderEditedAudio();
  if (!renderedBuffer) return;

  const wavBlob = audioBufferToWav(renderedBuffer);
  const link = document.createElement('a');
  const url = URL.createObjectURL(wavBlob);
  link.href = url;
  link.download = `edited_${audioFile.value.name.replace(/\.[^/.]+$/, '')}.wav`;
  link.click();
  URL.revokeObjectURL(url);
  message.success('Edited audio downloaded');
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toFixed(2)}`;
};

onBeforeUnmount(() => {
  stopPlayback();
  store.reset();
  if (audioContextRef.value) audioContextRef.value.close();
});
</script>

<template>
  <c-card>
    <div class="space-y-6">
      <div
        v-if="!audioFile"
        class="p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200"
        :class="{
          'border-primary bg-primary/10 scale-[1.008] ring-2 ring-primary/20': isDragging,
          'border-gray-300 dark:border-zinc-700 hover:border-primary hover:bg-gray-50/50 dark:hover:bg-zinc-800/20': !isDragging,
        }"
        @click="fileInput?.click()"
        @dragenter="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input ref="fileInput" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac" hidden @change="handleFileUpload" />
        <div class="pointer-events-none flex flex-col items-center">
          <n-icon size="48" class="text-gray-400 mb-2">
            <Upload />
          </n-icon>
          <p class="text-lg font-medium text-gray-700 dark:text-gray-200">Click or drop audio file here</p>
          <p class="text-xs text-gray-400 mt-1">Supports MP3, WAV, M4A, OGG, FLAC, AAC</p>
        </div>
      </div>

      <div
        v-else
        class="relative"
        @dragenter="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <!-- Overlay when dragging over existing audio -->
        <div
          v-if="isDragging"
          class="absolute inset-0 z-50 rounded-xl bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none"
        >
          <n-icon size="48" class="text-primary mb-2">
            <Upload />
          </n-icon>
          <p class="text-lg font-bold text-primary">Drop new audio to replace</p>
        </div>

        <div class="mb-4 flex flex-wrap justify-between items-center gap-3">
          <div class="flex flex-col">
            <h3 class="font-bold text-base">{{ audioFile.name }}</h3>
            <span class="text-xs text-gray-500">{{ formatTime(duration) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <input ref="fileInput" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac" hidden @change="handleFileUpload" />
            <c-button size="small" secondary @click="fileInput?.click()">
              <template #icon><n-icon><Upload /></n-icon></template>
              Replace Audio
            </c-button>
          </div>
        </div>

        <canvas
          ref="canvasRef"
          width="800"
          height="200"
          class="w-full h-40 bg-gray-100 dark:bg-gray-900 rounded border cursor-pointer mb-4"
          @mousedown="handleCanvasMouseDown"
          @mousemove="handleCanvasMouseMove"
          @mouseup="handleCanvasMouseUp"
          @mouseleave="handleCanvasMouseLeave"
        ></canvas>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <c-button size="small" :disabled="!hasSelection" @click="applyTrimSelection">Trim Selection</c-button>
          <c-button size="small" secondary @click="resetSelection">Reset Selection</c-button>
        </div>

        <div class="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center gap-2">
            <c-button circle @click="store.setSpeed(0.5)"
              ><template #icon
                ><n-icon><PlayerSkipBack /></n-icon></template
            ></c-button>
            <c-button circle primary size="large" @click="togglePlayPause">
              <template #icon>
                <n-icon size="24"><PlayerPause v-if="isPlaying" /><PlayerPlay v-else /></n-icon>
              </template>
            </c-button>
            <c-button circle @click="store.setSpeed(2.0)"
              ><template #icon
                ><n-icon><PlayerSkipForward /></n-icon></template
            ></c-button>
          </div>

          <div class="flex items-center gap-2 w-48">
            <n-icon><Volume3 /></n-icon>
            <n-slider v-model:value="volume" :max="1" :step="0.05" />
          </div>

          <div class="text-mono font-bold">{{ formatTime(currentTime) }}</div>
        </div>

        <n-tabs type="segment" class="mt-6">
          <n-tab-pane name="effects" tab="Effects">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <c-button @click="applyEffect('fadeIn')"
                ><template #icon
                  ><n-icon><Sun /></n-icon></template
                >Fade In</c-button
              >
              <c-button @click="applyEffect('fadeOut')"
                ><template #icon
                  ><n-icon><Moon /></n-icon></template
                >Fade Out</c-button
              >
              <c-button @click="applyEffect('echo')"
                ><template #icon
                  ><n-icon><Radio /></n-icon></template
                >Echo</c-button
              >
              <c-button @click="applyEffect('reverb')"
                ><template #icon
                  ><n-icon><Radio /></n-icon></template
                >Reverb</c-button
              >
            </div>

            <n-list v-if="effects.length > 0">
              <n-list-item v-for="effect in effects" :key="effect.id">
                <div class="flex justify-between items-center">
                  <span>{{ effect.type }}</span>
                  <c-button size="tiny" circle type="error" @click="removeEffect(effect.id)"
                    ><template #icon
                      ><n-icon><Trash /></n-icon></template
                  ></c-button>
                </div>
              </n-list-item>
            </n-list>
          </n-tab-pane>
          <n-tab-pane name="export" tab="Export">
            <div class="p-4 text-center">
              <c-button type="primary" size="large" @click="downloadAudio">
                <template #icon
                  ><n-icon><Download /></n-icon
                ></template>
                Download Edited Audio
              </c-button>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </c-card>
</template>

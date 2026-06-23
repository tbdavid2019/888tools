<script setup lang="ts">
import { useDropZone, useFileDialog } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { ref, shallowRef, onBeforeUnmount } from 'vue';
import { Rotate, Trash, PlayerPlay, PlayerPause, Volume, Volume3, Download, Movie } from '@vicons/tabler';

const message = useMessage();
const mainElement = ref<HTMLElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

const { open, onChange } = useFileDialog({
  accept: 'video/*',
  multiple: false,
});

const video = shallowRef<{
  url: string;
  file: File;
  name: string;
  size: number;
  type: string;
  duration: number;
  width: number;
  height: number;
} | null>(null);

const trimRange = ref({ start: 0, end: 0 });
const targetFormat = ref('video/mp4');
const isPlaying = ref(false);
const currentTime = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const processedVideo = ref<string | null>(null);
const processedMimeType = ref<string | null>(null);
const isProcessing = ref(false);

const formatOptions = [
  { label: 'MP4', value: 'video/mp4', extension: 'mp4' },
  { label: 'WebM', value: 'video/webm', extension: 'webm' },
  // OGG support varies by browser for encoding
];

const processFile = (file: File) => {
  if (file.size > 100 * 1024 * 1024) {
    message.error('Video size limit is 100MB');
    return;
  }

  const url = URL.createObjectURL(file);
  const tempVideo = document.createElement('video');
  tempVideo.src = url;

  tempVideo.onloadedmetadata = () => {
    video.value = {
      url,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      duration: tempVideo.duration,
      width: tempVideo.videoWidth,
      height: tempVideo.videoHeight,
    };
    trimRange.value = { start: 0, end: tempVideo.duration };
    processedVideo.value = null;
    processedMimeType.value = null;
  };
};

onChange((files) => {
  if (files && files.length > 0) {
    processFile(files[0]);
  }
});

const onDrop = (files: File[] | null) => {
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const { isOverDropZone } = useDropZone(mainElement, onDrop);

const handlePlayPause = () => {
  if (!videoRef.value) return;
  if (isPlaying.value) {
    videoRef.value.pause();
  } else {
    videoRef.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

const handleTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
  }
};

const handleSeek = (time: number) => {
  if (videoRef.value) {
    videoRef.value.currentTime = time;
    currentTime.value = time;
  }
};

const handleVolumeChange = (newVolume: number) => {
  volume.value = newVolume;
  if (videoRef.value) {
    videoRef.value.volume = newVolume;
  }
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  if (videoRef.value) {
    videoRef.value.muted = isMuted.value;
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const handleReset = () => {
  if (video.value?.url) {
    URL.revokeObjectURL(video.value.url);
  }
  video.value = null;
  trimRange.value = { start: 0, end: 0 };
  processedVideo.value = null;
  processedMimeType.value = null;
  currentTime.value = 0;
  isPlaying.value = false;
};

const handleProcess = async (mode: 'trim' | 'convert') => {
  if (!video.value) return;

  isProcessing.value = true;
  let audioContext: AudioContext | null = null;
  let processingVideoEl: HTMLVideoElement | null = null;
  try {
    const videoEl = document.createElement('video');
    processingVideoEl = videoEl;
    videoEl.src = video.value.url;
    videoEl.crossOrigin = 'anonymous';
    videoEl.preload = 'auto';
    videoEl.playsInline = true;
    videoEl.style.position = 'fixed';
    videoEl.style.left = '-9999px';
    videoEl.style.top = '0';
    document.body.appendChild(videoEl);

    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = resolve;
      videoEl.onerror = reject;
    });

    const startTime = mode === 'trim' ? trimRange.value.start : 0;
    const endTime = mode === 'trim' ? trimRange.value.end : video.value.duration;
    const duration = Math.max(0, endTime - startTime);
    if (duration <= 0) {
      message.error('Invalid trim range');
      isProcessing.value = false;
      return;
    }

    const videoStream = (videoEl as any).captureStream?.() || (videoEl as any).mozCaptureStream?.();
    if (!videoStream) {
      throw new Error('Video capture is not supported in this browser.');
    }

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioSource = audioContext.createMediaElementSource(videoEl);
    const audioDestination = audioContext.createMediaStreamDestination();
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    audioSource.connect(audioDestination);
    audioSource.connect(silentGain);
    silentGain.connect(audioContext.destination);
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);

    let mimeType = targetFormat.value;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error('Browser does not support this video encoding.');
      }
      message.warning('Requested format not supported, falling back to WebM.');
    }

    const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    const finalizeRecording = () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (processedVideo.value) URL.revokeObjectURL(processedVideo.value);
      processedVideo.value = URL.createObjectURL(blob);
      processedMimeType.value = mimeType;
      isProcessing.value = false;
      message.success('Video processed successfully!');
      audioContext?.close();
      document.body.removeChild(videoEl);
      processingVideoEl = null;
    };

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = finalizeRecording;

    await new Promise((resolve) => {
      if (startTime === 0) {
        resolve(null);
        return;
      }
      videoEl.onseeked = resolve;
      videoEl.currentTime = startTime;
    });

    mediaRecorder.start();
    await videoEl.play();

    const stopWhenDone = () => {
      if (videoEl.currentTime >= endTime || videoEl.ended) {
        videoEl.pause();
        mediaRecorder.stop();
        return;
      }
      requestAnimationFrame(stopWhenDone);
    };

    stopWhenDone();
  } catch (e: any) {
    console.error(e);
    message.error('Error processing video: ' + e.message);
    isProcessing.value = false;
    await audioContext?.close();
    if (processingVideoEl?.parentNode) {
      processingVideoEl.parentNode.removeChild(processingVideoEl);
    }
  }
};

const downloadVideo = () => {
  if (!processedVideo.value || !video.value) return;
  const link = document.createElement('a');
  link.href = processedVideo.value;
  const ext = (processedMimeType.value ?? targetFormat.value).split('/')[1] || 'mp4';
  link.download = `${video.value.name.split('.')[0]}_processed.${ext}`;
  link.click();
};

onBeforeUnmount(() => {
  if (video.value?.url) URL.revokeObjectURL(video.value.url);
  if (processedVideo.value) URL.revokeObjectURL(processedVideo.value);
});
</script>

<template>
  <c-card>
    <div ref="mainElement">
      <div
        v-if="!video"
        class="p-10 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        :class="{ 'border-primary bg-primary/5': isOverDropZone }"
        @click="open()"
      >
        <n-icon size="48" class="text-gray-400 mb-2">
          <Movie />
        </n-icon>
        <p class="text-lg text-gray-500">Click or drop video here</p>
        <p class="text-xs text-gray-400 mt-1">Supports MP4, WebM (Max 100MB)</p>
      </div>

      <div v-else class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Player -->
          <n-card title="Video Player" size="small">
            <template #header-extra>
              <c-button size="tiny" secondary @click="handleReset">
                <template #icon
                  ><n-icon><Rotate /></n-icon
                ></template>
                Reset
              </c-button>
            </template>

            <video
              ref="videoRef"
              :src="video.url"
              class="w-full rounded-lg bg-black aspect-video object-contain"
              @timeupdate="handleTimeUpdate"
              @play="isPlaying = true"
              @pause="isPlaying = false"
              @ended="isPlaying = false"
            ></video>

            <div class="mt-3 flex flex-col gap-2">
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(video.duration) }}</span>
              </div>
              <n-slider
                v-model:value="currentTime"
                :max="video.duration"
                :step="0.1"
                @update:value="handleSeek"
                :tooltip="false"
              />
              <div class="flex items-center gap-4 mt-2">
                <c-button circle size="tiny" @click="handlePlayPause">
                  <template #icon>
                    <n-icon size="16">
                      <PlayerPause v-if="isPlaying" />
                      <PlayerPlay v-else />
                    </n-icon>
                  </template>
                </c-button>

                <div class="flex items-center gap-2 w-32">
                  <c-button circle size="tiny" text @click="toggleMute">
                    <template #icon>
                      <n-icon>
                        <Volume3 v-if="isMuted || volume === 0" />
                        <Volume v-else />
                      </n-icon>
                    </template>
                  </c-button>
                  <n-slider
                    v-model:value="volume"
                    :max="1"
                    :step="0.1"
                    @update:value="handleVolumeChange"
                    :tooltip="false"
                  />
                </div>
              </div>
            </div>
          </n-card>

          <!-- Info -->
          <n-card title="Video Info" size="small">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between border-b pb-2">
                <span class="text-gray-500">Name</span>
                <span>{{ video.name }}</span>
              </div>
              <div class="flex justify-between border-b pb-2">
                <span class="text-gray-500">Size</span>
                <span>{{ (video.size / 1024 / 1024).toFixed(2) }} MB</span>
              </div>
              <div class="flex justify-between border-b pb-2">
                <span class="text-gray-500">Resolution</span>
                <span>{{ video.width }} x {{ video.height }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Type</span>
                <span>{{ video.type }}</span>
              </div>
            </div>
          </n-card>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Tools -->
          <div class="space-y-6">
            <n-card title="Trim Video" size="small">
              <div class="space-y-4">
                <div>
                  <label class="text-xs text-gray-500"
                    >Range: {{ formatTime(trimRange.start) }} - {{ formatTime(trimRange.end) }}</label
                  >
                  <n-slider v-model:value="trimRange.start" :max="video.duration" :step="0.1" class="mt-2" />
                  <n-slider v-model:value="trimRange.end" :max="video.duration" :step="0.1" class="mt-2" />
                </div>
                <div class="text-xs text-gray-500">Duration: {{ formatTime(trimRange.end - trimRange.start) }}</div>
                <c-button
                  class="w-full"
                  @click="handleProcess('trim')"
                  :disabled="isProcessing || trimRange.start >= trimRange.end"
                >
                  {{ isProcessing ? 'Processing...' : 'Trim Video' }}
                </c-button>
              </div>
            </n-card>

            <n-card title="Convert Format" size="small">
              <div class="space-y-4">
                <n-form-item label="Target Format" :show-label="false">
                  <c-select v-model:value="targetFormat" :options="formatOptions" />
                </n-form-item>
                <c-button class="w-full" @click="handleProcess('convert')" :disabled="isProcessing">
                  {{ isProcessing ? 'Processing...' : 'Convert Video' }}
                </c-button>
              </div>
            </n-card>
          </div>

          <!-- Preview -->
          <n-card title="Processed Result" size="small">
            <div
              class="h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800"
            >
              <video v-if="processedVideo" :src="processedVideo" controls class="h-full w-full object-contain"></video>
              <div v-else class="text-center text-gray-400">
                <n-icon size="32" class="mb-2"><Movie /></n-icon>
                <div>Processed video will appear here</div>
              </div>
            </div>
            <c-button v-if="processedVideo" class="w-full mt-4" primary @click="downloadVideo">
              <template #icon
                ><n-icon><Download /></n-icon
              ></template>
              Download
            </c-button>
          </n-card>
        </div>
      </div>
    </div>
  </c-card>
</template>

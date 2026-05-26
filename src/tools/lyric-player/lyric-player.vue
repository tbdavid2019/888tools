<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useDropZone, useFileDialog } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { convertOpenCC } from '@/services/opencc.service';
import { Download, Edit, FileMusic, Language, Microphone, PlayerPlay, Upload } from '@vicons/tabler';
import type { LyricLine, WhisperChunk } from './lyric-player.service';
import {
  alignLyricsToChunks,
  buildLrc,
  checkTimestampQuality,
  cleanReferenceLines,
  cleanRepeats,
  deduplicateOverlap,
  formatLrcTime,
  hasStructureMarkers,
  isWhisperJunk,
  parseLrc,
  redistributeChunks,
  structuredDistribute,
} from './lyric-player.service';

type SupportedLanguage = 'chinese' | 'english' | 'japanese' | 'korean' | 'auto';

type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{
  text?: string
  chunks?: Array<{ text?: string, timestamp?: [number?, number?] }>
}>;

const message = useMessage();
const dropZoneRef = ref<HTMLElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);

const audioFile = ref<File | null>(null);
const audioUrl = ref<string | null>(null);
const audioName = ref('');
const duration = ref(0);
const currentTime = ref(0);
const lyrics = ref<LyricLine[]>([]);
const currentLineIndex = ref(-1);
const referenceText = ref('');
const selectedLanguage = ref<SupportedLanguage>('chinese');
const isRecognizing = ref(false);
const aiProgress = ref(0);
const aiStatus = ref('模型尚未載入');
const showEditModal = ref(false);
const showExportModal = ref(false);
const editableLrc = ref('');
const modelRuntime = ref<'webgpu' | 'wasm' | null>(null);

const { open: openAudioDialog, onChange: onAudioDialogChange } = useFileDialog({
  accept: 'audio/*',
  multiple: false,
});

const { open: openLrcDialog, onChange: onLrcDialogChange } = useFileDialog({
  accept: '.lrc,.txt',
  multiple: false,
});

let transcriberPromise: Promise<Transcriber> | null = null;

const languageOptions = [
  { label: '中文', value: 'chinese' },
  { label: '英文', value: 'english' },
  { label: '日文', value: 'japanese' },
  { label: '韓文', value: 'korean' },
  { label: '自動偵測', value: 'auto' },
];

const hasAudio = computed(() => Boolean(audioFile.value && audioUrl.value));
const hasLyrics = computed(() => lyrics.value.length > 0);
const lrcPreview = computed(() => buildLrc(audioName.value || 'lyrics', lyrics.value));
const canTranscribe = computed(() => hasAudio.value && !isRecognizing.value);

const resetLyrics = () => {
  lyrics.value = [];
  currentLineIndex.value = -1;
};

const setAudioFile = (file: File) => {
  if (!file.type.startsWith('audio/')) {
    message.error('請選擇有效的音訊檔案');
    return;
  }

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }

  audioFile.value = file;
  audioUrl.value = URL.createObjectURL(file);
  audioName.value = file.name.replace(/\.[^.]+$/, '');
  duration.value = 0;
  currentTime.value = 0;
  resetLyrics();
};

onAudioDialogChange((files) => {
  const file = files?.[0];
  if (file) {
    setAudioFile(file);
  }
});

onLrcDialogChange(async (files) => {
  const file = files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  const parsed = parseLrc(text).filter(line => !isWhisperJunk(line.text));
  if (parsed.length === 0) {
    message.error('LRC 檔案格式無法解析');
    return;
  }

  lyrics.value = parsed;
  message.success(`已載入 ${parsed.length} 行歌詞`);
});

useDropZone(dropZoneRef, {
  onDrop(files) {
    const file = files?.[0];
    if (file) {
      setAudioFile(file);
    }
  },
});

watch(audioUrl, () => {
  if (audioRef.value) {
    audioRef.value.load();
  }
});

const syncCurrentLine = () => {
  if (!lyrics.value.length) {
    currentLineIndex.value = -1;
    return;
  }

  const now = currentTime.value;
  let nextIndex = -1;
  for (let index = lyrics.value.length - 1; index >= 0; index -= 1) {
    if (now >= lyrics.value[index].time) {
      nextIndex = index;
      break;
    }
  }
  currentLineIndex.value = nextIndex;
};

const handleLoadedMetadata = () => {
  duration.value = audioRef.value?.duration ?? 0;
};

const handleTimeUpdate = () => {
  currentTime.value = audioRef.value?.currentTime ?? 0;
  syncCurrentLine();
};

const seekToLine = async (line: LyricLine, index: number) => {
  if (!audioRef.value) {
    return;
  }

  audioRef.value.currentTime = line.time;
  currentTime.value = line.time;
  currentLineIndex.value = index;
  await audioRef.value.play();
};

const openEditor = () => {
  editableLrc.value = lrcPreview.value;
  showEditModal.value = true;
};

const saveEditor = () => {
  const parsed = parseLrc(editableLrc.value).filter(line => !isWhisperJunk(line.text));
  if (parsed.length === 0) {
    message.error('請至少保留一行有效的 LRC 時間戳歌詞');
    return;
  }

  lyrics.value = parsed;
  showEditModal.value = false;
  message.success('歌詞已更新');
};

const downloadLrc = () => {
  const blob = new Blob([lrcPreview.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${audioName.value || 'lyrics'}.lrc`;
  link.click();
  URL.revokeObjectURL(url);
};

const convertLyricsToTraditional = () => {
  lyrics.value = lyrics.value.map(line => ({
    ...line,
    text: convertOpenCC(line.text, 's2twp'),
  }));
  message.success('已轉換為正體中文');
};

const getPreferredRuntime = async (): Promise<{ device: 'webgpu' | 'wasm', dtype: 'fp32' | 'q8' }> => {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        return { device: 'webgpu', dtype: 'fp32' };
      }
    } catch {
      // Fall back to WASM below.
    }
  }

  return { device: 'wasm', dtype: 'q8' };
};

const loadTranscriber = async (): Promise<Transcriber> => {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const runtime = await getPreferredRuntime();
      modelRuntime.value = runtime.device;
      aiStatus.value = runtime.device === 'webgpu' ? '載入 Whisper 模型（WebGPU）...' : '載入 Whisper 模型（WASM）...';

      const pipe = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-small', {
        device: runtime.device,
        dtype: runtime.dtype,
        progress_callback(progressInfo: Record<string, any>) {
          if (progressInfo.status === 'progress' && typeof progressInfo.progress === 'number') {
            aiProgress.value = Math.round(progressInfo.progress);
            aiStatus.value = `下載模型中 ${Math.round(progressInfo.progress)}%`;
          }
        },
      });

      aiProgress.value = 100;
      aiStatus.value = '模型載入完成';
      return pipe as unknown as Transcriber;
    })();
  }

  return transcriberPromise;
};

const decodeAudioTo16kMono = async (file: File): Promise<Float32Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const decodingContext = new AudioContext();
  const decodedBuffer = await decodingContext.decodeAudioData(arrayBuffer.slice(0));
  const offlineContext = new OfflineAudioContext(1, Math.ceil(decodedBuffer.duration * 16000), 16000);
  const source = offlineContext.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineContext.destination);
  source.start(0);
  const renderedBuffer = await offlineContext.startRendering();
  await decodingContext.close();
  return renderedBuffer.getChannelData(0).slice();
};

const normalizeChunkText = (text: string) => convertOpenCC(cleanRepeats(text), 's2twp');

const transcribeChunks = async (file: File, transcriber: Transcriber): Promise<WhisperChunk[]> => {
  aiStatus.value = '處理音訊中...';
  aiProgress.value = 0;

  const audioData = await decodeAudioTo16kMono(file);
  const sampleRate = 16000;
  const chunkSeconds = 20;
  const overlapSeconds = 3;
  const chunkSamples = chunkSeconds * sampleRate;
  const stepSamples = (chunkSeconds - overlapSeconds) * sampleRate;
  const totalChunks = Math.max(1, Math.ceil(audioData.length / stepSamples));

  const chunks: WhisperChunk[] = [];
  let position = 0;
  let processed = 0;
  let nearZeroCount = 0;
  let timestampCount = 0;

  while (position < audioData.length) {
    processed += 1;
    const end = Math.min(position + chunkSamples, audioData.length);
    const slice = audioData.slice(position, end);
    const offsetSeconds = position / sampleRate;
    const options: Record<string, unknown> = {
      return_timestamps: true,
      task: 'transcribe',
    };

    if (selectedLanguage.value !== 'auto') {
      options.language = selectedLanguage.value;
    }

    aiProgress.value = Math.round((processed / totalChunks) * 80);
    aiStatus.value = `辨識歌詞中 (${processed}/${totalChunks})`;

    const result = await transcriber(slice, options);

    if (Array.isArray(result.chunks) && result.chunks.length > 0) {
      for (const chunk of result.chunks) {
        const text = chunk.text?.trim();
        if (!text) {
          continue;
        }

        const [start = 0, stop = start] = chunk.timestamp ?? [];
        timestampCount += 1;
        if (start < 1) {
          nearZeroCount += 1;
        }

        chunks.push({
          time: Number((start + offsetSeconds).toFixed(2)),
          endTime: Number((stop + offsetSeconds).toFixed(2)),
          text,
        });
      }
    } else if (result.text?.trim()) {
      chunks.push({
        time: Number(offsetSeconds.toFixed(2)),
        endTime: Number((end / sampleRate).toFixed(2)),
        text: result.text.trim(),
      });
    }

    position += stepSamples;
  }

  const deduped = deduplicateOverlap(chunks);
  const timestampReliable = checkTimestampQuality(deduped, duration.value || 180) && (timestampCount === 0 || nearZeroCount / timestampCount < 0.4);
  return timestampReliable ? deduped : redistributeChunks(deduped, duration.value || 180);
};

const startRecognition = async () => {
  if (!audioFile.value || isRecognizing.value) {
    return;
  }

  isRecognizing.value = true;
  aiProgress.value = 0;
  aiStatus.value = '準備中...';

  try {
    const transcriber = await loadTranscriber();
    const chunks = await transcribeChunks(audioFile.value, transcriber);
    const trackDuration = duration.value || 180;
    const rawReferenceLines = referenceText.value.split(/\r?\n/);

    if (referenceText.value.trim()) {
      const nextLyrics = hasStructureMarkers(rawReferenceLines)
        ? structuredDistribute(rawReferenceLines, trackDuration)
        : alignLyricsToChunks(
            cleanReferenceLines(rawReferenceLines),
            chunks.map(chunk => ({ ...chunk, text: normalizeChunkText(chunk.text) })),
            trackDuration,
            text => convertOpenCC(text, 's2twp'),
          );

      lyrics.value = nextLyrics;
      message.success(`歌詞對齊完成，共 ${nextLyrics.length} 行`);
    } else {
      lyrics.value = chunks
        .map(chunk => ({
          time: chunk.time,
          text: selectedLanguage.value === 'chinese' || selectedLanguage.value === 'auto'
            ? convertOpenCC(cleanRepeats(chunk.text), 's2twp')
            : cleanRepeats(chunk.text),
        }))
        .filter(line => !isWhisperJunk(line.text));

      message.success(`歌詞辨識完成，共 ${lyrics.value.length} 行`);
    }

    aiProgress.value = 100;
    aiStatus.value = '辨識完成';
    syncCurrentLine();
  } catch (error) {
    console.error(error);
    const reason = error instanceof Error ? error.message : '未知錯誤';
    aiStatus.value = '辨識失敗';
    message.error(`辨識失敗：${reason}`);
  } finally {
    isRecognizing.value = false;
  }
};

onBeforeUnmount(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>

<template>
  <div class="lyric-player-tool">
    <div
      ref="dropZoneRef"
      class="upload-zone"
      :class="{ disabled: hasAudio }"
      @click="openAudioDialog"
    >
      <n-icon size="42" :component="Upload" />
      <div>
        <div class="upload-title">拖放音訊到這裡，或點擊上傳</div>
        <div class="upload-hint">支援 MP3、WAV、M4A、OGG。Whisper 模型首次會下載到瀏覽器快取，之後本機推論。</div>
      </div>
    </div>

    <div v-if="hasAudio" class="workspace">
      <div class="left-column">
        <n-card>
          <template #header>
            <div class="section-title">
              <n-icon :component="FileMusic" />
              <span>{{ audioName }}</span>
            </div>
          </template>

          <audio
            ref="audioRef"
            class="audio-player"
            controls
            :src="audioUrl ?? undefined"
            @loadedmetadata="handleLoadedMetadata"
            @timeupdate="handleTimeUpdate"
          />

          <div class="meta-row">
            <span>長度 {{ duration ? formatLrcTime(duration).slice(0, 5) : '00:00' }}</span>
            <span v-if="modelRuntime">推論模式 {{ modelRuntime === 'webgpu' ? 'WebGPU' : 'WASM' }}</span>
          </div>
        </n-card>

        <n-card>
          <template #header>
            <div class="section-title">
              <n-icon :component="Microphone" />
              <span>AI 辨識與對齊</span>
            </div>
          </template>

          <n-alert type="info" :show-icon="false" mb-16>
            先貼歌詞可做時間對齊；不貼歌詞則直接聽寫。中文建議優先選「中文」而不是「自動偵測」。
          </n-alert>

          <n-input
            v-model:value="referenceText"
            type="textarea"
            :rows="8"
            placeholder="可選：貼上歌詞，每行一句。若含 [Verse] / [Chorus] 這類段落標記，也會一起處理。"
          />

          <div class="control-row">
            <div class="lang-picker">
              <div class="picker-label">
                <n-icon :component="Language" />
                <span>主要語言</span>
              </div>
              <n-select v-model:value="selectedLanguage" :options="languageOptions" />
            </div>
            <n-button type="primary" :disabled="!canTranscribe" :loading="isRecognizing" @click="startRecognition">
              AI 辨識歌詞
            </n-button>
          </div>

          <div class="progress-wrap">
            <div class="status-line">{{ aiStatus }}</div>
            <n-progress type="line" :percentage="aiProgress" :show-indicator="false" />
          </div>

          <div class="action-row">
            <n-button @click="openLrcDialog">上傳 LRC</n-button>
            <n-button :disabled="!hasLyrics" @click="convertLyricsToTraditional">簡轉繁</n-button>
            <n-button :disabled="!hasLyrics" @click="openEditor">
              <template #icon>
                <n-icon :component="Edit" />
              </template>
              編輯 LRC
            </n-button>
            <n-button :disabled="!hasLyrics" @click="showExportModal = true">
              <template #icon>
                <n-icon :component="Download" />
              </template>
              匯出
            </n-button>
          </div>
        </n-card>
      </div>

      <n-card class="lyrics-card">
        <template #header>
          <div class="section-title">
            <n-icon :component="PlayerPlay" />
            <span>同步歌詞</span>
          </div>
        </template>

        <div v-if="!hasLyrics" class="empty-state">
          上傳音訊後，可直接按「AI 辨識歌詞」，或先貼歌詞再做時間對齊。
        </div>

        <div v-else class="lyrics-list">
          <button
            v-for="(line, index) in lyrics"
            :key="`${line.time}-${index}`"
            class="lyric-line"
            :class="{ active: index === currentLineIndex, past: index < currentLineIndex }"
            @click="seekToLine(line, index)"
          >
            <span class="time">{{ formatLrcTime(line.time) }}</span>
            <span class="text">{{ line.text }}</span>
          </button>
        </div>
      </n-card>
    </div>

    <n-modal v-model:show="showEditModal" preset="card" title="編輯 LRC" style="max-width: 900px">
      <n-input
        v-model:value="editableLrc"
        type="textarea"
        :rows="18"
        placeholder="[00:12.34]歌詞內容"
      />
      <template #footer>
        <div class="modal-actions">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="saveEditor">儲存</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal v-model:show="showExportModal" preset="card" title="LRC 匯出預覽" style="max-width: 900px">
      <n-input :value="lrcPreview" type="textarea" :rows="18" readonly />
      <template #footer>
        <div class="modal-actions">
          <n-button @click="showExportModal = false">關閉</n-button>
          <n-button type="primary" @click="downloadLrc">下載 .lrc</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.lyric-player-tool {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-zone {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px dashed rgb(148 163 184 / 70%);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  background:
    radial-gradient(circle at top left, rgb(245 158 11 / 10%), transparent 42%),
    linear-gradient(135deg, rgb(15 23 42 / 3%), rgb(14 165 233 / 5%));
}

.upload-zone.disabled {
  opacity: 0.9;
}

.upload-title {
  font-size: 16px;
  font-weight: 600;
}

.upload-hint {
  margin-top: 4px;
  color: rgb(100 116 139);
  line-height: 1.5;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(420px, 0.95fr) minmax(440px, 1.25fr);
  gap: 20px;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-player {
  width: 100%;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  color: rgb(100 116 139);
  font-size: 13px;
}

.control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin-top: 16px;
}

.lang-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgb(71 85 105);
}

.progress-wrap {
  margin-top: 16px;
}

.status-line {
  margin-bottom: 8px;
  font-size: 13px;
  color: rgb(71 85 105);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.lyrics-card {
  min-height: 560px;
  width: 100%;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 420px;
  text-align: center;
  color: rgb(100 116 139);
}

.lyrics-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 720px;
  overflow: auto;
  padding-right: 4px;
}

.lyric-line {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 14px;
  background: rgb(148 163 184 / 8%);
  text-align: left;
  transition: transform 120ms ease, background 120ms ease;
}

.lyric-line:hover {
  transform: translateY(-1px);
  background: rgb(14 165 233 / 12%);
}

.lyric-line.active {
  background: linear-gradient(135deg, rgb(251 191 36 / 18%), rgb(14 165 233 / 18%));
  box-shadow: inset 0 0 0 1px rgb(251 191 36 / 30%);
}

.lyric-line.past .time,
.lyric-line.past .text {
  opacity: 0.72;
}

.time {
  font-variant-numeric: tabular-nums;
  color: rgb(71 85 105);
}

.text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .control-row {
    grid-template-columns: 1fr;
  }
}
</style>

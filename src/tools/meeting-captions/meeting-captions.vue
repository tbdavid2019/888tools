<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  Copy,
  DeviceFloppy,
  Download,
  Language,
  Microphone,
  Pencil,
  PlayerPause,
  PlayerPlay,
  Plus,
  Square,
  Trash,
  Upload,
} from '@vicons/tabler';
import type {
  MeetingCaptionsRuntime,
  MeetingSession,
  MeetingSessionsState,
  SupportedLanguage,
  WhisperChunk,
} from './meeting-captions.service';
import {
  MEETING_CAPTIONS_DEFAULT_MODEL_ID,
  MEETING_CAPTIONS_STORAGE_KEY,
  createMeetingSession,
  createMeetingSessionsState,
  formatClock,
  formatTimestamp,
  getMeetingCaptionsRuntime,
  hasAudibleSpeech,
  readMeetingSessionsState,
  serializeMeetingSessionsState,
  sessionToPlainText,
  updateSessionTranscript,
  upsertSession,
} from './meeting-captions.service';
import { convertOpenCC } from '@/services/opencc.service';

type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{
  text?: string
  chunks?: Array<{ text?: string; timestamp?: [number?, number?] }>
}>;

interface WhisperModelOption {
  label: string
  value: string
  hint: string
}

interface PcmChunk {
  samples: Float32Array
  sampleRate: number
  startMs: number
  endMs: number
};

const message = useMessage();
const { t } = useI18n();

const selectedLanguage = ref<SupportedLanguage>('auto');
const selectedModelId = ref(MEETING_CAPTIONS_DEFAULT_MODEL_ID);
const downloadAudioOnStop = ref(true);
const sessionsState = ref<MeetingSessionsState>(loadInitialState());
const aiStatus = ref(t('tools.meeting-captions.status.modelNotLoaded'));
const aiProgress = ref(0);
const modelRuntime = ref<'webgpu' | null>(null);
const recordingState = ref<'idle' | 'recording' | 'paused'>('idle');
const levelBars = ref<number[]>(Array.from({ length: 20 }, () => 0.08));
const liveElapsedMs = ref(0);
const pendingTranscription = ref(false);
const uploadInput = ref<HTMLInputElement | null>(null);
const uploadFileName = ref('');
const uploadProgress = ref(0);
const isProcessingUpload = ref(false);

const languageOptions = computed(() => [
  { label: t('tools.meeting-captions.language.auto'), value: 'auto' },
  { label: t('tools.meeting-captions.language.chinese'), value: 'chinese' },
  { label: t('tools.meeting-captions.language.english'), value: 'english' },
  { label: t('tools.meeting-captions.language.japanese'), value: 'japanese' },
  { label: t('tools.meeting-captions.language.korean'), value: 'korean' },
]);

const modelOptions = computed<WhisperModelOption[]>(() => [
  {
    label: t('tools.meeting-captions.models.medium.label'),
    value: MEETING_CAPTIONS_DEFAULT_MODEL_ID,
    hint: t('tools.meeting-captions.models.medium.hint'),
  },
]);

let transcriberPromise: Promise<Transcriber> | null = null;
let mediaStream: MediaStream | null = null;
let pcmChunks: PcmChunk[] = [];
let recordingChunks: PcmChunk[] = [];
let processing = false;
let hasQueuedProcessing = false;
let sessionStartPerf = 0;
let timerHandle: number | null = null;
let transcriptionTimerHandle: number | null = null;
let analyserContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let analyserFrame: number | null = null;
let captureSource: MediaStreamAudioSourceNode | null = null;
let captureProcessor: ScriptProcessorNode | null = null;
let captureSilenceGain: GainNode | null = null;

const activeSession = computed<MeetingSession | null>(() => {
  return sessionsState.value.sessions.find(session => session.id === sessionsState.value.activeSessionId) ?? null;
});

const sessionHistory = computed(() => sessionsState.value.sessions);

const liveClock = computed(() => formatClock(liveElapsedMs.value / 1000));
const canStart = computed(() => recordingState.value === 'idle' && !isProcessingUpload.value);
const canPause = computed(() => recordingState.value === 'recording');
const canResume = computed(() => recordingState.value === 'paused');
const canStop = computed(() => recordingState.value !== 'idle');
const canCreateNew = computed(() => recordingState.value === 'idle' && !isProcessingUpload.value);
const canClearHistory = computed(() => recordingState.value === 'idle' && !isProcessingUpload.value && sessionHistory.value.length > 0);
const canUploadAudio = computed(() => recordingState.value === 'idle' && !isProcessingUpload.value);
const transcriptPreview = computed(() => activeSession.value ? sessionToPlainText(activeSession.value) : '');
const latestLine = computed(() => activeSession.value?.lines.at(-1) ?? null);
const previousLines = computed(() => activeSession.value?.lines.slice(-8, -1) ?? []);
const selectedModel = computed(() => modelOptions.value.find(option => option.value === selectedModelId.value) ?? modelOptions.value[0]);

function loadInitialState() {
  if (typeof window === 'undefined') {
    return readMeetingSessionsState(null);
  }

  return readMeetingSessionsState(window.localStorage.getItem(MEETING_CAPTIONS_STORAGE_KEY));
}

function persistState() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    MEETING_CAPTIONS_STORAGE_KEY,
    serializeMeetingSessionsState(sessionsState.value),
  );
}

function replaceActiveSession(session: MeetingSession) {
  sessionsState.value = upsertSession(sessionsState.value, session, { setActive: true });
  persistState();
}

function createFreshSession() {
  const session = createMeetingSession(selectedLanguage.value, new Date());
  sessionsState.value = upsertSession(sessionsState.value, session, { setActive: true });
  liveElapsedMs.value = 0;
  persistState();
}

function openSession(sessionId: string) {
  if (recordingState.value !== 'idle' || isProcessingUpload.value) {
    message.warning(t('tools.meeting-captions.messages.cannotSwitchWhileRecording'));
    return;
  }

  sessionsState.value = {
    ...sessionsState.value,
    activeSessionId: sessionId,
  };
  liveElapsedMs.value = activeSession.value?.durationMs ?? 0;
  persistState();
}

function renameSession(session: MeetingSession) {
  const nextTitle = window.prompt(t('tools.meeting-captions.prompts.renameSession'), session.title)?.trim();
  if (!nextTitle || nextTitle === session.title) {
    return;
  }

  sessionsState.value = {
    ...sessionsState.value,
    sessions: sessionsState.value.sessions.map(item =>
      item.id === session.id
        ? { ...item, title: nextTitle, updatedAt: new Date().toISOString() }
        : item,
    ),
  };
  persistState();
  message.success(t('tools.meeting-captions.messages.sessionRenamed'));
}

function clearHistory() {
  if (!canClearHistory.value) {
    return;
  }

  const confirmed = window.confirm(t('tools.meeting-captions.prompts.clearHistory'));
  if (!confirmed) {
    return;
  }

  sessionsState.value = createMeetingSessionsState();
  liveElapsedMs.value = 0;
  persistState();
  message.success(t('tools.meeting-captions.messages.historyCleared'));
}

function exportCurrentSession() {
  if (!activeSession.value) {
    return;
  }

  const blob = new Blob([sessionToPlainText(activeSession.value)], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${safeFileName(activeSession.value.title || 'meeting-captions')}.txt`);
}

async function copyCurrentSession() {
  if (!transcriptPreview.value) {
    return;
  }

  await navigator.clipboard.writeText(transcriptPreview.value);
  message.success(t('tools.meeting-captions.messages.transcriptCopied'));
}

function openAudioUploadPicker() {
  if (!canUploadAudio.value) {
    return;
  }

  uploadInput.value?.click();
}

async function handleAudioFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (!file) {
    return;
  }

  await processUploadedAudio(file);
}

async function processUploadedAudio(file: File) {
  if (!canUploadAudio.value) {
    return;
  }

  isProcessingUpload.value = true;
  pendingTranscription.value = true;
  uploadFileName.value = file.name;
  uploadProgress.value = 0;
  aiProgress.value = 0;
  aiStatus.value = t('tools.meeting-captions.status.decodingUpload', { file: file.name });

  try {
    const audioData = await decodeAudioFileTo16kMono(file);
    const session = {
      ...createMeetingSession(selectedLanguage.value, new Date()),
      title: file.name.replace(/\.[^.]+$/, '') || file.name,
      durationMs: Math.round((audioData.length / 16000) * 1000),
    };

    sessionsState.value = upsertSession(sessionsState.value, session, { setActive: true });
    liveElapsedMs.value = session.durationMs;
    persistState();

    await transcribeUploadedAudio(audioData);
    aiProgress.value = 100;
    uploadProgress.value = 100;
    aiStatus.value = t('tools.meeting-captions.status.uploadComplete');
  }
  catch (error) {
    console.error(error);
    aiStatus.value = error instanceof Error
      ? t('tools.meeting-captions.errors.uploadTranscriptionFailedWithReason', { reason: error.message })
      : t('tools.meeting-captions.errors.uploadTranscriptionFailed');
  }
  finally {
    isProcessingUpload.value = false;
    pendingTranscription.value = false;
  }
}

async function startSession() {
  if (!canStart.value) {
    return;
  }

  if (!activeSession.value || activeSession.value.lines.length > 0 || activeSession.value.durationMs > 0) {
    createFreshSession();
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    pcmChunks = [];
    recordingChunks = [];
    pendingTranscription.value = false;
    sessionStartPerf = performance.now() - (activeSession.value?.durationMs ?? 0);

    setupAudioPipeline(mediaStream);
    if (analyserContext?.state === 'suspended') {
      await analyserContext.resume();
    }

    recordingState.value = 'recording';
    aiStatus.value = t('tools.meeting-captions.status.waitingFirstTranscript');
    startTimer();
    startTranscriptionTimer();

    replaceActiveSession({
      ...(activeSession.value as MeetingSession),
      language: selectedLanguage.value,
      updatedAt: new Date().toISOString(),
    });
  }
  catch (error) {
    cleanupMedia();
    const reason = error instanceof Error ? error.message : t('tools.meeting-captions.errors.microphoneAccess');
    message.error(t('tools.meeting-captions.errors.startFailed', { reason }));
  }
}

function pauseSession() {
  if (recordingState.value !== 'recording') {
    return;
  }

  liveElapsedMs.value = getElapsedMs();
  recordingState.value = 'paused';
  stopTimer();
  stopTranscriptionTimer();
  processLatestWindow().catch(console.error);
}

function resumeSession() {
  if (recordingState.value !== 'paused') {
    return;
  }

  sessionStartPerf = performance.now() - liveElapsedMs.value;
  recordingState.value = 'recording';
  startTimer();
  startTranscriptionTimer();
}

async function stopSession() {
  if (recordingState.value === 'idle') {
    return;
  }

  liveElapsedMs.value = getElapsedMs();
  stopTimer();
  stopTranscriptionTimer();
  recordingState.value = 'idle';

  await processLatestWindow();
  if (downloadAudioOnStop.value) {
    downloadCurrentAudio();
  }
  cleanupMedia();

  if (activeSession.value) {
    replaceActiveSession({
      ...activeSession.value,
      durationMs: liveElapsedMs.value,
      updatedAt: new Date().toISOString(),
    });
  }
}

function handleModelChange() {
  if (recordingState.value !== 'idle' || isProcessingUpload.value) {
    return;
  }

  transcriberPromise = null;
  modelRuntime.value = null;
  aiProgress.value = 0;
  aiStatus.value = t('tools.meeting-captions.status.preparePreload', { model: selectedModel.value.label });
  loadTranscriber().catch(console.error);
}

async function queueTranscription() {
  if (processing) {
    hasQueuedProcessing = true;
    return;
  }

  await processLatestWindow();
}

async function processLatestWindow() {
  if (!activeSession.value || pcmChunks.length === 0) {
    return;
  }

  processing = true;
  pendingTranscription.value = true;

  try {
    const transcriber = await loadTranscriber();
    const latestEndMs = pcmChunks[pcmChunks.length - 1].endMs;
    const windowStartMs = Math.max(0, latestEndMs - 28000);
    const windowChunks = pcmChunks.filter(chunk => chunk.endMs > windowStartMs);
    const audioData = buildTranscriptionAudio(windowChunks, 16000);
    const offsetSeconds = windowChunks[0]?.startMs ? windowChunks[0].startMs / 1000 : 0;

    if (!hasAudibleSpeech(audioData)) {
      aiStatus.value = t('tools.meeting-captions.status.noSpeechDetected');
      return;
    }

    aiStatus.value = t('tools.meeting-captions.status.transcribing');

    const options: Record<string, unknown> = {
      return_timestamps: true,
      task: 'transcribe',
    };

    if (selectedLanguage.value !== 'auto') {
      options.language = selectedLanguage.value;
    }

    const result = await transcriber(audioData, options);
    const chunks = normalizeResultChunks(result, offsetSeconds);

    if (chunks.length === 0) {
      return;
    }

    const nextSession = updateSessionTranscript(activeSession.value, chunks, {
      durationMs: liveElapsedMs.value,
      now: new Date(),
    });

    replaceActiveSession(nextSession);
    aiStatus.value = recordingState.value === 'paused'
      ? t('tools.meeting-captions.status.pausedCaptionsSaved')
      : t('tools.meeting-captions.status.listening');
    aiProgress.value = 100;
  }
  catch (error) {
    console.error(error);
    aiStatus.value = error instanceof Error
      ? t('tools.meeting-captions.errors.transcriptionFailedWithReason', { reason: error.message })
      : t('tools.meeting-captions.errors.transcriptionFailed');
  }
  finally {
    processing = false;
    pendingTranscription.value = false;

    if (hasQueuedProcessing) {
      hasQueuedProcessing = false;
      await processLatestWindow();
    }
  }
}

function normalizeResultChunks(
  result: Awaited<ReturnType<Transcriber>>,
  offsetSeconds: number,
): WhisperChunk[] {
  const chunks: WhisperChunk[] = [];

  if (Array.isArray(result.chunks) && result.chunks.length > 0) {
    for (const chunk of result.chunks) {
      const text = normalizeTranscriptText(chunk.text ?? '');
      if (!text) {
        continue;
      }

      const start = chunk.timestamp?.[0] ?? 0;
      const stop = chunk.timestamp?.[1] ?? start;
      chunks.push({
        time: Number((start + offsetSeconds).toFixed(2)),
        endTime: Number((stop + offsetSeconds).toFixed(2)),
        text,
      });
    }
  }
  else if (result.text?.trim()) {
    chunks.push({
      time: Number(offsetSeconds.toFixed(2)),
      text: normalizeTranscriptText(result.text),
    });
  }

  return chunks;
}

function normalizeTranscriptText(text: string) {
  if (selectedLanguage.value === 'chinese' || selectedLanguage.value === 'auto') {
    return convertOpenCC(text.trim(), 's2twp');
  }

  return text.trim();
}

function getElapsedMs() {
  if (recordingState.value === 'recording') {
    return Math.max(0, Math.round(performance.now() - sessionStartPerf));
  }

  return liveElapsedMs.value;
}

async function decodeAudioFileTo16kMono(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const decodingContext = new AudioContext();

  try {
    const decodedBuffer = await decodingContext.decodeAudioData(arrayBuffer.slice(0));
    const targetSampleRate = 16000;
    const offlineContext = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(decodedBuffer.duration * targetSampleRate)),
      targetSampleRate,
    );
    const source = offlineContext.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    const renderedBuffer = await offlineContext.startRendering();
    return renderedBuffer.getChannelData(0).slice();
  }
  finally {
    await decodingContext.close();
  }
}

async function transcribeUploadedAudio(audioData: Float32Array) {
  if (!activeSession.value) {
    return;
  }

  const transcriber = await loadTranscriber();
  const sampleRate = 16000;
  const chunkSeconds = 28;
  const overlapSeconds = 4;
  const chunkSamples = chunkSeconds * sampleRate;
  const stepSamples = (chunkSeconds - overlapSeconds) * sampleRate;
  const totalChunks = Math.max(1, Math.ceil(audioData.length / stepSamples));
  let position = 0;
  let processed = 0;

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

    uploadProgress.value = Math.round((processed / totalChunks) * 100);
    aiProgress.value = uploadProgress.value;
    aiStatus.value = t('tools.meeting-captions.status.transcribingUpload', {
      current: processed,
      total: totalChunks,
    });

    if (!hasAudibleSpeech(slice)) {
      position += stepSamples;
      continue;
    }

    const result = await transcriber(slice, options);
    const chunks = normalizeResultChunks(result, offsetSeconds);

    if (chunks.length > 0 && activeSession.value) {
      replaceActiveSession(updateSessionTranscript(activeSession.value, chunks, {
        durationMs: liveElapsedMs.value,
        now: new Date(),
      }));
    }

    position += stepSamples;
  }
}

function startTimer() {
  stopTimer();
  timerHandle = window.setInterval(() => {
    liveElapsedMs.value = getElapsedMs();
  }, 250);
}

function stopTimer() {
  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

function startTranscriptionTimer() {
  stopTranscriptionTimer();
  transcriptionTimerHandle = window.setInterval(() => {
    queueTranscription().catch(console.error);
  }, 4000);
}

function stopTranscriptionTimer() {
  if (transcriptionTimerHandle !== null) {
    window.clearInterval(transcriptionTimerHandle);
    transcriptionTimerHandle = null;
  }
}

async function loadTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const runtime = await getPreferredRuntime();
      return createTranscriber(pipeline, runtime);
    })().catch((error) => {
      transcriberPromise = null;
      aiStatus.value = error instanceof Error
        ? t('tools.meeting-captions.errors.modelLoadFailedWithReason', { reason: error.message })
        : t('tools.meeting-captions.errors.modelLoadFailed');
      throw error;
    });
  }

  return transcriberPromise;
}

async function createTranscriber(
  pipeline: any,
  runtime: MeetingCaptionsRuntime,
): Promise<Transcriber> {
  modelRuntime.value = runtime.device;
  aiStatus.value = t('tools.meeting-captions.status.preloadingRuntime', { model: selectedModel.value.label, runtime: 'WebGPU' });

  const pipe = await pipeline('automatic-speech-recognition', selectedModel.value.value, {
    device: runtime.device,
    dtype: runtime.dtype,
    progress_callback(progressInfo: Record<string, any>) {
      if (progressInfo.status === 'progress_total' && typeof progressInfo.progress === 'number') {
        const nextProgress = Math.max(aiProgress.value, Math.round(progressInfo.progress));
        aiProgress.value = nextProgress;
        aiStatus.value = t('tools.meeting-captions.status.downloadingModel', { progress: nextProgress });
      }
    },
  });

  aiProgress.value = 100;
  aiStatus.value = t('tools.meeting-captions.status.preloadedRuntime', { model: selectedModel.value.label, runtime: 'WebGPU' });
  return pipe as unknown as Transcriber;
}

async function getPreferredRuntime(): Promise<MeetingCaptionsRuntime> {
  const webGpuNavigator = navigator as Navigator & {
    gpu?: {
      requestAdapter: () => Promise<unknown>
    }
  };

  if (webGpuNavigator.gpu) {
    try {
      const adapter = await webGpuNavigator.gpu.requestAdapter();
      if (adapter) {
        const runtime = getMeetingCaptionsRuntime(true);
        if (runtime) {
          return runtime;
        }
      }
    }
    catch {
      // Surface the same WebGPU-required error below.
    }
  }

  const runtime = getMeetingCaptionsRuntime(false);
  if (runtime) {
    return runtime;
  }

  throw new Error(t('tools.meeting-captions.errors.webgpuRequired'));
}

function buildTranscriptionAudio(chunks: PcmChunk[], targetSampleRate: number): Float32Array {
  if (chunks.length === 0) {
    return new Float32Array();
  }

  const sourceSampleRate = chunks[0].sampleRate;
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.samples.length, 0);
  const merged = new Float32Array(totalLength);
  let writeOffset = 0;

  for (const chunk of chunks) {
    merged.set(chunk.samples, writeOffset);
    writeOffset += chunk.samples.length;
  }

  if (sourceSampleRate === targetSampleRate) {
    return merged;
  }

  const targetLength = Math.max(1, Math.round((merged.length / sourceSampleRate) * targetSampleRate));
  const resampled = new Float32Array(targetLength);
  const ratio = sourceSampleRate / targetSampleRate;

  for (let index = 0; index < targetLength; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, merged.length - 1);
    const mix = sourceIndex - leftIndex;
    resampled[index] = merged[leftIndex] * (1 - mix) + merged[rightIndex] * mix;
  }

  return resampled;
}

function setupAudioPipeline(stream: MediaStream) {
  analyserContext = new AudioContext();
  const source = analyserContext.createMediaStreamSource(stream);
  captureSource = source;
  analyserNode = analyserContext.createAnalyser();
  analyserNode.fftSize = 256;
  source.connect(analyserNode);

  captureProcessor = analyserContext.createScriptProcessor(4096, 1, 1);
  captureSilenceGain = analyserContext.createGain();
  captureSilenceGain.gain.value = 0;
  source.connect(captureProcessor);
  captureProcessor.connect(captureSilenceGain);
  captureSilenceGain.connect(analyserContext.destination);

  captureProcessor.onaudioprocess = (event) => {
    if (recordingState.value !== 'recording' || !analyserContext) {
      return;
    }

    const input = event.inputBuffer.getChannelData(0);
    const samples = new Float32Array(input);
    const durationMs = (samples.length / analyserContext.sampleRate) * 1000;
    const endMs = getElapsedMs();
    const startMs = Math.max(0, endMs - durationMs);

    pcmChunks.push({
      samples,
      sampleRate: analyserContext.sampleRate,
      startMs,
      endMs,
    });
    recordingChunks.push({
      samples,
      sampleRate: analyserContext.sampleRate,
      startMs,
      endMs,
    });

    const retentionStartMs = Math.max(0, endMs - 60000);
    pcmChunks = pcmChunks.filter(chunk => chunk.endMs >= retentionStartMs);
  };

  const buffer = new Uint8Array(analyserNode.frequencyBinCount);

  const tick = () => {
    if (!analyserNode) {
      return;
    }

    analyserNode.getByteFrequencyData(buffer);
    const sliceSize = Math.floor(buffer.length / levelBars.value.length);
    levelBars.value = levelBars.value.map((_, index) => {
      const start = index * sliceSize;
      const end = index === levelBars.value.length - 1 ? buffer.length : start + sliceSize;
      const slice = buffer.slice(start, end);
      const average = slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length);
      return Math.max(0.08, average / 255);
    });

    analyserFrame = window.requestAnimationFrame(tick);
  };

  tick();
}

function downloadCurrentAudio() {
  if (recordingChunks.length === 0) {
    message.warning(t('tools.meeting-captions.messages.noAudioToDownload'));
    return;
  }

  const blob = createWavBlob(recordingChunks);
  const title = activeSession.value?.title || `meeting-${new Date().toISOString()}`;
  downloadBlob(blob, `${safeFileName(title)}.wav`);
  message.success(t('tools.meeting-captions.messages.wavDownloaded'));
}

function createWavBlob(chunks: PcmChunk[]): Blob {
  const sampleRate = chunks[0]?.sampleRate ?? 44100;
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.samples.length, 0);
  const merged = new Float32Array(totalLength);
  let writeOffset = 0;

  for (const chunk of chunks) {
    merged.set(chunk.samples, writeOffset);
    writeOffset += chunk.samples.length;
  }

  const bytesPerSample = 2;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + merged.length * bytesPerSample);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + merged.length * bytesPerSample, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, merged.length * bytesPerSample, true);

  for (let index = 0; index < merged.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, merged[index]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(headerSize + index * bytesPerSample, value, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'meeting-captions';
}

function cleanupMedia() {
  stopTimer();
  stopTranscriptionTimer();

  if (analyserFrame !== null) {
    window.cancelAnimationFrame(analyserFrame);
    analyserFrame = null;
  }

  captureProcessor?.disconnect();
  captureProcessor = null;
  captureSilenceGain?.disconnect();
  captureSilenceGain = null;
  captureSource?.disconnect();
  captureSource = null;

  if (analyserContext) {
    analyserContext.close().catch(() => undefined);
    analyserContext = null;
  }

  analyserNode = null;
  levelBars.value = Array.from({ length: 20 }, () => 0.08);
  pcmChunks = [];
  recordingChunks = [];

  for (const track of mediaStream?.getTracks() ?? []) {
    track.stop();
  }
  mediaStream = null;
}

onMounted(() => {
  aiStatus.value = t('tools.meeting-captions.status.preloading', { model: selectedModel.value.label });
  loadTranscriber().catch(console.error);
});

onBeforeUnmount(() => {
  cleanupMedia();
});
</script>

<template>
  <div class="meeting-captions-tool">
    <aside class="history-panel">
      <div class="panel-header">
        <div>
          <div class="eyebrow">
            {{ t('tools.meeting-captions.history.eyebrow') }}
          </div>
          <h2>{{ t('tools.meeting-captions.history.title') }}</h2>
        </div>
        <n-space>
          <n-button type="primary" secondary :disabled="!canCreateNew" @click="createFreshSession">
            <template #icon>
              <n-icon :component="Plus" />
            </template>
            {{ t('tools.meeting-captions.actions.new') }}
          </n-button>
        </n-space>
      </div>

      <div class="language-card">
        <div class="field-label">
          <n-icon :component="Language" />
          {{ t('tools.meeting-captions.fields.language') }}
        </div>
        <n-select v-model:value="selectedLanguage" :options="languageOptions" :disabled="recordingState !== 'idle' || isProcessingUpload" />
      </div>

      <div class="language-card">
        <div class="field-label">
          <n-icon :component="Microphone" />
          {{ t('tools.meeting-captions.fields.whisperModel') }}
        </div>
        <n-select
          v-model:value="selectedModelId"
          :options="modelOptions"
          :disabled="recordingState !== 'idle' || isProcessingUpload"
          @update:value="handleModelChange"
        />
        <p class="field-hint">
          {{ selectedModel.hint }}
        </p>
      </div>

      <div class="language-card upload-card">
        <div class="field-label">
          <n-icon :component="Upload" />
          {{ t('tools.meeting-captions.fields.uploadAudio') }}
        </div>
        <p class="field-hint">
          {{ t('tools.meeting-captions.fields.uploadAudioHint') }}
        </p>
        <input
          ref="uploadInput"
          class="sr-only"
          type="file"
          accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/x-m4a,.wav,.mp3,.m4a,.aac"
          @change="handleAudioFileChange"
        >
        <n-button secondary block type="primary" :disabled="!canUploadAudio" :loading="isProcessingUpload" @click="openAudioUploadPicker">
          <template #icon>
            <n-icon :component="Upload" />
          </template>
          {{ isProcessingUpload ? t('tools.meeting-captions.actions.transcribingUpload') : t('tools.meeting-captions.actions.uploadAudio') }}
        </n-button>
        <p v-if="uploadFileName" class="field-hint">
          {{ t('tools.meeting-captions.status.uploadFile', { file: uploadFileName, progress: uploadProgress }) }}
        </p>
      </div>

      <div class="language-card option-card">
        <div>
          <div class="field-label compact">
            {{ t('tools.meeting-captions.fields.downloadOnStop') }}
          </div>
          <p class="field-hint">
            {{ t('tools.meeting-captions.fields.downloadOnStopHint') }}
          </p>
        </div>
        <n-switch v-model:value="downloadAudioOnStop" :disabled="recordingState !== 'idle' || isProcessingUpload" />
      </div>

      <div class="history-list">
        <div
          v-for="session in sessionHistory"
          :key="session.id"
          class="history-item"
          :class="{ active: session.id === activeSession?.id }"
        >
          <button class="history-open" @click="openSession(session.id)">
            <div class="history-title">
              {{ session.title }}
            </div>
            <div class="history-meta">
              <span>{{ formatClock(session.durationMs / 1000) }}</span>
              <span>{{ t('tools.meeting-captions.history.lineCount', { count: session.lines.length }) }}</span>
            </div>
          </button>
          <n-button
            quaternary
            circle
            size="small"
            :disabled="recordingState !== 'idle' || isProcessingUpload"
            :title="t('tools.meeting-captions.actions.rename')"
            @click="renameSession(session)"
          >
            <template #icon>
              <n-icon :component="Pencil" />
            </template>
          </n-button>
        </div>

        <div v-if="sessionHistory.length === 0" class="history-empty">
          {{ t('tools.meeting-captions.history.empty') }}
        </div>
      </div>

      <div class="history-footer">
        <n-button secondary type="error" block :disabled="!canClearHistory" @click="clearHistory">
          <template #icon>
            <n-icon :component="Trash" />
          </template>
          {{ t('tools.meeting-captions.actions.clearHistory') }}
        </n-button>
      </div>
    </aside>

    <section class="stage-panel">
      <div class="hero-card">
        <div class="hero-top">
          <div>
            <div class="hero-title">
              {{ activeSession?.title ?? t('tools.meeting-captions.title') }}
            </div>
            <div class="hero-meta">
              <span>{{ new Date(activeSession?.createdAt ?? Date.now()).toLocaleString('zh-TW') }}</span>
              <span>{{ liveClock }}</span>
              <span>{{ selectedModel.label }}</span>
              <span>{{ modelRuntime === 'webgpu' ? 'WebGPU' : t('tools.meeting-captions.status.modelNotLoaded') }}</span>
            </div>
          </div>

          <div class="status-chip" :class="recordingState">
            <span class="status-dot" />
            {{ recordingState === 'recording' ? t('tools.meeting-captions.recordingState.recording') : recordingState === 'paused' ? t('tools.meeting-captions.recordingState.paused') : t('tools.meeting-captions.recordingState.idle') }}
          </div>
        </div>

        <div class="captions-stage">
          <div class="section-label">
            {{ t('tools.meeting-captions.sections.liveCaptions') }}
          </div>
          <div v-if="previousLines.length" class="caption-history">
            <div v-for="line in previousLines" :key="line.id" class="caption-line muted">
              <span class="line-time">{{ formatTimestamp(line.time) }}</span>
              <span>{{ line.text }}</span>
            </div>
          </div>

          <div v-if="latestLine" class="caption-focus">
            <div class="line-time current">
              {{ formatTimestamp(latestLine.time) }}
            </div>
            <div class="focus-text">
              {{ latestLine.text }}
            </div>
          </div>

          <div v-else class="stage-empty">
            {{ recordingState === 'idle' ? aiStatus : t('tools.meeting-captions.status.startedListening', { status: aiStatus }) }}
          </div>

          <div v-if="recordingState !== 'idle'" class="listening-row">
            <span class="listening-label">{{ recordingState === 'paused' ? t('tools.meeting-captions.status.pausedEllipsis') : t('tools.meeting-captions.status.listeningEllipsis') }}</span>
            <span class="listening-preview">{{ pendingTranscription ? t('tools.meeting-captions.status.processingLatest') : aiStatus }}</span>
          </div>
        </div>

        <div class="meter-time">
          {{ liveClock }}
        </div>
        <div class="level-meter" aria-hidden="true">
          <span v-for="(level, index) in levelBars" :key="index" class="bar" :style="{ transform: `scaleY(${level})` }" />
        </div>

        <div class="control-row">
          <n-button type="primary" size="large" :disabled="!canStart" @click="startSession">
            <template #icon>
              <n-icon :component="Microphone" />
            </template>
            {{ t('tools.meeting-captions.actions.start') }}
          </n-button>

          <n-button size="large" :disabled="!canPause" @click="pauseSession">
            <template #icon>
              <n-icon :component="PlayerPause" />
            </template>
            {{ t('tools.meeting-captions.actions.pause') }}
          </n-button>

          <n-button size="large" :disabled="!canResume" @click="resumeSession">
            <template #icon>
              <n-icon :component="PlayerPlay" />
            </template>
            {{ t('tools.meeting-captions.actions.resume') }}
          </n-button>

          <n-button size="large" tertiary :disabled="!canStop" @click="stopSession">
            <template #icon>
              <n-icon :component="Square" />
            </template>
            {{ t('tools.meeting-captions.actions.stop') }}
          </n-button>
        </div>
      </div>

      <div class="detail-grid">
        <n-card class="detail-card" :title="t('tools.meeting-captions.sections.transcript')">
          <template #header-extra>
            <n-space>
              <n-button quaternary :disabled="!transcriptPreview" @click="copyCurrentSession">
                <template #icon>
                  <n-icon :component="Copy" />
                </template>
              </n-button>
              <n-button quaternary :disabled="!transcriptPreview" @click="exportCurrentSession">
                <template #icon>
                  <n-icon :component="Download" />
                </template>
              </n-button>
            </n-space>
          </template>

          <div v-if="!activeSession?.lines.length" class="detail-empty">
            {{ t('tools.meeting-captions.transcript.empty') }}
          </div>

          <div v-else class="transcript-list">
            <div v-for="line in activeSession.lines" :key="line.id" class="transcript-row">
              <span class="line-time">{{ formatTimestamp(line.time) }}</span>
              <span class="transcript-text">{{ line.text }}</span>
            </div>
          </div>
        </n-card>

        <n-card class="detail-card" :title="t('tools.meeting-captions.sections.status')">
          <div class="status-list">
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.model') }}</span>
              <span>{{ selectedModel.label }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.modelStatus') }}</span>
              <span>{{ aiStatus }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.progress') }}</span>
              <span>{{ aiProgress }}%</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.audioDownload') }}</span>
              <span>{{ downloadAudioOnStop ? t('tools.meeting-captions.statusPanel.downloadWavOnStop') : t('tools.meeting-captions.statusPanel.off') }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.storage') }}</span>
              <span>localStorage</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.history') }}</span>
              <span>{{ t('tools.meeting-captions.statusPanel.sessionCount', { count: sessionHistory.length }) }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('tools.meeting-captions.statusPanel.pauseDisplay') }}</span>
              <span>{{ recordingState === 'paused' ? liveClock : t('tools.meeting-captions.recordingState.recording') }}</span>
            </div>
          </div>
          <n-button secondary block class="mt-4" :disabled="!activeSession" @click="persistState">
            <template #icon>
              <n-icon :component="DeviceFloppy" />
            </template>
            {{ t('tools.meeting-captions.actions.saveNow') }}
          </n-button>
        </n-card>
      </div>
    </section>
  </div>
</template>

<style scoped>
.meeting-captions-tool {
  display: grid;
  grid-template-columns: 300px minmax(720px, 1fr);
  gap: 16px;
  width: min(100%, 1440px);
  min-height: calc(100vh - 116px);
  margin: 0 auto;
}

.history-panel,
.hero-card,
.detail-card,
.language-card {
  border: 1px solid rgb(220 226 218 / 0.9);
  background: rgb(255 255 250 / 0.96);
  border-radius: 12px;
}

.history-panel {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.panel-header,
.hero-top,
.history-meta,
.status-item,
.control-row,
.hero-meta,
.listening-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(249 115 22);
}

.panel-header h2,
.hero-title {
  margin: 4px 0 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0;
  color: rgb(28 25 23);
}

.language-card {
  padding: 16px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgb(120 113 108);
}

.field-label.compact {
  margin-bottom: 4px;
}

.field-hint {
  margin: 10px 0 0;
  color: rgb(120 113 108);
  font-size: 12px;
  line-height: 1.5;
}

.option-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upload-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.history-footer {
  margin-top: auto;
  padding-top: 8px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  background: rgb(255 255 255 / 0.78);
  transition: transform 0.18s ease, background-color 0.18s ease;
}

.history-open {
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.history-item.active {
  background: rgb(255 237 213);
  transform: translateX(3px);
}

.history-title {
  font-weight: 700;
  color: rgb(28 25 23);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta,
.hero-meta,
.history-empty,
.detail-empty,
.status-label,
.line-time {
  color: rgb(120 113 108);
  font-size: 13px;
}

.stage-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.hero-card {
  padding: 22px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.88);
  color: rgb(68 64 60);
  font-weight: 700;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(148 163 184);
}

.status-chip.recording .status-dot {
  background: rgb(34 197 94);
}

.status-chip.paused .status-dot {
  background: rgb(249 115 22);
}

.captions-stage {
  margin-top: 22px;
  min-height: 420px;
  padding: 26px;
  border-radius: 10px;
  background: rgb(255 255 255 / 0.84);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.section-label {
  margin-bottom: 18px;
  color: rgb(249 115 22);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.caption-history {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.caption-line {
  display: flex;
  gap: 14px;
  font-size: 19px;
  line-height: 1.55;
  min-width: 0;
}

.caption-line.muted {
  color: rgb(120 113 108);
}

.caption-focus {
  margin-top: auto;
}

.line-time.current {
  color: rgb(249 115 22);
  font-size: 24px;
  font-weight: 800;
}

.focus-text {
  margin-top: 12px;
  font-size: 42px;
  line-height: 1.28;
  font-weight: 800;
  color: rgb(28 25 23);
  overflow-wrap: anywhere;
}

.stage-empty,
.listening-preview {
  color: rgb(120 113 108);
}

.stage-empty {
  max-width: 520px;
  line-height: 1.7;
}

.listening-row {
  margin-top: 28px;
  justify-content: flex-start;
}

.listening-label {
  color: rgb(249 115 22);
  font-weight: 800;
}

.meter-time {
  margin-top: 22px;
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: rgb(28 25 23);
}

.level-meter {
  display: flex;
  justify-content: center;
  align-items: end;
  gap: 8px;
  height: 68px;
  margin-top: 16px;
}

.bar {
  width: 10px;
  height: 100%;
  border-radius: 999px;
  transform-origin: bottom;
  background: linear-gradient(180deg, rgb(251 146 60), rgb(249 115 22));
}

.control-row {
  justify-content: center;
  margin-top: 18px;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
}

.transcript-list,
.status-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.transcript-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  line-height: 1.6;
}

.transcript-text {
  color: rgb(41 37 36);
}

.status-item {
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgb(231 229 228);
}

:global(.tool-layout:has(+ .tool-content .meeting-captions-tool)) {
  display: none;
}

:global(.tool-content:has(.meeting-captions-tool)) {
  display: block !important;
  max-width: 1480px !important;
  padding: 16px !important;
}

:global(.tool-content:has(.meeting-captions-tool) > .meeting-captions-tool) {
  flex: none !important;
  max-width: 1440px !important;
}

@media (max-width: 1180px) {
  .meeting-captions-tool,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .captions-stage {
    min-height: 360px;
  }
}

@media (max-width: 720px) {
  .hero-card,
  .history-panel {
    padding: 18px;
  }

  .focus-text {
    font-size: 28px;
  }

  .caption-line {
    font-size: 18px;
  }
}
</style>

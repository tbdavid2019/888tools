import type { SupportedLanguage } from './meeting-captions.service';

const SHERPA_BASE_PATH = '/models/meeting-captions-sensevoice';
const SHERPA_CACHE_NAME = 'meeting-captions-sensevoice-assets-v1';
const SHERPA_ASSET_FILES = [
  'sherpa-onnx-asr.js',
  'sherpa-onnx-vad.js',
  'sherpa-onnx-wasm-main-vad-asr.js',
  'sherpa-onnx-wasm-main-vad-asr.wasm',
  'sherpa-onnx-wasm-main-vad-asr.data',
] as const;
const SHERPA_DATA_ASSET = 'sherpa-onnx-wasm-main-vad-asr.data';

type SherpaStatusHandler = (status: { message: string; progress?: number }) => void;

interface SherpaWindow extends Window {
  Module?: SherpaModule
  OfflineRecognizer?: SherpaOfflineRecognizerCtor
  createVad?: (module: SherpaModule, config?: SherpaVadConfig) => SherpaVad
  CircularBuffer?: SherpaCircularBufferCtor
}

interface SherpaModule {
  locateFile?: (path: string, scriptDirectory?: string) => string
  setStatus?: (status: string) => void
  onRuntimeInitialized?: () => void
}

interface SherpaVadConfig {
  sileroVad: {
    model: string
    threshold: number
    minSilenceDuration: number
    minSpeechDuration: number
    maxSpeechDuration: number
    windowSize: number
  }
  tenVad: {
    model: string
    threshold: number
    minSilenceDuration: number
    minSpeechDuration: number
    maxSpeechDuration: number
    windowSize: number
  }
  sampleRate: number
  numThreads: number
  provider: 'cpu'
  debug: number
  bufferSizeInSeconds: number
}

interface SherpaOfflineRecognizerCtor {
  new (config: Record<string, unknown>, module: SherpaModule): SherpaOfflineRecognizer
}

interface SherpaCircularBufferCtor {
  new (capacity: number, module: SherpaModule): SherpaCircularBuffer
}

interface SherpaOfflineRecognizer {
  createStream(): SherpaOfflineStream
  decode(stream: SherpaOfflineStream): void
  free(): void
}

interface SherpaOfflineStream {
  acceptWaveform(sampleRate: number, samples: Float32Array): void
  setOption(key: string, value: string): void
  free(): void
}

interface SherpaVad {
  readonly config: SherpaVadConfig
  acceptWaveform(samples: Float32Array): void
  isEmpty(): boolean
  isDetected(): boolean
  front(): { samples: Float32Array; start: number }
  pop(): void
  flush(): void
  reset(): void
  free(): void
}

interface SherpaCircularBuffer {
  push(samples: Float32Array): void
  get(startIndex: number, n: number): Float32Array
  pop(n: number): void
  size(): number
  head(): number
  reset(): void
  free(): void
}

export interface SenseVoiceChunk {
  samples: Float32Array
  startSeconds: number
}

export interface SenseVoiceTranscript {
  text: string
}

export class SenseVoiceEngine {
  private totalSamplesAccepted = 0;
  private totalSegmentsEmitted = 0;

  private constructor(
    private readonly module: SherpaModule,
    private readonly recognizer: SherpaOfflineRecognizer,
    private readonly vad: SherpaVad,
    private readonly circularBuffer: SherpaCircularBuffer,
  ) {}

  static async create(onStatus?: SherpaStatusHandler) {
    const runtime = await ensureSherpaRuntime(onStatus);
    const recognizer = new runtime.OfflineRecognizer({
      featConfig: {
        sampleRate: 16000,
        featureDim: 80,
      },
      modelConfig: {
        senseVoice: {
          model: './sense-voice.onnx',
          language: '',
          useInverseTextNormalization: 1,
        },
        tokens: './tokens.txt',
        numThreads: 1,
        provider: 'cpu',
        debug: 0,
      },
    }, runtime.module);

    const vadConfig: SherpaVadConfig = {
      sileroVad: {
        model: './silero_vad.onnx',
        threshold: 0.5,
        minSilenceDuration: 0.5,
        minSpeechDuration: 0.25,
        maxSpeechDuration: 20,
        windowSize: 512,
      },
      tenVad: {
        model: '',
        threshold: 0.5,
        minSilenceDuration: 0.5,
        minSpeechDuration: 0.25,
        maxSpeechDuration: 20,
        windowSize: 256,
      },
      sampleRate: 16000,
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
      bufferSizeInSeconds: 30,
    };
    const vad = runtime.createVad(runtime.module, vadConfig);
    const circularBuffer = new runtime.CircularBuffer(vadConfig.bufferSizeInSeconds * vadConfig.sampleRate, runtime.module);

    return new SenseVoiceEngine(runtime.module, recognizer, vad, circularBuffer);
  }

  consumeSamples(samples: Float32Array) {
    const windowSize = this.vad.config.sileroVad.windowSize;
    this.circularBuffer.push(samples);
    this.totalSamplesAccepted += samples.length;

    while (this.circularBuffer.size() >= windowSize) {
      const chunk = this.circularBuffer.get(this.circularBuffer.head(), windowSize);
      this.circularBuffer.pop(windowSize);
      this.vad.acceptWaveform(chunk);
    }

    return this.drainVadSegments();
  }

  flushSegments() {
    const windowSize = this.vad.config.sileroVad.windowSize;
    const remaining = this.circularBuffer.size();

    if (remaining > 0) {
      const tail = this.circularBuffer.get(this.circularBuffer.head(), remaining);
      this.circularBuffer.pop(remaining);

      const padded = new Float32Array(windowSize);
      padded.set(tail);
      this.vad.acceptWaveform(padded);
    }

    this.vad.flush();
    return this.drainVadSegments();
  }

  resetStreamingState() {
    this.vad.reset();
    this.circularBuffer.reset();
  }

  transcribe(samples: Float32Array, language: SupportedLanguage) {
    const stream = this.recognizer.createStream();
    const sherpaLanguage = mapSenseVoiceLanguage(language);

    if (sherpaLanguage) {
      stream.setOption('language', sherpaLanguage);
    }

    stream.acceptWaveform(16000, samples);
    const result = this.recognizer.decode(stream);
    void result;
    const text = this.readResultText(stream);
    stream.free();

    return { text };
  }

  free() {
    this.circularBuffer.free();
    this.vad.free();
    this.recognizer.free();
  }

  getDebugState() {
    return {
      bufferedSamples: this.circularBuffer.size(),
      speechDetected: this.vad.isDetected(),
      totalSamplesAccepted: this.totalSamplesAccepted,
      totalSegmentsEmitted: this.totalSegmentsEmitted,
    };
  }

  private drainVadSegments() {
    const segments: SenseVoiceChunk[] = [];

    while (!this.vad.isEmpty()) {
      const segment = this.vad.front();
      this.vad.pop();
      segments.push({
        samples: segment.samples,
        startSeconds: segment.start / 16000,
      });
    }

    this.totalSegmentsEmitted += segments.length;

    return segments;
  }

  private readResultText(stream: SherpaOfflineStream) {
    const recognizer = this.recognizer as SherpaOfflineRecognizer & {
      getResult: (stream: SherpaOfflineStream) => { text?: string }
    };
    return recognizer.getResult(stream).text?.trim() ?? '';
  }
}

let sherpaRuntimePromise: Promise<{
  module: SherpaModule
  OfflineRecognizer: SherpaOfflineRecognizerCtor
  createVad: (module: SherpaModule, config?: SherpaVadConfig) => SherpaVad
  CircularBuffer: SherpaCircularBufferCtor
}> | null = null;
let sherpaAssetUrlsPromise: Promise<Map<string, string>> | null = null;
const sherpaBlobUrls = new Map<string, string>();

async function ensureSherpaRuntime(onStatus?: SherpaStatusHandler) {
  if (!sherpaRuntimePromise) {
    sherpaRuntimePromise = (async () => {
      const runtimeWindow = window as SherpaWindow;
      const assetUrls = await ensureSherpaAssetUrls(onStatus);

      await loadScript(assetUrls.get('sherpa-onnx-asr.js') ?? getSherpaAssetPath('sherpa-onnx-asr.js'), 'sherpa-onnx-asr.js');
      await loadScript(assetUrls.get('sherpa-onnx-vad.js') ?? getSherpaAssetPath('sherpa-onnx-vad.js'), 'sherpa-onnx-vad.js');

      const module = runtimeWindow.Module ?? {};
      runtimeWindow.Module = module;
      module.locateFile = (path, scriptDirectory = `${SHERPA_BASE_PATH}/`) => assetUrls.get(path) ?? (scriptDirectory + path);
      module.setStatus = (status: string) => {
        const progressMatch = status.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
        if (progressMatch) {
          const downloaded = Number(progressMatch[1]);
          const total = Number(progressMatch[2]);
          const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          onStatus?.({ message: `Loading SenseVoice assets ${progress}%`, progress });
          return;
        }

        if (status === 'Running...') {
          onStatus?.({ message: 'Initializing SenseVoice runtime...' });
          return;
        }

        if (status) {
          onStatus?.({ message: status });
          return;
        }

        onStatus?.({ message: 'SenseVoice runtime ready', progress: 100 });
      };

      await new Promise<void>((resolve, reject) => {
        module.onRuntimeInitialized = () => resolve();
        loadScript(
          assetUrls.get('sherpa-onnx-wasm-main-vad-asr.js') ?? getSherpaAssetPath('sherpa-onnx-wasm-main-vad-asr.js'),
          'sherpa-onnx-wasm-main-vad-asr.js',
        ).catch(reject);
      });

      if (!runtimeWindow.OfflineRecognizer || !runtimeWindow.createVad || !runtimeWindow.CircularBuffer) {
        throw new Error('SenseVoice runtime loaded but required APIs are missing.');
      }

      return {
        module,
        OfflineRecognizer: runtimeWindow.OfflineRecognizer,
        createVad: runtimeWindow.createVad,
        CircularBuffer: runtimeWindow.CircularBuffer,
      };
    })().catch((error) => {
      sherpaRuntimePromise = null;
      throw error;
    });
  }

  return sherpaRuntimePromise;
}

export async function clearSenseVoiceModelCache() {
  if (typeof window !== 'undefined' && 'caches' in window) {
    const cache = await caches.open(SHERPA_CACHE_NAME);
    await Promise.all(SHERPA_ASSET_FILES.map(asset => cache.delete(getSherpaAssetPath(asset))));
  }

  resetSherpaRuntimeState();
}

export async function clearAllBrowserCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return 0;
  }

  const keys = await caches.keys();
  await Promise.all(keys.map(key => caches.delete(key)));
  resetSherpaRuntimeState();
  return keys.length;
}

async function ensureSherpaAssetUrls(onStatus?: SherpaStatusHandler) {
  if (!sherpaAssetUrlsPromise) {
    sherpaAssetUrlsPromise = (async () => {
      onStatus?.({ message: 'Checking local browser model cache...' });
      const urls = new Map<string, string>();
      let cacheHits = 0;

      for (const asset of SHERPA_ASSET_FILES) {
        const { response, fromCache } = await getSherpaAssetResponse(asset, onStatus);
        if (fromCache) {
          cacheHits += 1;
        }

        const existingBlobUrl = sherpaBlobUrls.get(asset);
        if (existingBlobUrl) {
          URL.revokeObjectURL(existingBlobUrl);
        }

        const blobUrl = URL.createObjectURL(await response.blob());
        sherpaBlobUrls.set(asset, blobUrl);
        urls.set(asset, blobUrl);
      }

      onStatus?.({
        message: cacheHits === SHERPA_ASSET_FILES.length
          ? 'Using cached SenseVoice assets from this browser'
          : 'SenseVoice assets cached in this browser',
        progress: 100,
      });

      return urls;
    })().catch((error) => {
      sherpaAssetUrlsPromise = null;
      revokeSherpaBlobUrls();
      throw error;
    });
  }

  return sherpaAssetUrlsPromise;
}

async function getSherpaAssetResponse(
  asset: (typeof SHERPA_ASSET_FILES)[number],
  onStatus?: SherpaStatusHandler,
) {
  const assetPath = getSherpaAssetPath(asset);

  if (typeof window !== 'undefined' && 'caches' in window) {
    const cache = await caches.open(SHERPA_CACHE_NAME);
    const cached = await cache.match(assetPath);
    if (cached) {
      return { response: cached, fromCache: true };
    }

    const response = await fetchSherpaAsset(asset, onStatus);
    await cache.put(assetPath, response.clone());
    return { response, fromCache: false };
  }

  return { response: await fetchSherpaAsset(asset, onStatus), fromCache: false };
}

async function fetchSherpaAsset(
  asset: (typeof SHERPA_ASSET_FILES)[number],
  onStatus?: SherpaStatusHandler,
) {
  const assetPath = getSherpaAssetPath(asset);
  const response = await fetch(assetPath);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${assetPath}: ${response.status} ${response.statusText}`);
  }

  if (asset !== SHERPA_DATA_ASSET || !response.body) {
    return response;
  }

  const totalBytes = Number(response.headers.get('content-length') ?? 0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    chunks.push(value);
    downloadedBytes += value.byteLength;

    if (totalBytes > 0) {
      const progress = Math.round((downloadedBytes / totalBytes) * 100);
      onStatus?.({ message: `Downloading SenseVoice model ${progress}%`, progress });
    }
    else {
      onStatus?.({ message: 'Downloading SenseVoice model...' });
    }
  }

  const body = new Blob(chunks, {
    type: response.headers.get('content-type') ?? 'application/octet-stream',
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
}

function getSherpaAssetPath(asset: (typeof SHERPA_ASSET_FILES)[number]) {
  return `${SHERPA_BASE_PATH}/${asset}`;
}

function resetSherpaRuntimeState() {
  sherpaRuntimePromise = null;
  sherpaAssetUrlsPromise = null;
  revokeSherpaBlobUrls();

  if (typeof document !== 'undefined') {
    document.querySelectorAll('script[data-sherpa-src]').forEach(script => script.remove());
  }

  if (typeof window !== 'undefined') {
    const runtimeWindow = window as SherpaWindow;
    runtimeWindow.Module = undefined;
    runtimeWindow.OfflineRecognizer = undefined;
    runtimeWindow.createVad = undefined;
    runtimeWindow.CircularBuffer = undefined;
  }
}

function revokeSherpaBlobUrls() {
  for (const blobUrl of sherpaBlobUrls.values()) {
    URL.revokeObjectURL(blobUrl);
  }

  sherpaBlobUrls.clear();
}

async function loadScript(src: string, key = src) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-sherpa-src="${key}"]`);
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${key}`)), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.sherpaSrc = key;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${key}`)), { once: true });
    document.head.appendChild(script);
  });
}

function mapSenseVoiceLanguage(language: SupportedLanguage) {
  switch (language) {
    case 'chinese':
      return 'zh';
    case 'english':
      return 'en';
    case 'japanese':
      return 'ja';
    case 'korean':
      return 'ko';
    default:
      return '';
  }
}

export type SupportedLanguage = 'chinese' | 'english' | 'japanese' | 'korean' | 'auto';
export type MeetingCaptionsModelId = 'sherpa-onnx/sensevoice-small' | 'onnx-community/whisper-small';

export interface WhisperChunk {
  time: number
  endTime?: number
  text: string
};

export interface MeetingCaptionLine {
  id: string
  time: number
  endTime?: number
  text: string
};

export interface MeetingSession {
  id: string
  title: string
  language: SupportedLanguage
  createdAt: string
  updatedAt: string
  durationMs: number
  lines: MeetingCaptionLine[]
};

export interface MeetingSessionsState {
  activeSessionId: string | null
  sessions: MeetingSession[]
  version: 1
};

export interface MeetingCaptionsRuntime { device: 'webgpu' | 'wasm'; dtype: 'fp32' | 'q8' }

const STORAGE_VERSION = 1;

export const MEETING_CAPTIONS_STORAGE_KEY = 'meeting-captions:sessions';
export const MEETING_CAPTIONS_SENSEVOICE_MODEL_ID = 'sherpa-onnx/sensevoice-small';
export const MEETING_CAPTIONS_WHISPER_MODEL_ID = 'onnx-community/whisper-small';
export const MEETING_CAPTIONS_DEFAULT_MODEL_ID = MEETING_CAPTIONS_SENSEVOICE_MODEL_ID;
export const MEETING_CAPTIONS_MODEL_IDS = [
  MEETING_CAPTIONS_SENSEVOICE_MODEL_ID,
  MEETING_CAPTIONS_WHISPER_MODEL_ID,
] as const;

export function isSenseVoiceModel(modelId: string): modelId is typeof MEETING_CAPTIONS_SENSEVOICE_MODEL_ID {
  return modelId === MEETING_CAPTIONS_SENSEVOICE_MODEL_ID;
}

export function isWhisperModel(modelId: string): modelId is typeof MEETING_CAPTIONS_WHISPER_MODEL_ID {
  return modelId === MEETING_CAPTIONS_WHISPER_MODEL_ID;
}

export function getMeetingCaptionsRuntime(hasWebGpu: boolean): MeetingCaptionsRuntime {
  if (hasWebGpu) {
    return { device: 'webgpu', dtype: 'fp32' };
  }

  return { device: 'wasm', dtype: 'q8' };
}

export function createMeetingSessionsState(): MeetingSessionsState {
  return {
    activeSessionId: null,
    sessions: [],
    version: STORAGE_VERSION,
  };
}

export function createMeetingSession(language: SupportedLanguage, now = new Date()): MeetingSession {
  const iso = now.toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${now.getTime()}`,
    title: buildSessionTitle(now),
    language,
    createdAt: iso,
    updatedAt: iso,
    durationMs: 0,
    lines: [],
  };
}

export function readMeetingSessionsState(raw: string | null | undefined): MeetingSessionsState {
  if (!raw) {
    return createMeetingSessionsState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MeetingSessionsState>;
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions
        .filter(session => session && typeof session.id === 'string')
        .map(session => ({
          id: session.id,
          title: typeof session.title === 'string' && session.title.trim() ? session.title : 'Untitled session',
          language: isSupportedLanguage(session.language) ? session.language : 'auto',
          createdAt: typeof session.createdAt === 'string' ? session.createdAt : new Date(0).toISOString(),
          updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : new Date(0).toISOString(),
          durationMs: typeof session.durationMs === 'number' ? session.durationMs : 0,
          lines: Array.isArray(session.lines)
            ? session.lines
              .filter(line => line && typeof line.text === 'string')
              .map(line => ({
                id: typeof line.id === 'string' ? line.id : `${session.id}-${line.time ?? 0}`,
                time: typeof line.time === 'number' ? line.time : 0,
                endTime: typeof line.endTime === 'number' ? line.endTime : undefined,
                text: line.text.trim(),
              }))
              .filter(line => line.text)
            : [],
        }))
      : [];

    return {
      activeSessionId: typeof parsed.activeSessionId === 'string' ? parsed.activeSessionId : null,
      sessions: sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      version: STORAGE_VERSION,
    };
  }
  catch {
    return createMeetingSessionsState();
  }
}

export function serializeMeetingSessionsState(state: MeetingSessionsState): string {
  return JSON.stringify({
    ...state,
    sessions: [...state.sessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    version: STORAGE_VERSION,
  });
}

export function upsertSession(
  state: MeetingSessionsState,
  session: MeetingSession,
  options?: { setActive?: boolean },
): MeetingSessionsState {
  const nextSessions = state.sessions.filter(item => item.id !== session.id);
  nextSessions.unshift(session);

  return {
    activeSessionId: options?.setActive ?? true ? session.id : state.activeSessionId,
    sessions: nextSessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    version: STORAGE_VERSION,
  };
}

export function buildSessionTitle(date: Date): string {
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `會議逐字稿 ${formatter.format(date)}`;
}

export function formatClock(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(wholeSeconds / 60);
  const secs = wholeSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const mins = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function cleanTranscriptText(text: string): string {
  return collapseRepeatedTranscriptLoops(text
    .replace(/(.)\1{3,}/g, '$1～')
    .replace(/(.{2,3})\1{2,}/g, '$1～')
    .replace(/\s+/g, ' ')
    .trim());
}

export function calculateAudioRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;
  for (const sample of samples) {
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / samples.length);
}

export function hasAudibleSpeech(samples: Float32Array, threshold = 0.0025): boolean {
  return calculateAudioRms(samples) >= threshold;
}

export function collapseRepeatedTranscriptLoops(text: string): string {
  const segments = text
    .match(/[^.!?。！？]+[.!?。！？]?/g)
    ?.map(segment => segment.trim())
    .filter(Boolean);

  if (!segments?.length) {
    return text;
  }

  const result: string[] = [];
  let previousKey = '';
  let repeatCount = 0;

  for (const segment of segments) {
    const key = segment
      .toLowerCase()
      .replace(/[.!?。！？,，;；:：]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (key && key === previousKey) {
      repeatCount += 1;
      if (repeatCount >= 2) {
        continue;
      }
    }
    else {
      previousKey = key;
      repeatCount = 0;
    }

    result.push(segment);
  }

  return result.join(' ');
}

export function isTranscriptJunk(text: string): boolean {
  const value = text.trim();
  if (!value) {
    return true;
  }

  if (/CC字幕|字幕[:：]|[Ss]ubtitle|[Cc]aption/i.test(value)) {
    return true;
  }

  if (/製作[:：]|翻[译譯][:：]|校[对對][:：]/i.test(value)) {
    return true;
  }

  return /^[\s\p{P}\p{S}]*$/u.test(value);
}

export function deduplicateOverlap(chunks: WhisperChunk[]): WhisperChunk[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const sorted = [...chunks].sort((a, b) => a.time - b.time);
  const result = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = result[result.length - 1];
    const current = sorted[index];

    if (Math.abs(current.time - previous.time) < 4 && current.text === previous.text) {
      continue;
    }

    if (Math.abs(current.time - previous.time) < 4 && isSubtext(previous.text, current.text)) {
      if (current.text.length > previous.text.length) {
        result[result.length - 1] = current;
      }
      continue;
    }

    result.push(current);
  }

  return result;
}

export function mergeLiveChunks(
  existingLines: MeetingCaptionLine[],
  incomingChunks: WhisperChunk[],
  options?: { overlapSeconds?: number },
): MeetingCaptionLine[] {
  if (incomingChunks.length === 0) {
    return existingLines;
  }

  const normalizedIncoming = deduplicateOverlap(incomingChunks)
    .map(chunk => ({
      time: Number(chunk.time.toFixed(2)),
      endTime: chunk.endTime === undefined ? undefined : Number(chunk.endTime.toFixed(2)),
      text: cleanTranscriptText(chunk.text),
    }))
    .filter(chunk => chunk.text && !isTranscriptJunk(chunk.text));

  if (normalizedIncoming.length === 0) {
    return existingLines;
  }

  const overlapSeconds = options?.overlapSeconds ?? 8;
  const replaceFrom = Math.max(0, normalizedIncoming[0].time - overlapSeconds);
  const preserved = existingLines.filter(line => line.time < replaceFrom);

  const merged = [
    ...preserved.map(line => ({ time: line.time, endTime: line.endTime, text: line.text })),
    ...normalizedIncoming,
  ];

  return deduplicateOverlap(merged).map(chunk => ({
    id: `line-${Math.round(chunk.time * 100)}-${slugifyText(chunk.text)}`,
    time: chunk.time,
    endTime: chunk.endTime,
    text: chunk.text,
  }));
}

export function sessionToPlainText(session: MeetingSession): string {
  return session.lines
    .map(line => `[${formatTimestamp(line.time)}] ${line.text}`)
    .join('\n');
}

export function updateSessionTranscript(
  session: MeetingSession,
  incomingChunks: WhisperChunk[],
  options?: { durationMs?: number; now?: Date },
): MeetingSession {
  const nextLines = mergeLiveChunks(session.lines, incomingChunks);
  const now = options?.now ?? new Date();

  return {
    ...session,
    title: nextLines[0]?.text ? nextLines[0].text.slice(0, 24) : session.title,
    updatedAt: now.toISOString(),
    durationMs: Math.max(session.durationMs, options?.durationMs ?? session.durationMs),
    lines: nextLines,
  };
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'chinese'
    || value === 'english'
    || value === 'japanese'
    || value === 'korean'
    || value === 'auto';
}

function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'caption';
}

function isSubtext(left: string, right: string): boolean {
  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const maxOverlap = Math.min(left.length, right.length);
  for (let overlap = Math.min(4, maxOverlap); overlap <= maxOverlap; overlap += 1) {
    if (left.slice(-overlap) === right.slice(0, overlap)) {
      return true;
    }
  }

  return false;
}

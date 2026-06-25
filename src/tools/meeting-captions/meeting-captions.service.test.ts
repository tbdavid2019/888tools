import { describe, expect, it } from 'vitest';
import {
  MEETING_CAPTIONS_DEFAULT_MODEL_ID,
  MEETING_CAPTIONS_MODEL_IDS,
  buildSessionTitle,
  calculateAudioRms,
  cleanTranscriptText,
  createMeetingSession,
  createMeetingSessionsState,
  formatClock,
  formatTimestamp,
  getMeetingCaptionsRuntime,
  hasAudibleSpeech,
  mergeLiveChunks,
  readMeetingSessionsState,
  serializeMeetingSessionsState,
  sessionToPlainText,
  updateSessionTranscript,
} from './meeting-captions.service';

describe('meeting-captions.service', () => {
  it('creates a new session with a generated title', () => {
    const session = createMeetingSession('chinese', new Date('2026-06-23T07:02:00.000Z'));

    expect(session.language).toBe('chinese');
    expect(session.title).toContain('會議逐字稿');
    expect(session.lines).toEqual([]);
  });

  it('replaces overlapping tail chunks while preserving older lines', () => {
    const merged = mergeLiveChunks(
      [
        { id: 'a', time: 10, text: '先前內容' },
        { id: 'b', time: 18, text: '舊尾段' },
      ],
      [
        { time: 16, endTime: 20, text: '更新後尾段' },
        { time: 22, endTime: 25, text: '新內容' },
      ],
      { overlapSeconds: 3 },
    );

    expect(merged.map(line => line.text)).toEqual(['先前內容', '更新後尾段', '新內容']);
  });

  it('serializes and reads storage state in updated order', () => {
    const state = createMeetingSessionsState();
    const sessionA = {
      ...createMeetingSession('auto', new Date('2026-06-23T00:00:00.000Z')),
      id: 'a',
      updatedAt: '2026-06-23T00:00:00.000Z',
    };
    const sessionB = {
      ...createMeetingSession('auto', new Date('2026-06-23T01:00:00.000Z')),
      id: 'b',
      updatedAt: '2026-06-23T01:00:00.000Z',
    };

    const raw = serializeMeetingSessionsState({
      ...state,
      sessions: [sessionA, sessionB],
      activeSessionId: 'b',
    });

    const restored = readMeetingSessionsState(raw);

    expect(restored.activeSessionId).toBe('b');
    expect(restored.sessions.map(session => session.id)).toEqual(['b', 'a']);
  });

  it('updates session transcript and exports readable text', () => {
    const base = {
      ...createMeetingSession('chinese', new Date('2026-06-23T00:00:00.000Z')),
      id: 'demo',
      title: '原始標題',
    };

    const updated = updateSessionTranscript(base, [
      { time: 5, endTime: 8, text: '第一句字幕' },
      { time: 12, endTime: 15, text: '第二句字幕' },
    ], {
      durationMs: 18000,
      now: new Date('2026-06-23T00:01:00.000Z'),
    });

    expect(updated.title).toBe('第一句字幕');
    expect(updated.durationMs).toBe(18000);
    expect(sessionToPlainText(updated)).toBe('[00:05] 第一句字幕\n[00:12] 第二句字幕');
  });

  it('formats session and line clocks for the UI', () => {
    expect(formatClock(251)).toBe('04:11');
    expect(formatTimestamp(251)).toBe('04:11');
    expect(formatTimestamp(3671)).toBe('01:01:11');
  });

  it('builds deterministic human title text', () => {
    expect(buildSessionTitle(new Date('2026-06-23T07:02:00.000Z'))).toContain('2026');
  });

  it('exposes SenseVoice first and keeps Whisper as fallback', () => {
    expect(MEETING_CAPTIONS_DEFAULT_MODEL_ID).toBe('sherpa-onnx/sensevoice-small');
    expect(MEETING_CAPTIONS_MODEL_IDS).toEqual([
      'sherpa-onnx/sensevoice-small',
      'onnx-community/whisper-small',
    ]);
  });

  it('prefers WebGPU but falls back to WASM for meeting captions', () => {
    expect(getMeetingCaptionsRuntime(true)).toEqual({ device: 'webgpu', dtype: 'fp32' });
    expect(getMeetingCaptionsRuntime(false)).toEqual({ device: 'wasm', dtype: 'q8' });
  });

  it('detects low energy audio before running transcription', () => {
    expect(calculateAudioRms(new Float32Array([0, 0, 0]))).toBe(0);
    expect(hasAudibleSpeech(new Float32Array([0.0001, -0.0001, 0.0001]))).toBe(false);
    expect(hasAudibleSpeech(new Float32Array([0.02, -0.02, 0.02]))).toBe(true);
  });

  it('collapses repeated hallucination loops in transcript text', () => {
    const cleaned = cleanTranscriptText(
      'I am excited. I am excited. I am excited. I am excited. I am excited.',
    );

    expect(cleaned).toBe('I am excited. I am excited.');
  });
});

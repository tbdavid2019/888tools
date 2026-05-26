import { describe, expect, it } from 'vitest';
import {
  alignLyricsToChunks,
  buildLrc,
  cleanReferenceLines,
  deduplicateOverlap,
  formatLrcTime,
  hasStructureMarkers,
  parseLrc,
  parseLrcTime,
  redistributeChunks,
  structuredDistribute,
} from './lyric-player.service';

describe('lyric-player.service', () => {
  it('parses lrc timestamps and keeps multiple timestamps on one line', () => {
    expect(parseLrc('[00:01.20]Hello\n[00:02.00][00:03.50]World')).toEqual([
      { time: 1.2, text: 'Hello' },
      { time: 2, text: 'World' },
      { time: 3.5, text: 'World' },
    ]);
  });

  it('formats and parses lrc timestamps symmetrically', () => {
    expect(formatLrcTime(75.23)).toBe('01:15.23');
    expect(parseLrcTime('01:15.23')).toBe(75.23);
  });

  it('builds an lrc payload with headers', () => {
    expect(buildLrc('demo', [{ time: 1.2, text: 'Hello' }])).toBe('[ti:demo]\n[by:Lyric Player]\n\n[00:01.20]Hello');
  });

  it('removes structure tags and annotations from reference lyrics', () => {
    expect(cleanReferenceLines(['[Verse]', ' Hello ', '(instrumental)', '', 'World'])).toEqual(['Hello', 'World']);
    expect(hasStructureMarkers(['[Verse]', 'Hello', '[Chorus]', 'World'])).toBe(true);
  });

  it('distributes sectioned lyrics across the track timeline', () => {
    expect(structuredDistribute(['[Intro]', '[Verse]', 'A', 'B', '[Break]', '[Chorus]', 'C'], 100)).toEqual([
      { time: 0, text: 'A' },
      { time: 31.67, text: 'B' },
      { time: 66.33, text: 'C' },
    ]);
  });

  it('deduplicates overlapping whisper chunks', () => {
    expect(deduplicateOverlap([
      { time: 1, endTime: 2, text: 'hello' },
      { time: 1.5, endTime: 2.5, text: 'hello' },
      { time: 4, endTime: 6, text: 'hello world' },
      { time: 5, endTime: 7, text: 'world' },
      { time: 9, endTime: 10, text: 'goodbye' },
    ])).toEqual([
      { time: 4, endTime: 6, text: 'hello world' },
      { time: 9, endTime: 10, text: 'goodbye' },
    ]);
  });

  it('redistributes unreliable timestamps over the usable audio range', () => {
    expect(redistributeChunks([
      { time: 0, text: 'A' },
      { time: 0, text: 'B' },
      { time: 0, text: 'C' },
    ], 60)).toEqual([
      { time: 3, endTime: 21.4, text: 'A' },
      { time: 21.4, endTime: 39.8, text: 'B' },
      { time: 39.8, endTime: 58.2, text: 'C' },
    ]);
  });

  it('aligns reference lyrics to whisper chunks and interpolates missing anchors', () => {
    const aligned = alignLyricsToChunks(
      ['12345', 'abc', '67890'],
      [
        { time: 10, endTime: 14, text: '12345' },
        { time: 20, endTime: 24, text: '完全不同' },
        { time: 30, endTime: 34, text: '67890' },
      ],
      40,
    );

    expect(aligned).toEqual([
      { time: 10, text: '12345' },
      { time: 20, text: 'abc' },
      { time: 30, text: '67890' },
    ]);
  });
});

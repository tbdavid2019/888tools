export type LyricLine = {
  time: number
  text: string
}

export type WhisperChunk = {
  time: number
  endTime?: number
  text: string
}

const structureTagRegex = /^\[.+\]$/;
const annotationRegex = /^\(.+\)$/;

export function parseLrc(text: string): LyricLine[] {
  const lines = text.split('\n');
  const lyrics: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    const content = line.replace(timeRegex, '').trim();

    if (!content || matches.length === 0) {
      continue;
    }

    for (const match of matches) {
      const minutes = Number.parseInt(match[1], 10);
      const seconds = Number.parseInt(match[2], 10);
      const milliseconds = match[3] ? Number.parseInt(match[3].padEnd(3, '0'), 10) : 0;

      lyrics.push({
        time: minutes * 60 + seconds + milliseconds / 1000,
        text: content,
      });
    }
  }

  return lyrics.sort((a, b) => a.time - b.time);
}

export function formatLrcTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.round((seconds % 1) * 100);
  return `${pad2(minutes)}:${pad2(secs)}.${pad2(centiseconds)}`;
}

export function parseLrcTime(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return 0;
  }

  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);
  const milliseconds = match[3] ? Number.parseInt(match[3].padEnd(3, '0'), 10) : 0;
  return minutes * 60 + seconds + milliseconds / 1000;
}

export function buildLrc(trackName: string, lyrics: LyricLine[]): string {
  return `[ti:${trackName}]\n[by:Lyric Player]\n\n${lyrics.map(line => `[${formatLrcTime(line.time)}]${line.text}`).join('\n')}`;
}

export function cleanReferenceLines(lines: string[]): string[] {
  return lines
    .map(line => line.trim())
    .filter(line => line && !structureTagRegex.test(line) && !annotationRegex.test(line));
}

export function hasStructureMarkers(lines: string[]): boolean {
  return lines.filter(line => structureTagRegex.test(line.trim())).length >= 2;
}

export function structuredDistribute(lines: string[], duration: number): LyricLine[] {
  const sections = parseSongStructure(lines);
  const gapEstimates: Record<string, number> = {
    intro: Math.min(duration * 0.06, 12),
    break: 3,
    instrumental: Math.min(duration * 0.08, 18),
    fade: Math.min(duration * 0.03, 5),
  } satisfies Record<string, number>;

  let totalGap = 0;
  let totalLines = 0;

  for (const section of sections) {
    if (section.lines.length === 0) {
      totalGap += gapEstimates[section.type] ?? 3;
    } else {
      totalLines += section.lines.length;
    }
  }

  const outroReserve = Math.min(duration * 0.02, 3);
  const singingTime = Math.max(duration - totalGap - outroReserve, duration * 0.5);
  const timePerLine = totalLines > 0 ? singingTime / totalLines : 3;

  let currentTime = 0;
  const result: LyricLine[] = [];

  for (const section of sections) {
    if (section.lines.length === 0) {
      currentTime += gapEstimates[section.type] ?? 3;
      continue;
    }

    for (const line of section.lines) {
      result.push({
        time: Number(currentTime.toFixed(2)),
        text: line,
      });
      currentTime += timePerLine;
    }
  }

  return result;
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

export function checkTimestampQuality(chunks: WhisperChunk[], duration: number): boolean {
  if (chunks.length === 0 || duration <= 0) {
    return false;
  }

  if (chunks.length === 1) {
    return true;
  }

  const span = chunks[chunks.length - 1].time - chunks[0].time;
  if (span < duration * 0.4) {
    return false;
  }

  const zeroCount = chunks.filter(chunk => chunk.time < 0.5).length;
  return zeroCount <= chunks.length * 0.5;
}

export function redistributeChunks(chunks: WhisperChunk[], duration: number): WhisperChunk[] {
  if (chunks.length === 0) {
    return chunks;
  }

  const start = Math.min(duration * 0.05, 5);
  let end = duration - Math.min(duration * 0.03, 3);
  if (end <= start) {
    end = duration;
  }

  const step = (end - start) / chunks.length;

  return chunks.map((chunk, index) => ({
    time: Number((start + step * index).toFixed(2)),
    endTime: Number((start + step * (index + 1)).toFixed(2)),
    text: chunk.text,
  }));
}

export function cleanRepeats(text: string): string {
  return text
    .replace(/(.)\1{3,}/g, '$1～')
    .replace(/(.{2,3})\1{2,}/g, '$1～')
    .trim();
}

export function isWhisperJunk(text: string): boolean {
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

export function alignLyricsToChunks(
  referenceLines: string[],
  chunks: WhisperChunk[],
  duration: number,
  normalizeText: (text: string) => string = text => text,
): LyricLine[] {
  const cleanedLines = referenceLines.map(line => line.trim()).filter(Boolean);
  const lineCount = cleanedLines.length;

  if (lineCount === 0) {
    return [];
  }

  if (chunks.length < 2) {
    return mapReferenceToTimestamps(cleanedLines, chunks, duration);
  }

  const normalizedChunks = chunks.map(chunk => ({
    ...chunk,
    text: normalizeText(chunk.text),
  }));

  const anchors: Array<{ lineIndex: number, chunkIndex: number }> = [];
  let chunkPointer = 0;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const reference = cleanedLines[lineIndex];
    let bestScore = 0;
    let bestChunkIndex = -1;

    const expectedChunk = Math.round((lineIndex / lineCount) * normalizedChunks.length);
    const windowStart = Math.max(0, Math.min(chunkPointer - 1, expectedChunk - 3));
    const windowEnd = Math.min(normalizedChunks.length, Math.max(chunkPointer + 6, expectedChunk + 6));

    for (let chunkIndex = windowStart; chunkIndex < windowEnd; chunkIndex += 1) {
      const score = charOverlap(reference, normalizedChunks[chunkIndex].text);
      if (score > bestScore) {
        bestScore = score;
        bestChunkIndex = chunkIndex;
      }
    }

    if (bestScore >= 0.3 && bestChunkIndex >= 0) {
      anchors.push({ lineIndex, chunkIndex: bestChunkIndex });
      chunkPointer = bestChunkIndex;
    }
  }

  if (anchors.length === 0) {
    return mapReferenceToTimestamps(cleanedLines, chunks, duration);
  }

  const times = new Array<number | undefined>(lineCount);

  for (const anchor of anchors) {
    times[anchor.lineIndex] = chunks[anchor.chunkIndex].time;
  }

  for (let anchorIndex = 0; anchorIndex < anchors.length;) {
    const chunkIndex = anchors[anchorIndex].chunkIndex;
    const groupStart = anchorIndex;
    while (anchorIndex < anchors.length && anchors[anchorIndex].chunkIndex === chunkIndex) {
      anchorIndex += 1;
    }

    if (anchorIndex - groupStart > 1) {
      const start = chunks[chunkIndex].time;
      const end = chunks[chunkIndex].endTime ?? (start + 3);
      const count = anchorIndex - groupStart;
      const step = (end - start) / count;

      for (let groupIndex = groupStart; groupIndex < anchorIndex; groupIndex += 1) {
        times[anchors[groupIndex].lineIndex] = Number((start + step * (groupIndex - groupStart)).toFixed(2));
      }
    }
  }

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    if (times[lineIndex] !== undefined) {
      continue;
    }

    let previousIndex = -1;
    let previousTime = 0;
    let nextIndex = lineCount;
    let nextTime = duration;

    for (let cursor = lineIndex - 1; cursor >= 0; cursor -= 1) {
      if (times[cursor] !== undefined) {
        previousIndex = cursor;
        previousTime = times[cursor]!;
        break;
      }
    }

    for (let cursor = lineIndex + 1; cursor < lineCount; cursor += 1) {
      if (times[cursor] !== undefined) {
        nextIndex = cursor;
        nextTime = times[cursor]!;
        break;
      }
    }

    times[lineIndex] = previousTime + ((nextTime - previousTime) / (nextIndex - previousIndex)) * (lineIndex - previousIndex);
  }

  return cleanedLines.map((text, index) => ({
    time: Math.max(0, Number(times[index]!.toFixed(2))),
    text,
  }));
}

export function mapReferenceToTimestamps(referenceLines: string[], chunks: WhisperChunk[], duration: number): LyricLine[] {
  if (referenceLines.length === 0) {
    return [];
  }

  let voiceStart: number;
  let voiceEnd: number;

  if (chunks.length > 0) {
    voiceStart = chunks[0].time;
    const lastChunk = chunks[chunks.length - 1];
    voiceEnd = Math.min(lastChunk.endTime ?? (lastChunk.time + 15), duration);

    if (voiceEnd - voiceStart < duration * 0.3) {
      voiceStart = Math.min(8, duration * 0.08);
      voiceEnd = duration - 3;
    }

    if (voiceStart < 2 && duration > 30) {
      voiceStart = Math.min(8, duration * 0.08);
    }
  } else {
    voiceStart = Math.min(8, duration * 0.08);
    voiceEnd = duration - 3;
  }

  if (voiceEnd <= voiceStart) {
    voiceEnd = duration - 2;
  }

  const step = (voiceEnd - voiceStart) / referenceLines.length;

  return referenceLines.map((text, index) => ({
    time: Math.max(0, Number((voiceStart + step * index).toFixed(2))),
    text: text.trim(),
  }));
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function parseSongStructure(lines: string[]): Array<{ type: string, lines: string[] }> {
  const sections: Array<{ type: string, lines: string[] }> = [];
  let current = { type: 'verse', lines: [] as string[] };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (structureTagRegex.test(line)) {
      if (current.lines.length > 0 || sections.length > 0) {
        sections.push(current);
      }

      const tag = line.slice(1, -1).toLowerCase();
      let type = 'verse';
      if (/intro/.test(tag)) type = 'intro';
      else if (/chorus|hook/.test(tag)) type = 'chorus';
      else if (/bridge/.test(tag)) type = 'bridge';
      else if (/outro/.test(tag)) type = 'outro';
      else if (/instrumental|solo|interlude/.test(tag)) type = 'instrumental';
      else if (/break/.test(tag)) type = 'break';
      else if (/fade/.test(tag)) type = 'fade';

      current = { type, lines: [] };
      continue;
    }

    if (!annotationRegex.test(line)) {
      current.lines.push(line);
    }
  }

  if (current.lines.length > 0 || sections.length > 0) {
    sections.push(current);
  }

  return sections;
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

function charOverlap(reference: string, target: string): number {
  const normalizedReference = reference.replace(/[\s\p{P}]/gu, '');
  const normalizedTarget = target.replace(/[\s\p{P}]/gu, '');

  if (!normalizedReference || !normalizedTarget) {
    return 0;
  }

  let targetIndex = 0;
  let matches = 0;

  for (const char of normalizedReference) {
    for (let cursor = targetIndex; cursor < normalizedTarget.length; cursor += 1) {
      if (char === normalizedTarget[cursor]) {
        matches += 1;
        targetIndex = cursor + 1;
        break;
      }
    }
  }

  return matches / normalizedReference.length;
}

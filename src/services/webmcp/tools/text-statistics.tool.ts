import type { WebMcpToolDefinition } from '../types';

export const textStatisticsTool: WebMcpToolDefinition = {
  name: 'analyze_text_statistics',
  description: 'Compute comprehensive statistics on a text string including character count, word count, line count, byte size, Chinese/CJK character count, and estimated reading time.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Input text string to analyze',
      },
    },
    required: ['text'],
  },
  execute: ({ text }) => {
    if (typeof text !== 'string') {
      return { isError: true, error: 'text must be a string' };
    }

    const trimmed = text.trim();
    const charCount = text.length;
    const charNoSpaces = text.replace(/\s/g, '').length;
    const lineCount = trimmed === '' ? 0 : text.split(/\r\n|\r|\n/).length;

    // Words count (separating spaces or CJK ideographs)
    const words = trimmed === '' ? 0 : text.split(/\s+/).filter(Boolean).length;

    // CJK character count (Chinese, Japanese, Korean)
    const cjkMatches = text.match(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g);
    const cjkCount = cjkMatches ? cjkMatches.length : 0;

    const byteSize = new TextEncoder().encode(text).buffer.byteLength;

    // Estimated reading time (~250 words or ~400 Chinese characters per minute)
    const estimatedReadingTimeMinutes = Number(((words / 250) + (cjkCount / 400)).toFixed(2));

    return {
      success: true,
      charCount,
      charNoSpaces,
      wordCount: words,
      cjkCharCount: cjkCount,
      lineCount,
      byteSize,
      estimatedReadingTimeMinutes: Math.max(0.1, estimatedReadingTimeMinutes),
    };
  },
};

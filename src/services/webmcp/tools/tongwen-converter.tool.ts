import type { WebMcpToolDefinition } from '../types';
import { type OpenCCDirection, convertOpenCC } from '@/services/opencc.service';

export const tongwenConverterTool: WebMcpToolDefinition = {
  name: 'convert_chinese_text',
  description: 'Convert text between Traditional Chinese (繁體中文) and Simplified Chinese (簡體中文) with OpenCC dictionary support (including Taiwan idiom phrases and standard conversion).',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The Chinese text to convert',
      },
      direction: {
        type: 'string',
        enum: ['s2t', 't2s', 's2twp', 's2tw'],
        description: 'Conversion mode: "s2t" (Simplified to Traditional with Taiwan phrases), "t2s" (Traditional to Simplified), "s2twp" (Simplified to Traditional with Taiwan phrases), "s2tw" (Simplified to Traditional characters only)',
        default: 's2t',
      },
    },
    required: ['text'],
  },
  execute: ({ text, direction = 's2t' }) => {
    if (!text || typeof text !== 'string') {
      return { convertedText: '' };
    }
    const converted = convertOpenCC(text, direction as OpenCCDirection);
    return {
      originalLength: text.length,
      direction,
      convertedText: converted,
    };
  },
};

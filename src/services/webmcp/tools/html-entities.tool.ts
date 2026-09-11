import { escape, unescape } from 'lodash';
import type { WebMcpToolDefinition } from '../types';

export const htmlEntitiesTool: WebMcpToolDefinition = {
  name: 'html_entities_codec',
  description: 'Escape or unescape HTML special character entities (&, <, >, ", \').',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Input text to escape or unescape',
      },
      action: {
        type: 'string',
        enum: ['escape', 'unescape'],
        description: 'Action: "escape" (convert characters to entities) or "unescape" (convert entities back to characters). Default "escape".',
        default: 'escape',
      },
    },
    required: ['text'],
  },
  execute: ({ text, action = 'escape' }) => {
    if (typeof text !== 'string') {
      return { isError: true, error: 'text must be a string' };
    }

    const result = action === 'unescape' ? unescape(text) : escape(text);

    return {
      success: true,
      action,
      result,
    };
  },
};

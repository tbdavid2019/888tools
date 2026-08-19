import type { WebMcpToolDefinition } from '../types';
import { base64ToText, isValidBase64, textToBase64 } from '@/utils/base64';

export const base64EncodeTool: WebMcpToolDefinition = {
  name: 'base64_encode',
  description: 'Encode text string to standard Base64 or URL-safe Base64 format.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The plain text string to encode',
      },
      urlSafe: {
        type: 'boolean',
        description: 'Whether to make the output URL-safe (replacing + with - and / with _)',
        default: false,
      },
    },
    required: ['text'],
  },
  execute: ({ text, urlSafe = false }) => {
    if (typeof text !== 'string') {
      return { error: 'Input must be a string' };
    }
    const encoded = textToBase64(text, { makeUrlSafe: Boolean(urlSafe) });
    return {
      encoded,
      urlSafe: Boolean(urlSafe),
    };
  },
};

export const base64DecodeTool: WebMcpToolDefinition = {
  name: 'base64_decode',
  description: 'Decode standard Base64 or URL-safe Base64 back into plain text string.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      base64: {
        type: 'string',
        description: 'The Base64 string to decode',
      },
      urlSafe: {
        type: 'boolean',
        description: 'Whether the input is URL-safe Base64',
        default: false,
      },
    },
    required: ['base64'],
  },
  execute: ({ base64, urlSafe = false }) => {
    if (typeof base64 !== 'string') {
      return { error: 'Input must be a string' };
    }
    const trimmed = base64.trim();
    if (!isValidBase64(trimmed, { makeUrlSafe: Boolean(urlSafe) })) {
      return {
        isError: true,
        error: 'Invalid Base64 string',
      };
    }
    try {
      const decoded = base64ToText(trimmed, { makeUrlSafe: Boolean(urlSafe) });
      return {
        decoded,
        urlSafe: Boolean(urlSafe),
      };
    }
    catch (e: any) {
      return {
        isError: true,
        error: `Decode failed: ${e?.message || String(e)}`,
      };
    }
  },
};

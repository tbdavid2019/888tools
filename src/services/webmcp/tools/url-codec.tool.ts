import type { WebMcpToolDefinition } from '../types';

export const urlEncodeDecodeTool: WebMcpToolDefinition = {
  name: 'url_encode_decode',
  description: 'Encode or decode URLs and URI query parameters.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The URL or string to encode/decode',
      },
      action: {
        type: 'string',
        enum: ['encode', 'decode', 'parse'],
        description: 'Operation: "encode" (encodeURIComponent), "decode" (decodeURIComponent), or "parse" (parse components)',
        default: 'encode',
      },
    },
    required: ['text'],
  },
  execute: ({ text, action = 'encode' }) => {
    if (typeof text !== 'string') {
      return { isError: true, error: 'Input must be a string' };
    }

    if (action === 'encode') {
      return {
        action: 'encode',
        original: text,
        encoded: encodeURIComponent(text),
      };
    }

    if (action === 'decode') {
      try {
        return {
          action: 'decode',
          original: text,
          decoded: decodeURIComponent(text),
        };
      }
      catch (e: any) {
        return { isError: true, error: `Failed to decode URL component: ${e?.message || String(e)}` };
      }
    }

    if (action === 'parse') {
      try {
        const url = new URL(text);
        const searchParams: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
          searchParams[k] = v;
        });

        return {
          protocol: url.protocol,
          host: url.host,
          hostname: url.hostname,
          port: url.port,
          pathname: url.pathname,
          search: url.search,
          searchParams,
          hash: url.hash,
          origin: url.origin,
        };
      }
      catch (e: any) {
        return { isError: true, error: `Invalid full URL for parse: ${e?.message || String(e)}` };
      }
    }

    return { isError: true, error: `Unknown action: ${action}` };
  },
};

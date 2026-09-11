import { UAParser } from 'ua-parser-js';
import type { WebMcpToolDefinition } from '../types';

export const userAgentTool: WebMcpToolDefinition = {
  name: 'parse_user_agent',
  description: 'Parse browser User-Agent header string to extract detailed browser, OS, engine, CPU, and device information.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      userAgent: {
        type: 'string',
        description: 'The User-Agent string to parse',
      },
    },
    required: ['userAgent'],
  },
  execute: ({ userAgent }) => {
    if (typeof userAgent !== 'string' || !userAgent.trim()) {
      return { isError: true, error: 'userAgent must be a non-empty string' };
    }

    try {
      const result = UAParser(userAgent.trim());
      return {
        success: true,
        browser: result.browser,
        os: result.os,
        device: result.device,
        engine: result.engine,
        cpu: result.cpu,
        ua: result.ua,
      };
    }
    catch (err: any) {
      return { isError: true, error: `Failed to parse User-Agent: ${err?.message || String(err)}` };
    }
  },
};

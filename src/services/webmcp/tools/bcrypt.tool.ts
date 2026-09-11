import { compareSync, hashSync } from 'bcryptjs';
import type { WebMcpToolDefinition } from '../types';

export const bcryptTool: WebMcpToolDefinition = {
  name: 'bcrypt_tool',
  description: 'Hash a plaintext string using bcrypt or verify a plaintext against an existing bcrypt hash.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['hash', 'verify'],
        description: 'Action to perform: "hash" (hash a string) or "verify" (compare plaintext with hash)',
        default: 'hash',
      },
      text: {
        type: 'string',
        description: 'The plaintext password or string',
      },
      hash: {
        type: 'string',
        description: 'Existing bcrypt hash string to compare against (required when action is "verify")',
      },
      saltRounds: {
        type: 'number',
        description: 'Number of salt rounds for hashing (default 10, between 4 and 16)',
        default: 10,
      },
    },
    required: ['text'],
  },
  execute: ({ action = 'hash', text, hash, saltRounds = 10 }) => {
    if (typeof text !== 'string') {
      return { isError: true, error: 'text must be a string' };
    }

    if (action === 'verify') {
      if (!hash || typeof hash !== 'string') {
        return { isError: true, error: 'hash must be provided when action is "verify"' };
      }
      try {
        const matches = compareSync(text, hash.trim());
        return {
          success: true,
          action: 'verify',
          matches,
        };
      }
      catch (err: any) {
        return { isError: true, error: `Bcrypt verify failed: ${err?.message || String(err)}` };
      }
    }

    try {
      const rounds = Math.max(4, Math.min(Number(saltRounds) || 10, 16));
      const hashed = hashSync(text, rounds);
      return {
        success: true,
        action: 'hash',
        saltRounds: rounds,
        hash: hashed,
      };
    }
    catch (err: any) {
      return { isError: true, error: `Bcrypt hash failed: ${err?.message || String(err)}` };
    }
  },
};

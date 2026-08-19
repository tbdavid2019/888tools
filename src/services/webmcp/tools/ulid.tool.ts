import { ulid } from 'ulid';
import type { WebMcpToolDefinition } from '../types';

export const ulidGeneratorTool: WebMcpToolDefinition = {
  name: 'generate_ulid',
  description: 'Generate Universally Unique Lexicographically Sortable Identifiers (ULID) with millisecond timestamp ordering.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      count: {
        type: 'number',
        description: 'Number of ULIDs to generate (1 to 100, default: 1)',
        default: 1,
      },
      lowercase: {
        type: 'boolean',
        description: 'Whether to output lowercase ULIDs (default: false)',
        default: false,
      },
    },
  },
  execute: ({ count = 1, lowercase = false }) => {
    const qty = Math.min(Math.max(1, Number(count) || 1), 100);
    const ulids: string[] = [];

    for (let i = 0; i < qty; i++) {
      let id = ulid();
      if (lowercase) {
        id = id.toLowerCase();
      }
      ulids.push(id);
    }

    return {
      count: qty,
      ulids,
      first: ulids[0],
    };
  },
};

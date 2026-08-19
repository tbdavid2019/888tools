import { v1 as uuidv1, v4 as uuidv4 } from 'uuid';
import type { WebMcpToolDefinition } from '../types';

export const uuidGeneratorTool: WebMcpToolDefinition = {
  name: 'generate_uuid',
  description: 'Generate universally unique identifiers (UUID version 4 or version 1) with options for quantity, uppercase, and hyphen removal.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      version: {
        type: 'string',
        enum: ['v4', 'v1'],
        description: 'UUID version to generate (default: "v4")',
        default: 'v4',
      },
      count: {
        type: 'number',
        description: 'Number of UUIDs to generate (1 to 100, default: 1)',
        default: 1,
      },
      uppercase: {
        type: 'boolean',
        description: 'Whether to output uppercase UUIDs (default: false)',
        default: false,
      },
      removeHyphens: {
        type: 'boolean',
        description: 'Whether to remove hyphens (dashes) from generated UUIDs (default: false)',
        default: false,
      },
    },
  },
  execute: ({ version = 'v4', count = 1, uppercase = false, removeHyphens = false }) => {
    const qty = Math.min(Math.max(1, Number(count) || 1), 100);
    const generator = version === 'v1' ? uuidv1 : uuidv4;
    const uuids: string[] = [];

    for (let i = 0; i < qty; i++) {
      let id = generator();
      if (removeHyphens) {
        id = id.replace(/-/g, '');
      }
      if (uppercase) {
        id = id.toUpperCase();
      }
      uuids.push(id);
    }

    return {
      version,
      count: qty,
      uuids,
      first: uuids[0],
    };
  },
};

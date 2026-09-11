import type { WebMcpToolDefinition } from '../types';
import { diff } from '@/tools/json-diff/json-diff.models';

export const jsonDiffTool: WebMcpToolDefinition = {
  name: 'diff_json',
  description: 'Compare two JSON objects or values to produce a detailed tree and list of differences (added, removed, modified).',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      original: {
        type: 'string',
        description: 'Original JSON string or data',
      },
      modified: {
        type: 'string',
        description: 'Modified JSON string or data to compare against original',
      },
      onlyDifferences: {
        type: 'boolean',
        description: 'Whether to only include modified/added/removed keys (default true)',
        default: true,
      },
    },
    required: ['original', 'modified'],
  },
  execute: ({ original, modified, onlyDifferences = true }) => {
    try {
      const origObj = typeof original === 'string' ? JSON.parse(original) : original;
      const modObj = typeof modified === 'string' ? JSON.parse(modified) : modified;

      const diffResult = diff(origObj, modObj, { onlyShowDifferences: Boolean(onlyDifferences) });

      return {
        success: true,
        diff: diffResult,
      };
    }
    catch (err: any) {
      return {
        isError: true,
        error: `JSON diff failed: ${err?.message || String(err)}`,
      };
    }
  },
};

import type { WebMcpToolDefinition } from '../types';

export const jsonUtilsTool: WebMcpToolDefinition = {
  name: 'format_or_minify_json',
  description: 'Validate, format (pretty-print) or minify JSON data with custom indentation.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to format or minify',
      },
      action: {
        type: 'string',
        enum: ['format', 'minify', 'validate'],
        description: 'Operation to perform: "format" (pretty-print), "minify" (compact one-line), or "validate"',
        default: 'format',
      },
      indent: {
        type: 'number',
        description: 'Number of spaces for indentation when formatting (default: 2)',
        default: 2,
      },
    },
    required: ['json'],
  },
  execute: ({ json, action = 'format', indent = 2 }) => {
    if (typeof json !== 'string') {
      return { isError: true, error: 'Input must be a JSON string' };
    }

    try {
      const parsed = JSON.parse(json);

      if (action === 'validate') {
        return {
          valid: true,
          type: Array.isArray(parsed) ? 'array' : typeof parsed,
          keysCount: parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 0,
        };
      }

      if (action === 'minify') {
        return {
          valid: true,
          result: JSON.stringify(parsed),
        };
      }

      const spaces = Math.max(1, Math.min(Number(indent) || 2, 8));
      return {
        valid: true,
        result: JSON.stringify(parsed, null, spaces),
      };
    }
    catch (e: any) {
      return {
        valid: false,
        isError: true,
        error: `Invalid JSON: ${e?.message || String(e)}`,
      };
    }
  },
};

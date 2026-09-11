import type { WebMcpToolDefinition } from '../types';
import { codesByCategories } from '@/tools/http-status-codes/http-status-codes.constants';

export const httpStatusTool: WebMcpToolDefinition = {
  name: 'lookup_http_status',
  description: 'Lookup HTTP status code standard definitions, messages, and official descriptions by numeric code or keyword.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'HTTP status code number (e.g. 404, 200) or name keyword (e.g. "not found", "unauthorized", "teapot")',
      },
    },
    required: ['query'],
  },
  execute: ({ query }) => {
    if (query === undefined || query === null || String(query).trim() === '') {
      return { isError: true, error: 'query is required' };
    }

    const q = String(query).toLowerCase().trim();
    const allCodes = codesByCategories.flatMap(cat =>
      cat.codes.map(c => ({
        ...c,
        category: cat.category,
      })),
    );

    const matches = allCodes.filter(c =>
      String(c.code) === q
      || c.name.toLowerCase().includes(q)
      || c.description.toLowerCase().includes(q),
    );

    return {
      success: true,
      query,
      found: matches.length,
      matches,
    };
  },
};

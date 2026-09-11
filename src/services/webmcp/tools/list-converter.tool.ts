import type { WebMcpToolDefinition } from '../types';
import { convert } from '@/tools/list-converter/list-converter.models';

export const listConverterTool: WebMcpToolDefinition = {
  name: 'convert_list_format',
  description: 'Batch convert and transform lists (lines of items) into formatted strings, comma-separated values, SQL IN lists, or custom prefixed/suffixed items with deduplication and sorting.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'string',
        description: 'Input items separated by newlines or comma',
      },
      separator: {
        type: 'string',
        description: 'Separator between items (default: ", ")',
        default: ', ',
      },
      itemPrefix: {
        type: 'string',
        description: 'Prefix added to each item (e.g. "\'" for SQL strings)',
        default: '',
      },
      itemSuffix: {
        type: 'string',
        description: 'Suffix added to each item (e.g. "\'" for SQL strings)',
        default: '',
      },
      listPrefix: {
        type: 'string',
        description: 'Prefix added to whole list (e.g. "(" for SQL IN clause)',
        default: '',
      },
      listSuffix: {
        type: 'string',
        description: 'Suffix added to whole list (e.g. ")" for SQL IN clause)',
        default: '',
      },
      deduplicate: {
        type: 'boolean',
        description: 'Remove duplicate items (default true)',
        default: true,
      },
      sort: {
        type: 'string',
        enum: ['none', 'asc', 'desc'],
        description: 'Sorting order: "none", "asc", or "desc" (default "none")',
        default: 'none',
      },
      lowerCase: {
        type: 'boolean',
        description: 'Convert items to lowercase (default false)',
        default: false,
      },
    },
    required: ['items'],
  },
  execute: ({
    items,
    separator = ', ',
    itemPrefix = '',
    itemSuffix = '',
    listPrefix = '',
    listSuffix = '',
    deduplicate = true,
    sort = 'none',
    lowerCase = false,
  }) => {
    if (typeof items !== 'string') {
      return { isError: true, error: 'items must be a string' };
    }

    const normalizedInput = items.includes('\n') ? items : items.split(',').join('\n');
    const sortVal = sort === 'asc' || sort === 'desc' ? sort : null;

    const result = convert(normalizedInput, {
      separator: String(separator),
      itemPrefix: String(itemPrefix),
      itemSuffix: String(itemSuffix),
      listPrefix: String(listPrefix),
      listSuffix: String(listSuffix),
      removeDuplicates: Boolean(deduplicate),
      sortList: sortVal,
      lowerCase: Boolean(lowerCase),
      trimItems: true,
      keepLineBreaks: false,
      reverseList: false,
    });

    return {
      success: true,
      result,
    };
  },
};

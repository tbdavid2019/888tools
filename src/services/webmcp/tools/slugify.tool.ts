import slugify from '@sindresorhus/slugify';
import type { WebMcpToolDefinition } from '../types';

export const slugifyTool: WebMcpToolDefinition = {
  name: 'slugify_string',
  description: 'Generate URL-friendly and safe slug strings from arbitrary text (removes special chars, handles accents, converts spaces to hyphens).',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text string to slugify',
      },
      separator: {
        type: 'string',
        description: 'Character to separate words with (default: "-")',
        default: '-',
      },
      lowercase: {
        type: 'boolean',
        description: 'Whether to convert the slug to lowercase (default: true)',
        default: true,
      },
    },
    required: ['text'],
  },
  execute: ({ text, separator = '-', lowercase = true }) => {
    if (typeof text !== 'string') {
      return { error: 'Input text must be a string' };
    }
    const slug = slugify(text, {
      separator: String(separator) || '-',
      lowercase: Boolean(lowercase),
    });
    return {
      original: text,
      slug,
    };
  },
};

import markdownit from 'markdown-it';
import type { WebMcpToolDefinition } from '../types';

export const markdownToHtmlTool: WebMcpToolDefinition = {
  name: 'convert_markdown_to_html',
  description: 'Convert Markdown formatted text into clean HTML markup.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      markdown: {
        type: 'string',
        description: 'The Markdown text to convert into HTML',
      },
      htmlTags: {
        type: 'boolean',
        description: 'Enable HTML tags in source markdown (default false)',
        default: false,
      },
      linkify: {
        type: 'boolean',
        description: 'Autoconvert URL-like text to links (default true)',
        default: true,
      },
    },
    required: ['markdown'],
  },
  execute: ({ markdown, htmlTags = false, linkify = true }) => {
    if (typeof markdown !== 'string') {
      return { isError: true, error: 'markdown must be a string' };
    }

    try {
      const md = markdownit({
        html: Boolean(htmlTags),
        linkify: Boolean(linkify),
        typographer: true,
      });

      const html = md.render(markdown);

      return {
        success: true,
        html,
      };
    }
    catch (err: any) {
      return {
        isError: true,
        error: `Markdown conversion failed: ${err?.message || String(err)}`,
      };
    }
  },
};

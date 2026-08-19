import type { WebMcpToolDefinition } from '../types';
import { toolsWithCategory } from '@/tools';

export const listToolsTool: WebMcpToolDefinition = {
  name: 'list_888_tools',
  description: 'List or search all available developer and IT tools on 888tools (tool.david888.com), including categories, paths, keywords, and descriptions.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Optional category name to filter by (e.g. "Crypto", "Converter", "Web", "Text", "Images and videos", "Development", "Network", "Measurement")',
      },
      search: {
        type: 'string',
        description: 'Optional keyword to search tool names, descriptions, and tags',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tools to return (default: 50)',
      },
    },
  },
  execute: ({ category, search, limit = 50 }) => {
    let result = toolsWithCategory.map(t => ({
      name: t.name,
      path: t.path,
      category: t.category,
      description: t.description,
      keywords: t.keywords,
      url: `https://tool.david888.com${t.path}`,
    }));

    if (category) {
      const lowerCat = String(category).toLowerCase();
      result = result.filter(t => t.category.toLowerCase().includes(lowerCat));
    }

    if (search) {
      const lowerSearch = String(search).toLowerCase();
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(lowerSearch)
          || t.description.toLowerCase().includes(lowerSearch)
          || t.path.toLowerCase().includes(lowerSearch)
          || t.keywords.some(k => k.toLowerCase().includes(lowerSearch)),
      );
    }

    const totalMatches = result.length;
    const sliced = result.slice(0, Number(limit) || 50);

    return {
      totalTools: toolsWithCategory.length,
      matchedTools: totalMatches,
      tools: sliced,
    };
  },
};

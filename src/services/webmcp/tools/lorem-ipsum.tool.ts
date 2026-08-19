import type { WebMcpToolDefinition } from '../types';
import { generateLoremIpsum } from '@/tools/lorem-ipsum-generator/lorem-ipsum-generator.service';

export const loremIpsumTool: WebMcpToolDefinition = {
  name: 'generate_lorem_ipsum',
  description: 'Generate placeholder Lorem Ipsum dummy text by paragraphs, sentences, or HTML markup.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      paragraphCount: {
        type: 'number',
        description: 'Number of paragraphs to generate (default: 2)',
        default: 2,
      },
      sentencePerParagraph: {
        type: 'number',
        description: 'Number of sentences per paragraph (default: 4)',
        default: 4,
      },
      wordCount: {
        type: 'number',
        description: 'Average number of words per sentence (default: 10)',
        default: 10,
      },
      startWithLoremIpsum: {
        type: 'boolean',
        description: 'Whether first sentence starts with "Lorem ipsum..." (default: true)',
        default: true,
      },
      asHTML: {
        type: 'boolean',
        description: 'Whether to format output wrapped in <p> HTML tags (default: false)',
        default: false,
      },
    },
  },
  execute: ({
    paragraphCount = 2,
    sentencePerParagraph = 4,
    wordCount = 10,
    startWithLoremIpsum = true,
    asHTML = false,
  }) => {
    const text = generateLoremIpsum({
      paragraphCount: Number(paragraphCount) || 2,
      sentencePerParagraph: Number(sentencePerParagraph) || 4,
      wordCount: Number(wordCount) || 10,
      startWithLoremIpsum: Boolean(startWithLoremIpsum),
      asHTML: Boolean(asHTML),
    });

    return {
      text,
      paragraphs: Number(paragraphCount) || 2,
      format: asHTML ? 'html' : 'plain',
    };
  },
};

import * as changeCase from 'change-case';
import type { WebMcpToolDefinition } from '../types';

export const caseConverterTool: WebMcpToolDefinition = {
  name: 'convert_text_case',
  description: 'Convert string between various naming cases: camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE, sentence case, dot.case, path/case, or generate all at once.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Input text string to transform',
      },
      targetCase: {
        type: 'string',
        enum: [
          'camelCase',
          'snakeCase',
          'paramCase',
          'pascalCase',
          'constantCase',
          'sentenceCase',
          'capitalCase',
          'dotCase',
          'pathCase',
          'lowerCase',
          'upperCase',
          'ALL',
        ],
        description: 'Target case transformation, or "ALL" for all casing styles',
        default: 'camelCase',
      },
    },
    required: ['text'],
  },
  execute: ({ text, targetCase = 'camelCase' }) => {
    if (typeof text !== 'string') {
      return { error: 'Input text must be a string' };
    }

    const cases = {
      camelCase: changeCase.camelCase(text),
      snakeCase: changeCase.snakeCase(text),
      kebabCase: changeCase.paramCase(text),
      paramCase: changeCase.paramCase(text),
      pascalCase: changeCase.pascalCase(text),
      constantCase: changeCase.constantCase(text),
      sentenceCase: changeCase.sentenceCase(text),
      capitalCase: changeCase.capitalCase(text),
      dotCase: changeCase.dotCase(text),
      pathCase: changeCase.pathCase(text),
      lowerCase: text.toLowerCase(),
      upperCase: text.toUpperCase(),
    };

    if (targetCase === 'ALL') {
      return cases;
    }

    const key = targetCase as keyof typeof cases;
    return {
      targetCase,
      result: cases[key] || cases.camelCase,
    };
  },
};

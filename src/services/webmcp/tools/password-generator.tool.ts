import type { WebMcpToolDefinition } from '../types';
import {
  estimatePasswordStrength,
  generateAllPasswordCategories,
  generatePassphrase,
  generatePassword,
} from '@/tools/password-generator/password-generator.service';

export const passwordGeneratorTool: WebMcpToolDefinition = {
  name: 'generate_password',
  description:
    'Generate cryptographically secure passwords or memorable multi-word passphrases with entropy evaluation, custom formats, and offline crack time estimates.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: [
          'passphrase',
          'alphaNumSym',
          'alphaNum',
          'alphaSym',
          'symbols',
          'alphabets',
          'numbers',
          'all',
        ],
        description:
          'Password format to generate: "passphrase" (memorable words), "alphaNumSym" (full mix), "alphaNum" (no symbols), "alphaSym" (letters & symbols), "symbols" (pure symbols), "alphabets" (letters only), "numbers" (PIN code), or "all" (return entire suite of all formats). Default: "passphrase".',
        default: 'passphrase',
      },
      length: {
        type: 'number',
        description: 'Length of generated password (for character-based formats, 4 to 128, default: 16).',
        default: 16,
      },
      wordCount: {
        type: 'number',
        description: 'Number of words for passphrase format (2 to 10 words, default: 4).',
        default: 4,
      },
      capitalize: {
        type: 'boolean',
        description: 'Whether to capitalize each word in passphrase format (default: false).',
        default: false,
      },
      addNumber: {
        type: 'boolean',
        description: 'Whether to append a random 3-digit number to passphrase format (default: false).',
        default: false,
      },
      addSymbol: {
        type: 'boolean',
        description: 'Whether to append a special symbol to passphrase format (default: false).',
        default: false,
      },
      excludeAmbiguous: {
        type: 'boolean',
        description: 'Exclude easily confused characters such as 0, O, 1, l, I, | (default: false).',
        default: false,
      },
      count: {
        type: 'number',
        description: 'Number of passwords to generate (1 to 50, default: 1).',
        default: 1,
      },
    },
  },
  execute: ({
    format = 'passphrase',
    length = 16,
    wordCount = 4,
    capitalize = false,
    addNumber = false,
    addSymbol = false,
    excludeAmbiguous = false,
    count = 1,
  }) => {
    const numCount = Math.max(1, Math.min(50, Number(count) || 1));
    const passLength = Math.max(4, Math.min(128, Number(length) || 16));
    const passWordCount = Math.max(2, Math.min(10, Number(wordCount) || 4));

    if (format === 'all') {
      const categories = generateAllPasswordCategories({
        length: passLength,
        excludeAmbiguous: Boolean(excludeAmbiguous),
      });
      return {
        mode: 'all_categories',
        totalCategories: categories.length,
        categories: categories.map(cat => ({
          key: cat.key,
          title: cat.title,
          titleEn: cat.titleEn,
          passwords: cat.items.map(item => ({
            label: item.label,
            labelKey: item.labelKey,
            value: item.value,
            strength: item.strength,
            crackTimeZh: item.crackTime,
            crackTimeEn: item.crackTimeEn,
          })),
        })),
      };
    }

    const passwords: Array<{
      value: string
      strength: string
      crackTimeZh: string
      crackTimeEn: string
    }> = [];

    for (let i = 0; i < numCount; i++) {
      let pwd = '';
      if (format === 'passphrase') {
        pwd = generatePassphrase({
          wordCount: passWordCount,
          capitalize: Boolean(capitalize),
          addNumber: Boolean(addNumber),
          addSymbol: Boolean(addSymbol),
          separator: '-',
        });
      }
      else {
        pwd = generatePassword({
          format: format as any,
          length: passLength,
          excludeAmbiguous: Boolean(excludeAmbiguous),
        });
      }

      const est = estimatePasswordStrength(pwd);
      passwords.push({
        value: pwd,
        strength: est.strength,
        crackTimeZh: est.crackTimeZh,
        crackTimeEn: est.crackTimeEn,
      });
    }

    return {
      format,
      count: passwords.length,
      first: passwords[0]?.value,
      passwords,
    };
  },
};

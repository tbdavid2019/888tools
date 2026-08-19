import {
  chineseSimplifiedWordList,
  chineseTraditionalWordList,
  czechWordList,
  englishWordList,
  entropyToMnemonic,
  frenchWordList,
  italianWordList,
  japaneseWordList,
  koreanWordList,
  mnemonicToEntropy,
  portugueseWordList,
  spanishWordList,
} from '@it-tools/bip39';
import type { WebMcpToolDefinition } from '../types';

const languages: Record<string, string[]> = {
  english: englishWordList,
  chinese_simplified: chineseSimplifiedWordList,
  chinese_traditional: chineseTraditionalWordList,
  czech: czechWordList,
  french: frenchWordList,
  italian: italianWordList,
  japanese: japaneseWordList,
  korean: koreanWordList,
  portuguese: portugueseWordList,
  spanish: spanishWordList,
};

export const bip39GeneratorTool: WebMcpToolDefinition = {
  name: 'generate_bip39_mnemonic',
  description: 'Generate or convert BIP39 cryptocurrency mnemonic seed phrase (12, 15, 18, 21, 24 words) and hex entropy in multiple languages.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['generate', 'mnemonic_to_entropy', 'entropy_to_mnemonic'],
        description: 'Operation: "generate" (creates new mnemonic), "mnemonic_to_entropy", or "entropy_to_mnemonic"',
        default: 'generate',
      },
      language: {
        type: 'string',
        enum: [
          'english',
          'chinese_simplified',
          'chinese_traditional',
          'japanese',
          'korean',
          'french',
          'spanish',
          'italian',
          'portuguese',
          'czech',
        ],
        description: 'Wordlist language (default: "english")',
        default: 'english',
      },
      wordsCount: {
        type: 'number',
        enum: [12, 15, 18, 21, 24],
        description: 'Number of words for newly generated mnemonic (default: 12)',
        default: 12,
      },
      mnemonic: {
        type: 'string',
        description: 'Mnemonic phrase string (required when action is "mnemonic_to_entropy")',
      },
      entropy: {
        type: 'string',
        description: 'Hex entropy string (required when action is "entropy_to_mnemonic")',
      },
    },
  },
  execute: ({ action = 'generate', language = 'english', wordsCount = 12, mnemonic, entropy }) => {
    const langList = languages[String(language).toLowerCase()] || englishWordList;

    if (action === 'mnemonic_to_entropy') {
      if (!mnemonic || typeof mnemonic !== 'string') {
        return { isError: true, error: 'Mnemonic phrase string is required' };
      }
      try {
        const ent = mnemonicToEntropy(mnemonic.trim(), langList);
        return {
          mnemonic: mnemonic.trim(),
          entropy: ent,
          language,
        };
      }
      catch (e: any) {
        return { isError: true, error: `Invalid mnemonic phrase: ${e?.message || String(e)}` };
      }
    }

    if (action === 'entropy_to_mnemonic') {
      if (!entropy || typeof entropy !== 'string') {
        return { isError: true, error: 'Entropy hex string is required' };
      }
      try {
        const mnem = entropyToMnemonic(entropy.trim(), langList);
        return {
          entropy: entropy.trim(),
          mnemonic: mnem,
          words: mnem.split(' '),
          language,
        };
      }
      catch (e: any) {
        return { isError: true, error: `Invalid entropy: ${e?.message || String(e)}` };
      }
    }

    // Default generate
    // Word counts mapping to bytes: 12 words = 16 bytes (128 bits), 15 = 20, 18 = 24, 21 = 28, 24 = 32
    const count = Number(wordsCount) || 12;
    const byteMap: Record<number, number> = { 12: 16, 15: 20, 18: 24, 21: 28, 24: 32 };
    const bytesLength = byteMap[count] || 16;

    const randomBytes = new Uint8Array(bytesLength);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    }
    else {
      for (let i = 0; i < bytesLength; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    const hexEntropy = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const generatedMnemonic = entropyToMnemonic(hexEntropy, langList);
    const words = generatedMnemonic.split(' ');

    return {
      mnemonic: generatedMnemonic,
      wordsCount: words.length,
      words,
      entropy: hexEntropy,
      language,
    };
  },
};

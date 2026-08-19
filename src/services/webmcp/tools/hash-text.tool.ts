import { MD5, RIPEMD160, SHA1, SHA224, SHA256, SHA3, SHA384, SHA512, enc } from 'crypto-js';
import type { WebMcpToolDefinition } from '../types';
import { convertHexToBin } from '@/tools/hash-text/hash-text.service';

const algos = {
  MD5,
  SHA1,
  SHA224,
  SHA256,
  SHA384,
  SHA512,
  SHA3,
  RIPEMD160,
} as const;

type AlgoName = keyof typeof algos;
type EncodingType = 'Hex' | 'Base64' | 'Bin';

export const hashTextTool: WebMcpToolDefinition = {
  name: 'hash_text',
  description: 'Compute cryptographic hashes (MD5, SHA1, SHA224, SHA256, SHA384, SHA512, SHA3, RIPEMD160) for text with Hex, Base64, or Binary output encoding.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text string to hash',
      },
      algorithm: {
        type: 'string',
        enum: ['MD5', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160', 'ALL'],
        description: 'Hash algorithm to use (or "ALL" to return all supported hashes)',
        default: 'SHA256',
      },
      encoding: {
        type: 'string',
        enum: ['Hex', 'Base64', 'Bin'],
        description: 'Output encoding format (default: "Hex")',
        default: 'Hex',
      },
    },
    required: ['text'],
  },
  execute: ({ text, algorithm = 'SHA256', encoding = 'Hex' }) => {
    if (typeof text !== 'string') {
      return { error: 'Input text must be a string' };
    }

    const encFormat = (encoding as EncodingType) || 'Hex';

    const computeSingle = (algo: AlgoName) => {
      const fn = algos[algo];
      if (!fn) {
        return '';
      }
      const words = fn(text);
      if (encFormat === 'Bin') {
        return convertHexToBin(words.toString(enc.Hex));
      }
      if (encFormat === 'Base64') {
        return words.toString(enc.Base64);
      }
      return words.toString(enc.Hex);
    };

    if (algorithm === 'ALL') {
      const allResults: Record<string, string> = {};
      for (const algo of Object.keys(algos) as AlgoName[]) {
        allResults[algo] = computeSingle(algo);
      }
      return {
        encoding: encFormat,
        hashes: allResults,
      };
    }

    const algo = (algorithm as AlgoName) in algos ? (algorithm as AlgoName) : 'SHA256';
    const hashValue = computeSingle(algo);

    return {
      algorithm: algo,
      encoding: encFormat,
      hash: hashValue,
    };
  },
};

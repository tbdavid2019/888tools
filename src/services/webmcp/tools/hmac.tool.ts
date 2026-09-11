import { HmacMD5, HmacSHA1, HmacSHA256, HmacSHA512, enc } from 'crypto-js';
import type { WebMcpToolDefinition } from '../types';

export const hmacTool: WebMcpToolDefinition = {
  name: 'generate_hmac',
  description: 'Generate Hash-based Message Authentication Code (HMAC) signature using SHA256, SHA512, SHA1, or MD5.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Plaintext message payload to sign',
      },
      secret: {
        type: 'string',
        description: 'Secret key for HMAC authentication',
      },
      algorithm: {
        type: 'string',
        enum: ['SHA256', 'SHA512', 'SHA1', 'MD5'],
        description: 'Hashing algorithm (default "SHA256")',
        default: 'SHA256',
      },
      encoding: {
        type: 'string',
        enum: ['hex', 'base64'],
        description: 'Output encoding (default "hex")',
        default: 'hex',
      },
    },
    required: ['text', 'secret'],
  },
  execute: ({ text, secret, algorithm = 'SHA256', encoding = 'hex' }) => {
    if (typeof text !== 'string' || typeof secret !== 'string') {
      return { isError: true, error: 'text and secret must be strings' };
    }

    const algoMap = {
      SHA256: HmacSHA256,
      SHA512: HmacSHA512,
      SHA1: HmacSHA1,
      MD5: HmacMD5,
    };

    const algoFn = algoMap[algorithm.toUpperCase() as keyof typeof algoMap] || HmacSHA256;
    const hmacWords = algoFn(text, secret);

    const result = encoding.toLowerCase() === 'base64'
      ? hmacWords.toString(enc.Base64)
      : hmacWords.toString(enc.Hex);

    return {
      success: true,
      algorithm,
      encoding,
      hmac: result,
    };
  },
};

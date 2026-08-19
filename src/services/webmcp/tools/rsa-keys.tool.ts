import type { WebMcpToolDefinition } from '../types';
import { generateKeyPair } from '@/tools/rsa-key-pair-generator/rsa-key-pair-generator.service';

export const rsaKeyPairTool: WebMcpToolDefinition = {
  name: 'generate_rsa_keypair',
  description: 'Generate RSA public and private key pairs in standard PEM format (512, 1024, 2048, or 4096 bits).',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      bits: {
        type: 'number',
        enum: [512, 1024, 2048, 4096],
        description: 'Key length in bits (default: 2048)',
        default: 2048,
      },
    },
  },
  execute: async ({ bits = 2048 }) => {
    try {
      const allowedBits = [512, 1024, 2048, 4096];
      const selectedBits = allowedBits.includes(Number(bits)) ? Number(bits) : 2048;
      const { publicKeyPem, privateKeyPem } = await generateKeyPair({ bits: selectedBits });

      return {
        bits: selectedBits,
        publicKeyPem,
        privateKeyPem,
      };
    }
    catch (e: any) {
      return {
        isError: true,
        error: `Failed to generate RSA key pair: ${e?.message || String(e)}`,
      };
    }
  },
};

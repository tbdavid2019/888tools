import type { WebMcpToolDefinition } from '../types';
import { generateSecret, generateTOTP, verifyTOTP } from '@/tools/otp-code-generator-and-validator/otp.service';

export const totpTool: WebMcpToolDefinition = {
  name: 'totp_tool',
  description: 'Generate or verify 6-digit Time-based One-Time Password (TOTP) codes (RFC 6238) for two-factor authentication, or generate a new Base32 secret.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['generate', 'verify', 'generate_secret'],
        description: 'Action: "generate" (generate 6-digit OTP from secret), "verify" (validate an OTP), or "generate_secret" (create new Base32 secret)',
        default: 'generate',
      },
      secret: {
        type: 'string',
        description: 'Base32 secret key (required for "generate" and "verify")',
      },
      token: {
        type: 'string',
        description: '6-digit OTP code to verify (required when action is "verify")',
      },
      timeStep: {
        type: 'number',
        description: 'Time step in seconds (default 30)',
        default: 30,
      },
    },
  },
  execute: ({ action = 'generate', secret, token, timeStep = 30 }) => {
    if (action === 'generate_secret') {
      const newSecret = generateSecret();
      return {
        success: true,
        action: 'generate_secret',
        secret: newSecret,
      };
    }

    if (!secret || typeof secret !== 'string') {
      return { isError: true, error: 'secret is required for generate and verify' };
    }

    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();

    if (action === 'verify') {
      if (!token || typeof token !== 'string') {
        return { isError: true, error: 'token is required for verify' };
      }
      const isValid = verifyTOTP({
        key: cleanSecret,
        token: token.trim(),
        window: 1,
        timeStep: Number(timeStep) || 30,
      });

      return {
        success: true,
        action: 'verify',
        token: token.trim(),
        isValid,
      };
    }

    try {
      const code = generateTOTP({
        key: cleanSecret,
        timeStep: Number(timeStep) || 30,
      });

      return {
        success: true,
        action: 'generate',
        code,
        timeStep: Number(timeStep) || 30,
      };
    }
    catch (err: any) {
      return { isError: true, error: `TOTP generation failed: ${err?.message || String(err)}` };
    }
  },
};

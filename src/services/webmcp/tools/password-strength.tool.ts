import type { WebMcpToolDefinition } from '../types';
import { getPasswordCrackTimeEstimation } from '@/tools/password-strength-analyser/password-strength-analyser.service';

export const passwordStrengthTool: WebMcpToolDefinition = {
  name: 'analyze_password_strength',
  description: 'Analyze password strength, calculate bit entropy, character set complexity, and estimated crack time.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      password: {
        type: 'string',
        description: 'Password string to analyze',
      },
    },
    required: ['password'],
  },
  execute: ({ password }) => {
    if (typeof password !== 'string') {
      return { isError: true, error: 'Password string required' };
    }

    const estimation = getPasswordCrackTimeEstimation({ password });
    let strengthRating = 'Very Weak';
    if (estimation.entropy >= 100) {
      strengthRating = 'Very Strong';
    }
    else if (estimation.entropy >= 75) {
      strengthRating = 'Strong';
    }
    else if (estimation.entropy >= 50) {
      strengthRating = 'Moderate';
    }
    else if (estimation.entropy >= 25) {
      strengthRating = 'Weak';
    }

    return {
      passwordLength: estimation.passwordLength,
      charsetSize: estimation.charsetLength,
      entropyBits: Number(estimation.entropy.toFixed(2)),
      strengthRating,
      estimatedCrackTime: estimation.crackDurationFormatted,
      score: Number(estimation.score.toFixed(2)),
    };
  },
};

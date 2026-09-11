import { extractIBAN, friendlyFormatIBAN, isQRIBAN, validateIBAN } from 'ibantools';
import type { WebMcpToolDefinition } from '../types';
import { getFriendlyErrors } from '@/tools/iban-validator-and-parser/iban-validator-and-parser.service';

export const ibanValidatorTool: WebMcpToolDefinition = {
  name: 'validate_iban',
  description: 'Validate and parse an International Bank Account Number (IBAN), verifying checksum and extracting country/BBAN details.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      iban: {
        type: 'string',
        description: 'The IBAN string to validate and parse',
      },
    },
    required: ['iban'],
  },
  execute: ({ iban }) => {
    if (typeof iban !== 'string' || !iban.trim()) {
      return { isError: true, error: 'iban must be a non-empty string' };
    }

    const cleanIban = iban.toUpperCase().replace(/\s/g, '').replace(/-/g, '');
    const { valid: isValid, errorCodes } = validateIBAN(cleanIban);
    const { countryCode, bban } = extractIBAN(cleanIban);
    const errors = getFriendlyErrors(errorCodes);

    return {
      isValid,
      formattedIban: friendlyFormatIBAN(cleanIban),
      countryCode: countryCode || null,
      bban: bban || null,
      isQRIban: isQRIBAN(cleanIban),
      errors,
    };
  },
};
